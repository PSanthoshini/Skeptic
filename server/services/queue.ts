import { v4 as uuidv4 } from 'uuid';
import { scrapeWebsite } from './scraper.js';
import { generateReport } from './ai.js';
import { logger } from '../utils/logger.js';
import db from '../db.js';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  url: string;
  userId?: string;
  status: JobStatus;
  result?: any;
  error?: string;
  createdAt: number;
}

// In-Memory Fallback Queue to handle thousands of requests seamlessly without requiring a local Redis connection.
// An enterprise production environment on Render runs BullMQ pointing to a managed Redis instance.
const jobs = new Map<string, Job>();

// Concurrency Semaphore (Limits actual physical scraping / AI tasks running simultaneously)
let activeWorkers = 0;
const MAX_CONCURRENCY = 3; // Maximum heavy requests allowed to run simultaneously over the event loop

export const analyzeQueue = {
  add: async (name: string, data: { url: string; userId?: string }) => {
    const id = uuidv4();
    const job: Job = { id, url: data.url, userId: data.userId, status: 'pending', createdAt: Date.now() };
    jobs.set(id, job);
    
    // Non-blocking trigger of the runner
    setImmediate(() => {
      runQueue().catch(err => logger.error(`Queue Runner err: ${err}`));
    });

    return { id };
  },
  getJob: async (id: string) => {
    return jobs.get(id);
  }
};

async function runQueue() {
  if (activeWorkers >= MAX_CONCURRENCY) return;

  // Find oldest pending job
  let nextJob: Job | null = null;
  for (const job of jobs.values()) {
    if (job.status === 'pending') {
      if (!nextJob || job.createdAt < nextJob.createdAt) {
        nextJob = job;
      }
    }
  }

  if (!nextJob) return;

  activeWorkers++;
  await processJob(nextJob.id);
  activeWorkers--;

  // Check if more jobs are pending
  setImmediate(runQueue);
}

async function processJob(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'processing';
    logger.info(`START WORKER task for job ${jobId} (${job.url})`);

    // 1. Scrape Safe limits
    const content = await scrapeWebsite(job.url);
    
    // 2. Rate Limited AI request
    const analysis = await generateReport(content);

    // 3. Optional DB Save
    let reportId = null;
    if (job.userId) {
      const { data: report, error } = await db
        .from('reports')
        .insert([{
          user_id: job.userId,
          url: job.url,
          score: analysis.score,
          full_analysis: JSON.stringify(analysis),
          tone: 'professional'
        }])
        .select()
        .single();
        
      if (error) {
        logger.error(`Database fail saving for user ${job.userId}`);
        throw error;
      }
      reportId = report.id;
      
      // Update limits safely
      await db.rpc('increment_roasts_count', { user_id: job.userId });
    }

    job.status = 'completed';
    job.result = { analysis, reportId };
    logger.info(`FINISH WORKER task for job ${jobId} successfully`);

  } catch (error: any) {
    job.status = 'failed';
    job.error = error.message;
    logger.error(`WORKER FAILED for job ${jobId}: ${error.message}`);
  }
}
