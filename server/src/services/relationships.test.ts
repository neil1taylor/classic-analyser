import { describe, it, expect } from 'vitest';
import { buildRelationships } from './relationships.js';

function makeInput(overrides = {}) {
  return {
    virtualGuests: [],
    hardware: [],
    vlans: [],
    subnets: [],
    gateways: [],
    firewalls: [],
    securityGroups: [],
    blockStorage: [],
    fileStorage: [],
    placementGroups: [],
    dedicatedHosts: [],
    imageTemplates: [],
    ...overrides,
  };
}

describe('buildRelationships', () => {
  it('returns empty array when all inputs are empty', () => {
    const result = buildRelationships(makeInput());
    expect(result).toEqual([]);
  });

  it('maps VLAN -> Virtual Server via networkVlans', () => {
    const result = buildRelationships(makeInput({
      virtualGuests: [
        { id: 10, hostname: 'web1', networkVlans: [{ id: 100, vlanNumber: 500, name: 'prod' }] },
      ],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'VLAN',
      parentId: 100,
      childType: 'Virtual Server',
      childId: 10,
      relationshipField: 'networkVlans',
    }));
  });

  it('maps VLAN -> Bare Metal via networkVlans', () => {
    const result = buildRelationships(makeInput({
      hardware: [
        { id: 20, hostname: 'bm1', networkVlans: [{ id: 200, vlanNumber: 600 }] },
      ],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'VLAN',
      childType: 'Bare Metal',
      childId: 20,
    }));
  });

  it('maps VLAN -> Subnet via networkVlan', () => {
    const result = buildRelationships(makeInput({
      subnets: [
        { id: 30, networkIdentifier: '10.0.0.0', cidr: 24, networkVlan: { id: 300, vlanNumber: 700 } },
      ],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'VLAN',
      childType: 'Subnet',
      childId: 30,
    }));
  });

  it('maps VLAN -> Firewall via networkVlan', () => {
    const result = buildRelationships(makeInput({
      firewalls: [
        { id: 40, primaryIpAddress: '1.2.3.4', networkVlan: { id: 400, vlanNumber: 800 } },
      ],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'VLAN',
      childType: 'Firewall',
      childId: 40,
    }));
  });

  it('maps Network Gateway -> VLAN via insideVlans', () => {
    const result = buildRelationships(makeInput({
      gateways: [
        { id: 50, name: 'gw1', insideVlans: [{ networkVlan: { id: 500, vlanNumber: 900 } }] },
      ],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'Network Gateway',
      childType: 'VLAN',
      parentId: 50,
    }));
  });

  it('maps Block Storage -> Virtual Server', () => {
    const result = buildRelationships(makeInput({
      blockStorage: [
        { id: 60, username: 'SL01-vol', allowedVirtualGuests: [{ id: 10, hostname: 'web1' }] },
      ],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'Block Storage',
      childType: 'Virtual Server',
      parentId: 60,
      childId: 10,
    }));
  });

  it('maps Block Storage -> Bare Metal', () => {
    const result = buildRelationships(makeInput({
      blockStorage: [
        { id: 61, username: 'SL01-vol2', allowedHardware: [{ id: 20, hostname: 'bm1' }] },
      ],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'Block Storage',
      childType: 'Bare Metal',
    }));
  });

  it('maps File Storage -> Virtual Server', () => {
    const result = buildRelationships(makeInput({
      fileStorage: [
        { id: 70, username: 'SL01-file', allowedVirtualGuests: [{ id: 10, hostname: 'web1' }] },
      ],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'File Storage',
      childType: 'Virtual Server',
    }));
  });

  it('maps File Storage -> Bare Metal', () => {
    const result = buildRelationships(makeInput({
      fileStorage: [
        { id: 71, username: 'SL01-file2', allowedHardware: [{ id: 20, hostname: 'bm1' }] },
      ],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'File Storage',
      childType: 'Bare Metal',
    }));
  });

  it('maps Security Group -> Virtual Server via networkComponentBindings', () => {
    const result = buildRelationships(makeInput({
      virtualGuests: [{ id: 10, hostname: 'web1' }],
      securityGroups: [
        {
          id: 80,
          name: 'sg1',
          networkComponentBindings: [
            { networkComponent: { guest: { hostname: 'web1' } } },
          ],
        },
      ],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'Security Group',
      childType: 'Virtual Server',
      parentId: 80,
    }));
  });

  it('maps Placement Group -> Virtual Server', () => {
    const result = buildRelationships(makeInput({
      virtualGuests: [{ id: 10, hostname: 'web1', placementGroupId: 90 }],
      placementGroups: [{ id: 90, name: 'pg1' }],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'Placement Group',
      childType: 'Virtual Server',
      parentId: 90,
    }));
  });

  it('maps Dedicated Host -> Virtual Server', () => {
    const result = buildRelationships(makeInput({
      virtualGuests: [{ id: 10, hostname: 'web1', dedicatedHost: { id: 100, name: 'dh1' } }],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'Dedicated Host',
      childType: 'Virtual Server',
      parentId: 100,
    }));
  });

  it('maps Image Template -> Virtual Server', () => {
    const result = buildRelationships(makeInput({
      virtualGuests: [
        { id: 10, hostname: 'web1', blockDeviceTemplateGroup: { id: 110, globalIdentifier: 'abc' } },
      ],
      imageTemplates: [{ id: 110, name: 'my-image', globalIdentifier: 'abc' }],
    }));

    expect(result).toContainEqual(expect.objectContaining({
      parentType: 'Image Template',
      childType: 'Virtual Server',
      parentId: 110,
    }));
  });

  it('skips entries with undefined IDs', () => {
    const result = buildRelationships(makeInput({
      virtualGuests: [
        { hostname: 'no-id', networkVlans: [{ id: 100, vlanNumber: 500 }] },
      ],
    }));

    // parentId defined but childId undefined — addEntry skips
    expect(result).toEqual([]);
  });
});
