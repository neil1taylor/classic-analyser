import { describe, it, expect, vi, afterEach } from 'vitest';
import { errorHandler, notFoundHandler } from './error.js';
import type { Request, Response, NextFunction } from 'express';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/api/test',
    ...overrides,
  } as Request;
}

describe('errorHandler', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('returns 500 for errors without statusCode', () => {
    const res = mockRes();
    const err = new Error('something broke');
    errorHandler(err, mockReq(), res, vi.fn() as NextFunction);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal server error' })
    );
  });

  it('returns custom statusCode from error', () => {
    const res = mockRes();
    const err = Object.assign(new Error('bad request'), { statusCode: 400 });
    errorHandler(err, mockReq(), res, vi.fn() as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'bad request' })
    );
  });

  it('includes stack trace in non-production', () => {
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    const err = new Error('dev error');
    errorHandler(err, mockReq(), res, vi.fn() as NextFunction);

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.stack).toBeDefined();
  });

  it('excludes stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    const err = new Error('prod error');
    errorHandler(err, mockReq(), res, vi.fn() as NextFunction);

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.stack).toBeUndefined();
  });

  it('includes error code', () => {
    const res = mockRes();
    const err = Object.assign(new Error('x'), { code: 'CUSTOM_ERROR' });
    errorHandler(err, mockReq(), res, vi.fn() as NextFunction);

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe('CUSTOM_ERROR');
  });
});

describe('notFoundHandler', () => {
  it('returns 404 with route info', () => {
    const res = mockRes();
    notFoundHandler(mockReq({ method: 'POST', path: '/api/missing' } as Request), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Not found',
        code: 'NOT_FOUND',
        message: expect.stringContaining('/api/missing'),
      })
    );
  });
});
