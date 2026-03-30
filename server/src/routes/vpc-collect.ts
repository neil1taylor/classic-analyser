import { Router } from 'express';
import type { Request, Response } from 'express';
import { apiKeyMiddleware } from '../middleware/apiKey.js';
import { collectAllVpcData } from '../services/vpc/aggregator.js';
import logger from '../utils/logger.js';

const router = Router();

router.get('/stream', apiKeyMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    // C2: Global collection timeout (10 minutes) to prevent hung connections
    const COLLECTION_TIMEOUT_MS = 10 * 60 * 1000;
    const collectionTimeout = setTimeout(() => {
      if (!abortSignal.aborted) {
        abortSignal.aborted = true;
        try {
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({ fatal: true, message: 'Collection timed out after 10 minutes' })}\n\n`);
          res.end();
        } catch {
          // connection already closed
        }
      }
    }, COLLECTION_TIMEOUT_MS);

    // C2: Keepalive ping every 30 seconds
    const keepaliveInterval = setInterval(() => {
      if (!abortSignal.aborted) {
        try {
          res.write(`:keepalive\n\n`);
        } catch {
          // connection closed
        }
      }
    }, 30_000);

  try {
    const auth = req.authMode === 'iam'
      ? { iamToken: req.iamToken! }
      : { apiKey: req.apiKey! };
    await collectAllVpcData(auth, res, abortSignal);
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
    clearTimeout(collectionTimeout);
    clearInterval(keepaliveInterval);
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
