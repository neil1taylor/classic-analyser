import type { ReportParserResult } from './types';
import type { AccountInfo } from '@/types/resources';
import { createLogger } from '@/utils/logger';

const log = createLogger('ReportJSON');

/**
 * Parse the JSON output from mdl-to-json.py.
 * The JSON structure already has resource keys matching the app schemas.
 */
export function parseReportJson(text: string): ReportParserResult {
  const raw = JSON.parse(text);
  const data: Record<string, unknown[]> = {};
  let accountInfo: Partial<AccountInfo> | undefined;

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'account' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      accountInfo = mapAccountInfo(value as Record<string, unknown>);
    } else if (Array.isArray(value) && !key.startsWith('_')) {
      data[key] = value;
    }
  }

  const total = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
  log.info(`Parsed JSON: ${total} resources across ${Object.keys(data).length} types`);

  return { data, accountInfo };
}

function mapAccountInfo(account: Record<string, unknown>): Partial<AccountInfo> {
  return {
    id: typeof account.id === 'number' ? account.id : undefined,
    companyName: typeof account.companyName === 'string' ? account.companyName : undefined,
    email: typeof account.email === 'string' ? account.email : undefined,
    firstName: typeof account.firstName === 'string' ? account.firstName : undefined,
    lastName: typeof account.lastName === 'string' ? account.lastName : undefined,
  };
}
