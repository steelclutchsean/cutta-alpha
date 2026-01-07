import { Router } from 'express';
import { prisma } from '@cutta/db';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { placeBidSchema } from '@cutta/shared';
import { AppError } from '../middleware/error.js';
import {
  getAuctionState,
  processAuctionBid,
  initializeWheelSpinAuction,
  executeWheelSpin,
  completeWheelSpin,
  getWheelSpinState,
  getMatchupBrief,
} from '../services/auction.js';
import { Server } from 'socket.io';

export const auctionRouter = Router();

// All routes require authentication
auctionRouter.use(authenticate);

// Get current auction state for a pool
auctionRouter.get('/:poolId/state', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    // Verify membership
    const membership = await prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId, userId: req.user!.id } },
    });

    if (!membership) {
      throw new AppError(403, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    const state = await getAuctionState(poolId);
    res.json(state);
  } catch (error) {
    next(error);
  }
});

// Place a bid
auctionRouter.post('/bid', validate(placeBidSchema), async (req, res, next) => {
  try {
    const { auctionItemId, amount } = req.body;

    // Get auction item and pool
    const auctionItem = await prisma.auctionItem.findUnique({
      where: { id: auctionItemId },
      include: { pool: true },
    });

    if (!auctionItem) {
      throw new AppError(404, 'Auction item not found', 'NOT_FOUND');
    }

    // Verify membership
    const membership = await prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId: auctionItem.poolId, userId: req.user!.id } },
    });

    if (!membership) {
      throw new AppError(403, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    // Verify user has payment method
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { userId: req.user!.id, isDefault: true },
    });

    if (!paymentMethod) {
      throw new AppError(400, 'You must add a payment method before bidding', 'NO_PAYMENT_METHOD');
    }

    // Process bid
    const io: Server = req.app.get('io');
    const result = await processAuctionBid(
      auctionItem.poolId,
      auctionItemId,
      req.user!.id,
      amount,
      io
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Start auction (commissioner only)
auctionRouter.post('/:poolId/start', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can start the auction', 'NOT_COMMISSIONER');
    }

    if (pool.status !== 'OPEN') {
      throw new AppError(400, 'Pool must be open to start auction', 'INVALID_STATUS');
    }

    // Get first item
    const firstItem = await prisma.auctionItem.findFirst({
      where: { poolId, status: 'PENDING' },
      orderBy: { order: 'asc' },
    });

    if (!firstItem) {
      throw new AppError(400, 'No items to auction', 'NO_ITEMS');
    }

    // Update pool status and activate first item
    await prisma.$transaction([
      prisma.pool.update({
        where: { id: poolId },
        data: { status: 'LIVE' },
      }),
      prisma.auctionItem.update({
        where: { id: firstItem.id },
        data: { status: 'ACTIVE' },
      }),
    ]);

    // Broadcast auction start
    const io: Server = req.app.get('io');
    const state = await getAuctionState(poolId);
    io.to(`pool:${poolId}`).emit('auctionStateUpdate', state);

    res.json({ message: 'Auction started', state });
  } catch (error) {
    next(error);
  }
});

// Pause auction (commissioner only)
auctionRouter.post('/:poolId/pause', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can pause the auction', 'NOT_COMMISSIONER');
    }

    // Broadcast pause
    const io: Server = req.app.get('io');
    io.to(`pool:${poolId}`).emit('auctionPaused');

    res.json({ message: 'Auction paused' });
  } catch (error) {
    next(error);
  }
});

// Resume auction (commissioner only)
auctionRouter.post('/:poolId/resume', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can resume the auction', 'NOT_COMMISSIONER');
    }

    // Broadcast resume
    const io: Server = req.app.get('io');
    io.to(`pool:${poolId}`).emit('auctionResumed');

    res.json({ message: 'Auction resumed' });
  } catch (error) {
    next(error);
  }
});

// Move to next item (commissioner only)
auctionRouter.post('/:poolId/next', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can advance the auction', 'NOT_COMMISSIONER');
    }

    // Get current active item
    const currentItem = await prisma.auctionItem.findFirst({
      where: { poolId, status: 'ACTIVE' },
    });

    if (currentItem) {
      // Mark as unsold if no bids
      await prisma.auctionItem.update({
        where: { id: currentItem.id },
        data: {
          status: currentItem.winnerId ? 'SOLD' : 'UNSOLD',
          auctionedAt: new Date(),
        },
      });
    }

    // Get next pending item
    const nextItem = await prisma.auctionItem.findFirst({
      where: { poolId, status: 'PENDING' },
      orderBy: { order: 'asc' },
    });

    if (nextItem) {
      await prisma.auctionItem.update({
        where: { id: nextItem.id },
        data: { status: 'ACTIVE' },
      });
    } else {
      // Auction complete
      await prisma.pool.update({
        where: { id: poolId },
        data: { status: 'IN_PROGRESS' },
      });

      const io: Server = req.app.get('io');
      const pool = await prisma.pool.findUnique({ where: { id: poolId } });
      io.to(`pool:${poolId}`).emit('auctionCompleted', {
        totalRaised: pool?.totalPot,
      });
    }

    // Broadcast state update
    const io: Server = req.app.get('io');
    const state = await getAuctionState(poolId);
    io.to(`pool:${poolId}`).emit('auctionStateUpdate', state);

    res.json({ message: 'Moved to next item', state });
  } catch (error) {
    next(error);
  }
});

// Reorder auction items (commissioner only)
auctionRouter.put('/:poolId/order', async (req, res, next) => {
  try {
    const { poolId } = req.params;
    const { itemOrder } = req.body; // Array of { itemId, order }

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can reorder items', 'NOT_COMMISSIONER');
    }

    if (pool.status !== 'DRAFT' && pool.status !== 'OPEN') {
      throw new AppError(400, 'Cannot reorder after auction has started', 'AUCTION_STARTED');
    }

    // Update order for each item
    await prisma.$transaction(
      itemOrder.map(({ itemId, order }: { itemId: string; order: number }) =>
        prisma.auctionItem.update({
          where: { id: itemId },
          data: { order },
        })
      )
    );

    res.json({ message: 'Order updated' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// WHEEL SPIN AUCTION ROUTES
// ============================================

// Initialize wheel spin auction (commissioner only)
auctionRouter.post('/:poolId/wheel-spin/init', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can initialize wheel spin', 'NOT_COMMISSIONER');
    }

    if (pool.auctionMode !== 'WHEEL_SPIN') {
      throw new AppError(400, 'Pool is not configured for wheel spin auction', 'INVALID_AUCTION_MODE');
    }

    if (pool.status !== 'OPEN') {
      throw new AppError(400, 'Pool must be open to initialize wheel spin', 'INVALID_STATUS');
    }

    const io: Server = req.app.get('io');
    await initializeWheelSpinAuction(poolId, io);

    // Update pool status to LIVE
    await prisma.pool.update({
      where: { id: poolId },
      data: { status: 'LIVE' },
    });

    res.json({ message: 'Wheel spin auction initialized' });
  } catch (error) {
    next(error);
  }
});

// Execute wheel spin (commissioner only)
auctionRouter.post('/:poolId/wheel-spin/spin', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can spin the wheel', 'NOT_COMMISSIONER');
    }

    const io: Server = req.app.get('io');
    const result = await executeWheelSpin(poolId, io);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Complete wheel spin and start bidding (commissioner only)
auctionRouter.post('/:poolId/wheel-spin/complete', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can complete the spin', 'NOT_COMMISSIONER');
    }

    const io: Server = req.app.get('io');
    await completeWheelSpin(poolId, io);

    res.json({ message: 'Spin complete, bidding started' });
  } catch (error) {
    next(error);
  }
});

// Get wheel spin state
auctionRouter.get('/:poolId/wheel-spin/state', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    // Verify membership
    const membership = await prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId, userId: req.user!.id } },
    });

    if (!membership) {
      throw new AppError(403, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    const state = getWheelSpinState(poolId);
    res.json(state);
  } catch (error) {
    next(error);
  }
});

// Get matchup brief for current item
auctionRouter.get('/:poolId/matchup-brief', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    // Verify membership
    const membership = await prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId, userId: req.user!.id } },
    });

    if (!membership) {
      throw new AppError(403, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    const brief = await getMatchupBrief(poolId);
    res.json({ matchupBrief: brief });
  } catch (error) {
    next(error);
  }
});

