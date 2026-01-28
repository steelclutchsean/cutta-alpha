import { Router } from 'express';
import { db, eq, and, inArray, desc, asc, count, sql, pools, poolMembers, tournaments, teams, auctionItems, payoutRules, deletedPools, users, ownerships } from '@cutta/db';
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
    const memberships = await db.query.poolMembers.findMany({
      where: eq(poolMembers.userId, req.user!.id),
      with: {
        pool: {
          with: {
            commissioner: {
              columns: { id: true, displayName: true, avatarUrl: true },
            },
            tournament: {
              columns: { id: true, name: true, year: true, status: true },
            },
          },
        },
      },
      orderBy: asc(poolMembers.joinedAt),
    });

    // Get counts for each pool
    const poolIds = memberships.map(m => m.poolId);
    
    const memberCounts = poolIds.length > 0 ? await db.select({
      poolId: poolMembers.poolId,
      count: count(),
    })
      .from(poolMembers)
      .where(inArray(poolMembers.poolId, poolIds))
      .groupBy(poolMembers.poolId) : [];
    
    const itemCounts = poolIds.length > 0 ? await db.select({
      poolId: auctionItems.poolId,
      count: count(),
    })
      .from(auctionItems)
      .where(inArray(auctionItems.poolId, poolIds))
      .groupBy(auctionItems.poolId) : [];

    const memberCountMap = new Map(memberCounts.map(c => [c.poolId, c.count]));
    const itemCountMap = new Map(itemCounts.map(c => [c.poolId, c.count]));

    const poolsData = memberships.map((m) => ({
      ...m.pool,
      memberCount: memberCountMap.get(m.poolId) || 0,
      auctionItemCount: itemCountMap.get(m.poolId) || 0,
      myRole: m.role,
      mySpent: m.totalSpent,
      myWinnings: m.totalWinnings,
    }));

    res.json(poolsData);
  } catch (error) {
    next(error);
  }
});

// Get pools where user is commissioner
poolsRouter.get('/commissioned', async (req, res, next) => {
  try {
    const commissionedPools = await db.query.pools.findMany({
      where: eq(pools.commissionerId, req.user!.id),
      with: {
        commissioner: {
          columns: { id: true, displayName: true, avatarUrl: true },
        },
        tournament: {
          columns: { id: true, name: true, year: true, status: true },
        },
      },
      orderBy: desc(pools.createdAt),
    });

    // Get counts
    const poolIds = commissionedPools.map(p => p.id);
    
    const memberCounts = poolIds.length > 0 ? await db.select({
      poolId: poolMembers.poolId,
      count: count(),
    })
      .from(poolMembers)
      .where(inArray(poolMembers.poolId, poolIds))
      .groupBy(poolMembers.poolId) : [];
    
    const itemCounts = poolIds.length > 0 ? await db.select({
      poolId: auctionItems.poolId,
      count: count(),
    })
      .from(auctionItems)
      .where(inArray(auctionItems.poolId, poolIds))
      .groupBy(auctionItems.poolId) : [];

    const memberCountMap = new Map(memberCounts.map(c => [c.poolId, c.count]));
    const itemCountMap = new Map(itemCounts.map(c => [c.poolId, c.count]));

    const webUrl = process.env.WEB_URL || 'http://localhost:3000';
    
    res.json(commissionedPools.map((pool) => ({
      ...pool,
      memberCount: memberCountMap.get(pool.id) || 0,
      auctionItemCount: itemCountMap.get(pool.id) || 0,
      inviteLink: `${webUrl}/pools/join?code=${pool.inviteCode}`,
      myRole: 'COMMISSIONER',
    })));
  } catch (error) {
    next(error);
  }
});

// Get public/discoverable pools
poolsRouter.get('/discover', async (req, res, next) => {
  try {
    // Find public pools that are open or in draft/live and not full
    const publicPools = await db.query.pools.findMany({
      where: and(
        eq(pools.isPublic, true),
        inArray(pools.status, ['DRAFT', 'OPEN', 'LIVE'])
      ),
      with: {
        commissioner: {
          columns: { id: true, displayName: true, avatarUrl: true },
        },
        tournament: {
          columns: { id: true, name: true, year: true, sport: true },
        },
      },
      orderBy: asc(pools.auctionStartTime),
      limit: 50,
    });

    // Get member counts
    const poolIds = publicPools.map(p => p.id);
    const memberCounts = poolIds.length > 0 ? await db.select({
      poolId: poolMembers.poolId,
      count: count(),
    })
      .from(poolMembers)
      .where(inArray(poolMembers.poolId, poolIds))
      .groupBy(poolMembers.poolId) : [];

    const memberCountMap = new Map(memberCounts.map(c => [c.poolId, c.count]));

    // Filter out pools that are full
    const availablePools = publicPools.filter((p) => {
      const memberCount = memberCountMap.get(p.id) || 0;
      if (p.maxParticipants === null) return true;
      return memberCount < p.maxParticipants;
    });

    res.json(
      availablePools.map((p) => {
        const memberCount = memberCountMap.get(p.id) || 0;
        return {
          ...p,
          memberCount,
          spotsRemaining: p.maxParticipants ? p.maxParticipants - memberCount : null,
        };
      })
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
    const membership = await db.query.poolMembers.findFirst({
      where: and(eq(poolMembers.poolId, id), eq(poolMembers.userId, req.user!.id)),
    });

    if (!membership) {
      throw new AppError(403, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    const pool = await db.query.pools.findFirst({
      where: eq(pools.id, id),
      with: {
        commissioner: {
          columns: { id: true, displayName: true, avatarUrl: true },
        },
        tournament: {
          columns: { id: true, name: true, year: true, status: true },
        },
        members: {
          with: {
            user: {
              columns: { id: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: desc(poolMembers.totalSpent),
        },
        auctionItems: {
          with: {
            team: true,
          },
          orderBy: asc(auctionItems.order),
        },
        payoutRules: {
          orderBy: asc(payoutRules.order),
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
      payoutRules: payoutRulesData 
    } = req.body;

    // Verify tournament exists
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
      with: { teams: true },
    });

    if (!tournament) {
      throw new AppError(404, 'Tournament not found', 'TOURNAMENT_NOT_FOUND');
    }

    // Validate payout rules if provided
    if (payoutRulesData && payoutRulesData.length > 0) {
      const totalPercentage = payoutRulesData.reduce((sum: number, r: { percentage: number }) => sum + r.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new AppError(400, 'Payout percentages must sum to 100%', 'INVALID_PERCENTAGES');
      }
    }

    // If autoStartAuction is true, auctionStartTime is not required (use current time)
    if (!autoStartAuction && !auctionStartTime) {
      throw new AppError(400, 'Auction start time is required when auto-start is disabled', 'MISSING_AUCTION_TIME');
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.query.pools.findFirst({ where: eq(pools.inviteCode, inviteCode) });
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
    const commissionerBudget = budgetEnabled && auctionBudget != null ? String(auctionBudget) : null;

    // Create pool
    const now = new Date();
    const insertValues = {
      name,
      description,
      commissionerId: req.user!.id,
      buyIn: String(buyIn),
      maxParticipants,
      auctionStartTime: effectiveAuctionStartTime,
      tournamentId,
      inviteCode,
      secondaryMarketEnabled: secondaryMarketEnabled ?? true,
      auctionMode: auctionMode || 'TRADITIONAL',
      isPublic: isPublic ?? false,
      autoStartAuction: autoStartAuction ?? false,
      auctionBudget: auctionBudget ? String(auctionBudget) : null,
      budgetEnabled: budgetEnabled ?? false,
      status: poolStatus,
      createdAt: now,
      updatedAt: now,
    };
    const [pool] = await db.insert(pools)
      .values(insertValues)
      .returning();

    // Create commissioner membership
    await db.insert(poolMembers).values({
      poolId: pool.id,
      userId: req.user!.id,
      role: 'COMMISSIONER',
      remainingBudget: commissionerBudget,
      joinedAt: now,
    });

    // Create auction items for all teams
    if (tournament.teams.length > 0) {
      await db.insert(auctionItems).values(
        tournament.teams.map((team, index) => ({
          poolId: pool.id,
          teamId: team.id,
          order: index + 1,
          startingBid: '1',
          createdAt: now,
          updatedAt: now,
        }))
      );

      // If autoStartAuction is enabled and it's TRADITIONAL mode, activate the first item
      // This makes the auction immediately active when users enter the draft room
      if (autoStartAuction && (auctionMode || 'TRADITIONAL') === 'TRADITIONAL') {
        const firstItem = await db.query.auctionItems.findFirst({
          where: and(
            eq(auctionItems.poolId, pool.id),
            eq(auctionItems.order, 1)
          ),
        });
        if (firstItem) {
          await db.update(auctionItems)
            .set({ status: 'ACTIVE' })
            .where(eq(auctionItems.id, firstItem.id));
        }
      }
    }

    // Create payout rules if provided
    if (payoutRulesData && payoutRulesData.length > 0) {
      await db.insert(payoutRules).values(
        payoutRulesData.map((rule: { name: string; description?: string; percentage: number; trigger: string; triggerValue?: string }, index: number) => ({
          poolId: pool.id,
          name: rule.name,
          description: rule.description,
          percentage: String(rule.percentage),
          trigger: rule.trigger as typeof payoutRules.$inferInsert.trigger,
          triggerValue: rule.triggerValue,
          order: index + 1,
          createdAt: now,
        }))
      );
    }

    // Fetch created pool with relations
    const createdPool = await db.query.pools.findFirst({
      where: eq(pools.id, pool.id),
      with: {
        commissioner: {
          columns: { id: true, displayName: true, avatarUrl: true },
        },
        tournament: {
          columns: { id: true, name: true, year: true },
        },
        payoutRules: {
          orderBy: asc(payoutRules.order),
        },
      },
    });

    // Get counts
    const [memberCount] = await db.select({ count: count() })
      .from(poolMembers)
      .where(eq(poolMembers.poolId, pool.id));
    const [itemCount] = await db.select({ count: count() })
      .from(auctionItems)
      .where(eq(auctionItems.poolId, pool.id));

    res.status(201).json({
      ...createdPool,
      memberCount: memberCount?.count || 0,
      auctionItemCount: itemCount?.count || 0,
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
    const pool = await db.query.pools.findFirst({
      where: eq(pools.id, id),
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
    const [updated] = await db.update(pools)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(pools.id, id))
      .returning();

    const updatedPool = await db.query.pools.findFirst({
      where: eq(pools.id, id),
      with: {
        commissioner: {
          columns: { id: true, displayName: true, avatarUrl: true },
        },
        tournament: {
          columns: { id: true, name: true, year: true },
        },
      },
    });

    // Get counts
    const [memberCount] = await db.select({ count: count() })
      .from(poolMembers)
      .where(eq(poolMembers.poolId, id));
    const [itemCount] = await db.select({ count: count() })
      .from(auctionItems)
      .where(eq(auctionItems.poolId, id));

    res.json({
      ...updatedPool,
      memberCount: memberCount?.count || 0,
      auctionItemCount: itemCount?.count || 0,
    });
  } catch (error) {
    next(error);
  }
});

// Join pool by invite code
poolsRouter.post('/join', validate(joinPoolSchema), async (req, res, next) => {
  try {
    const { inviteCode } = req.body;

    const pool = await db.query.pools.findFirst({
      where: eq(pools.inviteCode, inviteCode),
    });

    if (!pool) {
      throw new AppError(404, 'Invalid invite code', 'INVALID_INVITE');
    }

    // Get member count
    const [memberCount] = await db.select({ count: count() })
      .from(poolMembers)
      .where(eq(poolMembers.poolId, pool.id));

    // Allow joining pools that are in DRAFT, OPEN, or LIVE status
    if (pool.status !== 'DRAFT' && pool.status !== 'OPEN' && pool.status !== 'LIVE') {
      throw new AppError(400, 'This pool is no longer accepting members', 'POOL_CLOSED');
    }

    if (pool.maxParticipants && (memberCount?.count || 0) >= pool.maxParticipants) {
      throw new AppError(400, 'Pool is full', 'POOL_FULL');
    }

    // Check if already a member
    const existing = await db.query.poolMembers.findFirst({
      where: and(eq(poolMembers.poolId, pool.id), eq(poolMembers.userId, req.user!.id)),
    });

    if (existing) {
      throw new AppError(400, 'You are already a member of this pool', 'ALREADY_MEMBER');
    }

    // Determine remaining budget for new member
    const memberBudget = pool.budgetEnabled && pool.auctionBudget != null 
      ? pool.auctionBudget 
      : null;

    // Add member with budget
    await db.insert(poolMembers).values({
      poolId: pool.id,
      userId: req.user!.id,
      role: 'MEMBER',
      remainingBudget: memberBudget,
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

    const membership = await db.query.poolMembers.findFirst({
      where: and(eq(poolMembers.poolId, id), eq(poolMembers.userId, req.user!.id)),
    });

    if (!membership) {
      throw new AppError(404, 'You are not a member of this pool', 'NOT_MEMBER');
    }

    if (membership.role === 'COMMISSIONER') {
      throw new AppError(400, 'Commissioners cannot leave their pools', 'IS_COMMISSIONER');
    }

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, id) });
    if (pool?.status !== 'DRAFT' && pool?.status !== 'OPEN') {
      throw new AppError(400, 'Cannot leave pool after auction has started', 'AUCTION_STARTED');
    }

    await db.delete(poolMembers)
      .where(and(eq(poolMembers.poolId, id), eq(poolMembers.userId, req.user!.id)));

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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, id) });

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
    await db.delete(payoutRules).where(eq(payoutRules.poolId, id));

    await db.insert(payoutRules).values(
      rules.map((rule: { name: string; description?: string; percentage: number; trigger: string; triggerValue?: string }, index: number) => ({
        poolId: id,
        name: rule.name,
        description: rule.description,
        percentage: String(rule.percentage),
        trigger: rule.trigger as typeof payoutRules.$inferInsert.trigger,
        triggerValue: rule.triggerValue,
        order: index + 1,
      }))
    );

    const updatedRules = await db.query.payoutRules.findMany({
      where: eq(payoutRules.poolId, id),
      orderBy: asc(payoutRules.order),
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

    const pool = await db.query.pools.findFirst({ where: eq(pools.id, id) });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can open this pool', 'NOT_COMMISSIONER');
    }

    if (pool.status !== 'DRAFT') {
      throw new AppError(400, 'Pool can only be opened from draft status', 'INVALID_STATUS');
    }

    const [updated] = await db.update(pools)
      .set({ status: 'OPEN', updatedAt: new Date() })
      .where(eq(pools.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete pool (commissioner only) - archives to deleted pools history
poolsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    // Get pool with all related data
    const pool = await db.query.pools.findFirst({
      where: eq(pools.id, id),
      with: {
        tournament: {
          columns: { name: true, year: true },
        },
      },
    });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only the commissioner can delete this pool', 'NOT_COMMISSIONER');
    }

    // Get member count
    const [memberCount] = await db.select({ count: count() })
      .from(poolMembers)
      .where(eq(poolMembers.poolId, id));

    // Archive to deleted pools history before deletion
    await db.insert(deletedPools).values({
      originalPoolId: pool.id,
      name: pool.name,
      description: pool.description,
      commissionerId: pool.commissionerId,
      deletedStatus: pool.status,
      buyIn: pool.buyIn,
      totalPot: pool.totalPot,
      maxParticipants: pool.maxParticipants,
      auctionStartTime: pool.auctionStartTime,
      tournamentId: pool.tournamentId,
      tournamentName: pool.tournament.name,
      tournamentYear: pool.tournament.year,
      memberCount: memberCount?.count || 0,
      auctionMode: pool.auctionMode,
      isPublic: pool.isPublic,
      deletionReason: reason || null,
    });

    // Delete the pool (cascades to related records due to onDelete: Cascade)
    await db.delete(pools).where(eq(pools.id, id));

    res.json({ 
      message: 'Pool deleted successfully',
      deletedPoolId: id,
    });
  } catch (error) {
    next(error);
  }
});

// Get pool standings/leaderboard
poolsRouter.get('/:id/standings', async (req, res, next) => {
  try {
    const { id } = req.params;

    const members = await db.query.poolMembers.findMany({
      where: eq(poolMembers.poolId, id),
      with: {
        user: {
          columns: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Get ownerships for this pool
    const poolOwnerships = await db.query.ownerships.findMany({
      with: {
        auctionItem: {
          with: {
            team: true,
          },
        },
      },
    });

    // Filter to only ownerships for this pool (using auctionItem.poolId)
    const filteredOwnerships = poolOwnerships.filter(o => o.auctionItem?.poolId === id);

    // Build standings
    const standings = members.map((m) => {
      const userOwnerships = filteredOwnerships.filter((o) => o.userId === m.userId);
      const memberTeams = userOwnerships.map((o) => ({
        team: o.auctionItem.team,
        percentage: o.percentage,
        purchasePrice: o.purchasePrice,
        isEliminated: o.auctionItem.team.isEliminated,
      }));

      const activeTeams = memberTeams.filter((t) => !t.isEliminated).length;

      return {
        user: m.user,
        role: m.role,
        totalSpent: m.totalSpent,
        totalWinnings: m.totalWinnings,
        profit: Number(m.totalWinnings) - Number(m.totalSpent),
        teams: memberTeams,
        activeTeams,
        eliminatedTeams: memberTeams.length - activeTeams,
      };
    });

    // Sort by profit
    standings.sort((a, b) => b.profit - a.profit);

    res.json(standings);
  } catch (error) {
    next(error);
  }
});
