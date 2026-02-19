export interface InsightsRequest {
  analysisData: object;
}

export interface InsightsResponse {
  executiveSummary: string;
  risks: {
    title: string;
    severity: string;
    description: string;
  }[];
  recommendations: string[];
}

export interface ChatRequest {
  messages: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  context: object;
}

export interface ChatResponse {
  response: string;
}

export interface CostOptimizationRequest {
  costData: object;
}

export interface CostOptimizationResponse {
  narrative: string;
  savings: {
    area: string;
    description: string;
    estimatedSaving: string;
  }[];
}

export interface ReportNarrativeRequest {
  sectionType: string;
  data: object;
}

export interface ReportNarrativeResponse {
  narrative: string;
}
