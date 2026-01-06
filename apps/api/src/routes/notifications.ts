import { Router } from 'express';
import { prisma } from '@cutta/db';
import { authenticate } from '../middleware/auth.js';
import { getUnreadNotifications, markNotificationsAsRead } from '../services/notifications.js';

export const notificationsRouter = Router();

// All routes require authentication
notificationsRouter.use(authenticate);

// Get notifications
notificationsRouter.get('/', async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user!.id,
        ...(unreadOnly === 'true' && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user!.id,
        read: false,
      },
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

// Mark notifications as read
notificationsRouter.post('/read', async (req, res, next) => {
  try {
    const { notificationIds } = req.body;

    await markNotificationsAsRead(req.user!.id, notificationIds);

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
notificationsRouter.post('/read-all', async (req, res, next) => {
  try {
    await markNotificationsAsRead(req.user!.id);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

