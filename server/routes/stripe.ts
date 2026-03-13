import express from 'express';
import Stripe from 'stripe';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia' as any,
});

const PRICE_IDS: Record<string, string> = {
  pro: 'price_1T9qrjDaPIxDOdq3t4sd9O0y',
  agency: 'price_1T9rXMDaPIxDOdq3c2NwLoy4',
};

router.post('/create-checkout-session', authenticate, async (req: AuthRequest, res) => {
  const { plan } = req.body;
  const userId = req.user?.id;
  const userEmail = req.user?.email;

  if (!plan || !PRICE_IDS[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  try {
    const { data: user, error: userError } = await db
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    let customerId = user?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        metadata: { userId: userId || '' },
      });
      customerId = customer.id;

      await db
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Dynamically detect client origin from request headers
    const clientUrl = req.headers.origin || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId as any,
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      mode: 'subscription',
      success_url: `${clientUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/pricing`,
      metadata: { userId: userId || '', plan: plan as string },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/confirm-payment', authenticate, async (req: AuthRequest, res) => {
  const { session_id } = req.body;
  const userId = req.user?.id;

  if (!session_id) return res.status(400).json({ error: 'Session ID is required' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid' || session.status === 'complete') {
      const plan = session.metadata?.plan || 'pro';

      await db
        .from('users')
        .update({
          subscription_plan: plan,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
        })
        .eq('id', userId);

      return res.json({ success: true, plan });
    }

    res.status(400).json({ error: 'Payment not completed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/create-portal-session', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user?.id;

  try {
    const { data: user, error: userError } = await db
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Dynamically detect client origin from request headers
    const clientUrl = req.headers.origin || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${clientUrl}/billing`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;

      if (userId && plan) {
        await db
          .from('users')
          .update({
            subscription_plan: plan,
            subscription_status: 'active',
            subscription_start_date: new Date().toISOString(),
          })
          .eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status;
      const priceId = subscription.items.data[0]?.price?.id;

      const planName = Object.entries(PRICE_IDS).find(([, id]) => id === priceId)?.[0] || 'pro';

      await db
        .from('users')
        .update({
          subscription_plan: status === 'active' ? planName : 'free',
          subscription_status: status === 'active' ? 'active' : 'inactive',
        })
        .eq('stripe_customer_id', subscription.customer);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await db
        .from('users')
        .update({ subscription_plan: 'free', subscription_status: 'inactive' })
        .eq('stripe_customer_id', subscription.customer);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        await db
          .from('users')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', invoice.customer);
      }
      break;
    }

    default:
      break;
  }

  res.json({ received: true });
});

export default router;
