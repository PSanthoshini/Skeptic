import express from 'express';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  try {
    const { data: reports, error } = await db
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: report, error } = await db
      .from('reports')
      .select('*, users(subscription_plan)')
      .eq('id', id)
      .single();

    if (error || !report) return res.status(404).json({ error: 'Report not found' });

    const ownerPlan = (report as any).users?.subscription_plan || 'free';

    if (ownerPlan === 'free') {
      const analysis = JSON.parse(report.full_analysis);
      if (analysis.advanced_recommendations) {
        analysis.advanced_recommendations = analysis.advanced_recommendations.map(
          () => 'Upgrade to Pro to unlock this advanced recommendation.'
        );
      }
      report.full_analysis = JSON.stringify(analysis);
    }

    delete (report as any).users;
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const { error, count } = await db
      .from('reports')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    if (count === 0) return res.status(404).json({ error: 'Report not found or unauthorized' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
