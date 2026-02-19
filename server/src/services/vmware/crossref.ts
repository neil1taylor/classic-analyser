import type { SLHardware, SLNetworkVlan, SLBlockStorage, SLFileStorage } from '../softlayer/types.js';
import type { VMwareInstance, VMwareCluster, VMwareCrossReference } from './types.js';
import logger from '../../utils/logger.js';

interface CrossRefInput {
  hardware: SLHardware[];
  vlans: SLNetworkVlan[];
  blockStorage: SLBlockStorage[];
  fileStorage: SLFileStorage[];
  vmwareInstances: VMwareInstance[];
  vmwareClusters: VMwareCluster[];
}

export function buildVMwareCrossReferences(data: CrossRefInput): VMwareCrossReference[] {
  const refs: VMwareCrossReference[] = [];

  // Build a set of ESXi hostnames and IPs from VMware clusters
  const esxiHostMap = new Map<string, { clusterId: string; clusterName: string; instanceId: string }>();

  for (const cluster of data.vmwareClusters) {
    for (const host of cluster.hosts ?? []) {
      const info = {
        clusterId: cluster.id ?? '',
        clusterName: cluster.name ?? '',
        instanceId: cluster.instance_id ?? '',
      };
      if (host.hostname) {
        esxiHostMap.set(host.hostname.toLowerCase(), info);
      }
      if (host.primaryIp) {
        esxiHostMap.set(host.primaryIp, info);
      }
      if (host.backendIp) {
        esxiHostMap.set(host.backendIp, info);
      }
      if (host.hardwareId !== undefined) {
        esxiHostMap.set(`hw:${host.hardwareId}`, info);
      }
    }
  }

  // Match bare metal servers to ESXi hosts
  for (const hw of data.hardware) {
    const match =
      (hw.hostname && esxiHostMap.get(hw.hostname.toLowerCase())) ||
      (hw.primaryIpAddress && esxiHostMap.get(hw.primaryIpAddress)) ||
      (hw.primaryBackendIpAddress && esxiHostMap.get(hw.primaryBackendIpAddress)) ||
      (hw.id !== undefined && esxiHostMap.get(`hw:${hw.id}`));

    if (match) {
      refs.push({
        classicResourceType: 'Bare Metal',
        classicResourceId: hw.id ?? 0,
        classicResourceName: hw.hostname ?? '',
        vmwareRole: 'ESXi Host',
        vmwareResourceType: 'VMware Cluster',
        vmwareResourceId: match.clusterId,
        vmwareResourceName: match.clusterName,
      });
    }
  }

  // Match VLANs used by VMware instances (by datacenter overlap)
  const vmwareDatacenters = new Set<string>();
  for (const inst of data.vmwareInstances) {
    if (inst.datacenter) vmwareDatacenters.add(inst.datacenter.toLowerCase());
  }

  for (const vlan of data.vlans) {
    const vlanDc = vlan.primaryRouter?.datacenter?.name?.toLowerCase();
    if (vlanDc && vmwareDatacenters.has(vlanDc)) {
      // Check if any VMware bare metal refs are on this VLAN
      const vlanBareMetalIds = new Set(
        (data.hardware)
          .filter((hw) => hw.networkVlans?.some((v) => v.id === vlan.id))
          .filter((hw) => {
            return (
              (hw.hostname && esxiHostMap.has(hw.hostname.toLowerCase())) ||
              (hw.primaryIpAddress && esxiHostMap.has(hw.primaryIpAddress)) ||
              (hw.id !== undefined && esxiHostMap.has(`hw:${hw.id}`))
            );
          })
          .map((hw) => hw.id)
      );

      if (vlanBareMetalIds.size > 0) {
        refs.push({
          classicResourceType: 'VLAN',
          classicResourceId: vlan.id ?? 0,
          classicResourceName: `VLAN ${vlan.vlanNumber ?? ''}${vlan.name ? ` (${vlan.name})` : ''}`,
          vmwareRole: 'VMware VLAN',
          vmwareResourceType: 'VMware Infrastructure',
          vmwareResourceId: '',
          vmwareResourceName: `${vlanBareMetalIds.size} ESXi hosts`,
        });
      }
    }
  }

  // Match storage volumes authorized to VMware bare metal
  const vmwareBareMetalHostnames = new Set(
    refs
      .filter((r) => r.classicResourceType === 'Bare Metal')
      .map((r) => r.classicResourceName.toLowerCase())
  );
  const vmwareBareMetalIds = new Set(
    refs
      .filter((r) => r.classicResourceType === 'Bare Metal')
      .map((r) => r.classicResourceId)
  );

  for (const vol of data.blockStorage) {
    const authorizedToVMware = (vol.allowedHardware ?? []).some(
      (hw) =>
        (hw.hostname && vmwareBareMetalHostnames.has(hw.hostname.toLowerCase())) ||
        (hw.id !== undefined && vmwareBareMetalIds.has(hw.id))
    );
    if (authorizedToVMware) {
      refs.push({
        classicResourceType: 'Block Storage',
        classicResourceId: vol.id ?? 0,
        classicResourceName: vol.username ?? '',
        vmwareRole: 'VMware Storage',
        vmwareResourceType: 'VMware Infrastructure',
        vmwareResourceId: '',
        vmwareResourceName: 'Authorized to ESXi host(s)',
      });
    }
  }

  for (const vol of data.fileStorage) {
    const authorizedToVMware = (vol.allowedHardware ?? []).some(
      (hw) =>
        (hw.hostname && vmwareBareMetalHostnames.has(hw.hostname.toLowerCase())) ||
        (hw.id !== undefined && vmwareBareMetalIds.has(hw.id))
    );
    if (authorizedToVMware) {
      refs.push({
        classicResourceType: 'File Storage',
        classicResourceId: vol.id ?? 0,
        classicResourceName: vol.username ?? '',
        vmwareRole: 'VMware Storage',
        vmwareResourceType: 'VMware Infrastructure',
        vmwareResourceId: '',
        vmwareResourceName: 'Authorized to ESXi host(s)',
      });
    }
  }

  logger.info('Built VMware cross-references', { count: refs.length });
  return refs;
}
