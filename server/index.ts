import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import analyzeRoutes from './routes/analyze.js';
import reportRoutes from './routes/reports.js';
import razorpayRoutes from './routes/razorpay.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/razorpay', razorpayRoutes);

app.listen(5000, () => {
  console.log('Backend API running on http://localhost:5000');
});
