import { Router } from 'express';
import { prisma } from '@cutta/db';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addPaymentMethodSchema, withdrawSchema } from '@cutta/shared';
import { AppError } from '../middleware/error.js';
import { stripe } from '../services/stripe.js';
import { config } from '../config/index.js';

export const usersRouter = Router();

// All routes require authentication
usersRouter.use(authenticate);

// Sync Clerk user with database
usersRouter.post('/sync', async (req, res, next) => {
  try {
    const { clerkId, email, displayName, avatarUrl } = req.body;
    
    if (!clerkId || !email) {
      throw new AppError(400, 'clerkId and email are required', 'VALIDATION_ERROR');
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { clerkId },
    });

    if (!user) {
      // Check if user exists by email (legacy user migration)
      user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // Link existing user to Clerk - only update avatar if user doesn't have a custom one set
        const shouldUpdateAvatar = user.avatarType === 'CLERK' || !user.avatarUrl;
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            clerkId, 
            ...(shouldUpdateAvatar && avatarUrl && { 
              avatarUrl,
              avatarType: 'CLERK',
            }),
          },
        });
      } else {
        // Create new user with Clerk avatar
        user = await prisma.user.create({
          data: {
            clerkId,
            email,
            displayName: displayName || email.split('@')[0],
            avatarUrl,
            avatarType: avatarUrl ? 'CLERK' : 'CUSTOM',
            passwordHash: null, // No password for Clerk users
          },
        });
      }
    } else {
      // Update existing user info - only update avatar if user uses Clerk avatar
      const shouldUpdateAvatar = user.avatarType === 'CLERK';
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: displayName || user.displayName,
          ...(shouldUpdateAvatar && avatarUrl && { avatarUrl }),
        },
      });
    }

    res.json({
      id: user.id,
      clerkId: user.clerkId,
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

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        clerkId: true,
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
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        ownerships: {
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
        poolMemberships: {
          include: {
            pool: {
              select: {
                id: true,
                name: true,
                status: true,
                auctionStartTime: true,
              },
            },
          },
        },
        _count: {
          select: {
            ownerships: true,
            listings: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

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
      ownedTeams: user._count.ownerships,
      activeListings: user._count.listings,
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

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(displayName && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(avatarType && { avatarType }),
        ...(presetAvatarId !== undefined && { presetAvatarId }),
        ...(phone !== undefined && { phone: phone || null }),
      },
      select: {
        id: true,
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
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: 'COMPLETED',
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
    });

    // Get payouts for the user
    const payouts = await prisma.payout.findMany({
      where: {
        userId,
        status: 'PROCESSED',
      },
      include: {
        pool: { select: { id: true, name: true } },
      },
    });

    // Calculate summary
    let totalSpent = 0;
    let totalEarned = 0;
    const totalWinnings = payouts.reduce((sum, p) => sum + Number(p.amount), 0);

    transactions.forEach((tx) => {
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
    transactions.forEach((tx) => {
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
    
    transactions.forEach((tx) => {
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
    payouts.forEach((payout) => {
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
    
    transactions.forEach((tx) => {
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

    payouts.forEach((payout) => {
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
        transactionCount: transactions.length,
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

    const where: any = {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      status: 'COMPLETED',
    };

    if (type) {
      where.type = type as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        listing: {
          include: {
            ownership: {
              include: {
                auctionItem: {
                  include: {
                    team: {
                      select: { id: true, name: true, shortName: true, logoUrl: true },
                    },
                    pool: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Filter by pool if specified (after query since it's nested)
    let filteredTransactions = transactions;
    if (poolId) {
      filteredTransactions = transactions.filter(
        (tx) => tx.listing?.ownership?.auctionItem?.pool?.id === poolId
      );
    }

    // Get total count for pagination
    const totalCount = await prisma.transaction.count({ where });

    res.json({
      transactions: filteredTransactions,
      pagination: {
        total: totalCount,
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
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(paymentMethods);
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
      let user = await prisma.user.findUnique({
        where: { id: req.user!.id },
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

        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId },
        });
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
        await prisma.paymentMethod.updateMany({
          where: { userId: req.user!.id },
          data: { isDefault: false },
        });

        // Set as default in Stripe
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      }

      // Check if this is the first payment method
      const existingCount = await prisma.paymentMethod.count({
        where: { userId: req.user!.id },
      });

      // Create payment method record
      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          userId: req.user!.id,
          stripePaymentMethodId: paymentMethodId,
          last4: pm.card.last4,
          brand: pm.card.brand,
          expiryMonth: pm.card.exp_month,
          expiryYear: pm.card.exp_year,
          isDefault: setAsDefault || existingCount === 0,
        },
      });

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

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!paymentMethod) {
      throw new AppError(404, 'Payment method not found', 'NOT_FOUND');
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

    // Delete from database
    await prisma.paymentMethod.delete({
      where: { id },
    });

    // If this was the default, make another one default
    if (paymentMethod.isDefault) {
      const nextDefault = await prisma.paymentMethod.findFirst({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
      });

      if (nextDefault) {
        await prisma.paymentMethod.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
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
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { balance: true },
    });

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ buyerId: req.user!.id }, { sellerId: req.user!.id }],
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      balance: user?.balance || 0,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

// Get user's ownerships (for secondary market)
usersRouter.get('/ownerships', async (req, res, next) => {
  try {
    const { poolId } = req.query;

    const where: Record<string, unknown> = {
      userId: req.user!.id,
    };

    if (poolId) {
      where.auctionItem = { poolId: poolId as string };
    }

    const ownerships = await prisma.ownership.findMany({
      where,
      include: {
        auctionItem: {
          include: {
            team: true,
            pool: {
              select: { id: true, name: true, status: true },
            },
          },
        },
        listings: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            percentageForSale: true,
            askingPrice: true,
            status: true,
          },
        },
      },
      orderBy: { acquiredAt: 'desc' },
    });

    // Calculate available percentage for each ownership
    const ownershipsWithAvailable = ownerships.map((ownership) => {
      const listedPercentage = ownership.listings.reduce(
        (sum, listing) => sum + Number(listing.percentageForSale),
        0
      );
      return {
        ...ownership,
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
    const deletedPools = await prisma.deletedPool.findMany({
      where: { commissionerId: req.user!.id },
      orderBy: { deletedAt: 'desc' },
    });

    res.json(deletedPools);
  } catch (error) {
    next(error);
  }
});

// Request withdrawal
usersRouter.post('/withdraw', validate(withdrawSchema), async (req, res, next) => {
  try {
    const { amount } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
    const transaction = await prisma.transaction.create({
      data: {
        type: 'WITHDRAWAL',
        sellerId: user.id,
        amount,
        platformFee: 0,
        netAmount: amount,
        status: 'PENDING',
      },
    });

    // Deduct from balance
    await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { decrement: amount },
      },
    });

    // In production, this would trigger a Stripe Connect payout
    // For now, we'll mark it as completed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETED' },
    });

    res.json({
      message: 'Withdrawal request submitted',
      transaction,
    });
  } catch (error) {
    next(error);
  }
});

