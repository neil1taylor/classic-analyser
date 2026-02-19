import { describe, it, expect, vi } from 'vitest';
import { apiKeyMiddleware } from './apiKey.js';
import type { Request, Response, NextFunction } from 'express';

function mockReqRes(headers: Record<string, string> = {}) {
  const req = {
    headers,
    method: 'GET',
    path: '/api/test',
    ip: '127.0.0.1',
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe('apiKeyMiddleware', () => {
  it('calls next() and sets req.apiKey when key is present', () => {
    const { req, res, next } = mockReqRes({ 'x-api-key': 'valid-key-here' });
    apiKeyMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.apiKey).toBe('valid-key-here');
  });

  it('returns 401 when X-API-Key header is missing', () => {
    const { req, res, next } = mockReqRes({});
    apiKeyMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'API key required' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when X-API-Key header is empty string', () => {
    const { req, res, next } = mockReqRes({ 'x-api-key': '' });
    apiKeyMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when X-API-Key header is whitespace', () => {
    const { req, res, next } = mockReqRes({ 'x-api-key': '   ' });
    apiKeyMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('trims the API key before setting it', () => {
    const { req, res, next } = mockReqRes({ 'x-api-key': '  my-key  ' });
    apiKeyMiddleware(req, res, next);

    expect(req.apiKey).toBe('my-key');
    expect(next).toHaveBeenCalled();
  });
});
