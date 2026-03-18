import type { VPCProfile, VPCPricingData, VPCRegionalPricingData } from '@/types/migration';
import fallbackPricing from './vpcPricing.json';

export const VPC_PROFILES: VPCProfile[] = [
  // ── Balanced Flex (bxf) — burstable, shared CPU ──────────────────────────
  { name: 'bxf-2x8', family: 'balanced', vcpu: 2, memory: 8, bandwidth: 4, estimatedCost: 0 },
  { name: 'bxf-4x16', family: 'balanced', vcpu: 4, memory: 16, bandwidth: 8, estimatedCost: 0 },
  { name: 'bxf-8x32', family: 'balanced', vcpu: 8, memory: 32, bandwidth: 16, estimatedCost: 0 },
  { name: 'bxf-16x64', family: 'balanced', vcpu: 16, memory: 64, bandwidth: 32, estimatedCost: 0 },
  { name: 'bxf-24x96', family: 'balanced', vcpu: 24, memory: 96, bandwidth: 48, estimatedCost: 0 },
  { name: 'bxf-32x128', family: 'balanced', vcpu: 32, memory: 128, bandwidth: 64, estimatedCost: 0 },
  { name: 'bxf-48x192', family: 'balanced', vcpu: 48, memory: 192, bandwidth: 80, estimatedCost: 0 },
  { name: 'bxf-64x256', family: 'balanced', vcpu: 64, memory: 256, bandwidth: 80, estimatedCost: 0 },
  // ── Balanced Gen2 (bx2) — 1:4 vCPU:memory ────────────────────────────────
  { name: 'bx2-2x8', family: 'balanced', vcpu: 2, memory: 8, bandwidth: 4, estimatedCost: 0 },
  { name: 'bx2-4x16', family: 'balanced', vcpu: 4, memory: 16, bandwidth: 8, estimatedCost: 0 },
  { name: 'bx2-8x32', family: 'balanced', vcpu: 8, memory: 32, bandwidth: 16, estimatedCost: 0 },
  { name: 'bx2-16x64', family: 'balanced', vcpu: 16, memory: 64, bandwidth: 32, estimatedCost: 0 },
  { name: 'bx2-32x128', family: 'balanced', vcpu: 32, memory: 128, bandwidth: 64, estimatedCost: 0 },
  { name: 'bx2-48x192', family: 'balanced', vcpu: 48, memory: 192, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx2-64x256', family: 'balanced', vcpu: 64, memory: 256, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx2-96x384', family: 'balanced', vcpu: 96, memory: 384, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx2-128x512', family: 'balanced', vcpu: 128, memory: 512, bandwidth: 80, estimatedCost: 0 },
  // ── Balanced Gen2 Instance Storage (bx2d) — 1:4 vCPU:memory ──────────────
  { name: 'bx2d-2x8', family: 'balanced', vcpu: 2, memory: 8, bandwidth: 4, estimatedCost: 0 },
  { name: 'bx2d-4x16', family: 'balanced', vcpu: 4, memory: 16, bandwidth: 8, estimatedCost: 0 },
  { name: 'bx2d-8x32', family: 'balanced', vcpu: 8, memory: 32, bandwidth: 16, estimatedCost: 0 },
  { name: 'bx2d-16x64', family: 'balanced', vcpu: 16, memory: 64, bandwidth: 32, estimatedCost: 0 },
  { name: 'bx2d-32x128', family: 'balanced', vcpu: 32, memory: 128, bandwidth: 64, estimatedCost: 0 },
  { name: 'bx2d-48x192', family: 'balanced', vcpu: 48, memory: 192, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx2d-64x256', family: 'balanced', vcpu: 64, memory: 256, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx2d-96x384', family: 'balanced', vcpu: 96, memory: 384, bandwidth: 80, estimatedCost: 0 },
  { name: 'bx2d-128x512', family: 'balanced', vcpu: 128, memory: 512, bandwidth: 80, estimatedCost: 0 },
  // ── Balanced Gen3 (bx3d) — 1:5 vCPU:memory ───────────────────────────────
  { name: 'bx3d-2x10', family: 'balanced', vcpu: 2, memory: 10, bandwidth: 4, estimatedCost: 0 },
  { name: 'bx3d-4x20', family: 'balanced', vcpu: 4, memory: 20, bandwidth: 8, estimatedCost: 0 },
  { name: 'bx3d-8x40', family: 'balanced', vcpu: 8, memory: 40, bandwidth: 16, estimatedCost: 0 },
  { name: 'bx3d-16x80', family: 'balanced', vcpu: 16, memory: 80, bandwidth: 32, estimatedCost: 0 },
  { name: 'bx3d-24x120', family: 'balanced', vcpu: 24, memory: 120, bandwidth: 48, estimatedCost: 0 },
  { name: 'bx3d-32x160', family: 'balanced', vcpu: 32, memory: 160, bandwidth: 64, estimatedCost: 0 },
  { name: 'bx3d-48x240', family: 'balanced', vcpu: 48, memory: 240, bandwidth: 96, estimatedCost: 0 },
  { name: 'bx3d-64x320', family: 'balanced', vcpu: 64, memory: 320, bandwidth: 128, estimatedCost: 0 },
  { name: 'bx3d-96x480', family: 'balanced', vcpu: 96, memory: 480, bandwidth: 192, estimatedCost: 0 },
  { name: 'bx3d-128x640', family: 'balanced', vcpu: 128, memory: 640, bandwidth: 200, estimatedCost: 0 },
  { name: 'bx3d-176x880', family: 'balanced', vcpu: 176, memory: 880, bandwidth: 200, estimatedCost: 0 },
  // ── Balanced Gen3 Confidential (bx3dc) — 1:5 vCPU:memory ─────────────────
  { name: 'bx3dc-2x10', family: 'balanced', vcpu: 2, memory: 10, bandwidth: 4, estimatedCost: 0 },
  { name: 'bx3dc-4x20', family: 'balanced', vcpu: 4, memory: 20, bandwidth: 8, estimatedCost: 0 },
  { name: 'bx3dc-8x40', family: 'balanced', vcpu: 8, memory: 40, bandwidth: 16, estimatedCost: 0 },
  { name: 'bx3dc-16x80', family: 'balanced', vcpu: 16, memory: 80, bandwidth: 32, estimatedCost: 0 },
  { name: 'bx3dc-24x120', family: 'balanced', vcpu: 24, memory: 120, bandwidth: 48, estimatedCost: 0 },
  { name: 'bx3dc-32x160', family: 'balanced', vcpu: 32, memory: 160, bandwidth: 64, estimatedCost: 0 },
  { name: 'bx3dc-48x240', family: 'balanced', vcpu: 48, memory: 240, bandwidth: 96, estimatedCost: 0 },
  { name: 'bx3dc-64x320', family: 'balanced', vcpu: 64, memory: 320, bandwidth: 128, estimatedCost: 0 },
  { name: 'bx3dc-96x480', family: 'balanced', vcpu: 96, memory: 480, bandwidth: 192, estimatedCost: 0 },
  // ── Compute Flex (cxf) — burstable, shared CPU ───────────────────────────
  { name: 'cxf-2x4', family: 'compute', vcpu: 2, memory: 4, bandwidth: 4, estimatedCost: 0 },
  { name: 'cxf-4x8', family: 'compute', vcpu: 4, memory: 8, bandwidth: 8, estimatedCost: 0 },
  { name: 'cxf-8x16', family: 'compute', vcpu: 8, memory: 16, bandwidth: 16, estimatedCost: 0 },
  { name: 'cxf-16x32', family: 'compute', vcpu: 16, memory: 32, bandwidth: 32, estimatedCost: 0 },
  { name: 'cxf-24x48', family: 'compute', vcpu: 24, memory: 48, bandwidth: 48, estimatedCost: 0 },
  { name: 'cxf-32x64', family: 'compute', vcpu: 32, memory: 64, bandwidth: 64, estimatedCost: 0 },
  { name: 'cxf-48x96', family: 'compute', vcpu: 48, memory: 96, bandwidth: 80, estimatedCost: 0 },
  { name: 'cxf-64x128', family: 'compute', vcpu: 64, memory: 128, bandwidth: 80, estimatedCost: 0 },
  // ── Compute Gen2 (cx2) — 1:2 vCPU:memory ─────────────────────────────────
  { name: 'cx2-2x4', family: 'compute', vcpu: 2, memory: 4, bandwidth: 4, estimatedCost: 0 },
  { name: 'cx2-4x8', family: 'compute', vcpu: 4, memory: 8, bandwidth: 8, estimatedCost: 0 },
  { name: 'cx2-8x16', family: 'compute', vcpu: 8, memory: 16, bandwidth: 16, estimatedCost: 0 },
  { name: 'cx2-16x32', family: 'compute', vcpu: 16, memory: 32, bandwidth: 32, estimatedCost: 0 },
  { name: 'cx2-32x64', family: 'compute', vcpu: 32, memory: 64, bandwidth: 64, estimatedCost: 0 },
  { name: 'cx2-48x96', family: 'compute', vcpu: 48, memory: 96, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx2-64x128', family: 'compute', vcpu: 64, memory: 128, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx2-96x192', family: 'compute', vcpu: 96, memory: 192, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx2-128x256', family: 'compute', vcpu: 128, memory: 256, bandwidth: 80, estimatedCost: 0 },
  // ── Compute Gen2 Instance Storage (cx2d) — 1:2 vCPU:memory ───────────────
  { name: 'cx2d-2x4', family: 'compute', vcpu: 2, memory: 4, bandwidth: 4, estimatedCost: 0 },
  { name: 'cx2d-4x8', family: 'compute', vcpu: 4, memory: 8, bandwidth: 8, estimatedCost: 0 },
  { name: 'cx2d-8x16', family: 'compute', vcpu: 8, memory: 16, bandwidth: 16, estimatedCost: 0 },
  { name: 'cx2d-16x32', family: 'compute', vcpu: 16, memory: 32, bandwidth: 32, estimatedCost: 0 },
  { name: 'cx2d-32x64', family: 'compute', vcpu: 32, memory: 64, bandwidth: 64, estimatedCost: 0 },
  { name: 'cx2d-48x96', family: 'compute', vcpu: 48, memory: 96, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx2d-64x128', family: 'compute', vcpu: 64, memory: 128, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx2d-96x192', family: 'compute', vcpu: 96, memory: 192, bandwidth: 80, estimatedCost: 0 },
  { name: 'cx2d-128x256', family: 'compute', vcpu: 128, memory: 256, bandwidth: 80, estimatedCost: 0 },
  // ── Compute Gen3 (cx3d) — 1:2.5 vCPU:memory ──────────────────────────────
  { name: 'cx3d-2x5', family: 'compute', vcpu: 2, memory: 5, bandwidth: 4, estimatedCost: 0 },
  { name: 'cx3d-4x10', family: 'compute', vcpu: 4, memory: 10, bandwidth: 8, estimatedCost: 0 },
  { name: 'cx3d-8x20', family: 'compute', vcpu: 8, memory: 20, bandwidth: 16, estimatedCost: 0 },
  { name: 'cx3d-16x40', family: 'compute', vcpu: 16, memory: 40, bandwidth: 32, estimatedCost: 0 },
  { name: 'cx3d-24x60', family: 'compute', vcpu: 24, memory: 60, bandwidth: 48, estimatedCost: 0 },
  { name: 'cx3d-32x80', family: 'compute', vcpu: 32, memory: 80, bandwidth: 64, estimatedCost: 0 },
  { name: 'cx3d-48x120', family: 'compute', vcpu: 48, memory: 120, bandwidth: 96, estimatedCost: 0 },
  { name: 'cx3d-64x160', family: 'compute', vcpu: 64, memory: 160, bandwidth: 128, estimatedCost: 0 },
  { name: 'cx3d-96x240', family: 'compute', vcpu: 96, memory: 240, bandwidth: 192, estimatedCost: 0 },
  { name: 'cx3d-128x320', family: 'compute', vcpu: 128, memory: 320, bandwidth: 200, estimatedCost: 0 },
  { name: 'cx3d-176x440', family: 'compute', vcpu: 176, memory: 440, bandwidth: 200, estimatedCost: 0 },
  // ── Compute Gen3 Confidential (cx3dc) — 1:2.5 vCPU:memory ────────────────
  { name: 'cx3dc-2x5', family: 'compute', vcpu: 2, memory: 5, bandwidth: 4, estimatedCost: 0 },
  { name: 'cx3dc-4x10', family: 'compute', vcpu: 4, memory: 10, bandwidth: 8, estimatedCost: 0 },
  { name: 'cx3dc-8x20', family: 'compute', vcpu: 8, memory: 20, bandwidth: 16, estimatedCost: 0 },
  { name: 'cx3dc-16x40', family: 'compute', vcpu: 16, memory: 40, bandwidth: 32, estimatedCost: 0 },
  { name: 'cx3dc-24x60', family: 'compute', vcpu: 24, memory: 60, bandwidth: 48, estimatedCost: 0 },
  { name: 'cx3dc-32x80', family: 'compute', vcpu: 32, memory: 80, bandwidth: 64, estimatedCost: 0 },
  { name: 'cx3dc-48x120', family: 'compute', vcpu: 48, memory: 120, bandwidth: 96, estimatedCost: 0 },
  { name: 'cx3dc-64x160', family: 'compute', vcpu: 64, memory: 160, bandwidth: 128, estimatedCost: 0 },
  { name: 'cx3dc-96x240', family: 'compute', vcpu: 96, memory: 240, bandwidth: 192, estimatedCost: 0 },
  { name: 'cx3dc-128x320', family: 'compute', vcpu: 128, memory: 320, bandwidth: 200, estimatedCost: 0 },
  // ── Memory Flex (mxf) — burstable, shared CPU ────────────────────────────
  { name: 'mxf-2x16', family: 'memory', vcpu: 2, memory: 16, bandwidth: 4, estimatedCost: 0 },
  { name: 'mxf-4x32', family: 'memory', vcpu: 4, memory: 32, bandwidth: 8, estimatedCost: 0 },
  { name: 'mxf-8x64', family: 'memory', vcpu: 8, memory: 64, bandwidth: 16, estimatedCost: 0 },
  { name: 'mxf-16x128', family: 'memory', vcpu: 16, memory: 128, bandwidth: 32, estimatedCost: 0 },
  { name: 'mxf-24x192', family: 'memory', vcpu: 24, memory: 192, bandwidth: 48, estimatedCost: 0 },
  { name: 'mxf-32x256', family: 'memory', vcpu: 32, memory: 256, bandwidth: 64, estimatedCost: 0 },
  { name: 'mxf-48x384', family: 'memory', vcpu: 48, memory: 384, bandwidth: 80, estimatedCost: 0 },
  { name: 'mxf-64x512', family: 'memory', vcpu: 64, memory: 512, bandwidth: 80, estimatedCost: 0 },
  // ── Memory Gen2 (mx2) — 1:8 vCPU:memory ──────────────────────────────────
  { name: 'mx2-2x16', family: 'memory', vcpu: 2, memory: 16, bandwidth: 4, estimatedCost: 0 },
  { name: 'mx2-4x32', family: 'memory', vcpu: 4, memory: 32, bandwidth: 8, estimatedCost: 0 },
  { name: 'mx2-8x64', family: 'memory', vcpu: 8, memory: 64, bandwidth: 16, estimatedCost: 0 },
  { name: 'mx2-16x128', family: 'memory', vcpu: 16, memory: 128, bandwidth: 32, estimatedCost: 0 },
  { name: 'mx2-32x256', family: 'memory', vcpu: 32, memory: 256, bandwidth: 64, estimatedCost: 0 },
  { name: 'mx2-48x384', family: 'memory', vcpu: 48, memory: 384, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx2-64x512', family: 'memory', vcpu: 64, memory: 512, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx2-96x768', family: 'memory', vcpu: 96, memory: 768, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx2-128x1024', family: 'memory', vcpu: 128, memory: 1024, bandwidth: 80, estimatedCost: 0 },
  // ── Memory Gen2 Instance Storage (mx2d) — 1:8 vCPU:memory ────────────────
  { name: 'mx2d-2x16', family: 'memory', vcpu: 2, memory: 16, bandwidth: 4, estimatedCost: 0 },
  { name: 'mx2d-4x32', family: 'memory', vcpu: 4, memory: 32, bandwidth: 8, estimatedCost: 0 },
  { name: 'mx2d-8x64', family: 'memory', vcpu: 8, memory: 64, bandwidth: 16, estimatedCost: 0 },
  { name: 'mx2d-16x128', family: 'memory', vcpu: 16, memory: 128, bandwidth: 32, estimatedCost: 0 },
  { name: 'mx2d-32x256', family: 'memory', vcpu: 32, memory: 256, bandwidth: 64, estimatedCost: 0 },
  { name: 'mx2d-48x384', family: 'memory', vcpu: 48, memory: 384, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx2d-64x512', family: 'memory', vcpu: 64, memory: 512, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx2d-96x768', family: 'memory', vcpu: 96, memory: 768, bandwidth: 80, estimatedCost: 0 },
  { name: 'mx2d-128x1024', family: 'memory', vcpu: 128, memory: 1024, bandwidth: 80, estimatedCost: 0 },
  // ── Memory Gen3 (mx3d) — 1:10 vCPU:memory ────────────────────────────────
  { name: 'mx3d-2x20', family: 'memory', vcpu: 2, memory: 20, bandwidth: 4, estimatedCost: 0 },
  { name: 'mx3d-4x40', family: 'memory', vcpu: 4, memory: 40, bandwidth: 8, estimatedCost: 0 },
  { name: 'mx3d-8x80', family: 'memory', vcpu: 8, memory: 80, bandwidth: 16, estimatedCost: 0 },
  { name: 'mx3d-16x160', family: 'memory', vcpu: 16, memory: 160, bandwidth: 32, estimatedCost: 0 },
  { name: 'mx3d-24x240', family: 'memory', vcpu: 24, memory: 240, bandwidth: 48, estimatedCost: 0 },
  { name: 'mx3d-32x320', family: 'memory', vcpu: 32, memory: 320, bandwidth: 64, estimatedCost: 0 },
  { name: 'mx3d-48x480', family: 'memory', vcpu: 48, memory: 480, bandwidth: 96, estimatedCost: 0 },
  { name: 'mx3d-64x640', family: 'memory', vcpu: 64, memory: 640, bandwidth: 128, estimatedCost: 0 },
  { name: 'mx3d-96x960', family: 'memory', vcpu: 96, memory: 960, bandwidth: 192, estimatedCost: 0 },
  { name: 'mx3d-128x1280', family: 'memory', vcpu: 128, memory: 1280, bandwidth: 200, estimatedCost: 0 },
  { name: 'mx3d-176x1760', family: 'memory', vcpu: 176, memory: 1760, bandwidth: 200, estimatedCost: 0 },
  // ── Very High Memory (vx2d) — 1:14 vCPU:memory ───────────────────────────
  { name: 'vx2d-2x28', family: 'very-high-memory', vcpu: 2, memory: 28, bandwidth: 4, estimatedCost: 0 },
  { name: 'vx2d-4x56', family: 'very-high-memory', vcpu: 4, memory: 56, bandwidth: 8, estimatedCost: 0 },
  { name: 'vx2d-8x112', family: 'very-high-memory', vcpu: 8, memory: 112, bandwidth: 16, estimatedCost: 0 },
  { name: 'vx2d-16x224', family: 'very-high-memory', vcpu: 16, memory: 224, bandwidth: 32, estimatedCost: 0 },
  { name: 'vx2d-44x616', family: 'very-high-memory', vcpu: 44, memory: 616, bandwidth: 80, estimatedCost: 0 },
  { name: 'vx2d-88x1232', family: 'very-high-memory', vcpu: 88, memory: 1232, bandwidth: 80, estimatedCost: 0 },
  { name: 'vx2d-144x2016', family: 'very-high-memory', vcpu: 144, memory: 2016, bandwidth: 80, estimatedCost: 0 },
  { name: 'vx2d-176x2464', family: 'very-high-memory', vcpu: 176, memory: 2464, bandwidth: 80, estimatedCost: 0 },
  // ── Ultra High Memory (ux2d) — 1:28 vCPU:memory ──────────────────────────
  { name: 'ux2d-2x56', family: 'ultra-high-memory', vcpu: 2, memory: 56, bandwidth: 4, estimatedCost: 0 },
  { name: 'ux2d-4x112', family: 'ultra-high-memory', vcpu: 4, memory: 112, bandwidth: 8, estimatedCost: 0 },
  { name: 'ux2d-8x224', family: 'ultra-high-memory', vcpu: 8, memory: 224, bandwidth: 16, estimatedCost: 0 },
  { name: 'ux2d-16x448', family: 'ultra-high-memory', vcpu: 16, memory: 448, bandwidth: 32, estimatedCost: 0 },
  { name: 'ux2d-36x1008', family: 'ultra-high-memory', vcpu: 36, memory: 1008, bandwidth: 72, estimatedCost: 0 },
  { name: 'ux2d-48x1344', family: 'ultra-high-memory', vcpu: 48, memory: 1344, bandwidth: 80, estimatedCost: 0 },
  { name: 'ux2d-72x2016', family: 'ultra-high-memory', vcpu: 72, memory: 2016, bandwidth: 80, estimatedCost: 0 },
  { name: 'ux2d-100x2800', family: 'ultra-high-memory', vcpu: 100, memory: 2800, bandwidth: 80, estimatedCost: 0 },
  { name: 'ux2d-200x5600', family: 'ultra-high-memory', vcpu: 200, memory: 5600, bandwidth: 80, estimatedCost: 0 },
];

// VPC Bare Metal profiles — fixed-configuration servers
export const VPC_BARE_METAL_PROFILES: VPCProfile[] = [
  // Balanced Gen2
  { name: 'bx2-metal-96x384', family: 'balanced', vcpu: 96, memory: 384, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx2d-metal-96x384', family: 'balanced', vcpu: 96, memory: 384, bandwidth: 100, estimatedCost: 0 },
  // Balanced Gen3
  { name: 'bx3-metal-48x256', family: 'balanced', vcpu: 48, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3-metal-64x256', family: 'balanced', vcpu: 64, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3d-metal-48x256', family: 'balanced', vcpu: 48, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3d-metal-64x256', family: 'balanced', vcpu: 64, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'bx3d-metal-192x1024', family: 'balanced', vcpu: 192, memory: 1024, bandwidth: 100, estimatedCost: 0 },
  // Compute Gen2
  { name: 'cx2-metal-96x192', family: 'compute', vcpu: 96, memory: 192, bandwidth: 100, estimatedCost: 0 },
  { name: 'cx2d-metal-96x192', family: 'compute', vcpu: 96, memory: 192, bandwidth: 100, estimatedCost: 0 },
  // Compute Gen3
  { name: 'cx3d-metal-48x128', family: 'compute', vcpu: 48, memory: 128, bandwidth: 100, estimatedCost: 0 },
  { name: 'cx3d-metal-64x128', family: 'compute', vcpu: 64, memory: 128, bandwidth: 100, estimatedCost: 0 },
  // Memory Gen2
  { name: 'mx2-metal-96x768', family: 'memory', vcpu: 96, memory: 768, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx2d-metal-96x768', family: 'memory', vcpu: 96, memory: 768, bandwidth: 100, estimatedCost: 0 },
  // Memory Gen3
  { name: 'mx3-metal-48x512', family: 'memory', vcpu: 48, memory: 512, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3-metal-64x512', family: 'memory', vcpu: 64, memory: 512, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-16x128', family: 'memory', vcpu: 16, memory: 128, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-48x512', family: 'memory', vcpu: 48, memory: 512, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-64x512', family: 'memory', vcpu: 64, memory: 512, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-96x1024', family: 'memory', vcpu: 96, memory: 1024, bandwidth: 100, estimatedCost: 0 },
  { name: 'mx3d-metal-128x1024', family: 'memory', vcpu: 128, memory: 1024, bandwidth: 100, estimatedCost: 0 },
  // Very High Memory Gen3
  { name: 'vx3-metal-16x256', family: 'very-high-memory', vcpu: 16, memory: 256, bandwidth: 100, estimatedCost: 0 },
  { name: 'vx3d-metal-16x256', family: 'very-high-memory', vcpu: 16, memory: 256, bandwidth: 100, estimatedCost: 0 },
  // Ultra High Memory
  { name: 'ux2d-metal-112x3072', family: 'ultra-high-memory', vcpu: 112, memory: 3072, bandwidth: 100, estimatedCost: 0 },
  { name: 'ux2d-metal-224x6144', family: 'ultra-high-memory', vcpu: 224, memory: 6144, bandwidth: 100, estimatedCost: 0 },
  { name: 'ux3-metal-16x512', family: 'ultra-high-memory', vcpu: 16, memory: 512, bandwidth: 100, estimatedCost: 0 },
  { name: 'ux3d-metal-16x512', family: 'ultra-high-memory', vcpu: 16, memory: 512, bandwidth: 100, estimatedCost: 0 },
];

// ── Profile classification helpers ──────────────────────────────────────────

/** Check if a profile uses burstable/flex (shared) CPUs */
export function isBurstableProfile(name: string): boolean {
  const prefix = name.split('-')[0];
  return prefix.endsWith('f') && (prefix.startsWith('bx') || prefix.startsWith('cx') || prefix.startsWith('mx'));
}

/** Check if a profile is gen3 (Sapphire Rapids, DDR5, PCIe Gen5) */
export function isGen3Profile(name: string): boolean {
  const prefix = name.split('-')[0];
  return prefix.includes('3');
}

/** Check if a profile has NVMe instance storage (d-suffix, excluding flex) */
export function hasInstanceStorage(name: string): boolean {
  if (isBurstableProfile(name)) return false;
  const prefix = name.split('-')[0];
  return prefix.includes('d');
}

/** Check if a profile is confidential compute (dc-suffix) */
export function isConfidentialProfile(name: string): boolean {
  const prefix = name.split('-')[0];
  return prefix.endsWith('dc');
}

// ── Pricing application ─────────────────────────────────────────────────────

/**
 * Returns a copy of the profiles array with estimatedCost populated from the pricing data.
 * When regional pricing is available and a targetRegion is specified, uses region-specific rates.
 * Falls back to the bundled vpcPricing.json for any profile not found in server pricing.
 */
export function applyPricing(
  profiles: VPCProfile[],
  pricing: VPCPricingData | null,
  targetRegion?: string,
): VPCProfile[] {
  // Resolve the correct pricing source for the target region
  const regionPricing = resolveRegionalPricing(pricing, targetRegion);

  return profiles.map((p) => {
    const entry = regionPricing?.profiles[p.name]
      ?? pricing?.profiles[p.name]
      ?? fallbackPricing.profiles[p.name as keyof typeof fallbackPricing.profiles];
    if (!entry) return p;
    return {
      ...p,
      estimatedCost: entry.monthlyCost,
      hourlyRate: entry.hourlyRate,
    };
  });
}

/**
 * Returns a copy of the bare metal profiles with estimatedCost populated from pricing data.
 * Falls back to the bundled vpcPricing.json for any profile not found in server pricing.
 */
export function applyBareMetalPricing(
  profiles: VPCProfile[],
  pricing: VPCPricingData | null,
  targetRegion?: string,
): VPCProfile[] {
  const regionPricing = resolveRegionalPricing(pricing, targetRegion);

  return profiles.map((p) => {
    const entry = regionPricing?.bareMetalProfiles?.[p.name]
      ?? pricing?.bareMetalProfiles?.[p.name]
      ?? fallbackPricing.bareMetalProfiles[p.name as keyof typeof fallbackPricing.bareMetalProfiles];
    if (!entry) return p;
    return {
      ...p,
      estimatedCost: entry.monthlyCost,
      hourlyRate: entry.hourlyRate,
    };
  });
}

/** Resolve region-specific pricing from the regional pricing map */
function resolveRegionalPricing(
  pricing: VPCPricingData | null,
  targetRegion?: string,
): VPCRegionalPricingData | undefined {
  if (!targetRegion || !pricing?.regionalPricing) return undefined;
  // If the pricing data is already for the target region, no need to look up regional
  if (pricing.region === targetRegion) return undefined;
  return pricing.regionalPricing[targetRegion];
}
