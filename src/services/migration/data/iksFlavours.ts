import type { IKSFlavour } from '@/types/migration';

export const IKS_FLAVOURS: IKSFlavour[] = [
  // Balanced (bx2)
  { name: 'bx2.2x8', cores: 2, memoryGB: 8, category: 'balanced', hourlyRate: 0.096 },
  { name: 'bx2.4x16', cores: 4, memoryGB: 16, category: 'balanced', hourlyRate: 0.192 },
  { name: 'bx2.8x32', cores: 8, memoryGB: 32, category: 'balanced', hourlyRate: 0.384 },
  { name: 'bx2.16x64', cores: 16, memoryGB: 64, category: 'balanced', hourlyRate: 0.768 },
  { name: 'bx2.32x128', cores: 32, memoryGB: 128, category: 'balanced', hourlyRate: 1.536 },
  { name: 'bx2.48x192', cores: 48, memoryGB: 192, category: 'balanced', hourlyRate: 2.304 },
  // Balanced Gen3 (bx3)
  { name: 'bx3.2x8', cores: 2, memoryGB: 8, category: 'balanced', hourlyRate: 0.110 },
  { name: 'bx3.4x16', cores: 4, memoryGB: 16, category: 'balanced', hourlyRate: 0.220 },
  { name: 'bx3.8x32', cores: 8, memoryGB: 32, category: 'balanced', hourlyRate: 0.440 },
  { name: 'bx3.16x64', cores: 16, memoryGB: 64, category: 'balanced', hourlyRate: 0.880 },
  { name: 'bx3.32x128', cores: 32, memoryGB: 128, category: 'balanced', hourlyRate: 1.760 },
  // Compute (cx2)
  { name: 'cx2.2x4', cores: 2, memoryGB: 4, category: 'compute', hourlyRate: 0.072 },
  { name: 'cx2.4x8', cores: 4, memoryGB: 8, category: 'compute', hourlyRate: 0.144 },
  { name: 'cx2.8x16', cores: 8, memoryGB: 16, category: 'compute', hourlyRate: 0.288 },
  { name: 'cx2.16x32', cores: 16, memoryGB: 32, category: 'compute', hourlyRate: 0.576 },
  { name: 'cx2.32x64', cores: 32, memoryGB: 64, category: 'compute', hourlyRate: 1.152 },
  // Memory (mx2)
  { name: 'mx2.2x16', cores: 2, memoryGB: 16, category: 'memory', hourlyRate: 0.128 },
  { name: 'mx2.4x32', cores: 4, memoryGB: 32, category: 'memory', hourlyRate: 0.256 },
  { name: 'mx2.8x64', cores: 8, memoryGB: 64, category: 'memory', hourlyRate: 0.512 },
  { name: 'mx2.16x128', cores: 16, memoryGB: 128, category: 'memory', hourlyRate: 1.024 },
  { name: 'mx2.32x256', cores: 32, memoryGB: 256, category: 'memory', hourlyRate: 2.048 },
];

const CATEGORY_ORDER: Record<IKSFlavour['category'], number> = {
  balanced: 0,
  compute: 1,
  memory: 2,
  gpu: 3,
};

export function mapToIKSFlavour(cores: number, memoryGB: number): IKSFlavour | null {
  const candidates = IKS_FLAVOURS
    .filter(f => f.cores >= cores && f.memoryGB >= memoryGB)
    .sort((a, b) => {
      const catDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
      if (catDiff !== 0) return catDiff;
      return (a.cores + a.memoryGB) - (b.cores + b.memoryGB);
    });

  return candidates[0] ?? null;
}
