import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import xss from 'xss-clean';
import { env } from '../config/env.js';

// Global rate limiting
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

// Stricter rate limiting for API features
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiting (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 login attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later',
  },
});

// Helmet security headers (configured for REST API)
export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Adjust if strictly same-origin needed
});

// XSS Sanitization
export const xssSanitizer = xss();
