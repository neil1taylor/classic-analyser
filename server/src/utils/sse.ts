import type { Response } from 'express';

/**
 * Send a Server-Sent Event to the client.
 * Shared across all three domain aggregators (Classic, VPC, PowerVS).
 */
export function sendSSE(res: Response, event: string, data: unknown): void {
  try {
    if (!res.writableEnded) {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  } catch {
    // connection may be closed
  }
}
