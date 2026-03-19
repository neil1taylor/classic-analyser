import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { AIInsightsResponse, AIChatMessage, AICostOptimizationResponse } from '@/types/ai';
import type { MigrationAnalysisOutput, CostAnalysis } from '@/types/migration';
import { isAIConfigured, testConnection } from '@/services/ai/aiProxyClient';
import { fetchInsights } from '@/services/ai/insightsApi';
import { sendChat } from '@/services/ai/chatApi';
import { fetchCostOptimization } from '@/services/ai/costApi';
import { buildChatContext } from '@/services/ai/contextBuilders';
import { sendChatMessage, streamChatMessage } from '@/services/ai/client';
import { buildInfrastructureSummary } from '@/services/ai/context';
import { createLogger } from '@/utils/logger';

const log = createLogger('AI');

// ── Types ────────────────────────────────────────────────────────────────

interface AIConfigInfo {
  configured: boolean;
  watsonx: boolean;
  legacyProxy: boolean;
}

interface AIState {
  config: AIConfigInfo;
  isAvailable: boolean;
  // Insights
  insights: AIInsightsResponse | null;
  insightsLoading: boolean;
  insightsError: string | null;
  // Chat
  chatMessages: AIChatMessage[];
  chatLoading: boolean;
  streamingText: string;
  // Cost optimization
  costOptimization: AICostOptimizationResponse | null;
  costLoading: boolean;
  costError: string | null;
}

type AIAction =
  | { type: 'SET_CONFIG'; payload: AIConfigInfo }
  | { type: 'SET_AVAILABLE'; payload: boolean }
  | { type: 'INSIGHTS_LOADING' }
  | { type: 'INSIGHTS_SUCCESS'; payload: AIInsightsResponse }
  | { type: 'INSIGHTS_ERROR'; payload: string }
  | { type: 'CHAT_ADD_USER_MESSAGE'; payload: string }
  | { type: 'CHAT_LOADING'; payload: boolean }
  | { type: 'CHAT_STREAM_TOKEN'; payload: string }
  | { type: 'CHAT_ADD_ASSISTANT_MESSAGE'; payload: string }
  | { type: 'CHAT_ERROR'; payload: string }
  | { type: 'CHAT_CLEAR' }
  | { type: 'COST_LOADING' }
  | { type: 'COST_SUCCESS'; payload: AICostOptimizationResponse }
  | { type: 'COST_ERROR'; payload: string };

const initialState: AIState = {
  config: { configured: false, watsonx: false, legacyProxy: false },
  isAvailable: false,
  insights: null,
  insightsLoading: false,
  insightsError: null,
  chatMessages: [],
  chatLoading: false,
  streamingText: '',
  costOptimization: null,
  costLoading: false,
  costError: null,
};

function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    case 'SET_AVAILABLE':
      return { ...state, isAvailable: action.payload };
    case 'INSIGHTS_LOADING':
      return { ...state, insightsLoading: true, insightsError: null };
    case 'INSIGHTS_SUCCESS':
      return { ...state, insightsLoading: false, insights: action.payload };
    case 'INSIGHTS_ERROR':
      return { ...state, insightsLoading: false, insightsError: action.payload };
    case 'CHAT_ADD_USER_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, { role: 'user', content: action.payload }],
      };
    case 'CHAT_LOADING':
      return { ...state, chatLoading: action.payload, streamingText: action.payload ? '' : state.streamingText };
    case 'CHAT_STREAM_TOKEN':
      return { ...state, streamingText: state.streamingText + action.payload };
    case 'CHAT_ADD_ASSISTANT_MESSAGE':
      return {
        ...state,
        chatLoading: false,
        streamingText: '',
        chatMessages: [...state.chatMessages, { role: 'assistant', content: action.payload }],
      };
    case 'CHAT_ERROR':
      return {
        ...state,
        chatLoading: false,
        streamingText: '',
        chatMessages: [
          ...state.chatMessages,
          { role: 'assistant', content: `Error: ${action.payload}` },
        ],
      };
    case 'CHAT_CLEAR':
      return { ...state, chatMessages: [], streamingText: '' };
    case 'COST_LOADING':
      return { ...state, costLoading: true, costError: null };
    case 'COST_SUCCESS':
      return { ...state, costLoading: false, costOptimization: action.payload };
    case 'COST_ERROR':
      return { ...state, costLoading: false, costError: action.payload };
    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────────────────

interface AIContextValue {
  isConfigured: boolean;
  isAvailable: boolean;
  isWatsonx: boolean;
  // Insights
  insights: AIInsightsResponse | null;
  insightsLoading: boolean;
  insightsError: string | null;
  generateInsights: (result: MigrationAnalysisOutput) => Promise<void>;
  // Chat
  chatMessages: AIChatMessage[];
  chatLoading: boolean;
  streamingText: string;
  sendChatMessage: (
    message: string,
    collectedData: Record<string, unknown[]>,
    analysisResult?: MigrationAnalysisOutput | null,
    apiKey?: string,
  ) => Promise<void>;
  sendInfrastructureChat: (
    message: string,
    apiKey: string,
    classicData?: Record<string, unknown[]>,
    vpcData?: Record<string, unknown[]>,
    powerVsData?: Record<string, unknown[]>,
  ) => Promise<void>;
  clearChat: () => void;
  // Cost optimization
  costOptimization: AICostOptimizationResponse | null;
  costLoading: boolean;
  costError: string | null;
  generateCostOptimization: (costData: CostAnalysis) => Promise<void>;
  // Refresh
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

// ── Provider ─────────────────────────────────────────────────────────────

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiReducer, initialState);

  const refreshAvailability = useCallback(async () => {
    // Check configuration details from the server
    try {
      const res = await fetch('/api/ai/config');
      if (res.ok) {
        const configData = (await res.json()) as AIConfigInfo;
        dispatch({ type: 'SET_CONFIG', payload: configData });

        if (!configData.configured) {
          dispatch({ type: 'SET_AVAILABLE', payload: false });
          return;
        }
      } else {
        dispatch({ type: 'SET_AVAILABLE', payload: false });
        return;
      }
    } catch {
      dispatch({ type: 'SET_AVAILABLE', payload: false });
      return;
    }

    // Check if AI features are enabled in user preferences
    const configured = await isAIConfigured();
    if (!configured) {
      dispatch({ type: 'SET_AVAILABLE', payload: false });
      return;
    }

    try {
      const healthy = await testConnection();
      dispatch({ type: 'SET_AVAILABLE', payload: healthy });
      log.info('AI availability:', healthy);
    } catch {
      dispatch({ type: 'SET_AVAILABLE', payload: false });
    }
  }, []);

  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  const generateInsights = useCallback(async (result: MigrationAnalysisOutput) => {
    dispatch({ type: 'INSIGHTS_LOADING' });
    try {
      const response = await fetchInsights(result);
      dispatch({ type: 'INSIGHTS_SUCCESS', payload: response });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate insights';
      dispatch({ type: 'INSIGHTS_ERROR', payload: msg });
      log.error('AI insights error:', msg);
      // On 503, mark as unavailable (graceful degradation)
      if (msg.includes('503') || msg.includes('unavailable')) {
        dispatch({ type: 'SET_AVAILABLE', payload: false });
      }
    }
  }, []);

  // Legacy chat — uses proxy client (no API key header needed)
  const handleSendChatMessage = useCallback(
    async (
      message: string,
      collectedData: Record<string, unknown[]>,
      analysisResult?: MigrationAnalysisOutput | null,
      apiKey?: string,
    ) => {
      dispatch({ type: 'CHAT_ADD_USER_MESSAGE', payload: message });
      dispatch({ type: 'CHAT_LOADING', payload: true });

      try {
        // If we have an API key and watsonx is configured, use direct client with streaming
        if (apiKey && state.config.watsonx) {
          const context = buildChatContext(collectedData, analysisResult);
          const allMessages: AIChatMessage[] = [
            ...state.chatMessages,
            { role: 'user', content: message },
          ];

          let fullText = '';
          await new Promise<void>((resolve, reject) => {
            streamChatMessage(
              { messages: allMessages, context: context as Record<string, unknown> },
              apiKey,
              {
                onToken: (text) => {
                  fullText += text;
                  dispatch({ type: 'CHAT_STREAM_TOKEN', payload: text });
                },
                onDone: () => {
                  dispatch({
                    type: 'CHAT_ADD_ASSISTANT_MESSAGE',
                    payload: fullText || 'No response received.',
                  });
                  resolve();
                },
                onError: (error) => {
                  reject(new Error(error));
                },
              },
            );
          });
        } else {
          // Fall back to legacy proxy
          const context = buildChatContext(collectedData, analysisResult);
          const allMessages: AIChatMessage[] = [
            ...state.chatMessages,
            { role: 'user', content: message },
          ];
          const response = await sendChat(allMessages, context);
          dispatch({ type: 'CHAT_ADD_ASSISTANT_MESSAGE', payload: response });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to get response';
        dispatch({ type: 'CHAT_ERROR', payload: msg });
        if (msg.includes('503') || msg.includes('unavailable')) {
          dispatch({ type: 'SET_AVAILABLE', payload: false });
        }
      }
    },
    [state.chatMessages, state.config.watsonx],
  );

  // New infrastructure-focused chat — uses watsonx.ai direct with full context
  const sendInfrastructureChat = useCallback(
    async (
      message: string,
      apiKey: string,
      classicData?: Record<string, unknown[]>,
      vpcData?: Record<string, unknown[]>,
      powerVsData?: Record<string, unknown[]>,
    ) => {
      dispatch({ type: 'CHAT_ADD_USER_MESSAGE', payload: message });
      dispatch({ type: 'CHAT_LOADING', payload: true });

      try {
        const context = buildInfrastructureSummary(classicData, vpcData, powerVsData);
        const allMessages: AIChatMessage[] = [
          ...state.chatMessages,
          { role: 'user', content: message },
        ];

        // Try streaming first if watsonx is available
        if (state.config.watsonx) {
          let fullText = '';
          await new Promise<void>((resolve, reject) => {
            streamChatMessage(
              { messages: allMessages, context },
              apiKey,
              {
                onToken: (text) => {
                  fullText += text;
                  dispatch({ type: 'CHAT_STREAM_TOKEN', payload: text });
                },
                onDone: () => {
                  dispatch({
                    type: 'CHAT_ADD_ASSISTANT_MESSAGE',
                    payload: fullText || 'No response received.',
                  });
                  resolve();
                },
                onError: (error) => reject(new Error(error)),
              },
            );
          });
        } else {
          // Non-streaming fallback
          const response = await sendChatMessage(
            { messages: allMessages, context },
            apiKey,
          );
          dispatch({
            type: 'CHAT_ADD_ASSISTANT_MESSAGE',
            payload: response || 'No response received.',
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to get response';
        dispatch({ type: 'CHAT_ERROR', payload: msg });
        if (msg.includes('503') || msg.includes('unavailable')) {
          dispatch({ type: 'SET_AVAILABLE', payload: false });
        }
      }
    },
    [state.chatMessages, state.config.watsonx],
  );

  const clearChat = useCallback(() => {
    dispatch({ type: 'CHAT_CLEAR' });
  }, []);

  const generateCostOptimization = useCallback(async (costData: CostAnalysis) => {
    dispatch({ type: 'COST_LOADING' });
    try {
      const response = await fetchCostOptimization(costData);
      dispatch({ type: 'COST_SUCCESS', payload: response });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate cost optimization';
      dispatch({ type: 'COST_ERROR', payload: msg });
      log.error('AI cost optimization error:', msg);
      if (msg.includes('503') || msg.includes('unavailable')) {
        dispatch({ type: 'SET_AVAILABLE', payload: false });
      }
    }
  }, []);

  const value: AIContextValue = {
    isConfigured: state.config.configured,
    isAvailable: state.isAvailable,
    isWatsonx: state.config.watsonx,
    insights: state.insights,
    insightsLoading: state.insightsLoading,
    insightsError: state.insightsError,
    generateInsights,
    chatMessages: state.chatMessages,
    chatLoading: state.chatLoading,
    streamingText: state.streamingText,
    sendChatMessage: handleSendChatMessage,
    sendInfrastructureChat,
    clearChat,
    costOptimization: state.costOptimization,
    costLoading: state.costLoading,
    costError: state.costError,
    generateCostOptimization,
    refreshAvailability,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export default AIContext;
