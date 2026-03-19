import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGenerateExcelExport = vi.fn();
const mockApiKeyMiddleware = vi.fn((_req: unknown, _res: unknown, next: () => void) => next());

vi.mock('../services/export.js', () => ({
  generateExcelExport: (...args: unknown[]) => mockGenerateExcelExport(...(args as [unknown, unknown])),
}));

vi.mock('../middleware/apiKey.js', () => ({
  apiKeyMiddleware: (...args: unknown[]) => mockApiKeyMiddleware(...(args as [unknown, unknown, () => void])),
}));

// Import once after mocks are set up
const { default: router } = await import('./export.js');

describe('export route - POST /', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function callExportRoute(body: unknown) {

    // Find the POST / handler (skip middleware, get the actual handler)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = (router.stack as any[]).find(
      (l) => l.route?.path === '/' && l.route?.methods?.post
    );

    // The handler is the last in the route stack (after middleware)
    const handlers = layer!.route!.stack;
    const handler = handlers[handlers.length - 1].handle;

    const req = {
      headers: { 'x-api-key': 'test-key' },
      apiKey: 'test-key',
      body,
    } as unknown as import('express').Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      end: vi.fn(),
      headersSent: false,
    } as unknown as import('express').Response;

    const next = vi.fn();
    await handler(req, res, next);
    return res;
  }

  it('returns 400 when body data is not an object', async () => {
    const res = await callExportRoute('not-an-object');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid data' })
    );
  });

  it('sets correct content-type and disposition headers on success', async () => {
    const mockWorkbook = {
      xlsx: { write: vi.fn().mockResolvedValue(undefined) },
    };
    mockGenerateExcelExport.mockResolvedValue(mockWorkbook);

    const res = await callExportRoute({
      collectionTimestamp: '2024-01-01T00:00:00Z',
      account: { companyName: 'TestCo' },
    });

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('attachment; filename=')
    );
  });

  it('returns 500 on export generation error', async () => {
    mockGenerateExcelExport.mockRejectedValue(new Error('Excel error'));

    const res = await callExportRoute({
      collectionTimestamp: '2024-01-01T00:00:00Z',
      account: { companyName: 'TestCo' },
    });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Export failed' })
    );
  });
});
