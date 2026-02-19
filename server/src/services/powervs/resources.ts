import { PowerVsClient } from './client.js';
import type {
  PowerVsWorkspace,
  PvsInstance,
  PvsVolume,
  PvsNetwork,
  PvsNetworkPort,
  PvsSshKey,
  PvsImage,
  PvsSnapshot,
  PvsPlacementGroup,
  PvsCloudConnection,
  PvsDhcpServer,
  PvsVpnConnection,
  PvsIkePolicy,
  PvsIpsecPolicy,
  PvsSharedProcessorPool,
  PvsVolumeGroup,
  PvsNetworkSecurityGroup,
  PvsHostGroup,
  PvsSystemPool,
  PvsSapProfile,
  PvsEvent,
} from './types.js';
import logger from '../../utils/logger.js';

// ── Workspace-injected type helper ──────────────────────────────

type WithWorkspace<T> = T & { _workspace: string; _workspaceId: string; _zone: string };

// ── 1. PVM Instances ────────────────────────────────────────────

export async function getPvsInstances(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsInstance>[]> {
  const allItems: WithWorkspace<PvsInstance>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ pvmInstances: PvsInstance[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'pvm-instances',
        ws.crn,
      );

      const items = response.pvmInstances ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get PVM instances from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 2. Volumes ──────────────────────────────────────────────────

export async function getPvsVolumes(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsVolume>[]> {
  const allItems: WithWorkspace<PvsVolume>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ volumes: PvsVolume[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'volumes',
        ws.crn,
      );

      const items = response.volumes ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get volumes from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 3. Networks ─────────────────────────────────────────────────

export async function getPvsNetworks(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsNetwork>[]> {
  const allItems: WithWorkspace<PvsNetwork>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ networks: PvsNetwork[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'networks',
        ws.crn,
      );

      const items = response.networks ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get networks from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 4. Network Ports ────────────────────────────────────────────

export async function getPvsNetworkPorts(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
  networks: WithWorkspace<PvsNetwork>[],
): Promise<WithWorkspace<PvsNetworkPort & { _networkID: string; _networkName: string }>[]> {
  const allItems: WithWorkspace<PvsNetworkPort & { _networkID: string; _networkName: string }>[] = [];

  for (const ws of workspaces) {
    // Filter networks belonging to this workspace
    const wsNetworks = networks.filter((n) => n._workspaceId === ws.guid);

    for (const network of wsNetworks) {
      try {
        const response = await client.request<{ ports: PvsNetworkPort[] }>(
          ws._apiRegion,
          ws._cloudInstanceId,
          `networks/${network.networkID}/ports`,
          ws.crn,
        );

        const items = response.ports ?? [];
        for (const item of items) {
          allItems.push({
            ...item,
            _workspace: ws.name,
            _workspaceId: ws.guid,
            _zone: ws._zone,
            _networkID: network.networkID,
            _networkName: network.name,
          });
        }
      } catch (err) {
        logger.warn(`Failed to get network ports for network ${network.name} in workspace ${ws.name}`, {
          message: (err as Error).message,
        });
      }
    }
  }

  return allItems;
}

// ── 5. SSH Keys ─────────────────────────────────────────────────

export async function getPvsSshKeys(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsSshKey>[]> {
  const allItems: WithWorkspace<PvsSshKey>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.requestV1<{ sshKeys: PvsSshKey[] }>(
        ws._apiRegion,
        'ssh-keys',
        ws.crn,
      );

      const items = response.sshKeys ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get SSH keys from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 6. Images ───────────────────────────────────────────────────

export async function getPvsImages(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsImage>[]> {
  const allItems: WithWorkspace<PvsImage>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ images: PvsImage[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'images',
        ws.crn,
      );

      const items = response.images ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get images from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 7. Stock Images ─────────────────────────────────────────────

export async function getPvsStockImages(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsImage & { _stockImage: true }>[]> {
  const allItems: WithWorkspace<PvsImage & { _stockImage: true }>[] = [];

  // Stock images are the same across a region, so only fetch once per unique API region.
  // Pick one representative workspace per region.
  const seenRegions = new Set<string>();
  const uniqueRegionWorkspaces: PowerVsWorkspace[] = [];
  for (const ws of workspaces) {
    if (!seenRegions.has(ws._apiRegion)) {
      seenRegions.add(ws._apiRegion);
      uniqueRegionWorkspaces.push(ws);
    }
  }

  for (const ws of uniqueRegionWorkspaces) {
    try {
      const response = await client.request<{ images: PvsImage[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'stock-images',
        ws.crn,
      );

      const items = response.images ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _stockImage: true as const,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get stock images from region ${ws._apiRegion}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 8. Snapshots ────────────────────────────────────────────────

export async function getPvsSnapshots(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsSnapshot>[]> {
  const allItems: WithWorkspace<PvsSnapshot>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ snapshots: PvsSnapshot[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'snapshots',
        ws.crn,
      );

      const items = response.snapshots ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get snapshots from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 9. Placement Groups ────────────────────────────────────────

export async function getPvsPlacementGroups(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsPlacementGroup>[]> {
  const allItems: WithWorkspace<PvsPlacementGroup>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ placementGroups: PvsPlacementGroup[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'placement-groups',
        ws.crn,
      );

      const items = response.placementGroups ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get placement groups from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 10. Cloud Connections ──────────────────────────────────────

export async function getPvsCloudConnections(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsCloudConnection>[]> {
  const allItems: WithWorkspace<PvsCloudConnection>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ cloudConnections: PvsCloudConnection[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'cloud-connections',
        ws.crn,
      );

      const items = response.cloudConnections ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get cloud connections from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 11. DHCP Servers ───────────────────────────────────────────

export async function getPvsDhcpServers(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsDhcpServer>[]> {
  const allItems: WithWorkspace<PvsDhcpServer>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<PvsDhcpServer[] | { dhcpServers: PvsDhcpServer[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'services/dhcp',
        ws.crn,
      );

      // API may return a plain array or a wrapped object
      const items = Array.isArray(response) ? response : (response.dhcpServers ?? []);
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get DHCP servers from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 12. VPN Connections ────────────────────────────────────────

export async function getPvsVpnConnections(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsVpnConnection>[]> {
  const allItems: WithWorkspace<PvsVpnConnection>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ vpnConnections: PvsVpnConnection[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'vpn/vpn-connections',
        ws.crn,
      );

      const items = response.vpnConnections ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get VPN connections from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 13. IKE Policies ──────────────────────────────────────────

export async function getPvsIkePolicies(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsIkePolicy>[]> {
  const allItems: WithWorkspace<PvsIkePolicy>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ ikePolicies: PvsIkePolicy[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'vpn/ike-policies',
        ws.crn,
      );

      const items = response.ikePolicies ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get IKE policies from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 14. IPsec Policies ────────────────────────────────────────

export async function getPvsIpsecPolicies(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsIpsecPolicy>[]> {
  const allItems: WithWorkspace<PvsIpsecPolicy>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ ipsecPolicies: PvsIpsecPolicy[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'vpn/ipsec-policies',
        ws.crn,
      );

      const items = response.ipsecPolicies ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get IPsec policies from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 15. Shared Processor Pools ─────────────────────────────────

export async function getPvsSharedProcessorPools(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsSharedProcessorPool>[]> {
  const allItems: WithWorkspace<PvsSharedProcessorPool>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ sharedProcessorPools: PvsSharedProcessorPool[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'shared-processor-pools',
        ws.crn,
      );

      const items = response.sharedProcessorPools ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get shared processor pools from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 16. Volume Groups ──────────────────────────────────────────

export async function getPvsVolumeGroups(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsVolumeGroup>[]> {
  const allItems: WithWorkspace<PvsVolumeGroup>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ volumeGroups: PvsVolumeGroup[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'volume-groups',
        ws.crn,
      );

      const items = response.volumeGroups ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get volume groups from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 17. Network Security Groups ────────────────────────────────

export async function getPvsNetworkSecurityGroups(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsNetworkSecurityGroup>[]> {
  const allItems: WithWorkspace<PvsNetworkSecurityGroup>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.requestV1<{ networkSecurityGroups: PvsNetworkSecurityGroup[] }>(
        ws._apiRegion,
        'network-security-groups',
        ws.crn,
      );

      const items = response.networkSecurityGroups ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get network security groups from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 18. Host Groups ────────────────────────────────────────────

export async function getPvsHostGroups(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsHostGroup>[]> {
  const allItems: WithWorkspace<PvsHostGroup>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.requestV1<PvsHostGroup[] | { hostGroups: PvsHostGroup[] }>(
        ws._apiRegion,
        'host-groups',
        ws.crn,
      );

      // API may return a plain array or a wrapped object
      const items = Array.isArray(response) ? response : (response.hostGroups ?? []);
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get host groups from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 19. System Pools ───────────────────────────────────────────

export async function getPvsSystemPools(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsSystemPool>[]> {
  const allItems: WithWorkspace<PvsSystemPool>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<Record<string, Omit<PvsSystemPool, 'type'>>>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'system-pools',
        ws.crn,
      );

      // Response is an object where keys are system types (e.g. "s922", "e980")
      // and values are pool info objects. Flatten into array with type injected.
      for (const [systemType, poolData] of Object.entries(response)) {
        // Skip non-object entries (e.g. if the response has unexpected fields)
        if (!poolData || typeof poolData !== 'object') continue;

        allItems.push({
          ...poolData,
          type: systemType,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        } as WithWorkspace<PvsSystemPool>);
      }
    } catch (err) {
      logger.warn(`Failed to get system pools from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 20. SAP Profiles ───────────────────────────────────────────

export async function getPvsSapProfiles(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsSapProfile>[]> {
  const allItems: WithWorkspace<PvsSapProfile>[] = [];

  for (const ws of workspaces) {
    try {
      const response = await client.request<{ profiles: PvsSapProfile[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        'sap',
        ws.crn,
      );

      const items = response.profiles ?? [];
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get SAP profiles from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}

// ── 21. Events ─────────────────────────────────────────────────

export async function getPvsEvents(
  client: PowerVsClient,
  workspaces: PowerVsWorkspace[],
): Promise<WithWorkspace<PvsEvent>[]> {
  const allItems: WithWorkspace<PvsEvent>[] = [];

  for (const ws of workspaces) {
    try {
      // Events endpoint requires from_time query parameter
      const fromTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await client.request<PvsEvent[] | { events: PvsEvent[] }>(
        ws._apiRegion,
        ws._cloudInstanceId,
        `events?from_time=${fromTime}`,
        ws.crn,
      );

      // API may return a plain array or a wrapped object
      const items = Array.isArray(response) ? response : (response.events ?? []);
      for (const item of items) {
        allItems.push({
          ...item,
          _workspace: ws.name,
          _workspaceId: ws.guid,
          _zone: ws._zone,
        });
      }
    } catch (err) {
      logger.warn(`Failed to get events from workspace ${ws.name}`, {
        message: (err as Error).message,
      });
    }
  }

  return allItems;
}
