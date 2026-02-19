import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey || apiKey.trim().length === 0) {
    logger.warn('Request rejected: missing API key', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({
      error: 'API key required',
      message: 'Provide your IBM Cloud API key in the X-API-Key header.',
    });
    return;
  }

  req.apiKey = apiKey.trim();
  next();
};
