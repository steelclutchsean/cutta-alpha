import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { initializeSocket } from './socket/index.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { poolsRouter } from './routes/pools.js';
import { auctionRouter } from './routes/auction.js';
import { marketRouter } from './routes/market.js';
import { tournamentsRouter } from './routes/tournaments.js';
import { webhooksRouter } from './routes/webhooks.js';
import { livekitRouter } from './routes/livekit.js';
import { notificationsRouter } from './routes/notifications.js';
import { adminRouter } from './routes/admin.js';
import { startGamePolling } from './services/sports-data.js';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Make io available to routes
app.set('io', io);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8081'],
  credentials: true,
}));

// Stripe webhooks need raw body
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// Parse JSON for other routes
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  const health: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
  };

  // Check database
  try {
    const { db, sql } = await import('@cutta/db');
    await db.execute(sql`SELECT 1`);
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  // Check Redis (if configured)
  if (process.env.REDIS_URL) {
    try {
      // Basic check - in production you'd ping Redis
      health.checks.redis = 'configured';
    } catch (error) {
      health.checks.redis = 'error';
    }
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/pools', poolsRouter);
app.use('/auction', auctionRouter);
app.use('/market', marketRouter);
app.use('/tournaments', tournamentsRouter);
app.use('/webhooks', webhooksRouter);
app.use('/livekit', livekitRouter);
app.use('/notifications', notificationsRouter);
app.use('/admin', adminRouter);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  
  // Start game polling for live score updates
  if (process.env.ENABLE_LIVE_SCORES !== 'false') {
    const pollInterval = parseInt(process.env.ESPN_POLL_INTERVAL || '30000', 10);
    startGamePolling(io, pollInterval);
    console.log(`🏈 Live score polling started (every ${pollInterval / 1000}s)`);
  }
});

export { app, httpServer, io };

