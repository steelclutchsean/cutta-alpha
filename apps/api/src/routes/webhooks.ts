import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db, eq, transactions, games, teams } from '@cutta/db';
import { stripe } from '../services/stripe.js';
import { config } from '../config/index.js';

export const webhooksRouter = Router();

// Stripe webhook handler
webhooksRouter.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);

        // Update transaction status
        await db.update(transactions)
          .set({ status: 'COMPLETED' })
          .where(eq(transactions.stripePaymentIntentId, paymentIntent.id));
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);

        // Update transaction status
        await db.update(transactions)
          .set({ status: 'FAILED' })
          .where(eq(transactions.stripePaymentIntentId, paymentIntent.id));
        break;
      }

      case 'customer.subscription.deleted': {
        // Handle subscription cancellation if needed
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge refunded:', charge.id);

        if (charge.payment_intent) {
          await db.update(transactions)
            .set({ status: 'REFUNDED' })
            .where(eq(transactions.stripePaymentIntentId, charge.payment_intent as string));
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Sports data webhook (for live score updates)
webhooksRouter.post('/sports', async (req: Request, res: Response) => {
  // This would receive updates from a sports data provider
  // For now, just acknowledge receipt
  const { gameId, team1Score, team2Score, status, winnerId } = req.body;

  try {
    if (gameId) {
      const [game] = await db.update(games)
        .set({
          team1Score,
          team2Score,
          status: status?.toUpperCase(),
          winnerId,
          ...(status === 'final' && { completedAt: new Date() }),
        })
        .where(eq(games.externalId, gameId))
        .returning();

      // If game completed, update team elimination status
      if (status === 'final' && winnerId && game) {
        const loserId = winnerId === game.team1Id ? game.team2Id : game.team1Id;
        if (loserId) {
          await db.update(teams)
            .set({
              isEliminated: true,
              eliminatedRound: game.round,
            })
            .where(eq(teams.id, loserId));

          // Trigger payout processing for affected pools
          // This would be handled by a separate service
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing sports webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});
