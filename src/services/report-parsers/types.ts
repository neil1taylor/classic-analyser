import type { AccountInfo } from '@/types/resources';

export type ReportFileType =
  | 'warnings_csv'
  | 'gateway_csv'
  | 'nas_csv'
  | 'securitygroups_csv'
  | 'warnings_html'
  | 'overview_html'
  | 'summary_html'
  | 'inventory_html'
  | 'drawio'
  | 'json'
  | 'assessment_xlsx'
  | 'deviceinventory_xlsx'
  | 'consolidated_xlsx';

export interface ReportFileSet {
  accountId: string;
  files: Map<ReportFileType, File>;
}

export interface ReportTopologyEdge {
  id: string;
  source: string;
  sourceType: string;
  target: string;
  targetType: string;
  connectionType: 'PRIVATE_NATIVE' | 'PRIVATE_TRUNKED' | 'PUBLIC_NATIVE' | 'PUBLIC_TRUNKED' | 'IMPLICIT';
}

export interface ReportParserResult {
  data: Record<string, unknown[]>;
  accountInfo?: Partial<AccountInfo>;
  topology?: ReportTopologyEdge[];
}
