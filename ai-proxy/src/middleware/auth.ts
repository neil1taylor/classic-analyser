import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!config.AI_PROXY_SECRET) {
    res.status(500).json({ error: 'Server misconfigured: proxy secret not set' });
    return;
  }

  if (!apiKey) {
    res.status(401).json({ error: 'Missing X-API-Key header' });
    return;
  }

  if (apiKey !== config.AI_PROXY_SECRET) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  next();
}
