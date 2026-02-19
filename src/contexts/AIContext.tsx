import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AIInsightsResponse, AIChatMessage, AICostOptimizationResponse } from '@/types/ai';
import type { MigrationAnalysisOutput, CostAnalysis } from '@/types/migration';
import { isAIConfigured, testConnection } from '@/services/ai/aiProxyClient';
import { fetchInsights } from '@/services/ai/insightsApi';
import { sendChat } from '@/services/ai/chatApi';
import { fetchCostOptimization } from '@/services/ai/costApi';
import { buildChatContext } from '@/services/ai/contextBuilders';
import { createLogger } from '@/utils/logger';

const log = createLogger('AI');

interface AIContextValue {
  isConfigured: boolean;
  isAvailable: boolean;
  // Insights
  insights: AIInsightsResponse | null;
  insightsLoading: boolean;
  insightsError: string | null;
  generateInsights: (result: MigrationAnalysisOutput) => Promise<void>;
  // Chat
  chatMessages: AIChatMessage[];
  chatLoading: boolean;
  sendChatMessage: (
    message: string,
    collectedData: Record<string, unknown[]>,
    analysisResult?: MigrationAnalysisOutput | null,
  ) => Promise<void>;
  clearChat: () => void;
  // Cost optimization
  costOptimization: AICostOptimizationResponse | null;
  costLoading: boolean;
  costError: string | null;
  generateCostOptimization: (costData: CostAnalysis) => Promise<void>;
  // Refresh availability
  refreshAvailability: () => Promise<void>;
}

const AIContext = createContext<AIContextValue | undefined>(undefined);

export function useAI(): AIContextValue {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [costOptimization, setCostOptimization] = useState<AICostOptimizationResponse | null>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);

  const refreshAvailability = useCallback(async () => {
    const configured = await isAIConfigured();
    setIsConfigured(configured);
    if (configured) {
      try {
        const healthy = await testConnection();
        setIsAvailable(healthy);
        log.info('AI proxy availability:', healthy);
      } catch {
        setIsAvailable(false);
      }
    } else {
      setIsAvailable(false);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  const generateInsights = useCallback(async (result: MigrationAnalysisOutput) => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const response = await fetchInsights(result);
      setInsights(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate insights';
      setInsightsError(msg);
      log.error('AI insights error:', msg);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const sendChatMessage = useCallback(async (
    message: string,
    collectedData: Record<string, unknown[]>,
    analysisResult?: MigrationAnalysisOutput | null,
  ) => {
    const userMsg: AIChatMessage = { role: 'user', content: message };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const context = buildChatContext(collectedData, analysisResult);
      const allMessages = [...chatMessages, userMsg];
      const response = await sendChat(allMessages, context);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get response';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatMessages]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  const generateCostOptimization = useCallback(async (costData: CostAnalysis) => {
    setCostLoading(true);
    setCostError(null);
    try {
      const response = await fetchCostOptimization(costData);
      setCostOptimization(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate cost optimization';
      setCostError(msg);
      log.error('AI cost optimization error:', msg);
    } finally {
      setCostLoading(false);
    }
  }, []);

  const value: AIContextValue = {
    isConfigured,
    isAvailable,
    insights,
    insightsLoading,
    insightsError,
    generateInsights,
    chatMessages,
    chatLoading,
    sendChatMessage,
    clearChat,
    costOptimization,
    costLoading,
    costError,
    generateCostOptimization,
    refreshAvailability,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export default AIContext;
