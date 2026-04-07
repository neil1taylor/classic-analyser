import { describe, it, expect } from 'vitest';
import { analyzeStorage } from '../storageAnalysis';
import { mapFileStorageProfile } from '../data/storageTiers';
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

describe('analyzeStorage — file volume profile selection', () => {
  it('assigns rfs profile to low-IOPS file volumes', () => {
    const data = {
      fileStorage: [makeFile({ id: 10, iops: 2000, storageTierLevel: '2 IOPS/GB' })],
    };

    const result = analyzeStorage(data, prefs);
    const vol = result.fileStorage.volumeAssessments[0];

    expect(vol.vpcProfile).toBe('rfs');
    expect(vol.tier).toBe('2 IOPS/GB');
    expect(vol.iops).toBe(2000);
    expect(vol.notes[0]).toContain('rfs');
  });

  it('assigns dp2 profile to high-IOPS file volumes exceeding 35K', () => {
    const data = {
      fileStorage: [makeFile({ id: 11, iops: 40000, storageTierLevel: '10 IOPS/GB' })],
    };

    const result = analyzeStorage(data, prefs);
    const vol = result.fileStorage.volumeAssessments[0];

    expect(vol.vpcProfile).toBe('dp2');
    expect(vol.notes[0]).toContain('dp2');
  });

  it('includes alternative profile note when rfs is primary', () => {
    const data = {
      fileStorage: [makeFile({ id: 12, iops: 1000, storageTierLevel: '0.25 IOPS/GB' })],
    };

    const result = analyzeStorage(data, prefs);
    const vol = result.fileStorage.volumeAssessments[0];

    expect(vol.profileNotes).toEqual(
      expect.arrayContaining([expect.stringContaining('dp2')])
    );
  });

  it('handles file volumes with zero IOPS', () => {
    const data = {
      fileStorage: [makeFile({ id: 13 })],
    };

    const result = analyzeStorage(data, prefs);
    const vol = result.fileStorage.volumeAssessments[0];

    expect(vol.vpcProfile).toBe('rfs');
    expect(vol.iops).toBe(0);
  });
});

describe('mapFileStorageProfile', () => {
  it('recommends rfs for volumes within rfs IOPS limits', () => {
    const result = mapFileStorageProfile('2 IOPS/GB', 2000);
    expect(result.vpcProfile).toBe('rfs');
    expect(result.alternative).toBe('dp2');
  });

  it('recommends dp2 for volumes exceeding rfs max IOPS (35000)', () => {
    const result = mapFileStorageProfile('10 IOPS/GB', 40000);
    expect(result.vpcProfile).toBe('dp2');
    expect(result.alternative).toBeUndefined();
  });

  it('recommends rfs at the rfs IOPS boundary (35000)', () => {
    const result = mapFileStorageProfile('4 IOPS/GB', 35000);
    expect(result.vpcProfile).toBe('rfs');
  });

  it('handles zero/unknown IOPS by defaulting to rfs', () => {
    const result = mapFileStorageProfile('', 0);
    expect(result.vpcProfile).toBe('rfs');
  });

  it('includes Classic tier in notes', () => {
    const result = mapFileStorageProfile('4 IOPS/GB', 4000);
    expect(result.notes).toContain('Classic tier: 4 IOPS/GB → VPC profile: rfs');
  });
});
