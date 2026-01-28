import { Router } from 'express';
import { db, eq, and, pools, poolMembers, users } from '@cutta/db';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { generateLiveKitToken, createDraftRoom } from '../services/livekit.js';

export const livekitRouter = Router();

// All routes require authentication
livekitRouter.use(authenticate);

// Get token for joining a draft room
livekitRouter.get('/token/:poolId', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    // Verify membership
    const membership = await db.query.poolMembers.findFirst({
      where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, req.user!.id)),
    });

    if (!membership) {
      throw new AppError(403, 'Not a member of this pool', 'NOT_MEMBER');
    }

    const pool = await db.query.pools.findFirst({
      where: eq(pools.id, poolId),
    });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
      columns: { displayName: true },
    });

    const isHost = pool.commissionerId === req.user!.id;
    const roomName = pool.livekitRoom || `draft-${poolId}`;

    const token = await generateLiveKitToken(
      roomName,
      req.user!.id,
      user?.displayName || 'Anonymous',
      isHost
    );

    res.json({
      token,
      roomName,
      isHost,
    });
  } catch (error) {
    next(error);
  }
});

// Create/enable streaming for a pool (commissioner only)
livekitRouter.post('/:poolId/enable', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await db.query.pools.findFirst({
      where: eq(pools.id, poolId),
    });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only commissioner can enable streaming', 'NOT_COMMISSIONER');
    }

    // Create LiveKit room
    const roomName = await createDraftRoom(poolId);

    // Update pool
    await db.update(pools)
      .set({
        streamEnabled: true,
        livekitRoom: roomName,
        updatedAt: new Date(),
      })
      .where(eq(pools.id, poolId));

    res.json({
      message: 'Streaming enabled',
      roomName,
    });
  } catch (error) {
    next(error);
  }
});

// Disable streaming (commissioner only)
livekitRouter.post('/:poolId/disable', async (req, res, next) => {
  try {
    const { poolId } = req.params;

    const pool = await db.query.pools.findFirst({
      where: eq(pools.id, poolId),
    });

    if (!pool) {
      throw new AppError(404, 'Pool not found', 'NOT_FOUND');
    }

    if (pool.commissionerId !== req.user!.id) {
      throw new AppError(403, 'Only commissioner can disable streaming', 'NOT_COMMISSIONER');
    }

    await db.update(pools)
      .set({
        streamEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(pools.id, poolId));

    res.json({ message: 'Streaming disabled' });
  } catch (error) {
    next(error);
  }
});
