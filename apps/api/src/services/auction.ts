import { prisma } from '@cutta/db';
import { Server } from 'socket.io';
import { config } from '../config/index.js';
import { processAuctionWin } from './payments.js';
import type { AuctionState, AuctionItemWithDetails } from '@cutta/shared';
import { WHEEL_SPIN_DURATION } from '@cutta/shared';

// In-memory timer state (would use Redis in production)
const auctionTimers: Map<string, NodeJS.Timeout> = new Map();
const auctionTimeRemaining: Map<string, number> = new Map();

// Wheel spin state
const wheelSpinQueues: Map<string, { teamId: string; userId: string }[]> = new Map();
const currentSpinParticipant: Map<string, number> = new Map();

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
  // Get current item state and pool for budget check
  const auctionItem = await prisma.auctionItem.findUnique({
    where: { id: auctionItemId },
    include: { team: true, pool: true },
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

  // Check budget if enabled
  if (auctionItem.pool.budgetEnabled) {
    const member = await prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId, userId } },
    });

    if (!member) {
      throw new Error('User is not a member of this pool');
    }

    // If remainingBudget is null, budget is unlimited for this member
    if (member.remainingBudget !== null) {
      const remainingBudget = Number(member.remainingBudget);
      
      if (amount > remainingBudget) {
        throw new Error(`Insufficient budget. You have $${remainingBudget.toFixed(2)} remaining.`);
      }
    }
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

    // Get member to update budget
    const member = await prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId, userId: activeItem.currentBidderId } },
    });

    // Update member spending and deduct from budget if enabled
    const updateData: { totalSpent: { increment: typeof activeItem.currentBid }; remainingBudget?: { decrement: typeof activeItem.currentBid } } = {
      totalSpent: { increment: activeItem.currentBid },
    };

    // Deduct from remaining budget if budgetEnabled and member has a budget
    if (activeItem.pool.budgetEnabled && member?.remainingBudget !== null) {
      updateData.remainingBudget = { decrement: activeItem.currentBid };
    }

    await prisma.poolMember.update({
      where: { poolId_userId: { poolId, userId: activeItem.currentBidderId } },
      data: updateData,
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

// ============================================
// WHEEL SPIN AUCTION FUNCTIONS
// ============================================

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Initialize wheel spin auction - shuffles teams and assigns to participants
 */
export async function initializeWheelSpinAuction(poolId: string, io: Server): Promise<void> {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true } },
        },
      },
      auctionItems: {
        where: { status: 'PENDING' },
        include: { team: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!pool) throw new Error('Pool not found');
  if (pool.auctionMode !== 'WHEEL_SPIN') throw new Error('Pool is not configured for wheel spin auction');

  const members = pool.members.filter(m => m.role !== 'COMMISSIONER' || pool.members.length === 1);
  const teams = pool.auctionItems.map(item => ({
    teamId: item.teamId,
    teamName: item.team.name,
    itemId: item.id,
  }));

  // Shuffle teams
  const shuffledTeams = shuffleArray(teams);

  // Assign teams to participants in round-robin fashion
  const assignments: { teamId: string; userId: string; teamName: string; userName: string }[] = [];
  
  shuffledTeams.forEach((team, index) => {
    const member = members[index % members.length];
    assignments.push({
      teamId: team.teamId,
      userId: member.userId,
      teamName: team.teamName,
      userName: member.user.displayName,
    });
  });

  // Store the spin queue
  wheelSpinQueues.set(poolId, assignments.map(a => ({ teamId: a.teamId, userId: a.userId })));
  currentSpinParticipant.set(poolId, 0);

  // Broadcast initialization
  io.to(`pool:${poolId}`).emit('wheelSpinInitialized', {
    totalTeams: teams.length,
    participants: members.map(m => ({
      id: m.userId,
      displayName: m.user.displayName,
    })),
    assignments: assignments.map((a, i) => ({
      order: i + 1,
      teamName: a.teamName,
      userName: a.userName,
    })),
  });
}

/**
 * Execute wheel spin for current team
 */
export async function executeWheelSpin(poolId: string, io: Server): Promise<{
  team: { id: string; name: string; shortName: string; seed: number | null; region: string | null };
  teams: { id: string; name: string; shortName: string; seed: number | null; region: string | null }[];
  assignedUser: { id: string; displayName: string };
  spinIndex: number;
  totalSpins: number;
}> {
  let queue = wheelSpinQueues.get(poolId);
  let currentIndex = currentSpinParticipant.get(poolId) || 0;

  // First, always get pending items to know what's available
  const pendingItems = await prisma.auctionItem.findMany({
    where: { poolId, status: 'PENDING' },
    include: { team: true },
    orderBy: { order: 'asc' },
  });

  // Check for no teams early
  if (pendingItems.length === 0) {
    throw new Error('No more teams to spin - all teams have been assigned');
  }

  // Auto-reinitialize queue if empty, exhausted, or if there are more pending items than queue (teams added)
  const needsReinit = !queue || currentIndex >= queue.length || queue.length !== pendingItems.length;
  
  if (needsReinit) {
    // Get pool info
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!pool) {
      throw new Error('Pool not found');
    }

    // Pool must be LIVE or IN_PROGRESS (backwards compatibility) or OPEN (for first spin after init)
    if (pool.status !== 'LIVE' && pool.status !== 'IN_PROGRESS' && pool.status !== 'OPEN') {
      throw new Error(`Pool must be LIVE to spin wheel (current status: ${pool.status}). Please initialize the wheel spin first.`);
    }

    // Get members - include commissioner if they're the only member
    const members = pool.members.filter(m => m.role !== 'COMMISSIONER' || pool.members.length === 1);
    
    if (members.length === 0) {
      throw new Error('No eligible members to assign teams to');
    }

    // Auto-reinitialize the queue
    console.log(`Initializing wheel spin queue for pool ${poolId} with ${pendingItems.length} pending teams and ${members.length} members`);
    
    const teams = pendingItems.map(item => ({
      teamId: item.teamId,
      teamName: item.team.name,
    }));

    // Shuffle teams
    const shuffledTeams = shuffleArray(teams);

    // Assign teams to participants in round-robin fashion
    const assignments = shuffledTeams.map((team, index) => {
      const member = members[index % members.length];
      return {
        teamId: team.teamId,
        userId: member.userId,
      };
    });

    // Re-populate the queue
    wheelSpinQueues.set(poolId, assignments);
    currentSpinParticipant.set(poolId, 0);
    
    queue = assignments;
    currentIndex = 0;

    // Also ensure pool is LIVE
    if (pool.status === 'OPEN') {
      await prisma.pool.update({
        where: { id: poolId },
        data: { status: 'LIVE' },
      });
    }
  }

  const assignment = queue[currentIndex];

  // Get team details
  const team = await prisma.team.findUnique({
    where: { id: assignment.teamId },
  });

  const user = await prisma.user.findUnique({
    where: { id: assignment.userId },
    select: { id: true, displayName: true },
  });

  if (!team || !user) throw new Error('Team or user not found');

  // Format all teams for the wheel display (use the pendingItems we already fetched)
  const allTeams = pendingItems.map(item => ({
    id: item.team.id,
    name: item.team.name,
    seed: item.team.seed,
    region: item.team.region,
    shortName: item.team.shortName,
  }));

  // Broadcast spin start with all wheel data
  io.to(`pool:${poolId}`).emit('wheelSpinStart', {
    teams: allTeams,
    targetTeamId: team.id,
    assignedUserId: user.id,
    assignedUserName: user.displayName,
    spinDuration: WHEEL_SPIN_DURATION,
    spinIndex: currentIndex + 1,
    totalSpins: queue.length,
  });

  // Update the auction item to ACTIVE and set the assigned user as first bidder
  const auctionItem = await prisma.auctionItem.findFirst({
    where: { poolId, teamId: team.id },
  });

  if (auctionItem) {
    await prisma.auctionItem.update({
      where: { id: auctionItem.id },
      data: {
        status: 'ACTIVE',
        currentBidderId: user.id,
        currentBid: auctionItem.startingBid, // Start with starting bid for assigned user
      },
    });

    // Create initial bid record
    await prisma.bid.create({
      data: {
        auctionItemId: auctionItem.id,
        userId: user.id,
        amount: Number(auctionItem.startingBid),
      },
    });
  }

  // Increment spin index
  currentSpinParticipant.set(poolId, currentIndex + 1);

  return {
    team: {
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      seed: team.seed,
      region: team.region,
    },
    teams: allTeams, // Include teams array in HTTP response for frontend
    assignedUser: user,
    spinIndex: currentIndex + 1,
    totalSpins: queue.length,
  };
}

/**
 * Complete wheel spin and start bidding timer
 */
export async function completeWheelSpin(poolId: string, io: Server): Promise<void> {
  // Broadcast spin complete
  io.to(`pool:${poolId}`).emit('wheelSpinComplete', {
    message: 'Bidding is now open!',
  });

  // Start the auction timer for bidding
  resetAuctionTimer(poolId, io);

  // Broadcast updated auction state
  const state = await getAuctionState(poolId);
  io.to(`pool:${poolId}`).emit('auctionStateUpdate', state);
}

/**
 * Get wheel spin state for a pool
 */
export function getWheelSpinState(poolId: string): {
  currentIndex: number;
  totalTeams: number;
  isActive: boolean;
} {
  const queue = wheelSpinQueues.get(poolId);
  const currentIndex = currentSpinParticipant.get(poolId) || 0;

  return {
    currentIndex,
    totalTeams: queue?.length || 0,
    isActive: !!queue && currentIndex < queue.length,
  };
}

/**
 * Check if pool is in wheel spin mode
 */
export async function isWheelSpinPool(poolId: string): Promise<boolean> {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    select: { auctionMode: true },
  });
  return pool?.auctionMode === 'WHEEL_SPIN';
}

/**
 * Get matchup brief for current auction item
 */
export async function getMatchupBrief(poolId: string): Promise<string | null> {
  const currentItem = await prisma.auctionItem.findFirst({
    where: { poolId, status: 'ACTIVE' },
    include: { team: true },
  });

  if (!currentItem) return null;

  // Find the game where this team is playing
  const game = await prisma.game.findFirst({
    where: {
      OR: [
        { team1Id: currentItem.teamId },
        { team2Id: currentItem.teamId },
      ],
      status: 'SCHEDULED',
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return game?.matchupBrief || null;
}

