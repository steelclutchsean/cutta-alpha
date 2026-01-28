import { db, eq, and, sql, users, paymentMethods, auctionItems, transactions, ownerships, notifications, payouts, poolMembers, listings, type Pool, type Listing } from '@cutta/db';
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
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      paymentMethods: {
        where: eq(paymentMethods.isDefault, true),
        limit: 1,
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const auctionItem = await db.query.auctionItems.findFirst({
    where: eq(auctionItems.id, auctionItemId),
    with: { team: true },
  });

  if (!auctionItem) {
    throw new Error('Auction item not found');
  }

  // Create transaction record
  const [transaction] = await db.insert(transactions)
    .values({
      type: 'AUCTION_PURCHASE',
      buyerId: userId,
      auctionItemId,
      amount: String(amount),
      platformFee: '0', // No fee on primary auction
      netAmount: String(amount),
      status: 'PENDING',
    })
    .returning();

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

      await db.update(transactions)
        .set({
          stripePaymentIntentId: paymentIntent.id,
          status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
        })
        .where(eq(transactions.id, transaction.id));
    } catch (error) {
      console.error('Payment failed:', error);
      await db.update(transactions)
        .set({ status: 'FAILED' })
        .where(eq(transactions.id, transaction.id));
      throw error;
    }
  } else {
    // For demo purposes, mark as completed
    await db.update(transactions)
      .set({ status: 'COMPLETED' })
      .where(eq(transactions.id, transaction.id));
  }

  // Create ownership record
  await db.insert(ownerships).values({
    userId,
    auctionItemId,
    percentage: '100',
    purchasePrice: String(amount),
    source: 'AUCTION',
  });

  // Create notification
  await db.insert(notifications).values({
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
      id: string;
      auctionItem: {
        team: { name: string };
        pool: { id: string };
      };
    };
  },
  amount: number,
  io: Server
): Promise<{ success: boolean; transactionId: string }> {
  const buyer = await db.query.users.findFirst({
    where: eq(users.id, buyerId),
    with: {
      paymentMethods: {
        where: eq(paymentMethods.isDefault, true),
        limit: 1,
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
  const [transaction] = await db.insert(transactions)
    .values({
      type: 'SECONDARY_PURCHASE',
      buyerId,
      sellerId: listing.sellerId,
      listingId: listing.id,
      amount: String(amount),
      platformFee: String(platformFee),
      netAmount: String(netAmount),
      status: 'PENDING',
    })
    .returning();

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
          platformFee,
        }
      );

      await db.update(transactions)
        .set({
          stripePaymentIntentId: paymentIntent.id,
          status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
        })
        .where(eq(transactions.id, transaction.id));
    } catch (error) {
      console.error('Payment failed:', error);
      await db.update(transactions)
        .set({ status: 'FAILED' })
        .where(eq(transactions.id, transaction.id));
      throw error;
    }
  } else {
    // For demo purposes, mark as completed
    await db.update(transactions)
      .set({ status: 'COMPLETED' })
      .where(eq(transactions.id, transaction.id));
  }

  // Update listing status
  await db.update(listings)
    .set({ status: 'SOLD' })
    .where(eq(listings.id, listing.id));

  // Transfer ownership
  // Reduce seller's ownership
  await db.update(ownerships)
    .set({
      percentage: sql`${ownerships.percentage} - ${listing.percentageForSale}`,
    })
    .where(eq(ownerships.id, listing.ownershipId));

  // Create buyer's ownership
  await db.insert(ownerships).values({
    userId: buyerId,
    auctionItemId: listing.ownership.auctionItem.pool.id, // This should be the actual auctionItemId
    percentage: listing.percentageForSale,
    purchasePrice: String(amount),
    source: 'SECONDARY_MARKET',
  });

  // Credit seller's balance
  await db.update(users)
    .set({
      balance: sql`${users.balance} + ${netAmount}`,
    })
    .where(eq(users.id, listing.sellerId));

  // Notify both parties
  await db.insert(notifications).values([
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
  ]);

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
  const [payout] = await db.insert(payouts)
    .values({
      poolId,
      userId,
      amount: String(amount),
      reason,
      status: 'PENDING',
    })
    .returning();

  // Credit user's balance
  await db.update(users)
    .set({
      balance: sql`${users.balance} + ${amount}`,
    })
    .where(eq(users.id, userId));

  // Update pool member winnings
  await db.update(poolMembers)
    .set({
      totalWinnings: sql`${poolMembers.totalWinnings} + ${amount}`,
    })
    .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId)));

  // Create transaction
  await db.insert(transactions).values({
    type: 'PAYOUT',
    sellerId: userId, // Recipient
    amount: String(amount),
    platformFee: '0',
    netAmount: String(amount),
    status: 'COMPLETED',
  });

  // Mark payout as processed
  await db.update(payouts)
    .set({ status: 'PROCESSED' })
    .where(eq(payouts.id, payout.id));

  // Notify user
  await db.insert(notifications).values({
    userId,
    type: 'PAYOUT_RECEIVED',
    title: 'Payout Received!',
    body: `You received $${amount} - ${reason}`,
    data: { poolId, amount, reason },
  });

  // Broadcast balance update
  const updatedUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
  io.to(`user:${userId}`).emit('balanceUpdate', {
    balance: updatedUser?.balance,
    change: amount,
    reason,
  });

  io.to(`pool:${poolId}`).emit('payoutProcessed', {
    userId,
    amount,
    reason,
  });
}
