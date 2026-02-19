import type {
  SLVirtualGuest,
  SLHardware,
  SLNetworkVlan,
  SLSubnet,
  SLNetworkGateway,
  SLFirewall,
  SLSecurityGroup,
  SLBlockStorage,
  SLFileStorage,
  SLPlacementGroup,
  SLDedicatedHost,
  SLImageTemplate,
  RelationshipEntry,
  RelationshipMap,
} from './softlayer/types.js';
import type {
  VMwareInstance,
  VMwareCluster,
  DirectorSite,
  PVDC,
  VCFCluster,
  VDC,
} from './vmware/types.js';
import logger from '../utils/logger.js';

interface RelationshipInput {
  virtualGuests: SLVirtualGuest[];
  hardware: SLHardware[];
  vlans: SLNetworkVlan[];
  subnets: SLSubnet[];
  gateways: SLNetworkGateway[];
  firewalls: SLFirewall[];
  securityGroups: SLSecurityGroup[];
  blockStorage: SLBlockStorage[];
  fileStorage: SLFileStorage[];
  placementGroups: SLPlacementGroup[];
  dedicatedHosts: SLDedicatedHost[];
  imageTemplates: SLImageTemplate[];
  vmwareInstances?: VMwareInstance[];
  vmwareClusters?: VMwareCluster[];
  directorSites?: DirectorSite[];
  pvdcs?: PVDC[];
  vcfClusters?: VCFCluster[];
  vdcs?: VDC[];
}

function addEntry(
  entries: RelationshipEntry[],
  parentType: string,
  parentId: number | undefined,
  parentName: string,
  childType: string,
  childId: number | undefined,
  childName: string,
  relationshipField: string
): void {
  if (parentId === undefined || childId === undefined) return;
  entries.push({
    parentType,
    parentId,
    parentName,
    childType,
    childId,
    childName,
    relationshipField,
  });
}

export function buildRelationships(data: RelationshipInput): RelationshipMap {
  const entries: RelationshipEntry[] = [];

  // 1. VLAN -> Virtual Server (from VSI.networkVlans)
  for (const vsi of data.virtualGuests) {
    if (vsi.networkVlans && Array.isArray(vsi.networkVlans)) {
      for (const vlan of vsi.networkVlans) {
        addEntry(
          entries,
          'VLAN', vlan.id, `VLAN ${vlan.vlanNumber ?? ''}${vlan.name ? ` (${vlan.name})` : ''}`,
          'Virtual Server', vsi.id, vsi.hostname ?? '',
          'networkVlans'
        );
      }
    }
  }

  // 2. VLAN -> Bare Metal (from Hardware.networkVlans)
  for (const hw of data.hardware) {
    if (hw.networkVlans && Array.isArray(hw.networkVlans)) {
      for (const vlan of hw.networkVlans) {
        addEntry(
          entries,
          'VLAN', vlan.id, `VLAN ${vlan.vlanNumber ?? ''}${vlan.name ? ` (${vlan.name})` : ''}`,
          'Bare Metal', hw.id, hw.hostname ?? '',
          'networkVlans'
        );
      }
    }
  }

  // 3. VLAN -> Subnet (from Subnet.networkVlan)
  for (const subnet of data.subnets) {
    if (subnet.networkVlan && subnet.networkVlan.id) {
      const vlan = subnet.networkVlan;
      addEntry(
        entries,
        'VLAN', vlan.id, `VLAN ${vlan.vlanNumber ?? ''}${vlan.name ? ` (${vlan.name})` : ''}`,
        'Subnet', subnet.id, `${subnet.networkIdentifier ?? ''}/${subnet.cidr ?? ''}`,
        'networkVlan'
      );
    }
  }

  // 4. VLAN -> Firewall (from Firewall.networkVlan)
  for (const fw of data.firewalls) {
    if (fw.networkVlan && fw.networkVlan.id) {
      const vlan = fw.networkVlan;
      addEntry(
        entries,
        'VLAN', vlan.id, `VLAN ${vlan.vlanNumber ?? ''}${vlan.name ? ` (${vlan.name})` : ''}`,
        'Firewall', fw.id, fw.primaryIpAddress ?? `Firewall ${fw.id}`,
        'networkVlan'
      );
    }
  }

  // 5. Network Gateway -> VLAN (from Gateway.insideVlans)
  for (const gw of data.gateways) {
    if (gw.insideVlans && Array.isArray(gw.insideVlans)) {
      for (const gwVlan of gw.insideVlans) {
        const nv = gwVlan.networkVlan;
        if (nv) {
          addEntry(
            entries,
            'Network Gateway', gw.id, gw.name ?? '',
            'VLAN', nv.id, `VLAN ${nv.vlanNumber ?? ''}${nv.name ? ` (${nv.name})` : ''}`,
            'insideVlans'
          );
        }
      }
    }
  }

  // 6. Block Storage -> Virtual Server (from BlockStorage.allowedVirtualGuests)
  for (const vol of data.blockStorage) {
    if (vol.allowedVirtualGuests && Array.isArray(vol.allowedVirtualGuests)) {
      for (const guest of vol.allowedVirtualGuests) {
        addEntry(
          entries,
          'Block Storage', vol.id, vol.username ?? '',
          'Virtual Server', guest.id, guest.hostname ?? '',
          'allowedVirtualGuests'
        );
      }
    }
  }

  // 7. Block Storage -> Bare Metal (from BlockStorage.allowedHardware)
  for (const vol of data.blockStorage) {
    if (vol.allowedHardware && Array.isArray(vol.allowedHardware)) {
      for (const hw of vol.allowedHardware) {
        addEntry(
          entries,
          'Block Storage', vol.id, vol.username ?? '',
          'Bare Metal', hw.id, hw.hostname ?? '',
          'allowedHardware'
        );
      }
    }
  }

  // 8. File Storage -> Virtual Server (from FileStorage.allowedVirtualGuests)
  for (const vol of data.fileStorage) {
    if (vol.allowedVirtualGuests && Array.isArray(vol.allowedVirtualGuests)) {
      for (const guest of vol.allowedVirtualGuests) {
        addEntry(
          entries,
          'File Storage', vol.id, vol.username ?? '',
          'Virtual Server', guest.id, guest.hostname ?? '',
          'allowedVirtualGuests'
        );
      }
    }
  }

  // 9. File Storage -> Bare Metal (from FileStorage.allowedHardware)
  for (const vol of data.fileStorage) {
    if (vol.allowedHardware && Array.isArray(vol.allowedHardware)) {
      for (const hw of vol.allowedHardware) {
        addEntry(
          entries,
          'File Storage', vol.id, vol.username ?? '',
          'Bare Metal', hw.id, hw.hostname ?? '',
          'allowedHardware'
        );
      }
    }
  }

  // 10. Security Group -> Virtual Server (from SecurityGroup.networkComponentBindings)
  for (const sg of data.securityGroups) {
    if (sg.networkComponentBindings && Array.isArray(sg.networkComponentBindings)) {
      for (const binding of sg.networkComponentBindings) {
        const nc = binding.networkComponent;
        if (nc?.guest?.hostname) {
          // We don't have the guest ID directly from binding, use hostname as name
          // Try to find matching VSI by hostname
          const matchingVsi = data.virtualGuests.find(
            (v) => v.hostname === nc.guest?.hostname
          );
          addEntry(
            entries,
            'Security Group', sg.id, sg.name ?? '',
            'Virtual Server', matchingVsi?.id ?? 0, nc.guest.hostname,
            'networkComponentBindings'
          );
        }
        if (nc?.hardware?.hostname) {
          const matchingHw = data.hardware.find(
            (h) => h.hostname === nc.hardware?.hostname
          );
          addEntry(
            entries,
            'Security Group', sg.id, sg.name ?? '',
            'Bare Metal', matchingHw?.id ?? 0, nc.hardware.hostname,
            'networkComponentBindings'
          );
        }
      }
    }
  }

  // 11. Placement Group -> Virtual Server (from VSI.placementGroupId)
  for (const vsi of data.virtualGuests) {
    if (vsi.placementGroupId) {
      const pg = data.placementGroups.find((p) => p.id === vsi.placementGroupId);
      addEntry(
        entries,
        'Placement Group', vsi.placementGroupId, pg?.name ?? `Placement Group ${vsi.placementGroupId}`,
        'Virtual Server', vsi.id, vsi.hostname ?? '',
        'placementGroupId'
      );
    }
  }

  // 12. Dedicated Host -> Virtual Server (from VSI.dedicatedHost)
  for (const vsi of data.virtualGuests) {
    if (vsi.dedicatedHost && vsi.dedicatedHost.id) {
      addEntry(
        entries,
        'Dedicated Host', vsi.dedicatedHost.id, vsi.dedicatedHost.name ?? '',
        'Virtual Server', vsi.id, vsi.hostname ?? '',
        'dedicatedHost'
      );
    }
  }

  // 13. Image Template -> Virtual Server (from VSI.blockDeviceTemplateGroup)
  for (const vsi of data.virtualGuests) {
    if (vsi.blockDeviceTemplateGroup && vsi.blockDeviceTemplateGroup.id) {
      const tmpl = data.imageTemplates.find(
        (t) => t.id === vsi.blockDeviceTemplateGroup?.id ||
               t.globalIdentifier === vsi.blockDeviceTemplateGroup?.globalIdentifier
      );
      addEntry(
        entries,
        'Image Template', vsi.blockDeviceTemplateGroup.id, tmpl?.name ?? `Image ${vsi.blockDeviceTemplateGroup.id}`,
        'Virtual Server', vsi.id, vsi.hostname ?? '',
        'blockDeviceTemplateGroup'
      );
    }
  }

  // ── VMware Relationships ──────────────────────────────────────────

  // 14. vCenter Instance -> VMware Cluster
  for (const cluster of data.vmwareClusters ?? []) {
    if (cluster.instance_id) {
      const inst = (data.vmwareInstances ?? []).find((i) => i.id === cluster.instance_id);
      addEntry(
        entries,
        'vCenter Instance', 0, inst?.name ?? cluster.instance_id,
        'VMware Cluster', 0, cluster.name ?? '',
        'clusters'
      );
    }
  }

  // 15. Director Site -> PVDC
  for (const pvdc of data.pvdcs ?? []) {
    if (pvdc.director_site_id) {
      const site = (data.directorSites ?? []).find((s) => s.id === pvdc.director_site_id);
      addEntry(
        entries,
        'Director Site', 0, site?.name ?? pvdc.director_site_id,
        'PVDC', 0, pvdc.name ?? '',
        'pvdcs'
      );
    }
  }

  // 16. PVDC -> VCF Cluster
  for (const cluster of data.vcfClusters ?? []) {
    if (cluster.pvdc_id) {
      const pvdc = (data.pvdcs ?? []).find((p) => p.id === cluster.pvdc_id);
      addEntry(
        entries,
        'PVDC', 0, pvdc?.name ?? cluster.pvdc_id,
        'VCF Cluster', 0, cluster.name ?? '',
        'clusters'
      );
    }
  }

  // 17. Director Site -> VDC
  for (const vdc of data.vdcs ?? []) {
    if (vdc.director_site_id) {
      const site = (data.directorSites ?? []).find((s) => s.id === vdc.director_site_id);
      addEntry(
        entries,
        'Director Site', 0, site?.name ?? vdc.director_site_id ?? '',
        'VDC', 0, vdc.name ?? '',
        'vdcs'
      );
    }
  }

  logger.info('Built relationship map', { totalRelationships: entries.length });
  return entries;
}
