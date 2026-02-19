import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  let logger: typeof import('./logger.js').default;
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Set LOG_LEVEL to debug so all levels are enabled
    process.env.LOG_LEVEL = 'debug';
    vi.resetModules();
    const mod = await import('./logger.js');
    logger = mod.default;
  });

  afterEach(() => {
    process.env.LOG_LEVEL = originalLogLevel;
    vi.restoreAllMocks();
  });

  it('sanitizes API keys in log messages', () => {
    logger.error('Got key abcdefghijklmnopqrstuvwxyz1234567890 here');
    expect(console.error).toHaveBeenCalledTimes(1);
    const output = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('abcdefghijklmnopqrstuvwxyz1234567890');
  });

  it('sanitizes sensitive keys in metadata objects', () => {
    logger.error('test', { apikey: 'my-secret-key', safe: 'value' });
    const output = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('value');
  });

  it('sanitizes Basic auth headers in strings', () => {
    logger.error('Header Basic YXBpa2V5OnRlc3RrZXkxMjM0NTY=');
    const output = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(output).toContain('[REDACTED]');
  });

  it('sanitizes x-api-key references', () => {
    logger.error('test', { 'x-api-key': 'secret123' });
    const output = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(output).toContain('[REDACTED]');
  });

  it('routes error level to console.error', () => {
    logger.error('error message');
    expect(console.error).toHaveBeenCalled();
  });

  it('routes warn level to console.warn', () => {
    logger.warn('warn message');
    expect(console.warn).toHaveBeenCalled();
  });

  it('passes through non-sensitive metadata', () => {
    logger.error('msg', { count: 5 });
    const output = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(output).toContain('5');
  });
});
