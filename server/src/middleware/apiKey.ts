import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Check for IAM Bearer token first
  const authHeader = req.headers['authorization'] as string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.length > 0) {
      req.iamToken = token;
      req.authMode = 'iam';
      next();
      return;
    }
  }

  // Fall back to API key
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey || apiKey.trim().length === 0) {
    logger.warn('Request rejected: missing API key or IAM token', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({
      error: 'Authentication required',
      message: 'Provide an IBM Cloud API key in the X-API-Key header or an IAM token in the Authorization header.',
    });
    return;
  }

  req.apiKey = apiKey.trim();
  req.authMode = 'apikey';
  next();
};
