export interface ReportBranding {
  clientName: string;
  companyName: string;
  authorName: string;
}

export interface ReportConfig {
  branding: ReportBranding;
  includeAI: boolean;
  aiNarratives?: Record<string, string>;
}

export type ReportSectionType =
  | 'executive_summary'
  | 'environment_overview'
  | 'migration_readiness'
  | 'compute_assessment'
  | 'network_assessment'
  | 'storage_assessment'
  | 'security_assessment'
  | 'cost_analysis'
  | 'recommendations';
