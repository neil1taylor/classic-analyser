import { describe, it, expect } from 'vitest';
import { buildRelationships, RELATIONSHIP_DEFINITIONS } from './relationships';

describe('RELATIONSHIP_DEFINITIONS', () => {
  it('contains 13 relationship definitions', () => {
    expect(RELATIONSHIP_DEFINITIONS).toHaveLength(13);
  });

  it('each definition has required fields', () => {
    for (const def of RELATIONSHIP_DEFINITIONS) {
      expect(def).toHaveProperty('parentType');
      expect(def).toHaveProperty('childType');
      expect(def).toHaveProperty('parentField');
      expect(def).toHaveProperty('childField');
      expect(def).toHaveProperty('label');
    }
  });
});

describe('buildRelationships', () => {
  it('returns empty array when no data matches', () => {
    const result = buildRelationships({
      vlans: [{ id: 1, vlanNumber: 100 }],
      subnets: [{ id: 2, vlanNumber: 200 }],
    });
    expect(result).toEqual([]);
  });

  it('finds VLAN -> Subnet relationships', () => {
    const result = buildRelationships({
      vlans: [{ id: 1, vlanNumber: 100 }],
      subnets: [{ id: 2, vlanNumber: 100 }, { id: 3, vlanNumber: 200 }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({
      parentType: 'vlans',
      childType: 'subnets',
      parentId: 100,
      childIds: [2],
    }));
  });

  it('returns empty when one side is missing', () => {
    const result = buildRelationships({
      vlans: [{ id: 1, vlanNumber: 100 }],
    });
    expect(result).toEqual([]);
  });

  it('returns empty when both sides are empty arrays', () => {
    const result = buildRelationships({
      vlans: [],
      subnets: [],
    });
    expect(result).toEqual([]);
  });

  it('handles nested child fields', () => {
    const result = buildRelationships({
      vlans: [{ id: 1 }],
      virtualServers: [
        { id: 10, primaryNetworkComponent: { networkVlan: { id: 1 } } },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].childIds).toContain(10);
  });

  it('collects multiple matching children', () => {
    const result = buildRelationships({
      vlans: [{ id: 1, vlanNumber: 100 }],
      subnets: [
        { id: 2, vlanNumber: 100 },
        { id: 3, vlanNumber: 100 },
        { id: 4, vlanNumber: 100 },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].childIds).toEqual([2, 3, 4]);
  });

  it('skips parents with null parent field value', () => {
    const result = buildRelationships({
      vlans: [{ id: 1, vlanNumber: null }],
      subnets: [{ id: 2, vlanNumber: 100 }],
    });
    expect(result).toEqual([]);
  });
});
