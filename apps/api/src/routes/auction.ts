import { Router } from 'express';
import { db, eq, and, inArray, asc, desc, pools, poolMembers, auctionItems, bids, ownerships, chatMessages, users, paymentMethods, sql } from '@cutta/db';
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
    const membership = await db.query.poolMembers.findFirst({
      where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, req.user!.id)),
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
    const auctionItem = await db.query.auctionItems.findFirst({
      where: eq(auctionItems.id, auctionItemId),
      with: { pool: true },
    });

    if (!auctionItem) {
      throw new AppError(404, 'Auction item not found', 'NOT_FOUND');
    }

    // Verify membership
    const membership = await db.query.poolMembers.findFirst({
      where: and(eq(poolMembers.poolId, auctionItem.poolId), eq(poolMembers.userId, req.user!.id)),
    });

    if (!membership) {
      throw new AppError(403, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    // Verify user has payment method
    const paymentMethod = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.userId, req.user!.id),
        eq(paymentMethods.isDefault, true)
      ),
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

    const pool = await db.query.pools.findFirst({
      where: eq(pools.id, poolId),
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
    const firstItem = await db.query.auctionItems.findFirst({
      where: and(eq(auctionItems.poolId, poolId), eq(auctionItems.status, 'PENDING')),
      orderBy: asc(auctionItems.order),
    });

    if (!firstItem) {
      throw new AppError(400, 'No items to auction', 'NO_ITEMS');
    }

    // Update pool status and activate first item
    await db.transaction(async (tx) => {
      await tx.update(pools)
        .set({ status: 'LIVE' })
        .where(eq(pools.id, poolId));
      await tx.update(auctionItems)
        .set({ status: 'ACTIVE' })
        .where(eq(auctionItems.id, firstItem.id));
    });

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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can advance the auction', 'NOT_COMMISSIONER');
    }

    // Get current active item
    const currentItem = await db.query.auctionItems.findFirst({
      where: and(eq(auctionItems.poolId, poolId), eq(auctionItems.status, 'ACTIVE')),
    });

    if (currentItem) {
      // Mark as unsold if no bids
      await db.update(auctionItems)
        .set({
          status: currentItem.winnerId ? 'SOLD' : 'UNSOLD',
          auctionedAt: new Date(),
        })
        .where(eq(auctionItems.id, currentItem.id));
    }

    // Get next pending item
    const nextItem = await db.query.auctionItems.findFirst({
      where: and(eq(auctionItems.poolId, poolId), eq(auctionItems.status, 'PENDING')),
      orderBy: asc(auctionItems.order),
    });

    if (nextItem) {
      await db.update(auctionItems)
        .set({ status: 'ACTIVE' })
        .where(eq(auctionItems.id, nextItem.id));
    } else {
      // Auction complete - mark as COMPLETED so it no longer shows as live
      await db.update(pools)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(eq(pools.id, poolId));

      const io: Server = req.app.get('io');
      const updatedPool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });
      io.to(`pool:${poolId}`).emit('auctionCompleted', {
        totalRaised: updatedPool?.totalPot,
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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

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
    await db.transaction(async (tx) => {
      for (const { itemId, order } of itemOrder as { itemId: string; order: number }[]) {
        await tx.update(auctionItems)
          .set({ order })
          .where(and(eq(auctionItems.id, itemId), eq(auctionItems.status, 'PENDING')));
      }
    });

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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

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
    await db.update(pools)
      .set({ status: 'LIVE', updatedAt: new Date() })
      .where(eq(pools.id, poolId));

    res.json({ message: 'Wheel spin auction initialized' });
  } catch (error) {
    next(error);
  }
});

// Execute wheel spin (commissioner only)
auctionRouter.post('/:poolId/wheel-spin/spin', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

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
    const membership = await db.query.poolMembers.findFirst({
      where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, req.user!.id)),
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
    const membership = await db.query.poolMembers.findFirst({
      where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, req.user!.id)),
    });

    if (!membership) {
      throw new AppError(403, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    // Get all pending auction items with team details
    const pendingItems = await db.query.auctionItems.findMany({
      where: and(eq(auctionItems.poolId, poolId), eq(auctionItems.status, 'PENDING')),
      with: { team: true },
      orderBy: asc(auctionItems.order),
    });

    const teamsList = pendingItems.map(item => ({
      id: item.team.id,
      name: item.team.name,
      shortName: item.team.shortName,
      seed: item.team.seed,
      region: item.team.region,
    }));

    res.json({ teams: teamsList });
  } catch (error) {
    next(error);
  }
});

// DEBUG: Get pool auction items status breakdown
auctionRouter.get('/:poolId/debug', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await db.query.pools.findFirst({
      where: eq(pools.id, poolId),
      columns: {
        id: true,
        name: true,
        status: true,
        auctionMode: true,
      },
    });

    if (!pool) {
      return res.json({ error: 'Pool not found' });
    }

    // Get auction items grouped by status
    const statusCounts = await db.select({
      status: auctionItems.status,
      count: sql<number>`count(*)::int`,
    })
      .from(auctionItems)
      .where(eq(auctionItems.poolId, poolId))
      .groupBy(auctionItems.status);

    // Get member count
    const [memberCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(poolMembers)
      .where(eq(poolMembers.poolId, poolId));

    // Get all auction items for this pool
    const allItems = await db.query.auctionItems.findMany({
      where: eq(auctionItems.poolId, poolId),
      columns: { id: true, status: true, teamId: true },
      limit: 20,
    });

    res.json({
      pool: {
        id: pool.id,
        name: pool.name,
        status: pool.status,
        auctionMode: pool.auctionMode,
        totalAuctionItems: statusCounts.reduce((sum, s) => sum + s.count, 0),
        totalMembers: memberCount?.count || 0,
      },
      auctionItemsByStatus: statusCounts,
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
    const membership = await db.query.poolMembers.findFirst({
      where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, req.user!.id)),
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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can sell items', 'NOT_COMMISSIONER');
    }

    // Get current active item
    const currentItem = await db.query.auctionItems.findFirst({
      where: and(eq(auctionItems.poolId, poolId), eq(auctionItems.status, 'ACTIVE')),
    });

    if (!currentItem) {
      throw new AppError(400, 'No active auction item', 'NO_ACTIVE_ITEM');
    }

    if (!currentItem.currentBid || !currentItem.currentBidderId) {
      throw new AppError(400, 'No bids on this item', 'NO_BIDS');
    }

    // Mark as sold
    await db.update(auctionItems)
      .set({
        status: 'SOLD',
        winningBid: currentItem.currentBid,
        winnerId: currentItem.currentBidderId,
        auctionedAt: new Date(),
      })
      .where(eq(auctionItems.id, currentItem.id));

    // Update member spending
    await db.update(poolMembers)
      .set({
        totalSpent: sql`${poolMembers.totalSpent} + ${currentItem.currentBid}`,
      })
      .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, currentItem.currentBidderId)));

    // Create ownership record
    await db.insert(ownerships).values({
      userId: currentItem.currentBidderId,
      auctionItemId: currentItem.id,
      percentage: '100',
      purchasePrice: currentItem.currentBid,
      source: 'AUCTION',
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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can start auctions', 'NOT_COMMISSIONER');
    }

    // Check if there's already an active item
    const activeItem = await db.query.auctionItems.findFirst({
      where: and(eq(auctionItems.poolId, poolId), eq(auctionItems.status, 'ACTIVE')),
    });

    if (activeItem) {
      throw new AppError(400, 'There is already an active auction. Finish or skip it first.', 'ACTIVE_AUCTION_EXISTS');
    }

    // Get the item to start
    const item = await db.query.auctionItems.findFirst({
      where: and(eq(auctionItems.id, itemId), eq(auctionItems.poolId, poolId), eq(auctionItems.status, 'PENDING')),
    });

    if (!item) {
      throw new AppError(404, 'Item not found or already auctioned', 'ITEM_NOT_FOUND');
    }

    // Activate the item
    await db.update(auctionItems)
      .set({ status: 'ACTIVE' })
      .where(eq(auctionItems.id, itemId));

    // Update pool status if needed
    if (pool.status === 'OPEN') {
      await db.update(pools)
        .set({ status: 'LIVE', updatedAt: new Date() })
        .where(eq(pools.id, poolId));
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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can revert auctions', 'NOT_COMMISSIONER');
    }

    // Get the item to revert
    const item = await db.query.auctionItems.findFirst({
      where: and(
        eq(auctionItems.id, itemId),
        eq(auctionItems.poolId, poolId),
        inArray(auctionItems.status, ['SOLD', 'UNSOLD'])
      ),
    });

    if (!item) {
      throw new AppError(404, 'Item not found or not eligible for revert', 'ITEM_NOT_FOUND');
    }

    // If item was sold, refund the buyer
    if (item.status === 'SOLD' && item.winnerId && item.winningBid) {
      // Refund member spending
      const updateData: Record<string, unknown> = {
        totalSpent: sql`${poolMembers.totalSpent} - ${item.winningBid}`,
      };

      if (pool.budgetEnabled) {
        updateData.remainingBudget = sql`${poolMembers.remainingBudget} + ${item.winningBid}`;
      }

      await db.update(poolMembers)
        .set(updateData)
        .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, item.winnerId)));

      // Delete ownership record
      await db.delete(ownerships).where(eq(ownerships.auctionItemId, itemId));

      // Update pool total pot
      await db.update(pools)
        .set({
          totalPot: sql`${pools.totalPot} - ${item.winningBid}`,
          updatedAt: new Date(),
        })
        .where(eq(pools.id, poolId));
    }

    // Reset item to pending
    await db.update(auctionItems)
      .set({
        status: 'PENDING',
        currentBid: null,
        currentBidderId: null,
        winningBid: null,
        winnerId: null,
        auctionedAt: null,
      })
      .where(eq(auctionItems.id, itemId));

    // Delete all bids for this item
    await db.delete(bids).where(eq(bids.auctionItemId, itemId));

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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can end the auction', 'NOT_COMMISSIONER');
    }

    // Mark any active items as unsold
    await db.update(auctionItems)
      .set({ status: 'UNSOLD', auctionedAt: new Date() })
      .where(and(eq(auctionItems.poolId, poolId), eq(auctionItems.status, 'ACTIVE')));

    // Mark remaining pending items as unsold
    await db.update(auctionItems)
      .set({ status: 'UNSOLD', auctionedAt: new Date() })
      .where(and(eq(auctionItems.poolId, poolId), eq(auctionItems.status, 'PENDING')));

    // Update pool status
    await db.update(pools)
      .set({ status: 'COMPLETED', updatedAt: new Date() })
      .where(eq(pools.id, poolId));

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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can view muted users', 'NOT_COMMISSIONER');
    }

    const mutedMembers = await db.query.poolMembers.findMany({
      where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.isMuted, true)),
      with: {
        user: {
          columns: { id: true, displayName: true },
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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

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

    await db.update(poolMembers)
      .set({
        isMuted: true,
        mutedUntil,
      })
      .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId)));

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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can unmute users', 'NOT_COMMISSIONER');
    }

    await db.update(poolMembers)
      .set({
        isMuted: false,
        mutedUntil: null,
      })
      .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId)));

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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, poolId) });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can delete messages', 'NOT_COMMISSIONER');
    }

    // Soft delete the message
    await db.update(chatMessages)
      .set({
        isDeleted: true,
        deletedBy: req.user!.id,
      })
      .where(eq(chatMessages.id, messageId));

    // Broadcast delete event
    const io: Server = req.app.get('io');
    io.to(`pool:${poolId}`).emit('messageDeleted', { messageId });

    res.json({ message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
});
