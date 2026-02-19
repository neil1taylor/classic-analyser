import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SoftLayerClient } from './client.js';

describe('SoftLayerClient', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('constructs correct URL with service and method', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    const client = new SoftLayerClient('testkey');
    await client.request({ service: 'SoftLayer_Account', method: 'getObject' });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.softlayer.com/rest/v3.1/SoftLayer_Account/getObject.json',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('includes objectMask in query string', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    const client = new SoftLayerClient('testkey');
    await client.request({
      service: 'SoftLayer_Account',
      method: 'getObject',
      objectMask: 'mask[id,companyName]',
    });

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('objectMask=mask[id,companyName]');
  });

  it('sends Basic auth header with base64-encoded API key', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const client = new SoftLayerClient('my-api-key');
    await client.request({ service: 'SoftLayer_Account', method: 'getObject' });

    const headers = fetchSpy.mock.calls[0][1].headers;
    const expectedAuth = `Basic ${Buffer.from('apikey:my-api-key').toString('base64')}`;
    expect(headers.Authorization).toBe(expectedAuth);
  });

  it('includes resultLimit and offset in query string', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1 }],
    });

    const client = new SoftLayerClient('testkey');
    await client.request({
      service: 'SoftLayer_Account',
      method: 'getVirtualGuests',
      resultLimit: 100,
      offset: 200,
    });

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('resultLimit=200,100');
  });

  it('throws on non-ok response with statusCode', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Not authorized',
    });

    const client = new SoftLayerClient('badkey');
    await expect(
      client.request({ service: 'SoftLayer_Account', method: 'getObject' })
    ).rejects.toThrow('SoftLayer API error: 401');
  });

  it('retries on 429 status code', async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

    const client = new SoftLayerClient('testkey');
    // Override sleep to avoid waiting
    (client as unknown as { sleep: (ms: number) => Promise<void> }).sleep = async () => {};

    const result = await client.request<{ id: number }>({
      service: 'SoftLayer_Account',
      method: 'getObject',
    });

    expect(result.id).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('paginates through all pages via requestAllPages', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({ id: 100 + i }));

    fetchSpy
      .mockResolvedValueOnce({ ok: true, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, json: async () => page2 });

    const client = new SoftLayerClient('testkey');
    const results = await client.requestAllPages<{ id: number }>({
      service: 'SoftLayer_Account',
      method: 'getVirtualGuests',
    });

    expect(results).toHaveLength(150);
    expect(results[0].id).toBe(0);
    expect(results[149].id).toBe(149);
  });

  it('handles non-array response in requestAllPages', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, name: 'single' }),
    });

    const client = new SoftLayerClient('testkey');
    const results = await client.requestAllPages<{ id: number }>({
      service: 'SoftLayer_Account',
      method: 'getObject',
    });

    expect(results).toHaveLength(1);
  });
});
