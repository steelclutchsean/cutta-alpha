import { Router } from 'express';
import { db, eq, and, or, ne, desc, count, listings, ownerships, offers, transactions, users, auctionItems, teams, pools } from '@cutta/db';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createListingSchema, createOfferSchema, respondToOfferSchema } from '@cutta/shared';
import { calculatePlatformFee, calculateNetAmount } from '@cutta/shared';
import { AppError } from '../middleware/error.js';
import { processSecondaryMarketPurchase } from '../services/payments.js';
import { Server } from 'socket.io';

export const marketRouter = Router();

// All routes require authentication
marketRouter.use(authenticate);

// Get all active listings
marketRouter.get('/listings', async (req, res, next) => {
  try {
    const { poolId, teamId, minPrice, maxPrice } = req.query;

    const allListings = await db.query.listings.findMany({
      where: eq(listings.status, 'ACTIVE'),
      with: {
        seller: {
          columns: { id: true, displayName: true, avatarUrl: true },
        },
        ownership: {
          with: {
            auctionItem: {
              with: {
                team: true,
                pool: {
                  columns: { id: true, name: true },
                },
              },
            },
          },
        },
        offers: true,
      },
      orderBy: desc(listings.createdAt),
    });

    // Filter by pool/team if specified
    let filtered = allListings;
    if (poolId) {
      filtered = filtered.filter((l) => l.ownership.auctionItem?.pool?.id === poolId);
    }
    if (teamId) {
      filtered = filtered.filter((l) => l.ownership.auctionItem?.teamId === teamId);
    }

    // Filter by price if specified
    if (minPrice) {
      filtered = filtered.filter((l) => Number(l.askingPrice) >= Number(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter((l) => Number(l.askingPrice) <= Number(maxPrice));
    }

    res.json(
      filtered.map((l) => ({
        ...l,
        offerCount: l.offers.filter(o => o.status === 'PENDING').length,
      }))
    );
  } catch (error) {
    next(error);
  }
});

// Get my listings
marketRouter.get('/my-listings', async (req, res, next) => {
  try {
    const myListings = await db.query.listings.findMany({
      where: eq(listings.sellerId, req.user!.id),
      with: {
        ownership: {
          with: {
            auctionItem: {
              with: {
                team: true,
                pool: {
                  columns: { id: true, name: true },
                },
              },
            },
          },
        },
        offers: {
          with: {
            buyer: {
              columns: { id: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: desc(offers.amount),
        },
      },
      orderBy: desc(listings.createdAt),
    });

    // Filter to pending offers only
    const listingsWithPendingOffers = myListings.map(l => ({
      ...l,
      offers: l.offers.filter(o => o.status === 'PENDING'),
    }));

    res.json(listingsWithPendingOffers);
  } catch (error) {
    next(error);
  }
});

// Create listing
marketRouter.post('/listings', validate(createListingSchema), async (req, res, next) => {
  try {
    const { ownershipId, percentageForSale, askingPrice, acceptingOffers, expiresInDays } = req.body;

    // Verify ownership
    const ownership = await db.query.ownerships.findFirst({
      where: eq(ownerships.id, ownershipId),
      with: {
        auctionItem: {
          with: { team: true },
        },
      },
    });

    if (!ownership) {
      throw new AppError(404, 'Ownership not found', 'NOT_FOUND');
    }

    if (ownership.userId !== req.user!.id) {
      throw new AppError(403, 'You do not own this team', 'NOT_OWNER');
    }

    // Check if team is eliminated
    if (ownership.auctionItem.team.isEliminated) {
      throw new AppError(400, 'Cannot list eliminated teams', 'TEAM_ELIMINATED');
    }

    // Check percentage available
    const existingListings = await db.query.listings.findMany({
      where: and(eq(listings.ownershipId, ownershipId), eq(listings.status, 'ACTIVE')),
    });

    const listedPercentage = existingListings.reduce(
      (sum, l) => sum + Number(l.percentageForSale),
      0
    );

    if (listedPercentage + percentageForSale > Number(ownership.percentage)) {
      throw new AppError(
        400,
        `You only have ${Number(ownership.percentage) - listedPercentage}% available to list`,
        'INSUFFICIENT_OWNERSHIP'
      );
    }

    const [listing] = await db.insert(listings)
      .values({
        ownershipId,
        sellerId: req.user!.id,
        percentageForSale: String(percentageForSale),
        askingPrice: String(askingPrice),
        acceptingOffers,
        expiresAt: expiresInDays
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      })
      .returning();

    const createdListing = await db.query.listings.findFirst({
      where: eq(listings.id, listing.id),
      with: {
        ownership: {
          with: {
            auctionItem: {
              with: { team: true },
            },
          },
        },
      },
    });

    res.status(201).json(createdListing);
  } catch (error) {
    next(error);
  }
});

// Cancel listing
marketRouter.delete('/listings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, id),
    });

    if (!listing) {
      throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    }

    if (listing.sellerId !== req.user!.id) {
      throw new AppError(403, 'You do not own this listing', 'NOT_OWNER');
    }

    if (listing.status !== 'ACTIVE') {
      throw new AppError(400, 'Listing is not active', 'NOT_ACTIVE');
    }

    await db.update(listings)
      .set({ status: 'CANCELLED' })
      .where(eq(listings.id, id));

    // Cancel all pending offers
    await db.update(offers)
      .set({ status: 'CANCELLED' })
      .where(and(eq(offers.listingId, id), eq(offers.status, 'PENDING')));

    res.json({ message: 'Listing cancelled' });
  } catch (error) {
    next(error);
  }
});

// Buy now (purchase at asking price)
marketRouter.post('/listings/:id/buy', async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, id),
      with: {
        seller: true,
        ownership: {
          with: {
            auctionItem: {
              with: { team: true, pool: true },
            },
          },
        },
      },
    });

    if (!listing) {
      throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    }

    if (listing.status !== 'ACTIVE') {
      throw new AppError(400, 'Listing is not active', 'NOT_ACTIVE');
    }

    if (listing.sellerId === req.user!.id) {
      throw new AppError(400, 'Cannot buy your own listing', 'OWN_LISTING');
    }

    // Process purchase
    const io: Server = req.app.get('io');
    const result = await processSecondaryMarketPurchase(
      req.user!.id,
      listing,
      Number(listing.askingPrice),
      io
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Make offer
marketRouter.post('/offers', validate(createOfferSchema), async (req, res, next) => {
  try {
    const { listingId, amount } = req.body;

    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });

    if (!listing) {
      throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    }

    if (listing.status !== 'ACTIVE') {
      throw new AppError(400, 'Listing is not active', 'NOT_ACTIVE');
    }

    if (!listing.acceptingOffers) {
      throw new AppError(400, 'This listing is not accepting offers', 'NO_OFFERS');
    }

    if (listing.sellerId === req.user!.id) {
      throw new AppError(400, 'Cannot make offer on your own listing', 'OWN_LISTING');
    }

    // Check for existing pending offer from this user
    const existingOffer = await db.query.offers.findFirst({
      where: and(
        eq(offers.listingId, listingId),
        eq(offers.buyerId, req.user!.id),
        eq(offers.status, 'PENDING')
      ),
    });

    if (existingOffer) {
      // Update existing offer
      const [offer] = await db.update(offers)
        .set({
          amount: String(amount),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        })
        .where(eq(offers.id, existingOffer.id))
        .returning();
      res.json(offer);
      return;
    }

    const [offer] = await db.insert(offers)
      .values({
        listingId,
        buyerId: req.user!.id,
        amount: String(amount),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      })
      .returning();

    res.status(201).json(offer);
  } catch (error) {
    next(error);
  }
});

// Get my offers
marketRouter.get('/my-offers', async (req, res, next) => {
  try {
    const myOffers = await db.query.offers.findMany({
      where: eq(offers.buyerId, req.user!.id),
      with: {
        listing: {
          with: {
            seller: {
              columns: { id: true, displayName: true, avatarUrl: true },
            },
            ownership: {
              with: {
                auctionItem: {
                  with: {
                    team: true,
                    pool: { columns: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: desc(offers.createdAt),
    });

    res.json(myOffers);
  } catch (error) {
    next(error);
  }
});

// Respond to offer (accept/reject)
marketRouter.post('/offers/:id/respond', validate(respondToOfferSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const offer = await db.query.offers.findFirst({
      where: eq(offers.id, id),
      with: {
        listing: {
          with: {
            seller: true,
            ownership: {
              with: {
                auctionItem: {
                  with: { team: true, pool: true },
                },
              },
            },
          },
        },
      },
    });

    if (!offer) {
      throw new AppError(404, 'Offer not found', 'NOT_FOUND');
    }

    if (offer.listing.sellerId !== req.user!.id) {
      throw new AppError(403, 'You do not own this listing', 'NOT_OWNER');
    }

    if (offer.status !== 'PENDING') {
      throw new AppError(400, 'Offer is no longer pending', 'NOT_PENDING');
    }

    if (action === 'reject') {
      await db.update(offers)
        .set({ status: 'REJECTED' })
        .where(eq(offers.id, id));
      res.json({ message: 'Offer rejected' });
      return;
    }

    // Accept offer - process purchase
    const io: Server = req.app.get('io');
    const result = await processSecondaryMarketPurchase(
      offer.buyerId,
      offer.listing,
      Number(offer.amount),
      io
    );

    // Mark offer as accepted
    await db.update(offers)
      .set({ status: 'ACCEPTED' })
      .where(eq(offers.id, id));

    // Reject all other pending offers
    await db.update(offers)
      .set({ status: 'REJECTED' })
      .where(and(
        eq(offers.listingId, offer.listingId),
        ne(offers.id, id),
        eq(offers.status, 'PENDING')
      ));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Cancel offer
marketRouter.delete('/offers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const offer = await db.query.offers.findFirst({
      where: eq(offers.id, id),
    });

    if (!offer) {
      throw new AppError(404, 'Offer not found', 'NOT_FOUND');
    }

    if (offer.buyerId !== req.user!.id) {
      throw new AppError(403, 'You do not own this offer', 'NOT_OWNER');
    }

    if (offer.status !== 'PENDING') {
      throw new AppError(400, 'Offer is not pending', 'NOT_PENDING');
    }

    await db.update(offers)
      .set({ status: 'CANCELLED' })
      .where(eq(offers.id, id));

    res.json({ message: 'Offer cancelled' });
  } catch (error) {
    next(error);
  }
});

// Get transaction history
marketRouter.get('/transactions', async (req, res, next) => {
  try {
    const userTransactions = await db.query.transactions.findMany({
      where: or(eq(transactions.buyerId, req.user!.id), eq(transactions.sellerId, req.user!.id)),
      with: {
        listing: {
          with: {
            ownership: {
              with: {
                auctionItem: {
                  with: {
                    team: true,
                    pool: { columns: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: desc(transactions.createdAt),
      limit: 100,
    });

    res.json(userTransactions);
  } catch (error) {
    next(error);
  }
});
