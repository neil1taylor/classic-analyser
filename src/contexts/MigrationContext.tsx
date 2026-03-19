import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
  const [pricingFetchedRegion, setPricingFetchedRegion] = useState<string | null>(null);
  const lastFetchedRegion = useRef<string | null>(null);

  const pricingLoaded = pricingFetchedRegion === preferences.targetRegion;

  // Fetch VPC pricing on mount and when target region changes
  useEffect(() => {
    const region = preferences.targetRegion;
    // Skip if we already fetched for this region
    if (lastFetchedRegion.current === region) return;

    let cancelled = false;
    lastFetchedRegion.current = region;
    fetchVPCPricing(region)
      .then((data) => {
        if (!cancelled) {
          setPricing(data);
          setPricingFetchedRegion(region);
        }
      })
      .catch(() => {
        // Fallback: pricing remains null, static defaults in cost functions will be used
        if (!cancelled) {
          setPricingFetchedRegion(region);
        }
      });
    return () => { cancelled = true; };
  }, [preferences.targetRegion]);

  const setPreferences = useCallback((prefs: MigrationPreferences) => {
    setPreferencesState(prefs);
  }, []);

  const runAnalysis = useCallback(() => {
    setStatus('running');
    setError(null);

    // Use requestAnimationFrame to avoid blocking the UI
    requestAnimationFrame(() => {
      try {
        const targetRegion = preferences.targetRegion;
        const pricedProfiles = applyPricing(VPC_PROFILES, pricing, targetRegion);
        const pricedBareMetalProfiles = applyBareMetalPricing(VPC_BARE_METAL_PROFILES, pricing, targetRegion);
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
