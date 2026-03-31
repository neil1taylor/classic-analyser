/**
 * Shared types for export services.
 */

export type ExportFormat = 'xlsx' | 'pdf' | 'docx' | 'pptx' | 'handover';

export type InfrastructureDomain = 'classic' | 'vpc' | 'powervs' | 'platform';

export interface ExportOptions {
  format: ExportFormat;
  accountName: string;
  domain: InfrastructureDomain;
  /** Page size for PDF export */
  pageSize?: 'a4' | 'letter';
  /** Optional client name for cover pages */
  clientName?: string;
}

export interface ExportData {
  data: Record<string, unknown[]>;
  accountName: string;
  domain: InfrastructureDomain;
  timestamp: string;
}

/** Resource type metadata needed by export services */
export interface ResourceTypeMeta {
  key: string;
  label: string;
  category: string;
  columns: Array<{
    field: string;
    header: string;
    dataType: string;
    defaultVisible: boolean;
  }>;
}
