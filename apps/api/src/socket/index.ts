import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '@cutta/db';
import { config } from '../config/index.js';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@cutta/shared';
import { processAuctionBid } from '../services/auction.js';

export function initializeSocket(httpServer: HttpServer): Server {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8081'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, displayName: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.userId = user.id;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>) => {
    console.log(`User connected: ${socket.data.userId}`);

    // Join user's personal room for notifications
    socket.join(`user:${socket.data.userId}`);

    // Join pool room
    socket.on('joinPool', async (poolId: string) => {
      // Verify membership
      const membership = await prisma.poolMember.findUnique({
        where: { poolId_userId: { poolId, userId: socket.data.userId } },
      });

      if (!membership) {
        socket.emit('error', { message: 'Not a member of this pool', code: 'NOT_MEMBER' });
        return;
      }

      // Leave previous pool room if any
      if (socket.data.poolId) {
        socket.leave(`pool:${socket.data.poolId}`);
        io.to(`pool:${socket.data.poolId}`).emit('memberLeft', { userId: socket.data.userId });
      }

      // Join new pool room
      socket.join(`pool:${poolId}`);
      socket.data.poolId = poolId;

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { displayName: true },
      });

      // Notify others
      socket.to(`pool:${poolId}`).emit('memberJoined', {
        userId: socket.data.userId,
        displayName: user?.displayName || 'Unknown',
      });

      console.log(`User ${socket.data.userId} joined pool ${poolId}`);
    });

    // Leave pool room
    socket.on('leavePool', (poolId: string) => {
      socket.leave(`pool:${poolId}`);
      socket.data.poolId = null;
      io.to(`pool:${poolId}`).emit('memberLeft', { userId: socket.data.userId });
    });

    // Place bid
    socket.on('placeBid', async ({ auctionItemId, amount }) => {
      if (!socket.data.poolId) {
        socket.emit('error', { message: 'Not in a pool', code: 'NOT_IN_POOL' });
        return;
      }

      try {
        await processAuctionBid(
          socket.data.poolId,
          auctionItemId,
          socket.data.userId,
          amount,
          io
        );
      } catch (error) {
        socket.emit('error', {
          message: (error as Error).message,
          code: 'BID_ERROR',
        });
      }
    });

    // Send chat message
    socket.on('sendMessage', async ({ poolId, content }) => {
      if (socket.data.poolId !== poolId) {
        socket.emit('error', { message: 'Not in this pool', code: 'NOT_IN_POOL' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { displayName: true, avatarUrl: true },
      });

      const message = await prisma.chatMessage.create({
        data: {
          poolId,
          userId: socket.data.userId,
          content,
        },
      });

      io.to(`pool:${poolId}`).emit('newMessage', {
        id: message.id,
        poolId,
        userId: socket.data.userId,
        user: {
          displayName: user?.displayName || 'Unknown',
          avatarUrl: user?.avatarUrl || null,
        },
        content,
        reactions: {},
        createdAt: message.createdAt,
      });
    });

    // Send reaction
    socket.on('sendReaction', async ({ messageId, emoji }) => {
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
      });

      if (!message || message.poolId !== socket.data.poolId) {
        return;
      }

      // Update reactions
      const reactions = (message.reactions as Record<string, string[]>) || {};
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }
      if (!reactions[emoji].includes(socket.data.userId)) {
        reactions[emoji].push(socket.data.userId);
      }

      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { reactions },
      });

      io.to(`pool:${message.poolId}`).emit('messageReaction', {
        messageId,
        emoji,
        userId: socket.data.userId,
      });
    });

    // Typing indicators
    socket.on('startTyping', async (poolId: string) => {
      if (socket.data.poolId !== poolId) return;

      const user = await prisma.user.findUnique({
        where: { id: socket.data.userId },
        select: { displayName: true },
      });

      socket.to(`pool:${poolId}`).emit('userTyping', {
        userId: socket.data.userId,
        displayName: user?.displayName || 'Unknown',
      });
    });

    socket.on('stopTyping', (poolId: string) => {
      if (socket.data.poolId !== poolId) return;

      socket.to(`pool:${poolId}`).emit('userStoppedTyping', {
        userId: socket.data.userId,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.userId}`);

      if (socket.data.poolId) {
        io.to(`pool:${socket.data.poolId}`).emit('memberLeft', {
          userId: socket.data.userId,
        });
      }
    });
  });

  return io;
}

export type SocketServer = ReturnType<typeof initializeSocket>;

