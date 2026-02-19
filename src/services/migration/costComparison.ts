import type { CostAnalysis, ComputeAssessment, StorageAssessment, NetworkAssessment, MigrationPreferences, VPCPricingData } from '@/types/migration';
import { getVPCStorageCostPerGB, getVPCFileCostPerGB, getVPCLBMonthlyCost, getVPCVPNMonthlyCost } from './data/vpcCostEstimates';

export function analyzeCosts(
  compute: ComputeAssessment,
  storage: StorageAssessment,
  network: NetworkAssessment,
  _preferences: MigrationPreferences,
  pricing?: VPCPricingData | null,
): CostAnalysis {
  // Classic compute costs
  const classicComputeCost =
    compute.vsiMigrations.reduce((sum, v) => sum + v.currentFee, 0) +
    compute.bareMetalMigrations.reduce((sum, b) => sum + b.currentFee, 0);

  // VPC compute costs (from recommended profiles)
  const vpcComputeCost =
    compute.vsiMigrations.reduce((sum, v) => sum + (v.recommendedProfile?.estimatedCost ?? 0), 0) +
    compute.bareMetalMigrations.reduce((sum, b) => {
      if (b.migrationPath === 'vpc-vsi') {
        return sum + (b.recommendedProfile?.estimatedCost ?? b.currentFee * 0.6);
      }
      if (b.migrationPath === 'vpc-bare-metal') {
        return sum + (b.recommendedProfile?.estimatedCost ?? b.currentFee * 0.9);
      }
      return sum + b.currentFee; // not migratable — keep same cost
    }, 0);

  // Classic storage costs
  const classicStorageCost =
    storage.blockStorage.volumeAssessments.reduce((sum, v) => sum + v.currentFee, 0) +
    storage.fileStorage.volumeAssessments.reduce((sum, v) => sum + v.currentFee, 0);

  // VPC storage costs
  const vpcBlockCost = storage.blockStorage.volumeAssessments.reduce((sum, v) => {
    return sum + (v.capacityGB * getVPCStorageCostPerGB(v.vpcProfile, pricing));
  }, 0);
  const vpcFileCost = storage.fileStorage.volumeAssessments.reduce((sum, v) => {
    return sum + (v.capacityGB * getVPCFileCostPerGB(pricing));
  }, 0);
  const vpcStorageCost = vpcBlockCost + vpcFileCost;

  // Classic network costs (firewalls, LBs)
  const classicNetworkCost =
    (network.firewallAnalysis.totalFirewalls * 50) + // rough estimate
    (network.loadBalancerAnalysis.totalLBs * 50) +
    (network.vpnAnalysis.totalTunnels * 80);

  // VPC network costs
  const vpcNetworkCost =
    (network.loadBalancerAnalysis.totalLBs * getVPCLBMonthlyCost(pricing)) +
    (network.vpnAnalysis.totalTunnels * getVPCVPNMonthlyCost(pricing));

  const classicMonthlyCost = classicComputeCost + classicStorageCost + classicNetworkCost;
  const vpcMonthlyCost = vpcComputeCost + vpcStorageCost + vpcNetworkCost;
  const monthlyDifference = classicMonthlyCost - vpcMonthlyCost;
  const percentageChange = classicMonthlyCost > 0
    ? Math.round(((vpcMonthlyCost - classicMonthlyCost) / classicMonthlyCost) * 100)
    : 0;

  // Break-even: assume migration one-time cost roughly 2x one month's VPC cost
  const migrationOneTimeCost = vpcMonthlyCost * 2;
  const breakEvenMonths = monthlyDifference > 0
    ? Math.ceil(migrationOneTimeCost / monthlyDifference)
    : 0;

  const threeYearSavings = (monthlyDifference * 36) - migrationOneTimeCost;

  return {
    classicMonthlyCost: Math.round(classicMonthlyCost * 100) / 100,
    vpcMonthlyCost: Math.round(vpcMonthlyCost * 100) / 100,
    monthlyDifference: Math.round(monthlyDifference * 100) / 100,
    percentageChange,
    breakEvenMonths,
    threeYearSavings: Math.round(threeYearSavings * 100) / 100,
    costByCategory: {
      compute: {
        classic: Math.round(classicComputeCost * 100) / 100,
        vpc: Math.round(vpcComputeCost * 100) / 100,
      },
      storage: {
        classic: Math.round(classicStorageCost * 100) / 100,
        vpc: Math.round(vpcStorageCost * 100) / 100,
      },
      network: {
        classic: Math.round(classicNetworkCost * 100) / 100,
        vpc: Math.round(vpcNetworkCost * 100) / 100,
      },
    },
  };
}
