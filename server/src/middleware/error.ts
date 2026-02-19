import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    statusCode,
    errorCode: err.code,
    message: err.message,
    stack: isProduction ? undefined : err.stack,
  });

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
    code: err.code || 'INTERNAL_ERROR',
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  logger.debug('Route not found', { method: req.method, path: req.path });
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
};
