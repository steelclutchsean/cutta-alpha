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
      balance: user.balance,
      kycVerified: user.kycVerified,
      totalWinnings,
      ownedTeams: user._count.ownerships,
      activeListings: user._count.listings,
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
    const { displayName, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(displayName && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        balance: true,
        kycVerified: true,
      },
    });

    res.json(user);
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

