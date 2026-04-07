import { describe, it, expect } from 'vitest';
import { runStorageChecks } from '../checks/storageChecks';

function makeBlock(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    username: 'block-vol-1',
    capacityGb: 100,
    iops: 1000,
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

describe('runStorageChecks — K8s filtering', () => {
  it('excludes K8s block storage from size checks', () => {
    const data = {
      blockStorage: [
        // K8s volume with huge capacity — should NOT trigger blocker
        makeBlock({ id: 1, _isKubeStorage: true, capacityGb: 40000 }),
        // Normal volume within limits
        makeBlock({ id: 2, _isKubeStorage: false, capacityGb: 100 }),
      ],
    };

    const results = runStorageChecks(data);
    const sizeCheck = results.find(r => r.check.id === 'storage-block-size');

    expect(sizeCheck).toBeDefined();
    expect(sizeCheck!.severity).toBe('passed');
    expect(sizeCheck!.affectedCount).toBe(0);
  });

  it('excludes K8s file storage from size checks', () => {
    const data = {
      fileStorage: [
        makeFile({ id: 1, _isKubeStorage: true, capacityGb: 40000 }),
      ],
    };

    const results = runStorageChecks(data);
    const sizeCheck = results.find(r => r.check.id === 'storage-file-size');

    expect(sizeCheck).toBeDefined();
    expect(sizeCheck!.severity).toBe('passed');
  });

  it('reports K8s-consumed storage in info check', () => {
    const kubeNotes = "{'plugin':'ibm-file-plugin-abc','cluster':'cluster123','pvc':'my-pvc'}";
    const data = {
      blockStorage: [
        makeBlock({ id: 1, _isKubeStorage: true, notes: kubeNotes }),
      ],
      fileStorage: [
        makeFile({ id: 2, _isKubeStorage: true, notes: kubeNotes }),
      ],
    };

    const results = runStorageChecks(data);
    const kubeCheck = results.find(r => r.check.id === 'storage-kube-consumed');

    expect(kubeCheck).toBeDefined();
    expect(kubeCheck!.severity).toBe('info');
    expect(kubeCheck!.affectedCount).toBe(2);
    // Should extract cluster and PVC from notes
    expect(kubeCheck!.affectedResources[0].detail).toContain('cluster123');
    expect(kubeCheck!.affectedResources[0].detail).toContain('my-pvc');
  });

  it('passes K8s check when no K8s storage exists', () => {
    const data = {
      blockStorage: [makeBlock()],
      fileStorage: [makeFile()],
    };

    const results = runStorageChecks(data);
    const kubeCheck = results.find(r => r.check.id === 'storage-kube-consumed');

    expect(kubeCheck).toBeDefined();
    expect(kubeCheck!.severity).toBe('passed');
    expect(kubeCheck!.affectedCount).toBe(0);
  });
});
