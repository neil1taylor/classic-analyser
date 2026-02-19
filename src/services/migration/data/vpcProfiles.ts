import type { VPCProfile, VPCPricingData } from '@/types/migration';
import fallbackPricing from './vpcPricing.json';

export const VPC_PROFILES: VPCProfile[] = [
  // Balanced (bx2) — 1:4 vCPU:memory ratio
  { name: 'bx2-2x8', family: 'balanced', vcpu: 2, memory: 8, bandwidth: 4, estimatedCost: 0 },
  { name: 'bx2-4x16', family: 'balanced', vcpu: 4, memory: 16, bandwidth: 8, estimatedCost: 0 },
  { name: 'bx2-8x32', family: 'balanced', vcpu: 8, memory: 32, bandwidth: 16, estimatedCost: 0 },
  { name: 'bx2-16x64', family: 'balanced', vcpu: 16, memory: 64, bandwidth: 32, estimatedCost: 0 },
  { name: 'bx2-32x128', family: 'balanced', vcpu: 32, memory: 128, bandwidth: 64, estimatedCost: 0 },
  { name: 'bx2-48x192', family: 'balanced', vcpu: 48, memory: 192, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx2-64x256', family: 'balanced', vcpu: 64, memory: 256, bandwidth: 80, estimatedCost: 0 },
  // Balanced (bx3d) — 1:5 vCPU:memory ratio
  { name: 'bx3d-2x10', family: 'balanced', vcpu: 2, memory: 10, bandwidth: 4, estimatedCost: 0 },
  { name: 'bx3d-4x20', family: 'balanced', vcpu: 4, memory: 20, bandwidth: 8, estimatedCost: 0 },
  { name: 'bx3d-8x40', family: 'balanced', vcpu: 8, memory: 40, bandwidth: 16, estimatedCost: 0 },
  { name: 'bx3d-16x80', family: 'balanced', vcpu: 16, memory: 80, bandwidth: 32, estimatedCost: 0 },
  { name: 'bx3d-24x120', family: 'balanced', vcpu: 24, memory: 120, bandwidth: 48, estimatedCost: 0 },
  { name: 'bx3d-32x160', family: 'balanced', vcpu: 32, memory: 160, bandwidth: 64, estimatedCost: 0 },
  { name: 'bx3d-48x240', family: 'balanced', vcpu: 48, memory: 240, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx3d-64x320', family: 'balanced', vcpu: 64, memory: 320, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx3d-96x480', family: 'balanced', vcpu: 96, memory: 480, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx3d-128x640', family: 'balanced', vcpu: 128, memory: 640, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx3d-176x880', family: 'balanced', vcpu: 176, memory: 880, bandwidth: 80, estimatedCost: 0 },
  // Compute (cx2) — 1:2 vCPU:memory ratio
  { name: 'cx2-2x4', family: 'compute', vcpu: 2, memory: 4, bandwidth: 4, estimatedCost: 0 },
  { name: 'cx2-4x8', family: 'compute', vcpu: 4, memory: 8, bandwidth: 8, estimatedCost: 0 },
  { name: 'cx2-8x16', family: 'compute', vcpu: 8, memory: 16, bandwidth: 16, estimatedCost: 0 },
  { name: 'cx2-16x32', family: 'compute', vcpu: 16, memory: 32, bandwidth: 32, estimatedCost: 0 },
  { name: 'cx2-32x64', family: 'compute', vcpu: 32, memory: 64, bandwidth: 64, estimatedCost: 0 },
  // Compute (cx3d) — 1:2.5 vCPU:memory ratio
  { name: 'cx3d-2x5', family: 'compute', vcpu: 2, memory: 5, bandwidth: 4, estimatedCost: 0 },
  { name: 'cx3d-4x10', family: 'compute', vcpu: 4, memory: 10, bandwidth: 8, estimatedCost: 0 },
  { name: 'cx3d-8x20', family: 'compute', vcpu: 8, memory: 20, bandwidth: 16, estimatedCost: 0 },
  { name: 'cx3d-16x40', family: 'compute', vcpu: 16, memory: 40, bandwidth: 32, estimatedCost: 0 },
  { name: 'cx3d-24x60', family: 'compute', vcpu: 24, memory: 60, bandwidth: 48, estimatedCost: 0 },
  { name: 'cx3d-32x80', family: 'compute', vcpu: 32, memory: 80, bandwidth: 64, estimatedCost: 0 },
  { name: 'cx3d-48x120', family: 'compute', vcpu: 48, memory: 120, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx3d-64x160', family: 'compute', vcpu: 64, memory: 160, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx3d-96x240', family: 'compute', vcpu: 96, memory: 240, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx3d-128x320', family: 'compute', vcpu: 128, memory: 320, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx3d-176x440', family: 'compute', vcpu: 176, memory: 440, bandwidth: 80, estimatedCost: 0 },
  // Memory (mx2) — 1:8 vCPU:memory ratio
  { name: 'mx2-2x16', family: 'memory', vcpu: 2, memory: 16, bandwidth: 4, estimatedCost: 0 },
  { name: 'mx2-4x32', family: 'memory', vcpu: 4, memory: 32, bandwidth: 8, estimatedCost: 0 },
  { name: 'mx2-8x64', family: 'memory', vcpu: 8, memory: 64, bandwidth: 16, estimatedCost: 0 },
  { name: 'mx2-16x128', family: 'memory', vcpu: 16, memory: 128, bandwidth: 32, estimatedCost: 0 },
  { name: 'mx2-32x256', family: 'memory', vcpu: 32, memory: 256, bandwidth: 64, estimatedCost: 0 },
  { name: 'mx2-48x384', family: 'memory', vcpu: 48, memory: 384, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx2-64x512', family: 'memory', vcpu: 64, memory: 512, bandwidth: 80, estimatedCost: 0 },
  // Memory (mx3d) — 1:10 vCPU:memory ratio
  { name: 'mx3d-2x20', family: 'memory', vcpu: 2, memory: 20, bandwidth: 4, estimatedCost: 0 },
  { name: 'mx3d-4x40', family: 'memory', vcpu: 4, memory: 40, bandwidth: 8, estimatedCost: 0 },
  { name: 'mx3d-8x80', family: 'memory', vcpu: 8, memory: 80, bandwidth: 16, estimatedCost: 0 },
  { name: 'mx3d-16x160', family: 'memory', vcpu: 16, memory: 160, bandwidth: 32, estimatedCost: 0 },
  { name: 'mx3d-24x240', family: 'memory', vcpu: 24, memory: 240, bandwidth: 48, estimatedCost: 0 },
  { name: 'mx3d-32x320', family: 'memory', vcpu: 32, memory: 320, bandwidth: 64, estimatedCost: 0 },
  { name: 'mx3d-48x480', family: 'memory', vcpu: 48, memory: 480, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx3d-64x640', family: 'memory', vcpu: 64, memory: 640, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx3d-96x960', family: 'memory', vcpu: 96, memory: 960, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx3d-128x1280', family: 'memory', vcpu: 128, memory: 1280, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx3d-176x1760', family: 'memory', vcpu: 176, memory: 1760, bandwidth: 80, estimatedCost: 0 },
  // Very High Memory (vx2d) — 1:14 vCPU:memory ratio
  { name: 'vx2d-2x28', family: 'very-high-memory', vcpu: 2, memory: 28, bandwidth: 4, estimatedCost: 0 },
  { name: 'vx2d-4x56', family: 'very-high-memory', vcpu: 4, memory: 56, bandwidth: 8, estimatedCost: 0 },
  { name: 'vx2d-8x112', family: 'very-high-memory', vcpu: 8, memory: 112, bandwidth: 16, estimatedCost: 0 },
  { name: 'vx2d-16x224', family: 'very-high-memory', vcpu: 16, memory: 224, bandwidth: 32, estimatedCost: 0 },
  { name: 'vx2d-32x448', family: 'very-high-memory', vcpu: 32, memory: 448, bandwidth: 64, estimatedCost: 0 },
  { name: 'vx2d-48x672', family: 'very-high-memory', vcpu: 48, memory: 672, bandwidth: 80, estimatedCost: 0 },
  { name: 'vx2d-64x896', family: 'very-high-memory', vcpu: 64, memory: 896, bandwidth: 80, estimatedCost: 0 },
  { name: 'vx2d-96x1344', family: 'very-high-memory', vcpu: 96, memory: 1344, bandwidth: 80, estimatedCost: 0 },
  { name: 'vx2d-128x1792', family: 'very-high-memory', vcpu: 128, memory: 1792, bandwidth: 80, estimatedCost: 0 },
  { name: 'vx2d-176x2464', family: 'very-high-memory', vcpu: 176, memory: 2464, bandwidth: 80, estimatedCost: 0 },
  // Ultra High Memory (ux2d) — 1:28 vCPU:memory ratio
  { name: 'ux2d-2x56', family: 'ultra-high-memory', vcpu: 2, memory: 56, bandwidth: 4, estimatedCost: 0 },
  { name: 'ux2d-4x112', family: 'ultra-high-memory', vcpu: 4, memory: 112, bandwidth: 8, estimatedCost: 0 },
  { name: 'ux2d-8x224', family: 'ultra-high-memory', vcpu: 8, memory: 224, bandwidth: 16, estimatedCost: 0 },
  { name: 'ux2d-16x448', family: 'ultra-high-memory', vcpu: 16, memory: 448, bandwidth: 32, estimatedCost: 0 },
  { name: 'ux2d-36x1008', family: 'ultra-high-memory', vcpu: 36, memory: 1008, bandwidth: 64, estimatedCost: 0 },
  { name: 'ux2d-48x1344', family: 'ultra-high-memory', vcpu: 48, memory: 1344, bandwidth: 80, estimatedCost: 0 },
  { name: 'ux2d-72x2016', family: 'ultra-high-memory', vcpu: 72, memory: 2016, bandwidth: 80, estimatedCost: 0 },
  { name: 'ux2d-100x2800', family: 'ultra-high-memory', vcpu: 100, memory: 2800, bandwidth: 80, estimatedCost: 0 },
  { name: 'ux2d-200x5600', family: 'ultra-high-memory', vcpu: 200, memory: 5600, bandwidth: 80, estimatedCost: 0 },
];

// VPC Bare Metal profiles — fixed-configuration servers
export const VPC_BARE_METAL_PROFILES: VPCProfile[] = [
  // Balanced (bx2d-metal) — 1:4 vCPU:memory ratio
  { name: 'bx2d-metal-96x384', family: 'balanced', vcpu: 96, memory: 384, bandwidth: 100, estimatedCost: 0 },
  // Balanced (bx3d-metal) — 1:5 vCPU:memory ratio
  { name: 'bx3d-metal-64x320', family: 'balanced', vcpu: 64, memory: 320, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3d-metal-96x480', family: 'balanced', vcpu: 96, memory: 480, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3d-metal-128x640', family: 'balanced', vcpu: 128, memory: 640, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3d-metal-176x880', family: 'balanced', vcpu: 176, memory: 880, bandwidth: 100, estimatedCost: 0 },
  // Compute (cx2d-metal) — 1:2 vCPU:memory ratio
  { name: 'cx2d-metal-96x192', family: 'compute', vcpu: 96, memory: 192, bandwidth: 100, estimatedCost: 0 },
  // Compute (cx3d-metal) — 1:2.5 vCPU:memory ratio
  { name: 'cx3d-metal-64x160', family: 'compute', vcpu: 64, memory: 160, bandwidth: 100, estimatedCost: 0 },
  { name: 'cx3d-metal-96x240', family: 'compute', vcpu: 96, memory: 240, bandwidth: 100, estimatedCost: 0 },
  { name: 'cx3d-metal-128x320', family: 'compute', vcpu: 128, memory: 320, bandwidth: 100, estimatedCost: 0 },
  { name: 'cx3d-metal-176x440', family: 'compute', vcpu: 176, memory: 440, bandwidth: 100, estimatedCost: 0 },
  // Memory (mx2d-metal) — 1:8 vCPU:memory ratio
  { name: 'mx2d-metal-96x768', family: 'memory', vcpu: 96, memory: 768, bandwidth: 100, estimatedCost: 0 },
  // Memory (mx3d-metal) — 1:10 vCPU:memory ratio
  { name: 'mx3d-metal-64x640', family: 'memory', vcpu: 64, memory: 640, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-96x960', family: 'memory', vcpu: 96, memory: 960, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-128x1280', family: 'memory', vcpu: 128, memory: 1280, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-176x1760', family: 'memory', vcpu: 176, memory: 1760, bandwidth: 100, estimatedCost: 0 },
];

/**
 * Returns a copy of the profiles array with estimatedCost populated from the pricing data.
 * Falls back to the bundled vpcPricing.json for any profile not found in server pricing.
 */
export function applyPricing(profiles: VPCProfile[], pricing: VPCPricingData | null): VPCProfile[] {
  return profiles.map((p) => {
    const entry = pricing?.profiles[p.name] ?? fallbackPricing.profiles[p.name as keyof typeof fallbackPricing.profiles];
    return entry ? { ...p, estimatedCost: entry.monthlyCost } : p;
  });
}

/**
 * Returns a copy of the bare metal profiles with estimatedCost populated from pricing data.
 * Falls back to the bundled vpcPricing.json for any profile not found in server pricing.
 */
export function applyBareMetalPricing(profiles: VPCProfile[], pricing: VPCPricingData | null): VPCProfile[] {
  return profiles.map((p) => {
    const entry = pricing?.bareMetalProfiles?.[p.name] ?? fallbackPricing.bareMetalProfiles[p.name as keyof typeof fallbackPricing.bareMetalProfiles];
    return entry ? { ...p, estimatedCost: entry.monthlyCost } : p;
  });
}
