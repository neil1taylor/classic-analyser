const API_KEY_PATTERNS = [
  /[A-Za-z0-9_-]{32,}/g,
  /apikey[:\s=]+[^\s,}"]+/gi,
  /[Bb]asic\s+[A-Za-z0-9+/=]{20,}/g,
  /[Bb]earer\s+[A-Za-z0-9._-]{20,}/g,
  /x-api-key[:\s=]+[^\s,}"]+/gi,
];

const SENSITIVE_KEYS = new Set([
  'apikey', 'api_key', 'api-key', 'authorization',
  'x-api-key', 'password', 'passwords', 'secret', 'token',
]);

function sanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    let sanitized = value;
    for (const pattern of API_KEY_PATTERNS) {
      sanitized = sanitized.replace(new RegExp(pattern.source, pattern.flags), '[REDACTED]');
    }
    return sanitized;
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitize(val);
      }
    }
    return sanitized;
  }
  return value;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = process.env.NODE_ENV === 'production';
const configuredLevel = (process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')) as LogLevel;
const minPriority = LEVEL_PRIORITY[configuredLevel] ?? 0;

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const sanitizedMeta = meta ? sanitize(meta) : undefined;
  const metaStr = sanitizedMeta && Object.keys(sanitizedMeta as object).length > 0
    ? ` ${JSON.stringify(sanitizedMeta)}`
    : '';

  if (isProduction) {
    return JSON.stringify({
      timestamp,
      level,
      message: sanitize(message),
      ...((sanitizedMeta as Record<string, unknown>) || {}),
    });
  }

  return `${timestamp} [${level.toUpperCase()}]: ${sanitize(message) as string}${metaStr}`;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_PRIORITY[level] < minPriority) return;
  const output = formatLog(level, message, meta);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};

export default logger;
