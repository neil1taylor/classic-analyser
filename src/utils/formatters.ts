import type { ColumnDataType } from '@/types/resources';

export function get(obj: Record<string, unknown>, path: string): unknown {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const date = new Date(value as string);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBoolean(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (value === true || value === 1 || value === '1' || value === 'true') return 'Yes';
  if (value === false || value === 0 || value === '0' || value === 'false') return 'No';
  return String(value);
}

export function formatArray(value: unknown): string {
  if (!Array.isArray(value)) return value === null || value === undefined ? '' : String(value);
  return value.join(', ');
}

export function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US');
}

export function formatBytes(bytes: unknown): string {
  if (bytes === null || bytes === undefined || bytes === '') return '';
  const num = Number(bytes);
  if (isNaN(num)) return String(bytes);
  if (num === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(num) / Math.log(1024));
  const index = Math.min(i, units.length - 1);
  return `${(num / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export function formatCurrency(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

const ID_FIELD_PATTERN = /(?:^id$|Id$|_id$)/;

function isIdField(field?: string): boolean {
  return field !== undefined && ID_FIELD_PATTERN.test(field);
}

export function formatValue(value: unknown, dataType: ColumnDataType, field?: string): string {
  switch (dataType) {
    case 'date':
      return formatDate(value);
    case 'boolean':
      return formatBoolean(value);
    case 'number':
      if (isIdField(field)) {
        return value === null || value === undefined || value === '' ? '' : String(value);
      }
      return formatNumber(value);
    case 'currency':
      return formatCurrency(value);
    case 'bytes':
      return formatBytes(value);
    case 'array':
      return formatArray(value);
    case 'string':
    default:
      return value === null || value === undefined ? '' : String(value);
  }
}
