// Focused hook for AI cost optimization — thin wrapper over AIContext
import { useAI } from '@/contexts/AIContext';

export function useAICostAnalysis() {
  const { costOptimization, costLoading, costError, generateCostOptimization, isAvailable } = useAI();

  return {
    costOptimization,
    isLoading: costLoading,
    error: costError,
    generateCostOptimization,
    isAvailable,
  };
}
