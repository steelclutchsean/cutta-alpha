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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

export { app, httpServer, io };

