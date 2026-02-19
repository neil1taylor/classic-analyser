import { describe, it, expect } from 'vitest';
import { get, formatDate, formatBoolean, formatBytes, formatCurrency, formatValue } from './formatters';

describe('get', () => {
  it('retrieves a nested value', () => {
    expect(get({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined for missing path', () => {
    expect(get({ a: 1 }, 'b.c')).toBeUndefined();
  });

  it('returns undefined for null object', () => {
    expect(get(null as unknown as Record<string, unknown>, 'a')).toBeUndefined();
  });

  it('returns undefined for empty path', () => {
    expect(get({ a: 1 }, '')).toBeUndefined();
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    const result = formatDate('2024-06-15T10:30:00Z');
    expect(result).toBeTruthy();
    expect(result).toContain('2024');
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns original string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatBoolean', () => {
  it('returns Yes for true', () => {
    expect(formatBoolean(true)).toBe('Yes');
  });

  it('returns No for false', () => {
    expect(formatBoolean(false)).toBe('No');
  });

  it('returns Yes for 1', () => {
    expect(formatBoolean(1)).toBe('Yes');
  });

  it('returns No for 0', () => {
    expect(formatBoolean(0)).toBe('No');
  });

  it('returns Yes for string "true"', () => {
    expect(formatBoolean('true')).toBe('Yes');
  });

  it('returns No for string "false"', () => {
    expect(formatBoolean('false')).toBe('No');
  });

  it('returns empty string for null', () => {
    expect(formatBoolean(null)).toBe('');
  });
});

describe('formatBytes', () => {
  it('returns 0 B for zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.00 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1.00 GB');
  });

  it('returns empty string for null', () => {
    expect(formatBytes(null)).toBe('');
  });

  it('returns original value for NaN', () => {
    expect(formatBytes('abc')).toBe('abc');
  });
});

describe('formatCurrency', () => {
  it('formats number as USD currency', () => {
    const result = formatCurrency(42.5);
    expect(result).toBe('$42.50');
  });

  it('returns empty string for null', () => {
    expect(formatCurrency(null)).toBe('');
  });

  it('returns original value for NaN', () => {
    expect(formatCurrency('abc')).toBe('abc');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatValue', () => {
  it('dispatches to formatDate for date type', () => {
    const result = formatValue('2024-01-01T00:00:00Z', 'date');
    expect(result).toContain('2024');
  });

  it('dispatches to formatBoolean for boolean type', () => {
    expect(formatValue(true, 'boolean')).toBe('Yes');
  });

  it('dispatches to formatCurrency for currency type', () => {
    expect(formatValue(10, 'currency')).toBe('$10.00');
  });

  it('dispatches to formatBytes for bytes type', () => {
    expect(formatValue(1024, 'bytes')).toBe('1.00 KB');
  });

  it('returns raw value for id fields with number type', () => {
    expect(formatValue(12345, 'number', 'id')).toBe('12345');
  });

  it('returns formatted number for non-id number fields', () => {
    expect(formatValue(1000, 'number', 'count')).toBe('1,000');
  });

  it('returns empty string for null string type', () => {
    expect(formatValue(null, 'string')).toBe('');
  });
});
