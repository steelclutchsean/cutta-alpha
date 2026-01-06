import { Router } from 'express';
import { prisma } from '@cutta/db';
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

    const where: Record<string, unknown> = {
      status: 'ACTIVE',
    };

    if (poolId) {
      where.ownership = { auctionItem: { poolId: poolId as string } };
    }

    if (teamId) {
      where.ownership = { auctionItem: { teamId: teamId as string } };
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        seller: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        ownership: {
          include: {
            auctionItem: {
              include: {
                team: true,
                pool: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        _count: {
          select: { offers: { where: { status: 'PENDING' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by price if specified
    let filtered = listings;
    if (minPrice) {
      filtered = filtered.filter((l) => Number(l.askingPrice) >= Number(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter((l) => Number(l.askingPrice) <= Number(maxPrice));
    }

    res.json(
      filtered.map((l) => ({
        ...l,
        offerCount: l._count.offers,
      }))
    );
  } catch (error) {
    next(error);
  }
});

// Get my listings
marketRouter.get('/my-listings', async (req, res, next) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { sellerId: req.user!.id },
      include: {
        ownership: {
          include: {
            auctionItem: {
              include: {
                team: true,
                pool: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        offers: {
          where: { status: 'PENDING' },
          include: {
            buyer: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { amount: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(listings);
  } catch (error) {
    next(error);
  }
});

// Create listing
marketRouter.post('/listings', validate(createListingSchema), async (req, res, next) => {
  try {
    const { ownershipId, percentageForSale, askingPrice, acceptingOffers, expiresInDays } = req.body;

    // Verify ownership
    const ownership = await prisma.ownership.findUnique({
      where: { id: ownershipId },
      include: {
        auctionItem: {
          include: { team: true },
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
    const existingListings = await prisma.listing.findMany({
      where: {
        ownershipId,
        status: 'ACTIVE',
      },
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

    const listing = await prisma.listing.create({
      data: {
        ownershipId,
        sellerId: req.user!.id,
        percentageForSale,
        askingPrice,
        acceptingOffers,
        expiresAt: expiresInDays
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
      include: {
        ownership: {
          include: {
            auctionItem: {
              include: { team: true },
            },
          },
        },
      },
    });

    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
});

// Cancel listing
marketRouter.delete('/listings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id },
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

    await prisma.listing.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Cancel all pending offers
    await prisma.offer.updateMany({
      where: { listingId: id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Listing cancelled' });
  } catch (error) {
    next(error);
  }
});

// Buy now (purchase at asking price)
marketRouter.post('/listings/:id/buy', async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        seller: true,
        ownership: {
          include: {
            auctionItem: {
              include: { team: true, pool: true },
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

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
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
    const existingOffer = await prisma.offer.findFirst({
      where: {
        listingId,
        buyerId: req.user!.id,
        status: 'PENDING',
      },
    });

    if (existingOffer) {
      // Update existing offer
      const offer = await prisma.offer.update({
        where: { id: existingOffer.id },
        data: {
          amount,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });
      res.json(offer);
      return;
    }

    const offer = await prisma.offer.create({
      data: {
        listingId,
        buyerId: req.user!.id,
        amount,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    res.status(201).json(offer);
  } catch (error) {
    next(error);
  }
});

// Get my offers
marketRouter.get('/my-offers', async (req, res, next) => {
  try {
    const offers = await prisma.offer.findMany({
      where: { buyerId: req.user!.id },
      include: {
        listing: {
          include: {
            seller: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
            ownership: {
              include: {
                auctionItem: {
                  include: {
                    team: true,
                    pool: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(offers);
  } catch (error) {
    next(error);
  }
});

// Respond to offer (accept/reject)
marketRouter.post('/offers/:id/respond', validate(respondToOfferSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            seller: true,
            ownership: {
              include: {
                auctionItem: {
                  include: { team: true, pool: true },
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
      await prisma.offer.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
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
    await prisma.offer.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    // Reject all other pending offers
    await prisma.offer.updateMany({
      where: {
        listingId: offer.listingId,
        id: { not: id },
        status: 'PENDING',
      },
      data: { status: 'REJECTED' },
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Cancel offer
marketRouter.delete('/offers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({
      where: { id },
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

    await prisma.offer.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Offer cancelled' });
  } catch (error) {
    next(error);
  }
});

// Get transaction history
marketRouter.get('/transactions', async (req, res, next) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ buyerId: req.user!.id }, { sellerId: req.user!.id }],
      },
      include: {
        listing: {
          include: {
            ownership: {
              include: {
                auctionItem: {
                  include: {
                    team: true,
                    pool: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

