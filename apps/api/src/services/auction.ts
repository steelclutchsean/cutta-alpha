import { prisma } from '@cutta/db';
import { Server } from 'socket.io';
import { config } from '../config/index.js';
import { processAuctionWin } from './payments.js';
import type { AuctionState, AuctionItemWithDetails } from '@cutta/shared';

// In-memory timer state (would use Redis in production)
const auctionTimers: Map<string, NodeJS.Timeout> = new Map();
const auctionTimeRemaining: Map<string, number> = new Map();

/**
 * Get current auction state for a pool
 */
export async function getAuctionState(poolId: string): Promise<AuctionState> {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    throw new Error('Pool not found');
  }

  // Get current active item
  const currentItem = await prisma.auctionItem.findFirst({
    where: { poolId, status: 'ACTIVE' },
    include: {
      team: true,
      bids: {
        orderBy: { amount: 'desc' },
        take: 1,
        include: {
          user: {
            select: { id: true, displayName: true },
          },
        },
      },
      _count: {
        select: { bids: true },
      },
    },
  });

  // Get next pending items
  const nextItems = await prisma.auctionItem.findMany({
    where: { poolId, status: 'PENDING' },
    include: {
      team: true,
      _count: { select: { bids: true } },
    },
    orderBy: { order: 'asc' },
    take: 5,
  });

  // Get completed items
  const completedItems = await prisma.auctionItem.findMany({
    where: { poolId, status: { in: ['SOLD', 'UNSOLD'] } },
    include: {
      team: true,
      _count: { select: { bids: true } },
    },
    orderBy: { auctionedAt: 'desc' },
    take: 10,
  });

  // Calculate total raised
  const totalRaised = await prisma.auctionItem.aggregate({
    where: { poolId, status: 'SOLD' },
    _sum: { winningBid: true },
  });

  const formatItem = (item: typeof currentItem): AuctionItemWithDetails | null => {
    if (!item) return null;
    return {
      id: item.id,
      poolId: item.poolId,
      teamId: item.teamId,
      status: item.status.toLowerCase() as 'pending' | 'active' | 'sold' | 'unsold',
      startingBid: Number(item.startingBid),
      currentBid: item.currentBid ? Number(item.currentBid) : null,
      currentBidderId: item.currentBidderId,
      winningBid: item.winningBid ? Number(item.winningBid) : null,
      winnerId: item.winnerId,
      order: item.order,
      auctionedAt: item.auctionedAt,
      createdAt: item.createdAt,
      team: {
        id: item.team.id,
        name: item.team.name,
        seed: item.team.seed || 0,
        region: item.team.region || '',
        logoUrl: item.team.logoUrl,
      },
      currentBidder: item.bids?.[0]?.user || null,
      bidCount: item._count.bids,
    };
  };

  let status: 'not_started' | 'in_progress' | 'paused' | 'completed';
  if (pool.status === 'DRAFT' || pool.status === 'OPEN') {
    status = 'not_started';
  } else if (pool.status === 'LIVE') {
    status = 'in_progress';
  } else if (pool.status === 'IN_PROGRESS' || pool.status === 'COMPLETED') {
    status = 'completed';
  } else {
    status = 'not_started';
  }

  return {
    poolId,
    status,
    currentItem: formatItem(currentItem),
    nextItems: nextItems.map((item) => formatItem({ ...item, bids: [], _count: item._count }) as AuctionItemWithDetails),
    completedItems: completedItems.map((item) => formatItem({ ...item, bids: [], _count: item._count }) as AuctionItemWithDetails),
    timeRemaining: auctionTimeRemaining.get(poolId) || config.auction.timerDuration,
    totalRaised: Number(totalRaised._sum.winningBid) || 0,
  };
}

/**
 * Process a bid on an auction item
 */
export async function processAuctionBid(
  poolId: string,
  auctionItemId: string,
  userId: string,
  amount: number,
  io: Server
): Promise<{ success: boolean; bid?: { id: string; amount: number } }> {
  // Get current item state
  const auctionItem = await prisma.auctionItem.findUnique({
    where: { id: auctionItemId },
    include: { team: true },
  });

  if (!auctionItem) {
    throw new Error('Auction item not found');
  }

  if (auctionItem.status !== 'ACTIVE') {
    throw new Error('Item is not currently being auctioned');
  }

  // Validate bid amount
  const minBid = auctionItem.currentBid
    ? Number(auctionItem.currentBid) + config.auction.minBidIncrement
    : Number(auctionItem.startingBid);

  if (amount < minBid) {
    throw new Error(`Minimum bid is $${minBid}`);
  }

  // Create bid record
  const bid = await prisma.bid.create({
    data: {
      auctionItemId,
      userId,
      amount,
    },
  });

  // Update auction item
  await prisma.auctionItem.update({
    where: { id: auctionItemId },
    data: {
      currentBid: amount,
      currentBidderId: userId,
    },
  });

  // Get bidder info
  const bidder = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });

  // Broadcast new bid
  io.to(`pool:${poolId}`).emit('newBid', {
    ...bid,
    amount: Number(bid.amount),
    bidder: { displayName: bidder?.displayName || 'Unknown' },
  });

  // Reset/extend timer
  resetAuctionTimer(poolId, io);

  return {
    success: true,
    bid: { id: bid.id, amount: Number(bid.amount) },
  };
}

/**
 * Reset auction timer (called on new bid)
 */
function resetAuctionTimer(poolId: string, io: Server) {
  // Clear existing timer
  const existingTimer = auctionTimers.get(poolId);
  if (existingTimer) {
    clearInterval(existingTimer);
  }

  // Set initial time
  auctionTimeRemaining.set(poolId, config.auction.timerDuration);

  // Broadcast timer reset
  io.to(`pool:${poolId}`).emit('timerUpdate', config.auction.timerDuration);

  // Start countdown
  const timer = setInterval(async () => {
    const remaining = (auctionTimeRemaining.get(poolId) || 0) - 1;
    auctionTimeRemaining.set(poolId, remaining);

    // Broadcast timer update
    io.to(`pool:${poolId}`).emit('timerUpdate', remaining);

    if (remaining <= 0) {
      clearInterval(timer);
      auctionTimers.delete(poolId);
      auctionTimeRemaining.delete(poolId);

      // Process item sale
      await processItemSale(poolId, io);
    }
  }, 1000);

  auctionTimers.set(poolId, timer);
}

/**
 * Process item sale when timer expires
 */
async function processItemSale(poolId: string, io: Server) {
  const activeItem = await prisma.auctionItem.findFirst({
    where: { poolId, status: 'ACTIVE' },
    include: {
      team: true,
      pool: true,
    },
  });

  if (!activeItem) return;

  if (activeItem.currentBidderId && activeItem.currentBid) {
    // Item sold - process payment
    const winner = await prisma.user.findUnique({
      where: { id: activeItem.currentBidderId },
      select: { id: true, displayName: true },
    });

    // Update item status
    await prisma.auctionItem.update({
      where: { id: activeItem.id },
      data: {
        status: 'SOLD',
        winningBid: activeItem.currentBid,
        winnerId: activeItem.currentBidderId,
        auctionedAt: new Date(),
      },
    });

    // Mark winning bid
    await prisma.bid.updateMany({
      where: {
        auctionItemId: activeItem.id,
        userId: activeItem.currentBidderId,
        amount: activeItem.currentBid,
      },
      data: { isWinning: true },
    });

    // Process payment and create ownership
    await processAuctionWin(
      activeItem.currentBidderId,
      activeItem.id,
      Number(activeItem.currentBid),
      activeItem.pool
    );

    // Update pool total
    await prisma.pool.update({
      where: { id: poolId },
      data: {
        totalPot: { increment: activeItem.currentBid },
      },
    });

    // Update member spending
    await prisma.poolMember.update({
      where: { poolId_userId: { poolId, userId: activeItem.currentBidderId } },
      data: {
        totalSpent: { increment: activeItem.currentBid },
      },
    });

    // Broadcast sale
    io.to(`pool:${poolId}`).emit('itemSold', {
      item: {
        id: activeItem.id,
        team: activeItem.team,
      },
      winner: winner,
      winningBid: Number(activeItem.currentBid),
    });
  } else {
    // Item unsold
    await prisma.auctionItem.update({
      where: { id: activeItem.id },
      data: {
        status: 'UNSOLD',
        auctionedAt: new Date(),
      },
    });
  }

  // Broadcast updated state
  const state = await getAuctionState(poolId);
  io.to(`pool:${poolId}`).emit('auctionStateUpdate', state);
}

/**
 * Start timer for an item (called when item becomes active)
 */
export function startAuctionTimer(poolId: string, io: Server) {
  resetAuctionTimer(poolId, io);
}

/**
 * Stop timer (called on pause/end)
 */
export function stopAuctionTimer(poolId: string) {
  const timer = auctionTimers.get(poolId);
  if (timer) {
    clearInterval(timer);
    auctionTimers.delete(poolId);
  }
}

