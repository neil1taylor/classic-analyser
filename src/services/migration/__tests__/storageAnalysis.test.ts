import { describe, it, expect } from 'vitest';
import { analyzeStorage } from '../storageAnalysis';
import type { MigrationPreferences } from '@/types/migration';

const prefs: MigrationPreferences = {
  targetRegion: 'us-south',
  excludeResources: [],
};

function makeBlock(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    username: 'block-vol-1',
    capacityGb: 100,
    iops: 1000,
    storageTierLevel: 'READHEAVY_TIER',
    _isKubeStorage: false,
    ...overrides,
  };
}

function makeFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    username: 'file-vol-1',
    capacityGb: 50,
    _isKubeStorage: false,
    ...overrides,
  };
}

describe('analyzeStorage — K8s filtering', () => {
  it('excludes K8s block storage from volume assessments', () => {
    const data = {
      blockStorage: [
        makeBlock({ id: 1, _isKubeStorage: true }),
        makeBlock({ id: 2, _isKubeStorage: false }),
      ],
    };

    const result = analyzeStorage(data, prefs);

    expect(result.blockStorage.totalVolumes).toBe(1);
    expect(result.blockStorage.volumeAssessments).toHaveLength(1);
    expect(result.blockStorage.volumeAssessments[0].id).toBe(2);
  });

  it('excludes K8s file storage from volume assessments', () => {
    const data = {
      fileStorage: [
        makeFile({ id: 1, _isKubeStorage: true }),
        makeFile({ id: 2, _isKubeStorage: false }),
      ],
    };

    const result = analyzeStorage(data, prefs);

    expect(result.fileStorage.totalVolumes).toBe(1);
    expect(result.fileStorage.volumeAssessments).toHaveLength(1);
    expect(result.fileStorage.volumeAssessments[0].id).toBe(2);
  });

  it('includes non-K8s storage in assessments', () => {
    const data = {
      blockStorage: [makeBlock({ id: 1 }), makeBlock({ id: 2 })],
      fileStorage: [makeFile({ id: 3 })],
    };

    const result = analyzeStorage(data, prefs);

    expect(result.blockStorage.totalVolumes).toBe(2);
    expect(result.fileStorage.totalVolumes).toBe(1);
  });

  it('reports K8s storage summary when K8s volumes exist', () => {
    const data = {
      blockStorage: [
        makeBlock({ id: 1, _isKubeStorage: true, capacityGb: 200 }),
        makeBlock({ id: 2, _isKubeStorage: false }),
      ],
      fileStorage: [
        makeFile({ id: 3, _isKubeStorage: true, capacityGb: 100 }),
      ],
    };

    const result = analyzeStorage(data, prefs);

    expect(result.kubeStorage).toBeDefined();
    expect(result.kubeStorage!.totalVolumes).toBe(2);
    expect(result.kubeStorage!.totalCapacityGB).toBe(300);
    expect(result.kubeStorage!.blockCount).toBe(1);
    expect(result.kubeStorage!.fileCount).toBe(1);
  });

  it('adds K8s exclusion recommendation when K8s volumes exist', () => {
    const data = {
      blockStorage: [makeBlock({ _isKubeStorage: true })],
    };

    const result = analyzeStorage(data, prefs);

    const kubeRec = result.recommendations.find(r => r.includes('IKS/ROKS'));
    expect(kubeRec).toBeDefined();
    expect(kubeRec).toContain('excluded');
  });

  it('does not report kubeStorage when no K8s volumes exist', () => {
    const data = {
      blockStorage: [makeBlock()],
      fileStorage: [makeFile()],
    };

    const result = analyzeStorage(data, prefs);

    expect(result.kubeStorage).toBeUndefined();
  });
});
