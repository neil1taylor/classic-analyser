import type { VPCCostEstimate, VPCPricingData } from '@/types/migration';

// Approximate VPC monthly costs for comparison purposes
export const VPC_COST_ESTIMATES: VPCCostEstimate[] = [
  // Block storage (per GB/month)
  { resource: 'block-storage-general', unit: 'GB/month', monthlyCost: 0.10 },
  { resource: 'block-storage-5iops', unit: 'GB/month', monthlyCost: 0.13 },
  { resource: 'block-storage-10iops', unit: 'GB/month', monthlyCost: 0.20 },
  // File storage (per GB/month)
  { resource: 'file-storage', unit: 'GB/month', monthlyCost: 0.12 },
  // Floating IP
  { resource: 'floating-ip', unit: 'per IP/month', monthlyCost: 5.00 },
  // VPN Gateway
  { resource: 'vpn-gateway', unit: 'per gateway/month', monthlyCost: 90.00 },
  // Load Balancer
  { resource: 'application-lb', unit: 'per LB/month', monthlyCost: 22.00 },
  { resource: 'network-lb', unit: 'per LB/month', monthlyCost: 22.00 },
];

// Default storage costs (used when no dynamic pricing is available)
const DEFAULT_STORAGE: VPCPricingData['storage'] = {
  'block-general': 0.10,
  'block-5iops': 0.13,
  'block-10iops': 0.20,
  file: 0.12,
};

const DEFAULT_NETWORK: VPCPricingData['network'] = {
  'floating-ip': 5.00,
  'vpn-gateway': 90.00,
  'load-balancer': 22.00,
};

export function getVPCStorageCostPerGB(tier: string, pricing?: VPCPricingData | null): number {
  const storage = pricing?.storage ?? DEFAULT_STORAGE;
  if (tier.includes('general') || tier.includes('0.25')) return storage['block-general'];
  if (tier.includes('5iops') || tier.includes('2')) return storage['block-5iops'];
  return storage['block-10iops']; // 10iops or custom
}

export function getVPCFileCostPerGB(pricing?: VPCPricingData | null): number {
  return pricing?.storage?.file ?? DEFAULT_STORAGE.file;
}

export function getVPCLBMonthlyCost(pricing?: VPCPricingData | null): number {
  return pricing?.network?.['load-balancer'] ?? DEFAULT_NETWORK['load-balancer'];
}

export function getVPCVPNMonthlyCost(pricing?: VPCPricingData | null): number {
  return pricing?.network?.['vpn-gateway'] ?? DEFAULT_NETWORK['vpn-gateway'];
}
