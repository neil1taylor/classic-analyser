import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('api service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('validateApiKey posts to /auth/validate with X-API-Key header', async () => {
    const mockAxios = {
      create: vi.fn().mockReturnValue({
        post: vi.fn().mockResolvedValue({
          data: {
            valid: true,
            account: { id: 1, companyName: 'Test', email: '', firstName: '', lastName: '' },
          },
        }),
        interceptors: { request: { use: vi.fn() } },
      }),
    };

    vi.doMock('axios', () => ({ default: mockAxios }));
    const { validateApiKey } = await import('./api');

    const result = await validateApiKey('my-key');
    expect(result.companyName).toBe('Test');

    const client = mockAxios.create.mock.results[0].value;
    expect(client.post).toHaveBeenCalledWith(
      '/auth/validate',
      {},
      expect.objectContaining({
        headers: { 'X-API-Key': 'my-key' },
      })
    );
  });

  it('setApiKeyForRequests stores key for interceptor', async () => {
    let interceptorFn: ((config: Record<string, Record<string, string>>) => Record<string, Record<string, string>>) | undefined;

    const mockAxios = {
      create: vi.fn().mockReturnValue({
        post: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: {
          request: {
            use: vi.fn((fn: typeof interceptorFn) => { interceptorFn = fn; }),
          },
        },
      }),
    };

    vi.doMock('axios', () => ({ default: mockAxios }));
    const { setApiKeyForRequests } = await import('./api');

    setApiKeyForRequests('my-api-key');

    const config = { headers: {} as Record<string, string> };
    const result = interceptorFn!(config);
    expect(result.headers['X-API-Key']).toBe('my-api-key');
  });

  it('collectDataStream creates SSE connection with correct headers', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: connected\ndata: {"status":"connected"}\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: complete\ndata: {"duration":1000}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    }));

    const mockAxios = {
      create: vi.fn().mockReturnValue({
        post: vi.fn(),
        interceptors: { request: { use: vi.fn() } },
      }),
    };
    vi.doMock('axios', () => ({ default: mockAxios }));

    const { collectDataStream } = await import('./api');

    const onComplete = vi.fn();
    collectDataStream('test-key', {
      onProgress: vi.fn(),
      onData: vi.fn(),
      onError: vi.fn(),
      onComplete,
    });

    // Wait for the async SSE processing
    await new Promise((r) => setTimeout(r, 100));

    expect(fetch).toHaveBeenCalledWith(
      '/api/collect/stream',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-Key': 'test-key' }),
      })
    );

    expect(onComplete).toHaveBeenCalledWith(1000);
  });
});
