import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import analyzeRoutes from './routes/analyze.js';
import reportRoutes from './routes/reports.js';
import stripeRoutes from './routes/stripe.js';

dotenv.config({ path: '.env' });

const app = express();

// CORS: Dynamically allow the requester's origin
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stripe', stripeRoutes);

// Hardcoded Port
app.listen(5000);
