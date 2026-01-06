import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { prisma, NotificationType } from '@cutta/db';

const expo = new Expo();

// In production, you'd store push tokens in the database
// For now, we'll use the notification system for in-app notifications

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
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data,
    },
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
  // const pushTokens = await prisma.pushToken.findMany({ where: { userId: { in: userIds } } });

  // For now, just create in-app notifications
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: 'AUCTION_WON' as NotificationType, // Default type
      title,
      body,
      data,
    })),
  });
}

/**
 * Send auction starting notification
 */
export async function notifyAuctionStarting(poolId: string): Promise<void> {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      members: {
        select: { userId: true },
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
  const ownerships = await prisma.ownership.findMany({
    where: {
      auctionItem: {
        teamId: { in: teamIds },
      },
    },
    include: {
      auctionItem: {
        include: {
          team: true,
        },
      },
    },
  });

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      team1: true,
      team2: true,
    },
  });

  if (!game) return;

  await Promise.all(
    ownerships.map((ownership) =>
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
  const ownerships = await prisma.ownership.findMany({
    where: {
      auctionItem: {
        teamId,
      },
    },
    include: {
      auctionItem: {
        include: {
          team: true,
        },
      },
    },
  });

  await Promise.all(
    ownerships.map((ownership) =>
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
  const ownerships = await prisma.ownership.findMany({
    where: {
      auctionItem: {
        teamId,
      },
    },
    include: {
      auctionItem: {
        include: {
          team: true,
        },
      },
    },
  });

  await Promise.all(
    ownerships.map((ownership) =>
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
  return prisma.notification.findMany({
    where: {
      userId,
      read: false,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
  userId: string,
  notificationIds?: string[]
): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      userId,
      ...(notificationIds && { id: { in: notificationIds } }),
    },
    data: { read: true },
  });
}

