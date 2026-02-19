import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../utils/logger.js';

const router = Router();

const AI_PROXY_URL = process.env.AI_PROXY_URL;
const AI_PROXY_SECRET = process.env.AI_PROXY_SECRET;
const TIMEOUT_MS = 30_000;

function ensureConfigured(_req: Request, res: Response): boolean {
  if (!AI_PROXY_URL || !AI_PROXY_SECRET) {
    res.status(503).json({
      error: 'AI proxy not configured',
      message: 'AI_PROXY_URL and AI_PROXY_SECRET environment variables are required.',
    });
    return false;
  }
  return true;
}

router.get('/config', (_req: Request, res: Response): void => {
  res.json({ configured: !!(AI_PROXY_URL && AI_PROXY_SECRET) });
});

router.get('/health', async (req: Request, res: Response): Promise<void> => {
  if (!ensureConfigured(req, res)) return;

  try {
    const response = await fetch(`${AI_PROXY_URL}/health`, {
      method: 'GET',
      headers: { 'X-API-Key': AI_PROXY_SECRET! },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    logger.error('AI proxy health check failed', { error: (err as Error).message });
    res.status(502).json({ error: 'AI proxy unreachable' });
  }
});

async function forwardToProxy(subPath: string, req: Request, res: Response): Promise<void> {
  if (!ensureConfigured(req, res)) return;

  const targetUrl = `${AI_PROXY_URL}/api/${subPath}`;
  logger.info('AI proxy forwarding', { method: 'POST', subPath, targetUrl });

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_PROXY_SECRET!,
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const data = await response.json();
    logger.info('AI proxy response', { subPath, status: response.status });
    res.status(response.status).json(data);
  } catch (err) {
    logger.error('AI proxy request failed', {
      subPath,
      targetUrl,
      error: (err as Error).message,
    });
    res.status(502).json({ error: 'AI proxy request failed' });
  }
}

router.post('/insights', (req, res) => forwardToProxy('insights', req, res));
router.post('/chat', (req, res) => forwardToProxy('chat', req, res));
router.post('/cost-optimization', (req, res) => forwardToProxy('cost-optimization', req, res));
router.post('/report-narratives', (req, res) => forwardToProxy('report-narratives', req, res));

export default router;
