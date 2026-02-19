import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  MigrationPreferences,
  MigrationAnalysisOutput,
  MigrationAnalysisStatus,
  VPCPricingData,
} from '@/types/migration';
import { DEFAULT_PREFERENCES } from '@/types/migration';
import { runMigrationAnalysis } from '@/services/migration/index';
import { VPC_PROFILES, VPC_BARE_METAL_PROFILES, applyPricing, applyBareMetalPricing } from '@/services/migration/data/vpcProfiles';
import { fetchVPCPricing } from '@/services/api';
import { useData } from '@/contexts/DataContext';

interface MigrationContextValue {
  preferences: MigrationPreferences;
  analysisResult: MigrationAnalysisOutput | null;
  status: MigrationAnalysisStatus;
  error: string | null;
  pricingLoaded: boolean;
  pricing: VPCPricingData | null;
  setPreferences: (prefs: MigrationPreferences) => void;
  runAnalysis: () => void;
  clearAnalysis: () => void;
}

const MigrationContext = createContext<MigrationContextValue | undefined>(undefined);

export function useMigration(): MigrationContextValue {
  const context = useContext(MigrationContext);
  if (!context) {
    throw new Error('useMigration must be used within a MigrationProvider');
  }
  return context;
}

export function MigrationProvider({ children }: { children: React.ReactNode }) {
  const { collectedData } = useData();
  const [preferences, setPreferencesState] = useState<MigrationPreferences>(DEFAULT_PREFERENCES);
  const [analysisResult, setAnalysisResult] = useState<MigrationAnalysisOutput | null>(null);
  const [status, setStatus] = useState<MigrationAnalysisStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<VPCPricingData | null>(null);
  const [pricingLoaded, setPricingLoaded] = useState(false);

  // Fetch VPC pricing on mount
  useEffect(() => {
    let cancelled = false;
    fetchVPCPricing()
      .then((data) => {
        if (!cancelled) {
          setPricing(data);
          setPricingLoaded(true);
        }
      })
      .catch(() => {
        // Fallback: pricing remains null, static defaults in cost functions will be used
        if (!cancelled) {
          setPricingLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const setPreferences = useCallback((prefs: MigrationPreferences) => {
    setPreferencesState(prefs);
  }, []);

  const runAnalysis = useCallback(() => {
    setStatus('running');
    setError(null);

    // Use requestAnimationFrame to avoid blocking the UI
    requestAnimationFrame(() => {
      try {
        const pricedProfiles = applyPricing(VPC_PROFILES, pricing);
        const pricedBareMetalProfiles = applyBareMetalPricing(VPC_BARE_METAL_PROFILES, pricing);
        const result = runMigrationAnalysis(collectedData, preferences, pricedProfiles, pricing, pricedBareMetalProfiles);
        setAnalysisResult(result);
        setStatus('complete');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed');
        setStatus('error');
      }
    });
  }, [collectedData, preferences, pricing]);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setStatus('idle');
    setError(null);
  }, []);

  const value: MigrationContextValue = {
    preferences,
    analysisResult,
    status,
    error,
    pricingLoaded,
    pricing,
    setPreferences,
    runAnalysis,
    clearAnalysis,
  };

  return <MigrationContext.Provider value={value}>{children}</MigrationContext.Provider>;
}

export default MigrationContext;
