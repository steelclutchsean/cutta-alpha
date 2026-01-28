import { Router } from 'express';
import { db, eq, and, or, desc, count, users, paymentMethods, ownerships, poolMembers, transactions, payouts, deletedPools, listings, auctionItems, teams, pools } from '@cutta/db';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addPaymentMethodSchema, withdrawSchema } from '@cutta/shared';
import { AppError } from '../middleware/error.js';
import { stripe } from '../services/stripe.js';
import { config } from '../config/index.js';

export const usersRouter = Router();

// All routes require authentication
usersRouter.use(authenticate);

// Sync Google user with database (called after OAuth)
usersRouter.post('/sync', async (req, res, next) => {
  try {
    const { googleId, email, displayName, avatarUrl } = req.body;
    
    if (!email) {
      throw new AppError(400, 'email is required', 'VALIDATION_ERROR');
    }

    // Find user by googleId if provided
    let user = googleId ? await db.query.users.findFirst({
      where: eq(users.googleId, googleId),
    }) : null;

    if (!user) {
      // Check if user exists by email
      user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (user) {
        // Link existing user to Google - only update avatar if user doesn't have a custom one set
        const shouldUpdateAvatar = user.avatarType === 'GOOGLE' || !user.avatarUrl;
        const [updated] = await db.update(users)
          .set({ 
            ...(googleId && { googleId }),
            ...(shouldUpdateAvatar && avatarUrl && { 
              avatarUrl,
              avatarType: 'GOOGLE' as const,
            }),
          })
          .where(eq(users.id, user.id))
          .returning();
        user = updated;
      } else {
        // Create new user
        const [created] = await db.insert(users)
          .values({
            googleId: googleId || null,
            email,
            displayName: displayName || email.split('@')[0],
            avatarUrl,
            avatarType: avatarUrl ? 'GOOGLE' : 'CUSTOM',
            passwordHash: null,
          })
          .returning();
        user = created;
      }
    } else {
      // Update existing user info - only update avatar if user uses Google avatar
      const shouldUpdateAvatar = user.avatarType === 'GOOGLE';
      const [updated] = await db.update(users)
        .set({
          displayName: displayName || user.displayName,
          ...(shouldUpdateAvatar && avatarUrl && { avatarUrl }),
        })
        .where(eq(users.id, user.id))
        .returning();
      user = updated;
    }

    res.json({
      id: user.id,
      googleId: user.googleId,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarType: user.avatarType,
      presetAvatarId: user.presetAvatarId,
      phone: user.phone,
      balance: user.balance,
      kycVerified: user.kycVerified,
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
usersRouter.get('/me', async (req, res, next) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, 'Not authenticated', 'UNAUTHORIZED');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
      columns: {
        id: true,
        googleId: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        avatarType: true,
        presetAvatarId: true,
        phone: true,
        balance: true,
        kycVerified: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Preset avatars configuration
const PRESET_AVATARS = [
  { id: 'avatar-01', name: 'Basketball', category: 'sports', url: '/avatars/avatar-01.svg' },
  { id: 'avatar-02', name: 'Football', category: 'sports', url: '/avatars/avatar-02.svg' },
  { id: 'avatar-03', name: 'Trophy Gold', category: 'sports', url: '/avatars/avatar-03.svg' },
  { id: 'avatar-04', name: 'Champion', category: 'sports', url: '/avatars/avatar-04.svg' },
  { id: 'avatar-05', name: 'Stadium', category: 'sports', url: '/avatars/avatar-05.svg' },
  { id: 'avatar-06', name: 'Whistle', category: 'sports', url: '/avatars/avatar-06.svg' },
  { id: 'avatar-07', name: 'Neon Wave', category: 'abstract', url: '/avatars/avatar-07.svg' },
  { id: 'avatar-08', name: 'Cosmic', category: 'abstract', url: '/avatars/avatar-08.svg' },
  { id: 'avatar-09', name: 'Gradient Sphere', category: 'abstract', url: '/avatars/avatar-09.svg' },
  { id: 'avatar-10', name: 'Digital Grid', category: 'abstract', url: '/avatars/avatar-10.svg' },
  { id: 'avatar-11', name: 'Aurora', category: 'abstract', url: '/avatars/avatar-11.svg' },
  { id: 'avatar-12', name: 'Crystal', category: 'abstract', url: '/avatars/avatar-12.svg' },
  { id: 'avatar-13', name: 'Wolf', category: 'animals', url: '/avatars/avatar-13.svg' },
  { id: 'avatar-14', name: 'Eagle', category: 'animals', url: '/avatars/avatar-14.svg' },
  { id: 'avatar-15', name: 'Lion', category: 'animals', url: '/avatars/avatar-15.svg' },
  { id: 'avatar-16', name: 'Bear', category: 'animals', url: '/avatars/avatar-16.svg' },
  { id: 'avatar-17', name: 'Hawk', category: 'animals', url: '/avatars/avatar-17.svg' },
  { id: 'avatar-18', name: 'Tiger', category: 'animals', url: '/avatars/avatar-18.svg' },
  { id: 'avatar-19', name: 'Ninja', category: 'characters', url: '/avatars/avatar-19.svg' },
  { id: 'avatar-20', name: 'Warrior', category: 'characters', url: '/avatars/avatar-20.svg' },
  { id: 'avatar-21', name: 'Samurai', category: 'characters', url: '/avatars/avatar-21.svg' },
  { id: 'avatar-22', name: 'Knight', category: 'characters', url: '/avatars/avatar-22.svg' },
  { id: 'avatar-23', name: 'Astronaut', category: 'characters', url: '/avatars/avatar-23.svg' },
  { id: 'avatar-24', name: 'Robot', category: 'characters', url: '/avatars/avatar-24.svg' },
];

// Get preset avatars list
usersRouter.get('/avatars/presets', async (req, res) => {
  res.json(PRESET_AVATARS);
});

// Get user profile
usersRouter.get('/profile', async (req, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
      with: {
        ownerships: {
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
        poolMemberships: {
          with: {
            pool: {
              columns: {
                id: true,
                name: true,
                status: true,
                auctionStartTime: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Get counts
    const [ownershipCount] = await db.select({ count: count() }).from(ownerships).where(eq(ownerships.userId, req.user!.id));
    const [listingCount] = await db.select({ count: count() }).from(listings).where(eq(listings.sellerId, req.user!.id));

    // Calculate total winnings
    const totalWinnings = user.poolMemberships.reduce(
      (sum, pm) => sum + Number(pm.totalWinnings),
      0
    );

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarType: user.avatarType,
      presetAvatarId: user.presetAvatarId,
      phone: user.phone,
      balance: user.balance,
      kycVerified: user.kycVerified,
      createdAt: user.createdAt,
      totalWinnings,
      ownedTeams: ownershipCount?.count || 0,
      activeListings: listingCount?.count || 0,
      poolsJoined: user.poolMemberships.length,
      pools: user.poolMemberships.map((pm) => pm.pool),
      ownerships: user.ownerships,
    });
  } catch (error) {
    next(error);
  }
});

// Update profile
usersRouter.patch('/profile', async (req, res, next) => {
  try {
    const { displayName, avatarUrl, avatarType, presetAvatarId, phone } = req.body;

    // Validate phone number format if provided
    if (phone !== undefined && phone !== null && phone !== '') {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
        throw new AppError(400, 'Invalid phone number format', 'INVALID_PHONE');
      }
    }

    const [user] = await db.update(users)
      .set({
        ...(displayName && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(avatarType && { avatarType }),
        ...(presetAvatarId !== undefined && { presetAvatarId }),
        ...(phone !== undefined && { phone: phone || null }),
      })
      .where(eq(users.id, req.user!.id))
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        avatarType: users.avatarType,
        presetAvatarId: users.presetAvatarId,
        phone: users.phone,
        balance: users.balance,
        kycVerified: users.kycVerified,
      });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Get transaction analytics
usersRouter.get('/transactions/analytics', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Get all transactions for the user
    const userTransactions = await db.query.transactions.findMany({
      where: and(
        or(eq(transactions.buyerId, userId), eq(transactions.sellerId, userId)),
        eq(transactions.status, 'COMPLETED')
      ),
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
    });

    // Get payouts for the user
    const userPayouts = await db.query.payouts.findMany({
      where: and(
        eq(payouts.userId, userId),
        eq(payouts.status, 'PROCESSED')
      ),
      with: {
        pool: { columns: { id: true, name: true } },
      },
    });

    // Calculate summary
    let totalSpent = 0;
    let totalEarned = 0;
    const totalWinnings = userPayouts.reduce((sum, p) => sum + Number(p.amount), 0);

    userTransactions.forEach((tx) => {
      const amount = Number(tx.amount);
      if (tx.buyerId === userId) {
        totalSpent += amount;
      }
      if (tx.sellerId === userId) {
        totalEarned += Number(tx.netAmount);
      }
    });

    // Calculate by type
    const byTypeMap = new Map<string, { count: number; total: number }>();
    userTransactions.forEach((tx) => {
      const existing = byTypeMap.get(tx.type) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(tx.amount);
      byTypeMap.set(tx.type, existing);
    });
    const byType = Array.from(byTypeMap.entries()).map(([type, data]) => ({
      type,
      ...data,
    }));

    // Calculate by pool
    const byPoolMap = new Map<string, { poolId: string; poolName: string; spent: number; earned: number; winnings: number }>();
    
    userTransactions.forEach((tx) => {
      const pool = tx.listing?.ownership?.auctionItem?.pool;
      if (pool) {
        const existing = byPoolMap.get(pool.id) || {
          poolId: pool.id,
          poolName: pool.name,
          spent: 0,
          earned: 0,
          winnings: 0,
        };
        if (tx.buyerId === userId) {
          existing.spent += Number(tx.amount);
        }
        if (tx.sellerId === userId) {
          existing.earned += Number(tx.netAmount);
        }
        byPoolMap.set(pool.id, existing);
      }
    });

    // Add payouts to pool data
    userPayouts.forEach((payout) => {
      const existing = byPoolMap.get(payout.poolId) || {
        poolId: payout.poolId,
        poolName: payout.pool.name,
        spent: 0,
        earned: 0,
        winnings: 0,
      };
      existing.winnings += Number(payout.amount);
      byPoolMap.set(payout.poolId, existing);
    });

    const byPool = Array.from(byPoolMap.values());

    // Calculate monthly trends
    const monthlyMap = new Map<string, { spent: number; earned: number; winnings: number }>();
    
    userTransactions.forEach((tx) => {
      const month = tx.createdAt.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyMap.get(month) || { spent: 0, earned: 0, winnings: 0 };
      if (tx.buyerId === userId) {
        existing.spent += Number(tx.amount);
      }
      if (tx.sellerId === userId) {
        existing.earned += Number(tx.netAmount);
      }
      monthlyMap.set(month, existing);
    });

    userPayouts.forEach((payout) => {
      const month = payout.createdAt.toISOString().slice(0, 7);
      const existing = monthlyMap.get(month) || { spent: 0, earned: 0, winnings: 0 };
      existing.winnings += Number(payout.amount);
      monthlyMap.set(month, existing);
    });

    const monthlyTrends = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      summary: {
        totalSpent,
        totalEarned,
        totalWinnings,
        netPnL: totalEarned + totalWinnings - totalSpent,
        transactionCount: userTransactions.length,
      },
      byType,
      byPool,
      monthlyTrends,
    });
  } catch (error) {
    next(error);
  }
});

// Get detailed transactions list with filtering
usersRouter.get('/transactions', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { type, poolId, startDate, endDate, limit = '50', offset = '0' } = req.query;

    // Build conditions
    const conditions = [
      or(eq(transactions.buyerId, userId), eq(transactions.sellerId, userId)),
      eq(transactions.status, 'COMPLETED'),
    ];

    if (type) {
      conditions.push(eq(transactions.type, type as typeof transactions.type.enumValues[number]));
    }

    // Note: Date filtering in Drizzle requires SQL functions
    // For simplicity, we filter in application code
    const userTransactions = await db.query.transactions.findMany({
      where: and(...conditions),
      with: {
        listing: {
          with: {
            ownership: {
              with: {
                auctionItem: {
                  with: {
                    team: {
                      columns: { id: true, name: true, shortName: true, logoUrl: true },
                    },
                    pool: { columns: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: desc(transactions.createdAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    // Filter by date if specified
    let filteredTransactions = userTransactions;
    if (startDate) {
      const start = new Date(startDate as string);
      filteredTransactions = filteredTransactions.filter(tx => tx.createdAt >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      filteredTransactions = filteredTransactions.filter(tx => tx.createdAt <= end);
    }

    // Filter by pool if specified
    if (poolId) {
      filteredTransactions = filteredTransactions.filter(
        (tx) => tx.listing?.ownership?.auctionItem?.pool?.id === poolId
      );
    }

    // Get total count for pagination
    const [totalResult] = await db.select({ count: count() })
      .from(transactions)
      .where(and(...conditions));

    res.json({
      transactions: filteredTransactions,
      pagination: {
        total: totalResult?.count || 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get payment methods
usersRouter.get('/payment-methods', async (req, res, next) => {
  try {
    const userPaymentMethods = await db.query.paymentMethods.findMany({
      where: eq(paymentMethods.userId, req.user!.id),
      orderBy: desc(paymentMethods.createdAt),
    });

    res.json(userPaymentMethods);
  } catch (error) {
    next(error);
  }
});

// Add payment method (from Stripe)
usersRouter.post(
  '/payment-methods',
  validate(addPaymentMethodSchema),
  async (req, res, next) => {
    try {
      const { paymentMethodId, setAsDefault } = req.body;

      // Get user's Stripe customer ID or create one
      let user = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id),
      });

      if (!user) {
        throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
      }

      let stripeCustomerId = user.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.displayName,
          metadata: { userId: user.id },
        });
        stripeCustomerId = customer.id;

        await db.update(users)
          .set({ stripeCustomerId })
          .where(eq(users.id, user.id));
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });

      // Get payment method details
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

      if (!pm.card) {
        throw new AppError(400, 'Invalid payment method', 'INVALID_PAYMENT_METHOD');
      }

      // If setting as default, update all existing to non-default
      if (setAsDefault) {
        await db.update(paymentMethods)
          .set({ isDefault: false })
          .where(eq(paymentMethods.userId, req.user!.id));

        // Set as default in Stripe
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      }

      // Check if this is the first payment method
      const [existingCountResult] = await db.select({ count: count() })
        .from(paymentMethods)
        .where(eq(paymentMethods.userId, req.user!.id));

      // Create payment method record
      const [paymentMethod] = await db.insert(paymentMethods)
        .values({
          userId: req.user!.id,
          stripePaymentMethodId: paymentMethodId,
          last4: pm.card.last4,
          brand: pm.card.brand,
          expiryMonth: pm.card.exp_month,
          expiryYear: pm.card.exp_year,
          isDefault: setAsDefault || (existingCountResult?.count || 0) === 0,
        })
        .returning();

      res.status(201).json(paymentMethod);
    } catch (error) {
      next(error);
    }
  }
);

// Delete payment method
usersRouter.delete('/payment-methods/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const paymentMethod = await db.query.paymentMethods.findFirst({
      where: and(eq(paymentMethods.id, id), eq(paymentMethods.userId, req.user!.id)),
    });

    if (!paymentMethod) {
      throw new AppError(404, 'Payment method not found', 'NOT_FOUND');
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

    // Delete from database
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));

    // If this was the default, make another one default
    if (paymentMethod.isDefault) {
      const nextDefault = await db.query.paymentMethods.findFirst({
        where: eq(paymentMethods.userId, req.user!.id),
        orderBy: desc(paymentMethods.createdAt),
      });

      if (nextDefault) {
        await db.update(paymentMethods)
          .set({ isDefault: true })
          .where(eq(paymentMethods.id, nextDefault.id));
      }
    }

    res.json({ message: 'Payment method deleted' });
  } catch (error) {
    next(error);
  }
});

// Get balance and transactions
usersRouter.get('/balance', async (req, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
      columns: { balance: true },
    });

    const userTransactions = await db.query.transactions.findMany({
      where: and(
        or(eq(transactions.buyerId, req.user!.id), eq(transactions.sellerId, req.user!.id)),
        eq(transactions.status, 'COMPLETED')
      ),
      orderBy: desc(transactions.createdAt),
      limit: 50,
    });

    res.json({
      balance: user?.balance || 0,
      transactions: userTransactions,
    });
  } catch (error) {
    next(error);
  }
});

// Get user's ownerships (for secondary market)
usersRouter.get('/ownerships', async (req, res, next) => {
  try {
    const { poolId } = req.query;

    const userOwnerships = await db.query.ownerships.findMany({
      where: eq(ownerships.userId, req.user!.id),
      with: {
        auctionItem: {
          with: {
            team: true,
            pool: {
              columns: { id: true, name: true, status: true },
            },
          },
        },
        listings: {
          columns: {
            id: true,
            percentageForSale: true,
            askingPrice: true,
            status: true,
          },
        },
      },
      orderBy: desc(ownerships.acquiredAt),
    });

    // Filter by pool if specified
    let filteredOwnerships = userOwnerships;
    if (poolId) {
      filteredOwnerships = userOwnerships.filter(
        (o) => o.auctionItem?.pool?.id === poolId
      );
    }

    // Filter to active listings and calculate available percentage
    const ownershipsWithAvailable = filteredOwnerships.map((ownership) => {
      const activeListings = ownership.listings.filter(l => l.status === 'ACTIVE');
      const listedPercentage = activeListings.reduce(
        (sum, listing) => sum + Number(listing.percentageForSale),
        0
      );
      return {
        ...ownership,
        listings: activeListings,
        availablePercentage: Number(ownership.percentage) - listedPercentage,
        listedPercentage,
      };
    });

    res.json(ownershipsWithAvailable);
  } catch (error) {
    next(error);
  }
});

// Get deleted pools history (private, commissioner only)
usersRouter.get('/deleted-pools', async (req, res, next) => {
  try {
    const userDeletedPools = await db.query.deletedPools.findMany({
      where: eq(deletedPools.commissionerId, req.user!.id),
      orderBy: desc(deletedPools.deletedAt),
    });

    res.json(userDeletedPools);
  } catch (error) {
    next(error);
  }
});

// Request withdrawal
usersRouter.post('/withdraw', validate(withdrawSchema), async (req, res, next) => {
  try {
    const { amount } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    if (Number(user.balance) < amount) {
      throw new AppError(400, 'Insufficient balance', 'INSUFFICIENT_BALANCE');
    }

    if (amount < config.platform.minWithdrawal) {
      throw new AppError(
        400,
        `Minimum withdrawal is $${config.platform.minWithdrawal}`,
        'MIN_WITHDRAWAL'
      );
    }

    // Create withdrawal transaction (would integrate with Stripe Connect payouts)
    const [transaction] = await db.insert(transactions)
      .values({
        type: 'WITHDRAWAL',
        sellerId: user.id,
        amount: String(amount),
        platformFee: '0',
        netAmount: String(amount),
        status: 'PENDING',
      })
      .returning();

    // Deduct from balance
    await db.update(users)
      .set({
        balance: String(Number(user.balance) - amount),
      })
      .where(eq(users.id, user.id));

    // In production, this would trigger a Stripe Connect payout
    // For now, we'll mark it as completed
    await db.update(transactions)
      .set({ status: 'COMPLETED' })
      .where(eq(transactions.id, transaction.id));

    res.json({
      message: 'Withdrawal request submitted',
      transaction,
    });
  } catch (error) {
    next(error);
  }
});
