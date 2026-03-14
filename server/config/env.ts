import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(), // Supabase anonymous key from .env
  JWT_SECRET: z.string(),
  REDIS_URL: z.string().url().optional(), // Optional for now, required for queues/caching later
  GROQ_API_KEY: z.string(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:\n', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
