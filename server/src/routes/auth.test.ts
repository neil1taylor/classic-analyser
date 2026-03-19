import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let mockRequest = vi.fn();

vi.mock('../services/softlayer/client.js', () => {
  return {
    SoftLayerClient: class {
      request(...args: unknown[]) {
        return mockRequest(...args);
      }
    },
  };
});

describe('auth route - POST /validate', () => {
  beforeEach(() => {
    mockRequest = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function importAndCall(headers: Record<string, string>, body = {}) {
    vi.resetModules();
    // Re-import the module to get fresh router
    const mod = await import('./auth.js');
    const router = mod.default;

    // Find the POST /validate handler
    const layer = (router.stack as any[]).find(
      (l) => l.route?.path === '/validate' && l.route?.methods?.post
    );

    const handler = layer!.route!.stack[0].handle;

    const req = { headers, body } as unknown as import('express').Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as import('express').Response;
    const next = vi.fn();

    await handler(req, res, next);
    return res;
  }

  it('returns valid:true with account info on success', async () => {
    mockRequest.mockResolvedValue({
      id: 123,
      companyName: 'TestCo',
      email: 'a@b.com',
      firstName: 'John',
      lastName: 'Doe',
    });

    const res = await importAndCall({ 'x-api-key': 'good-key' });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        valid: true,
        account: expect.objectContaining({ id: 123, companyName: 'TestCo' }),
      })
    );
  });

  it('returns 401 when API key is missing', async () => {
    const res = await importAndCall({});
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'API key required' })
    );
  });

  it('returns 401 on 401 statusCode error', async () => {
    const err = Object.assign(new Error('Unauthorized'), { statusCode: 401, body: '' });
    mockRequest.mockRejectedValue(err);

    const res = await importAndCall({ 'x-api-key': 'bad-key' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ valid: false, error: 'Invalid API key' })
    );
  });

  it('returns 502 on other errors', async () => {
    const err = Object.assign(new Error('Service down'), { statusCode: 500, body: 'timeout' });
    mockRequest.mockRejectedValue(err);

    const res = await importAndCall({ 'x-api-key': 'some-key' });
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('returns 401 when error body contains auth-related keywords', async () => {
    const err = Object.assign(new Error('Error'), { statusCode: 500, body: 'invalid api key was provided' });
    mockRequest.mockRejectedValue(err);

    const res = await importAndCall({ 'x-api-key': 'some-key' });
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
