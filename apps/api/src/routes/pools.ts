import { Router } from 'express';
import { prisma } from '@cutta/db';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPoolSchema,
  updatePoolSchema,
  joinPoolSchema,
  updatePayoutRulesSchema,
} from '@cutta/shared';
import { generateInviteCode } from '@cutta/shared';
import { AppError } from '../middleware/error.js';

export const poolsRouter = Router();

// All routes require authentication
poolsRouter.use(authenticate);

// Get all pools for the user
poolsRouter.get('/', async (req, res, next) => {
  try {
    const memberships = await prisma.poolMember.findMany({
      where: { userId: req.user!.id },
      include: {
        pool: {
          include: {
            commissioner: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
            tournament: {
              select: { id: true, name: true, year: true, status: true },
            },
            _count: {
              select: {
                members: true,
                auctionItems: true,
              },
            },
          },
        },
      },
      orderBy: { pool: { auctionStartTime: 'asc' } },
    });

    const pools = memberships.map((m) => ({
      ...m.pool,
      memberCount: m.pool._count.members,
      auctionItemCount: m.pool._count.auctionItems,
      myRole: m.role,
      mySpent: m.totalSpent,
      myWinnings: m.totalWinnings,
    }));

    res.json(pools);
  } catch (error) {
    next(error);
  }
});

// Get pools where user is commissioner
poolsRouter.get('/commissioned', async (req, res, next) => {
  try {
    const pools = await prisma.pool.findMany({
      where: { commissionerId: req.user!.id },
      include: {
        commissioner: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        tournament: {
          select: { id: true, name: true, year: true, status: true },
        },
        _count: {
          select: {
            members: true,
            auctionItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const webUrl = process.env.WEB_URL || 'http://localhost:3000';
    
    res.json(pools.map((pool) => ({
      ...pool,
      memberCount: pool._count.members,
      auctionItemCount: pool._count.auctionItems,
      inviteLink: `${webUrl}/pools/join?code=${pool.inviteCode}`,
      myRole: 'COMMISSIONER',
    })));
  } catch (error) {
    next(error);
  }
});

// Get pools where user is commissioner
poolsRouter.get('/commissioned', async (req, res, next) => {
  try {
    const pools = await prisma.pool.findMany({
      where: { commissionerId: req.user!.id },
      include: {
        tournament: {
          select: { id: true, name: true, year: true, status: true },
        },
        _count: {
          select: {
            members: true,
            auctionItems: true,
          },
        },
      },
      orderBy: { auctionStartTime: 'desc' },
    });

    res.json(
      pools.map((p) => ({
        ...p,
        memberCount: p._count.members,
        auctionItemCount: p._count.auctionItems,
      }))
    );
  } catch (error) {
    next(error);
  }
});

// Get public/discoverable pools
poolsRouter.get('/discover', async (req, res, next) => {
  try {
    // Find public pools that are open or in draft/live and not full
    const pools = await prisma.pool.findMany({
      where: {
        isPublic: true,
        status: { in: ['DRAFT', 'OPEN', 'LIVE'] },
      },
      include: {
        commissioner: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        tournament: {
          select: { id: true, name: true, year: true, sport: true },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { auctionStartTime: 'asc' },
      take: 50,
    });

    // Filter out pools that are full
    const availablePools = pools.filter((p) => {
      if (p.maxParticipants === null) return true;
      return p._count.members < p.maxParticipants;
    });

    res.json(
      availablePools.map((p) => ({
        ...p,
        memberCount: p._count.members,
        spotsRemaining: p.maxParticipants ? p.maxParticipants - p._count.members : null,
      }))
    );
  } catch (error) {
    next(error);
  }
});

// Get single pool
poolsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user is a member
    const membership = await prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId: id, userId: req.user!.id } },
    });

    if (!membership) {
      throw new AppError(403, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    const pool = await prisma.pool.findUnique({
      where: { id },
      include: {
        commissioner: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        tournament: {
          select: { id: true, name: true, year: true, status: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { totalSpent: 'desc' },
        },
        auctionItems: {
          include: {
            team: true,
          },
          orderBy: { order: 'asc' },
        },
        payoutRules: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    const webUrl = process.env.WEB_URL || 'http://localhost:3000';
    
    res.json({
      ...pool,
      myRole: membership.role,
      mySpent: membership.totalSpent,
      myWinnings: membership.totalWinnings,
      inviteLink: `${webUrl}/pools/join?code=${pool.inviteCode}`,
    });
  } catch (error) {
    next(error);
  }
});

// Create pool
poolsRouter.post('/', validate(createPoolSchema), async (req, res, next) => {
  try {
    const { 
      name, 
      description, 
      buyIn, 
      maxParticipants, 
      auctionStartTime, 
      tournamentId, 
      secondaryMarketEnabled, 
      auctionMode, 
      isPublic,
      autoStartAuction,
      auctionBudget,
      budgetEnabled,
      payoutRules 
    } = req.body;

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true },
    });

    if (!tournament) {
      throw new AppError(404, 'Tournament not found', 'TOURNAMENT_NOT_FOUND');
    }

    // Validate payout rules if provided
    if (payoutRules && payoutRules.length > 0) {
      const totalPercentage = payoutRules.reduce((sum: number, r: { percentage: number }) => sum + r.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new AppError(400, 'Payout percentages must sum to 100%', 'INVALID_PERCENTAGES');
      }
    }

    // If autoStartAuction is true, auctionStartTime is not required (use current time)
    // Otherwise, auctionStartTime is required
    if (!autoStartAuction && !auctionStartTime) {
      throw new AppError(400, 'Auction start time is required when auto-start is disabled', 'MISSING_AUCTION_TIME');
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.pool.findUnique({ where: { inviteCode } });
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    // Determine pool status and auction start time
    const poolStatus = autoStartAuction ? 'LIVE' : 'DRAFT';
    const effectiveAuctionStartTime = autoStartAuction 
      ? new Date() 
      : new Date(auctionStartTime);

    // Determine remaining budget for commissioner
    const commissionerBudget = budgetEnabled && auctionBudget != null ? auctionBudget : null;

    // Create pool with commissioner membership
    const pool = await prisma.pool.create({
      data: {
        name,
        description,
        commissionerId: req.user!.id,
        buyIn,
        maxParticipants,
        auctionStartTime: effectiveAuctionStartTime,
        tournamentId,
        inviteCode,
        secondaryMarketEnabled: secondaryMarketEnabled ?? true,
        auctionMode: auctionMode || 'TRADITIONAL',
        isPublic: isPublic ?? false,
        autoStartAuction: autoStartAuction ?? false,
        auctionBudget: auctionBudget ?? null,
        budgetEnabled: budgetEnabled ?? false,
        status: poolStatus,
        members: {
          create: {
            userId: req.user!.id,
            role: 'COMMISSIONER',
            remainingBudget: commissionerBudget,
          },
        },
        // Create auction items for all teams
        auctionItems: {
          create: tournament.teams.map((team, index) => ({
            teamId: team.id,
            order: index + 1,
            startingBid: 1,
          })),
        },
        // Create payout rules if provided
        ...(payoutRules && payoutRules.length > 0 ? {
          payoutRules: {
            create: payoutRules.map((rule: { name: string; description?: string; percentage: number; trigger: string; triggerValue?: string }, index: number) => ({
              name: rule.name,
              description: rule.description,
              percentage: rule.percentage,
              trigger: rule.trigger,
              triggerValue: rule.triggerValue,
              order: index + 1,
            })),
          },
        } : {}),
      },
      include: {
        commissioner: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        tournament: {
          select: { id: true, name: true, year: true },
        },
        payoutRules: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { members: true, auctionItems: true },
        },
      },
    });

    res.status(201).json({
      ...pool,
      memberCount: pool._count.members,
      auctionItemCount: pool._count.auctionItems,
      inviteLink: `${process.env.WEB_URL || 'http://localhost:3000'}/pools/join?code=${pool.inviteCode}`,
    });
  } catch (error) {
    next(error);
  }
});

// Update pool (commissioner only)
poolsRouter.patch('/:id', validate(updatePoolSchema), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user is commissioner
    const pool = await prisma.pool.findUnique({
      where: { id },
    });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can update this pool', 'NOT_COMMISSIONER');
    }

    // Fields that can ONLY be updated before auction starts
    const restrictedFields = ['name', 'description', 'buyIn', 'maxParticipants', 'auctionStartTime', 'tournamentId'];
    const requestedFields = Object.keys(req.body);
    const hasRestrictedFields = requestedFields.some(field => restrictedFields.includes(field));

    // If trying to update restricted fields after auction started, block it
    if (hasRestrictedFields && pool.status !== 'DRAFT' && pool.status !== 'OPEN') {
      throw new AppError(400, 'Cannot update pool details after auction has started', 'AUCTION_STARTED');
    }

    // Fields like secondaryMarketEnabled can be updated anytime
    const updated = await prisma.pool.update({
      where: { id },
      data: req.body,
      include: {
        commissioner: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        tournament: {
          select: { id: true, name: true, year: true },
        },
        _count: {
          select: { members: true, auctionItems: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Join pool by invite code
poolsRouter.post('/join', validate(joinPoolSchema), async (req, res, next) => {
  try {
    const { inviteCode } = req.body;

    const pool = await prisma.pool.findUnique({
      where: { inviteCode },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!pool) {
      throw new AppError(404, 'Invalid invite code', 'INVALID_INVITE');
    }

    // Allow joining pools that are in DRAFT, OPEN, or LIVE status
    if (pool.status !== 'DRAFT' && pool.status !== 'OPEN' && pool.status !== 'LIVE') {
      throw new AppError(400, 'This pool is no longer accepting members', 'POOL_CLOSED');
    }

    if (pool.maxParticipants && pool._count.members >= pool.maxParticipants) {
      throw new AppError(400, 'Pool is full', 'POOL_FULL');
    }

    // Check if already a member
    const existing = await prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId: pool.id, userId: req.user!.id } },
    });

    if (existing) {
      throw new AppError(400, 'You are already a member of this pool', 'ALREADY_MEMBER');
    }

    // Determine remaining budget for new member
    const memberBudget = pool.budgetEnabled && pool.auctionBudget != null 
      ? Number(pool.auctionBudget) 
      : null;

    // Add member with budget
    await prisma.poolMember.create({
      data: {
        poolId: pool.id,
        userId: req.user!.id,
        role: 'MEMBER',
        remainingBudget: memberBudget,
      },
    });

    res.json({
      message: 'Successfully joined pool',
      poolId: pool.id,
    });
  } catch (error) {
    next(error);
  }
});

// Leave pool
poolsRouter.post('/:id/leave', async (req, res, next) => {
  try {
    const { id } = req.params;

    const membership = await prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId: id, userId: req.user!.id } },
    });

    if (!membership) {
      throw new AppError(404, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    if (membership.role === 'COMMISSIONER') {
      throw new AppError(400, 'Commissioners cannot leave their pools', 'IS_COMMISSIONER');
    }

    const pool = await prisma.pool.findUnique({ where: { id } });
    if (pool?.status !== 'DRAFT' && pool?.status !== 'OPEN') {
      throw new AppError(400, 'Cannot leave pool after auction has started', 'AUCTION_STARTED');
    }

    await prisma.poolMember.delete({
      where: { poolId_userId: { poolId: id, userId: req.user!.id } },
    });

    res.json({ message: 'Successfully left pool' });
  } catch (error) {
    next(error);
  }
});

// Update payout rules (commissioner only)
poolsRouter.put('/:id/payouts', validate(updatePayoutRulesSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rules } = req.body;

    const pool = await prisma.pool.findUnique({ where: { id } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can update payouts', 'NOT_COMMISSIONER');
    }

    // Verify percentages sum to 100 (use tolerance for floating-point)
    const totalPercentage = rules.reduce((sum: number, r: { percentage: number }) => sum + r.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new AppError(400, 'Payout percentages must sum to 100%', 'INVALID_PERCENTAGES');
    }

    // Delete existing rules and create new ones
    await prisma.payoutRule.deleteMany({ where: { poolId: id } });

    await prisma.payoutRule.createMany({
      data: rules.map((rule: { name: string; description?: string; percentage: number; trigger: string; triggerValue?: string }, index: number) => ({
        poolId: id,
        name: rule.name,
        description: rule.description,
        percentage: rule.percentage,
        trigger: rule.trigger,
        triggerValue: rule.triggerValue,
        order: index + 1,
      })),
    });

    const updatedRules = await prisma.payoutRule.findMany({
      where: { poolId: id },
      orderBy: { order: 'asc' },
    });

    res.json(updatedRules);
  } catch (error) {
    next(error);
  }
});

// Open pool for joining (commissioner only)
poolsRouter.post('/:id/open', async (req, res, next) => {
  try {
    const { id } = req.params;

    const pool = await prisma.pool.findUnique({ where: { id } });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can open this pool', 'NOT_COMMISSIONER');
    }

    if (pool.status !== 'DRAFT') {
      throw new AppError(400, 'Pool can only be opened from draft status', 'INVALID_STATUS');
    }

    const updated = await prisma.pool.update({
      where: { id },
      data: { status: 'OPEN' },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Get pool standings/leaderboard
poolsRouter.get('/:id/standings', async (req, res, next) => {
  try {
    const { id } = req.params;

    const members = await prisma.poolMember.findMany({
      where: { poolId: id },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Get ownerships for this pool
    const ownerships = await prisma.ownership.findMany({
      where: {
        auctionItem: { poolId: id },
      },
      include: {
        auctionItem: {
          include: {
            team: true,
          },
        },
      },
    });

    // Build standings
    const standings = members.map((m) => {
      const userOwnerships = ownerships.filter((o) => o.userId === m.userId);
      const teams = userOwnerships.map((o) => ({
        team: o.auctionItem.team,
        percentage: o.percentage,
        purchasePrice: o.purchasePrice,
        isEliminated: o.auctionItem.team.isEliminated,
      }));

      const activeTeams = teams.filter((t) => !t.isEliminated).length;

      return {
        user: m.user,
        role: m.role,
        totalSpent: m.totalSpent,
        totalWinnings: m.totalWinnings,
        profit: Number(m.totalWinnings) - Number(m.totalSpent),
        teams,
        activeTeams,
        eliminatedTeams: teams.length - activeTeams,
      };
    });

    // Sort by profit
    standings.sort((a, b) => b.profit - a.profit);

    res.json(standings);
  } catch (error) {
    next(error);
  }
});

