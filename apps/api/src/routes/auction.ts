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
      // Auction complete - mark as COMPLETED so it no longer shows as live
      await prisma.pool.update({
        where: { id: poolId },
        data: { status: 'COMPLETED' },
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

    // Allow reordering during DRAFT, OPEN, and LIVE (for studio control)
    if (pool.status !== 'DRAFT' && pool.status !== 'OPEN' && pool.status !== 'LIVE') {
      throw new AppError(400, 'Cannot reorder after auction has completed', 'AUCTION_COMPLETED');
    }

    // Update order for each item (only pending items)
    await prisma.$transaction(
      itemOrder.map(({ itemId, order }: { itemId: string; order: number }) =>
        prisma.auctionItem.update({
          where: { id: itemId, status: 'PENDING' },
          data: { order },
        })
      )
    );

    // Broadcast queue update
    const io: Server = req.app.get('io');
    const state = await getAuctionState(poolId);
    io.to(`pool:${poolId}`).emit('auctionStateUpdate', state);

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

// Get remaining teams for wheel display
auctionRouter.get('/:poolId/wheel-spin/teams', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    // Verify membership
    const membership = await prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId, userId: req.user!.id } },
    });

    if (!membership) {
      throw new AppError(403, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    // Get all pending auction items with team details
    const pendingItems = await prisma.auctionItem.findMany({
      where: { poolId, status: 'PENDING' },
      include: { team: true },
      orderBy: { order: 'asc' },
    });

    const teams = pendingItems.map(item => ({
      id: item.team.id,
      name: item.team.name,
      shortName: item.team.shortName,
      seed: item.team.seed,
      region: item.team.region,
    }));

    res.json({ teams });
  } catch (error) {
    next(error);
  }
});

// DEBUG: Get pool auction items status breakdown
auctionRouter.get('/:poolId/debug', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: {
        id: true,
        name: true,
        status: true,
        auctionMode: true,
        _count: {
          select: { auctionItems: true, members: true },
        },
      },
    });

    if (!pool) {
      return res.json({ error: 'Pool not found' });
    }

    // Get auction items grouped by status
    const auctionItems = await prisma.auctionItem.groupBy({
      by: ['status'],
      where: { poolId },
      _count: { status: true },
    });

    // Get all auction items for this pool
    const allItems = await prisma.auctionItem.findMany({
      where: { poolId },
      select: { id: true, status: true, teamId: true },
      take: 20,
    });

    res.json({
      pool: {
        id: pool.id,
        name: pool.name,
        status: pool.status,
        auctionMode: pool.auctionMode,
        totalAuctionItems: pool._count.auctionItems,
        totalMembers: pool._count.members,
      },
      auctionItemsByStatus: auctionItems,
      sampleItems: allItems,
    });
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

// ============================================
// COMMISSIONER STUDIO ROUTES
// ============================================

// Sell current item immediately (commissioner only)
auctionRouter.post('/:poolId/sell-now', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can sell items', 'NOT_COMMISSIONER');
    }

    // Get current active item
    const currentItem = await prisma.auctionItem.findFirst({
      where: { poolId, status: 'ACTIVE' },
    });

    if (!currentItem) {
      throw new AppError(400, 'No active auction item', 'NO_ACTIVE_ITEM');
    }

    if (!currentItem.currentBid || !currentItem.currentBidderId) {
      throw new AppError(400, 'No bids on this item', 'NO_BIDS');
    }

    // Mark as sold
    await prisma.auctionItem.update({
      where: { id: currentItem.id },
      data: {
        status: 'SOLD',
        winningBid: currentItem.currentBid,
        winnerId: currentItem.currentBidderId,
        auctionedAt: new Date(),
      },
    });

    // Update member spending
    await prisma.poolMember.update({
      where: { poolId_userId: { poolId, userId: currentItem.currentBidderId } },
      data: {
        totalSpent: { increment: currentItem.currentBid },
      },
    });

    // Create ownership record
    await prisma.ownership.create({
      data: {
        userId: currentItem.currentBidderId,
        auctionItemId: currentItem.id,
        percentage: 100,
        purchasePrice: Number(currentItem.currentBid),
        source: 'AUCTION',
      },
    });

    // Broadcast state update
    const io: Server = req.app.get('io');
    const state = await getAuctionState(poolId);
    io.to(`pool:${poolId}`).emit('auctionStateUpdate', state);
    io.to(`pool:${poolId}`).emit('itemSold', {
      itemId: currentItem.id,
      winningBid: Number(currentItem.currentBid),
      winnerId: currentItem.currentBidderId,
    });

    res.json({ message: 'Item sold', state });
  } catch (error) {
    next(error);
  }
});

// Start auction for a specific item (commissioner only)
auctionRouter.post('/:poolId/start-item/:itemId', async (req, res, next) => {
  try {
    const { poolId, itemId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can start auctions', 'NOT_COMMISSIONER');
    }

    // Check if there's already an active item
    const activeItem = await prisma.auctionItem.findFirst({
      where: { poolId, status: 'ACTIVE' },
    });

    if (activeItem) {
      throw new AppError(400, 'There is already an active auction. Finish or skip it first.', 'ACTIVE_AUCTION_EXISTS');
    }

    // Get the item to start
    const item = await prisma.auctionItem.findFirst({
      where: { id: itemId, poolId, status: 'PENDING' },
    });

    if (!item) {
      throw new AppError(404, 'Item not found or already auctioned', 'ITEM_NOT_FOUND');
    }

    // Activate the item
    await prisma.auctionItem.update({
      where: { id: itemId },
      data: { status: 'ACTIVE' },
    });

    // Update pool status if needed
    if (pool.status === 'OPEN') {
      await prisma.pool.update({
        where: { id: poolId },
        data: { status: 'LIVE' },
      });
    }

    // Broadcast state update
    const io: Server = req.app.get('io');
    const state = await getAuctionState(poolId);
    io.to(`pool:${poolId}`).emit('auctionStateUpdate', state);

    res.json({ message: 'Auction started', state });
  } catch (error) {
    next(error);
  }
});

// Revert a sold/unsold auction back to pending (commissioner only)
auctionRouter.post('/:poolId/revert/:itemId', async (req, res, next) => {
  try {
    const { poolId, itemId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can revert auctions', 'NOT_COMMISSIONER');
    }

    // Get the item to revert
    const item = await prisma.auctionItem.findFirst({
      where: { id: itemId, poolId, status: { in: ['SOLD', 'UNSOLD'] } },
    });

    if (!item) {
      throw new AppError(404, 'Item not found or not eligible for revert', 'ITEM_NOT_FOUND');
    }

    // If item was sold, refund the buyer
    if (item.status === 'SOLD' && item.winnerId && item.winningBid) {
      // Refund member spending
      await prisma.poolMember.update({
        where: { poolId_userId: { poolId, userId: item.winnerId } },
        data: {
          totalSpent: { decrement: item.winningBid },
          remainingBudget: pool.budgetEnabled ? { increment: item.winningBid } : undefined,
        },
      });

      // Delete ownership record
      await prisma.ownership.deleteMany({
        where: { auctionItemId: itemId },
      });

      // Update pool total pot
      await prisma.pool.update({
        where: { id: poolId },
        data: {
          totalPot: { decrement: item.winningBid },
        },
      });
    }

    // Reset item to pending
    await prisma.auctionItem.update({
      where: { id: itemId },
      data: {
        status: 'PENDING',
        currentBid: null,
        currentBidderId: null,
        winningBid: null,
        winnerId: null,
        auctionedAt: null,
      },
    });

    // Delete all bids for this item
    await prisma.bid.deleteMany({
      where: { auctionItemId: itemId },
    });

    // Broadcast state update
    const io: Server = req.app.get('io');
    const state = await getAuctionState(poolId);
    io.to(`pool:${poolId}`).emit('auctionStateUpdate', state);
    io.to(`pool:${poolId}`).emit('auctionReverted', { itemId });

    res.json({ message: 'Auction reverted', state });
  } catch (error) {
    next(error);
  }
});

// End entire auction (commissioner only)
auctionRouter.post('/:poolId/end', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can end the auction', 'NOT_COMMISSIONER');
    }

    // Mark any active items as unsold
    await prisma.auctionItem.updateMany({
      where: { poolId, status: 'ACTIVE' },
      data: { status: 'UNSOLD', auctionedAt: new Date() },
    });

    // Mark remaining pending items as unsold
    await prisma.auctionItem.updateMany({
      where: { poolId, status: 'PENDING' },
      data: { status: 'UNSOLD', auctionedAt: new Date() },
    });

    // Update pool status
    await prisma.pool.update({
      where: { id: poolId },
      data: { status: 'COMPLETED' },
    });

    // Broadcast completion
    const io: Server = req.app.get('io');
    io.to(`pool:${poolId}`).emit('auctionCompleted', {
      totalRaised: pool.totalPot,
    });

    res.json({ message: 'Auction ended' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CHAT MODERATION ROUTES
// ============================================

// Get muted users for a pool (commissioner only)
auctionRouter.get('/:poolId/chat/muted', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can view muted users', 'NOT_COMMISSIONER');
    }

    const mutedMembers = await prisma.poolMember.findMany({
      where: {
        poolId,
        isMuted: true,
      },
      include: {
        user: {
          select: { id: true, displayName: true },
        },
      },
    });

    const mutedUsers = mutedMembers.map(m => ({
      id: m.user.id,
      displayName: m.user.displayName,
      mutedUntil: m.mutedUntil,
    }));

    res.json(mutedUsers);
  } catch (error) {
    next(error);
  }
});

// Mute a user (commissioner only)
auctionRouter.post('/:poolId/chat/mute/:userId', async (req, res, next) => {
  try {
    const { poolId, userId } = req.params;
    const { duration } = req.body; // duration in minutes, undefined = permanent

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can mute users', 'NOT_COMMISSIONER');
    }

    // Can't mute yourself
    if (userId === req.user!.id) {
      throw new AppError(400, 'You cannot mute yourself', 'CANNOT_MUTE_SELF');
    }

    // Calculate mute expiry
    const mutedUntil = duration ? new Date(Date.now() + duration * 60 * 1000) : null;

    await prisma.poolMember.update({
      where: { poolId_userId: { poolId, userId } },
      data: {
        isMuted: true,
        mutedUntil,
      },
    });

    // Broadcast mute event
    const io: Server = req.app.get('io');
    io.to(`pool:${poolId}`).emit('userMuted', { userId, mutedUntil });

    res.json({ message: 'User muted' });
  } catch (error) {
    next(error);
  }
});

// Unmute a user (commissioner only)
auctionRouter.post('/:poolId/chat/unmute/:userId', async (req, res, next) => {
  try {
    const { poolId, userId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can unmute users', 'NOT_COMMISSIONER');
    }

    await prisma.poolMember.update({
      where: { poolId_userId: { poolId, userId } },
      data: {
        isMuted: false,
        mutedUntil: null,
      },
    });

    // Broadcast unmute event
    const io: Server = req.app.get('io');
    io.to(`pool:${poolId}`).emit('userUnmuted', { userId });

    res.json({ message: 'User unmuted' });
  } catch (error) {
    next(error);
  }
});

// Delete a chat message (commissioner only)
auctionRouter.delete('/:poolId/chat/message/:messageId', async (req, res, next) => {
  try {
    const { poolId, messageId } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id: poolId } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can delete messages', 'NOT_COMMISSIONER');
    }

    // Soft delete the message
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedBy: req.user!.id,
      },
    });

    // Broadcast delete event
    const io: Server = req.app.get('io');
    io.to(`pool:${poolId}`).emit('messageDeleted', { messageId });

    res.json({ message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
});

