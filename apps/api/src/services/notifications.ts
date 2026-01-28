import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { db, eq, and, inArray, desc, pools, poolMembers, ownerships, auctionItems, games, notifications, type Notification } from '@cutta/db';

const expo = new Expo();

// In production, you'd store push tokens in the database
// For now, we'll use the notification system for in-app notifications

type NotificationType = typeof notifications.$inferSelect['type'];

/**
 * Create an in-app notification
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  await db.insert(notifications).values({
    userId,
    type,
    title,
    body,
    data,
  });

  // TODO: Also send push notification if user has enabled them
  // This would require storing device tokens
}

/**
 * Send push notifications to multiple users
 */
export async function sendPushNotifications(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  // In production, fetch push tokens from database
  // const pushTokens = await db.query.pushTokens.findMany({ where: inArray(pushTokens.userId, userIds) });

  // For now, just create in-app notifications
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: 'AUCTION_WON' as NotificationType, // Default type
      title,
      body,
      data,
    }))
  );
}

/**
 * Send auction starting notification
 */
export async function notifyAuctionStarting(poolId: string): Promise<void> {
  const pool = await db.query.pools.findFirst({
    where: eq(pools.id, poolId),
    with: {
      members: {
        columns: { userId: true },
      },
    },
  });

  if (!pool) return;

  const userIds = pool.members.map((m) => m.userId);

  await Promise.all(
    userIds.map((userId) =>
      createNotification(
        userId,
        'AUCTION_STARTING',
        'Auction Starting Soon!',
        `The auction for ${pool.name} is starting in 5 minutes`,
        { poolId }
      )
    )
  );
}

/**
 * Send outbid notification
 */
export async function notifyOutbid(
  userId: string,
  teamName: string,
  newBidAmount: number,
  poolId: string
): Promise<void> {
  await createNotification(
    userId,
    'AUCTION_OUTBID',
    'You\'ve been outbid!',
    `Someone bid $${newBidAmount} on ${teamName}`,
    { poolId, teamName, amount: newBidAmount }
  );
}

/**
 * Send game starting notification
 */
export async function notifyGameStarting(
  gameId: string,
  teamIds: string[]
): Promise<void> {
  // Find all users who own these teams
  const ownershipList = await db.query.ownerships.findMany({
    with: {
      auctionItem: {
        with: {
          team: true,
        },
      },
    },
  });

  // Filter to ownerships for the specified teams
  const filteredOwnerships = ownershipList.filter(
    o => o.auctionItem?.teamId && teamIds.includes(o.auctionItem.teamId)
  );

  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    with: {
      team1: true,
      team2: true,
    },
  });

  if (!game) return;

  await Promise.all(
    filteredOwnerships.map((ownership) =>
      createNotification(
        ownership.userId,
        'GAME_STARTING',
        'Game Starting Soon!',
        `${game.team1?.name} vs ${game.team2?.name} is about to begin`,
        { gameId, teamId: ownership.auctionItem.teamId }
      )
    )
  );
}

/**
 * Send team won notification
 */
export async function notifyTeamWon(
  teamId: string,
  roundName: string
): Promise<void> {
  const ownershipList = await db.query.ownerships.findMany({
    with: {
      auctionItem: {
        with: {
          team: true,
        },
      },
    },
  });

  // Filter to ownerships for the specified team
  const filteredOwnerships = ownershipList.filter(
    o => o.auctionItem?.teamId === teamId
  );

  await Promise.all(
    filteredOwnerships.map((ownership) =>
      createNotification(
        ownership.userId,
        'TEAM_WON',
        'Your team won!',
        `${ownership.auctionItem.team.name} advanced to the ${roundName}!`,
        { teamId }
      )
    )
  );
}

/**
 * Send team eliminated notification
 */
export async function notifyTeamEliminated(teamId: string): Promise<void> {
  const ownershipList = await db.query.ownerships.findMany({
    with: {
      auctionItem: {
        with: {
          team: true,
        },
      },
    },
  });

  // Filter to ownerships for the specified team
  const filteredOwnerships = ownershipList.filter(
    o => o.auctionItem?.teamId === teamId
  );

  await Promise.all(
    filteredOwnerships.map((ownership) =>
      createNotification(
        ownership.userId,
        'TEAM_ELIMINATED',
        'Team Eliminated',
        `${ownership.auctionItem.team.name} has been eliminated from the tournament`,
        { teamId }
      )
    )
  );
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
  return db.query.notifications.findMany({
    where: and(eq(notifications.userId, userId), eq(notifications.read, false)),
    orderBy: desc(notifications.createdAt),
    limit: 50,
  });
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
  userId: string,
  notificationIds?: string[]
): Promise<void> {
  const conditions = [eq(notifications.userId, userId)];
  if (notificationIds) {
    conditions.push(inArray(notifications.id, notificationIds));
  }

  await db.update(notifications)
    .set({ read: true })
    .where(and(...conditions));
}
