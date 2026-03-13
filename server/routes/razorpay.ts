import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const PLAN_IDS: Record<string, string> = {
  pro: 'plan_pro_id_here', // Replace with actual Razorpay Plan ID
  agency: 'plan_agency_id_here', // Replace with actual Razorpay Plan ID
};

// Create a subscription
router.post('/create-subscription', authenticate, async (req: AuthRequest, res) => {
  const { plan } = req.body;
  const userId = req.user?.id;

  if (!plan || !PLAN_IDS[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: PLAN_IDS[plan],
      customer_notify: 1,
      total_count: 12, // For 1 year, or whatever you prefer
      notes: {
        userId: userId || '',
        plan: plan,
      },
    });

    res.json({
      subscription_id: subscription.id,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify payment
router.post('/verify-payment', authenticate, async (req: AuthRequest, res) => {
  const {
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
    plan
  } = req.body;
  
  const userId = req.user?.id;

  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const generated_signature = crypto
    .createHmac('sha256', secret)
    .update(razorpay_payment_id + '|' + razorpay_subscription_id)
    .digest('hex');

  if (generated_signature === razorpay_signature) {
    try {
      await db
        .from('users')
        .update({
          subscription_plan: plan,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
          // We can still use the stripe_customer_id column OR rename it in the DB later.
          // For now, let's just update the plan status.
        })
        .eq('id', userId);

      res.json({ success: true, plan });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: 'Invalid signature' });
  }
});

// Webhook removed as requested. 
// Note: Manual verification via /verify-payment handles the initial activation.
// Subscription cancellations or renewals won't be synced automatically without webhooks.

export default router;
