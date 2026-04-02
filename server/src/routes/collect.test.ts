import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockCollectAllData = vi.fn();
const mockApiKeyMiddleware = vi.fn((req: unknown, _res: unknown, next: () => void) => {
  (req as { apiKey: string; authMode: string }).apiKey = 'test-key';
  (req as { apiKey: string; authMode: string }).authMode = 'apikey';
  next();
});

vi.mock('../services/aggregator.js', () => ({
  collectAllData: (...args: unknown[]) => mockCollectAllData(...(args as [unknown, unknown, unknown])),
}));

vi.mock('../middleware/apiKey.js', () => ({
  apiKeyMiddleware: (...args: unknown[]) => mockApiKeyMiddleware(...(args as [unknown, unknown, () => void])),
}));

describe('collect route - GET /stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function callStreamRoute() {
    vi.resetModules();
    const mod = await import('./collect.js');
    const router = mod.default;

    const layer = (router.stack as any[]).find(
      (l) => l.route?.path === '/stream' && l.route?.methods?.get
    );

    const handlers = layer!.route!.stack;
    const handler = handlers[handlers.length - 1].handle;

    const closeHandlers: Array<() => void> = [];
    const req = {
      headers: { 'x-api-key': 'test-key' },
      apiKey: 'test-key',
      authMode: 'apikey',
      query: {},
      on: vi.fn((event: string, cb: () => void) => {
        if (event === 'close') closeHandlers.push(cb);
      }),
    } as unknown as import('express').Request;

    const written: string[] = [];
    const res = {
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      write: vi.fn((data: string) => { written.push(data); }),
      end: vi.fn(),
    } as unknown as import('express').Response;

    const next = vi.fn();
    const handlerPromise = handler(req, res, next);
    return { req, res, written, closeHandlers, handlerPromise };
  }

  it('sets SSE headers', async () => {
    mockCollectAllData.mockResolvedValue(undefined);

    const { res, handlerPromise } = await callStreamRoute();
    await handlerPromise;

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
  });

  it('sends connected event on start', async () => {
    mockCollectAllData.mockResolvedValue(undefined);

    const { written, handlerPromise } = await callStreamRoute();
    await handlerPromise;

    expect(written.some((w) => w.includes('event: connected'))).toBe(true);
  });

  it('calls collectAllData with API key', async () => {
    mockCollectAllData.mockResolvedValue(undefined);

    const { handlerPromise } = await callStreamRoute();
    await handlerPromise;

    expect(mockCollectAllData).toHaveBeenCalledWith(
      { apiKey: 'test-key' },
      expect.anything(),
      expect.objectContaining({ aborted: false }),
      { collectDiskUtil: false, skipBilling: false },
    );
  });

  it('sets aborted flag on client disconnect', async () => {
    mockCollectAllData.mockImplementation(async (_auth: unknown, _res: unknown, signal: { aborted: boolean }) => {
      // Simulate waiting
      await new Promise((r) => setTimeout(r, 10));
      expect(signal.aborted).toBe(true);
    });

    const { closeHandlers, handlerPromise } = await callStreamRoute();
    // Trigger disconnect
    closeHandlers.forEach((cb) => cb());
    await handlerPromise;
  });

  it('sends error event on collection failure', async () => {
    mockCollectAllData.mockRejectedValue(new Error('Collection failed'));

    const { written, handlerPromise } = await callStreamRoute();
    await handlerPromise;

    expect(written.some((w) => w.includes('event: error'))).toBe(true);
    expect(written.some((w) => w.includes('Collection failed'))).toBe(true);
  });
});
