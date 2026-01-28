import { Router } from 'express';
import { db, eq, and, desc, count, notifications } from '@cutta/db';
import { authenticate } from '../middleware/auth.js';
import { markNotificationsAsRead } from '../services/notifications.js';

export const notificationsRouter = Router();

// All routes require authentication
notificationsRouter.use(authenticate);

// Get notifications
notificationsRouter.get('/', async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;

    const conditions = [eq(notifications.userId, req.user!.id)];
    if (unreadOnly === 'true') {
      conditions.push(eq(notifications.read, false));
    }

    const userNotifications = await db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: desc(notifications.createdAt),
      limit: 50,
    });

    const [unreadCountResult] = await db.select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, req.user!.id), eq(notifications.read, false)));

    res.json({
      notifications: userNotifications,
      unreadCount: unreadCountResult?.count || 0,
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
