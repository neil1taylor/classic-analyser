export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export type LogCategory =
  | 'API'
  | 'Collection'
  | 'SSE'
  | 'Import'
  | 'Export'
  | 'Auth'
  | 'UI';

const API_KEY_PATTERN = /[A-Za-z0-9_-]{32,}/g;

let currentLevel: LogLevel =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV
    ? LogLevel.DEBUG
    : LogLevel.INFO;

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

export function sanitize(value: string): string {
  return value.replace(API_KEY_PATTERN, '[REDACTED]');
}

function formatArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === 'string') return sanitize(arg);
    return arg;
  });
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
  table: (data: unknown) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
}

export function createLogger(category: LogCategory): Logger {
  const prefix = `[ClassicExplorer:${category}]`;

  return {
    debug: (...args: unknown[]) => {
      if (currentLevel <= LogLevel.DEBUG) {
        console.debug(prefix, ...formatArgs(args));
      }
    },
    info: (...args: unknown[]) => {
      if (currentLevel <= LogLevel.INFO) {
        console.info(prefix, ...formatArgs(args));
      }
    },
    warn: (...args: unknown[]) => {
      if (currentLevel <= LogLevel.WARN) {
        console.warn(prefix, ...formatArgs(args));
      }
    },
    error: (...args: unknown[]) => {
      if (currentLevel <= LogLevel.ERROR) {
        console.error(prefix, ...formatArgs(args));
      }
    },
    group: (label: string) => {
      console.group(`${prefix} ${label}`);
    },
    groupEnd: () => {
      console.groupEnd();
    },
    table: (data: unknown) => {
      console.table(data);
    },
    time: (label: string) => {
      console.time(`${prefix} ${label}`);
    },
    timeEnd: (label: string) => {
      console.timeEnd(`${prefix} ${label}`);
    },
  };
}
