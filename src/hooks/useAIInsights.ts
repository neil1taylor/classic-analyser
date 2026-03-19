// Focused hook for AI insights — thin wrapper over AIContext
import { useAI } from '@/contexts/AIContext';

export function useAIInsights() {
  const { insights, insightsLoading, insightsError, generateInsights, isAvailable } = useAI();

  return {
    insights,
    isLoading: insightsLoading,
    error: insightsError,
    generateInsights,
    isAvailable,
  };
}
