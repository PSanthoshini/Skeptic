import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { env } from '../config/env.js';

const router = express.Router();

router.post('/signup', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await db
      .from('users')
      .insert([{ email, password: hashedPassword }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      throw error;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      env.JWT_SECRET, // Strictly enforced secret, no hardcoded fallbacks
      { expiresIn: '7d' }
    );
    const isProduction = env.NODE_ENV === 'production';
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: isProduction, 
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ user: { id: user.id, email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const isProduction = env.NODE_ENV === 'production';
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: isProduction, 
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie('token', { 
    httpOnly: true, 
    secure: isProduction, 
    sameSite: isProduction ? 'none' : 'lax' 
  });
  res.json({ success: true });
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const { data: user, error } = await db
    .from('users')
    .select('id, email, roasts_count, subscription_plan, subscription_status, subscription_start_date')
    .eq('id', req.user?.id)
    .single();

  if (error || !user) return res.status(404).json({ error: 'User not found' });

  res.json({ user: { ...user, analysis_count: user.roasts_count } });
});

export default router;
