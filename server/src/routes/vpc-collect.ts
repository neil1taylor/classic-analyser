import { Router } from 'express';
import type { Request, Response } from 'express';
import { apiKeyMiddleware } from '../middleware/apiKey.js';
import { collectAllVpcData } from '../services/vpc/aggregator.js';
import logger from '../utils/logger.js';

const router = Router();

router.get('/stream', apiKeyMiddleware, async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.apiKey!;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connection confirmation
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

  // Track cancellation
  const abortSignal = { aborted: false };

  req.on('close', () => {
    logger.info('Client disconnected from VPC SSE stream');
    abortSignal.aborted = true;
  });

  try {
    await collectAllVpcData(apiKey, res, abortSignal);
  } catch (err) {
    const error = err as Error;
    logger.error('VPC collection stream error', { message: error.message });

    if (!abortSignal.aborted) {
      try {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ fatal: true, message: error.message })}\n\n`);
      } catch {
        // connection already closed
      }
    }
  } finally {
    if (!abortSignal.aborted) {
      try {
        res.end();
      } catch {
        // connection already closed
      }
    }
  }
});

export default router;
