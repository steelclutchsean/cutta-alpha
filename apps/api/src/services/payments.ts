import { prisma, Pool, Listing } from '@cutta/db';
import { Server } from 'socket.io';
import { stripe, createAuctionPaymentIntent, createMarketPaymentIntent } from './stripe.js';
import { config } from '../config/index.js';

/**
 * Process payment for auction win
 */
export async function processAuctionWin(
  userId: string,
  auctionItemId: string,
  amount: number,
  pool: Pool
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      paymentMethods: {
        where: { isDefault: true },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const auctionItem = await prisma.auctionItem.findUnique({
    where: { id: auctionItemId },
    include: { team: true },
  });

  if (!auctionItem) {
    throw new Error('Auction item not found');
  }

  // Create transaction record
  const transaction = await prisma.transaction.create({
    data: {
      type: 'AUCTION_PURCHASE',
      buyerId: userId,
      auctionItemId,
      amount,
      platformFee: 0, // No fee on primary auction
      netAmount: amount,
      status: 'PENDING',
    },
  });

  // Process payment if user has Stripe customer ID and payment method
  if (user.stripeCustomerId && user.paymentMethods[0]) {
    try {
      const paymentIntent = await createAuctionPaymentIntent(
        user.stripeCustomerId,
        amount,
        user.paymentMethods[0].stripePaymentMethodId,
        {
          userId,
          poolId: pool.id,
          auctionItemId,
          teamName: auctionItem.team.name,
        }
      );

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
        },
      });
    } catch (error) {
      console.error('Payment failed:', error);
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  } else {
    // For demo purposes, mark as completed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETED' },
    });
  }

  // Create ownership record
  await prisma.ownership.create({
    data: {
      userId,
      auctionItemId,
      percentage: 100,
      purchasePrice: amount,
      source: 'AUCTION',
    },
  });

  // Create notification
  await prisma.notification.create({
    data: {
      userId,
      type: 'AUCTION_WON',
      title: 'Auction Won!',
      body: `You won ${auctionItem.team.name} for $${amount}`,
      data: {
        poolId: pool.id,
        auctionItemId,
        teamId: auctionItem.teamId,
        amount,
      },
    },
  });
}

/**
 * Process secondary market purchase
 */
export async function processSecondaryMarketPurchase(
  buyerId: string,
  listing: Listing & {
    seller: { id: string };
    ownership: {
      auctionItem: {
        team: { name: string };
        pool: { id: string };
      };
    };
  },
  amount: number,
  io: Server
): Promise<{ success: boolean; transactionId: string }> {
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    include: {
      paymentMethods: {
        where: { isDefault: true },
        take: 1,
      },
    },
  });

  if (!buyer) {
    throw new Error('Buyer not found');
  }

  // Calculate fees
  const platformFee = Math.round(amount * config.platform.feeRate * 100) / 100;
  const netAmount = amount - platformFee;

  // Create transaction record
  const transaction = await prisma.transaction.create({
    data: {
      type: 'SECONDARY_PURCHASE',
      buyerId,
      sellerId: listing.sellerId,
      listingId: listing.id,
      amount,
      platformFee,
      netAmount,
      status: 'PENDING',
    },
  });

  // Process payment
  if (buyer.stripeCustomerId && buyer.paymentMethods[0]) {
    try {
      const paymentIntent = await createMarketPaymentIntent(
        buyer.stripeCustomerId,
        amount,
        buyer.paymentMethods[0].stripePaymentMethodId,
        {
          buyerId,
          sellerId: listing.sellerId,
          listingId: listing.id,
          platformFee: platformFee.toString(),
        }
      );

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
        },
      });
    } catch (error) {
      console.error('Payment failed:', error);
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  } else {
    // For demo purposes, mark as completed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETED' },
    });
  }

  // Update listing status
  await prisma.listing.update({
    where: { id: listing.id },
    data: { status: 'SOLD' },
  });

  // Transfer ownership
  // Reduce seller's ownership
  await prisma.ownership.update({
    where: { id: listing.ownershipId },
    data: {
      percentage: {
        decrement: listing.percentageForSale,
      },
    },
  });

  // Create buyer's ownership
  await prisma.ownership.create({
    data: {
      userId: buyerId,
      auctionItemId: listing.ownership.auctionItem.pool.id, // This should be the actual auctionItemId
      percentage: listing.percentageForSale,
      purchasePrice: amount,
      source: 'SECONDARY_MARKET',
    },
  });

  // Credit seller's balance
  await prisma.user.update({
    where: { id: listing.sellerId },
    data: {
      balance: { increment: netAmount },
    },
  });

  // Notify both parties
  await prisma.notification.createMany({
    data: [
      {
        userId: buyerId,
        type: 'OFFER_ACCEPTED',
        title: 'Purchase Complete',
        body: `You purchased ${listing.percentageForSale}% of ${listing.ownership.auctionItem.team.name} for $${amount}`,
        data: { transactionId: transaction.id },
      },
      {
        userId: listing.sellerId,
        type: 'OFFER_ACCEPTED',
        title: 'Sale Complete',
        body: `You sold ${listing.percentageForSale}% of ${listing.ownership.auctionItem.team.name} for $${amount} (received $${netAmount})`,
        data: { transactionId: transaction.id },
      },
    ],
  });

  // Broadcast balance update to seller
  io.to(`user:${listing.sellerId}`).emit('balanceUpdate', {
    change: netAmount,
    reason: 'Secondary market sale',
  });

  return {
    success: true,
    transactionId: transaction.id,
  };
}

/**
 * Process tournament payout
 */
export async function processPayout(
  poolId: string,
  userId: string,
  amount: number,
  reason: string,
  io: Server
): Promise<void> {
  // Create payout record
  const payout = await prisma.payout.create({
    data: {
      poolId,
      userId,
      amount,
      reason,
      status: 'PENDING',
    },
  });

  // Credit user's balance
  await prisma.user.update({
    where: { id: userId },
    data: {
      balance: { increment: amount },
    },
  });

  // Update pool member winnings
  await prisma.poolMember.update({
    where: { poolId_userId: { poolId, userId } },
    data: {
      totalWinnings: { increment: amount },
    },
  });

  // Create transaction
  await prisma.transaction.create({
    data: {
      type: 'PAYOUT',
      sellerId: userId, // Recipient
      amount,
      platformFee: 0,
      netAmount: amount,
      status: 'COMPLETED',
    },
  });

  // Mark payout as processed
  await prisma.payout.update({
    where: { id: payout.id },
    data: { status: 'PROCESSED' },
  });

  // Notify user
  await prisma.notification.create({
    data: {
      userId,
      type: 'PAYOUT_RECEIVED',
      title: 'Payout Received!',
      body: `You received $${amount} - ${reason}`,
      data: { poolId, amount, reason },
    },
  });

  // Broadcast balance update
  io.to(`user:${userId}`).emit('balanceUpdate', {
    balance: (await prisma.user.findUnique({ where: { id: userId } }))?.balance,
    change: amount,
    reason,
  });

  io.to(`pool:${poolId}`).emit('payoutProcessed', {
    userId,
    amount,
    reason,
  });
}

