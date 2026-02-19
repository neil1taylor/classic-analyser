// ── AI Service Types ─────────────────────────────────────────────────────

export interface AIConfig {
  configured: boolean;
  enabled: boolean;
}

export interface AIInsightsResponse {
  executiveSummary: string;
  risks: AIRisk[];
  recommendations: string[];
}

export interface AIRisk {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AICostOptimizationResponse {
  narrative: string;
  savings: AISaving[];
}

export interface AISaving {
  area: string;
  description: string;
  estimatedSaving: string;
}

export interface AIReportNarrativeResponse {
  narrative: string;
}

export type AIReportSectionType =
  | 'executive_summary'
  | 'environment_overview'
  | 'migration_readiness'
  | 'compute_assessment'
  | 'network_assessment'
  | 'storage_assessment'
  | 'security_assessment'
  | 'cost_analysis'
  | 'recommendations';
