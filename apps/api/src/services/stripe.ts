import Stripe from 'stripe';
import { config } from '../config/index.js';

export const stripe = new Stripe(config.stripe.secretKey || 'sk_test_placeholder', {
  apiVersion: '2023-10-16',
});

/**
 * Create a payment intent for an auction win
 */
export async function createAuctionPaymentIntent(
  customerId: string,
  amount: number,
  paymentMethodId: string,
  metadata: {
    userId: string;
    poolId: string;
    auctionItemId: string;
    teamName: string;
  }
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    metadata,
  });
}

/**
 * Create a payment intent for secondary market purchase
 */
export async function createMarketPaymentIntent(
  customerId: string,
  amount: number,
  paymentMethodId: string,
  metadata: {
    buyerId: string;
    sellerId: string;
    listingId: string;
    platformFee: number;
  }
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    metadata,
  });
}

/**
 * Create a setup intent for saving payment method
 */
export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });
}

/**
 * Transfer funds to a connected account (for payouts)
 */
export async function createTransfer(
  amount: number,
  destinationAccountId: string,
  metadata: Record<string, string>
): Promise<Stripe.Transfer> {
  return stripe.transfers.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    destination: destinationAccountId,
    metadata,
  });
}

/**
 * Create a refund
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number
): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount && { amount: Math.round(amount * 100) }),
  });
}

