import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { analyzeQueue } from '../services/queue.js';

const router = express.Router();

/**
 * @route POST /api/v1/analyze/start
 * @desc Start an async website analysis job
 * @access Public (with tracking via limits)
 */
router.post('/start', async (req, res) => {
  const { url, userId } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    // 1. If authenticated, check limits before adding to Queue
    if (userId) {
      const { data: user, error: userError } = await db
        .from('users')
        .select('roasts_count, subscription_plan')
        .eq('id', userId)
        .single();

      if (userError || !user) throw new Error('User not found');

      if (user.subscription_plan === 'free' && user.roasts_count >= 2) {
        return res.status(403).json({
          error: 'Monthly limit reached',
          message: 'Free users are limited to 2 analyses per month. Please upgrade to Pro.',
        });
      }
    }

    // 2. Add job to Queue instantly (Never blocks the thread or crashes memory)
    const { id } = await analyzeQueue.add('analyze-website', { url, userId });
    
    // 3. Respond instantly
    res.status(202).json({ 
      status: 'queued', 
      jobId: id,
      message: 'Analysis job started. Please poll /status/:jobId for completion.'
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/v1/analyze/status/:jobId
 * @desc Get the status and result of a queued analysis
 * @access Public 
 */
router.get('/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const job = await analyzeQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Return the current status (pending, processing, failed, completed)
    res.json({
      jobId: job.id,
      status: job.status,
      result: job.result, 
      error: job.error
    });

  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

export default router;
