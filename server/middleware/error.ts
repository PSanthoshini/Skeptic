import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn(`Operational Error: ${err.message}`, { path: req.path, ip: req.ip });
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Unhandled / Unexpected Errors
  logger.error('Unhandled Exception:', { error: err.message, stack: err.stack, path: req.path });
  
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
