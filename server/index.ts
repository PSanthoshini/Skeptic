import { env } from './config/env.js'; // This validates env on startup
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import analyzeRoutes from './routes/analyze.js';
import reportRoutes from './routes/reports.js';
import razorpayRoutes from './routes/razorpay.js';

import { globalLimiter, securityHeaders, xssSanitizer } from './middleware/security.js';
import { globalErrorHandler } from './middleware/error.js';
import { logger } from './utils/logger.js';
import { NotFoundError } from './utils/errors.js';

const app = express();

// --- 1. Security & Global Middleware ---
app.use(securityHeaders);

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

app.use(globalLimiter);

// Parse JSON bodies mapping to limit size
app.use(express.json({ limit: '50kb' })); 
app.use(cookieParser());
app.use(xssSanitizer);

// --- 2. Logging ---
// Use Morgan for HTTP request logging, pipelined into Winston
const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: { write: (message: string) => logger.info(message.trim()) }
}));

// --- 3. Routes ---
// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: env.NODE_ENV, timestamp: new Date() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/analyze', analyzeRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/razorpay', razorpayRoutes);

// If an outdated client hits /api/ endpoint, gracefully redirect or fail
app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/razorpay', razorpayRoutes);

// --- 4. 404 & Global Error Handling ---
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
});

app.use(globalErrorHandler);

// --- 5. Boot Up ---
const server = app.listen(env.PORT, () => {
  logger.info(`Enterprise API running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
});

// --- 6. Graceful Shutdown ---
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err.name, message: err.message, stack: err.stack });
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    logger.info('💥 Process terminated!');
  });
});
