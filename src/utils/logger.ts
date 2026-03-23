import { pushLogEntry } from './logBuffer';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export type LogCategory =
  | 'AI'
  | 'API'
  | 'Collection'
  | 'SSE'
  | 'Import'
  | 'Export'
  | 'Auth'
  | 'OAuth'
  | 'PowerVS-API'
  | 'PowerVS-Collection'
  | 'PowerVS-Export'
  | 'UI'
  | 'VPC-API'
  | 'VPC-Collection'
  | 'VPC-Export'
  | 'Export-PDF'
  | 'Export-DOCX'
  | 'Export-PPTX'
  | 'Export-Handover'
  | 'ReportImport'
  | 'ReportCSV'
  | 'ReportHTML'
  | 'ReportDrawio'
  | 'ReportMerger'
  | 'ReportJSON'
  | 'ReportXLSX'
  | 'ImportReport'
  | 'ImportMDL';

export interface LogContext {
  [key: string]: unknown;
}

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

function extractMessage(args: unknown[]): string {
  return args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
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
      pushLogEntry({ timestamp: new Date().toISOString(), level: 'debug', module: category, message: extractMessage(args) });
    },
    info: (...args: unknown[]) => {
      if (currentLevel <= LogLevel.INFO) {
        console.info(prefix, ...formatArgs(args));
      }
      pushLogEntry({ timestamp: new Date().toISOString(), level: 'info', module: category, message: extractMessage(args) });
    },
    warn: (...args: unknown[]) => {
      if (currentLevel <= LogLevel.WARN) {
        console.warn(prefix, ...formatArgs(args));
      }
      pushLogEntry({ timestamp: new Date().toISOString(), level: 'warn', module: category, message: extractMessage(args) });
    },
    error: (...args: unknown[]) => {
      if (currentLevel <= LogLevel.ERROR) {
        console.error(prefix, ...formatArgs(args));
      }
      const errContext: Record<string, unknown> = {};
      for (const arg of args) {
        if (arg instanceof Error) {
          errContext.errorName = arg.name;
          errContext.errorMessage = arg.message;
        }
      }
      pushLogEntry({
        timestamp: new Date().toISOString(),
        level: 'error',
        module: category,
        message: extractMessage(args),
        context: Object.keys(errContext).length > 0 ? errContext : undefined,
      });
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
