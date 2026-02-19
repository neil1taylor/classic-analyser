import { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30;

interface WindowEntry {
  timestamps: number[];
}

const clients = new Map<string, WindowEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of clients.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      clients.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = clients.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    clients.set(ip, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((entry.timestamps[0] + WINDOW_MS - now) / 1000),
    });
    return;
  }

  entry.timestamps.push(now);
  next();
}
