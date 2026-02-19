import { useMemo } from 'react';
import { useMigration } from '@/contexts/MigrationContext';
import { useData } from '@/contexts/DataContext';

export function useMigrationAnalysis() {
  const { analysisResult, status, error, preferences, setPreferences, runAnalysis, clearAnalysis } = useMigration();
  const { collectedData, collectionStatus } = useData();

  const hasData = useMemo(() => {
    return collectionStatus === 'complete' && Object.keys(collectedData).length > 0;
  }, [collectedData, collectionStatus]);

  const resourceCounts = useMemo(() => {
    if (!hasData) return null;
    return {
      virtualServers: (collectedData['virtualServers'] ?? []).length,
      bareMetal: (collectedData['bareMetal'] ?? []).length,
      vlans: (collectedData['vlans'] ?? []).length,
      subnets: (collectedData['subnets'] ?? []).length,
      gateways: (collectedData['gateways'] ?? []).length,
      firewalls: (collectedData['firewalls'] ?? []).length,
      loadBalancers: (collectedData['loadBalancers'] ?? []).length,
      blockStorage: (collectedData['blockStorage'] ?? []).length,
      fileStorage: (collectedData['fileStorage'] ?? []).length,
      objectStorage: (collectedData['objectStorage'] ?? []).length,
      sslCertificates: (collectedData['sslCertificates'] ?? []).length,
      sshKeys: (collectedData['sshKeys'] ?? []).length,
      vpnTunnels: (collectedData['vpnTunnels'] ?? []).length,
      securityGroups: (collectedData['securityGroups'] ?? []).length,
    };
  }, [collectedData, hasData]);

  return {
    analysisResult,
    status,
    error,
    hasData,
    preferences,
    setPreferences,
    runAnalysis,
    clearAnalysis,
    resourceCounts,
  };
}
