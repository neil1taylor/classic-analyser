import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

function sanitizeMessage(message: string): string {
  // Remove anything that looks like an API key or token
  return message
    .replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/apikey[=:]\s*\S+/gi, 'apikey=[REDACTED]');
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const sanitized = sanitizeMessage(err.message);

  logger.error({
    message: sanitized,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = (err as Error & { statusCode?: number }).statusCode || 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : sanitized,
  });
}
