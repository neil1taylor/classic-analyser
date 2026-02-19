import type { MigrationWave, MigrationWaveResource, ComputeAssessment, NetworkAssessment, StorageAssessment, SecurityAssessment } from '@/types/migration';

function makeResource(id: string | number, type: string, name: string, dc: string): MigrationWaveResource {
  return { id: String(id), type, name, datacenter: dc };
}

export function planWaves(
  compute: ComputeAssessment,
  network: NetworkAssessment,
  storage: StorageAssessment,
  security: SecurityAssessment,
): MigrationWave[] {
  const waves: MigrationWave[] = [];

  // Wave 0: Foundation — VPC, subnets, security groups, SSH keys
  const wave0Resources: MigrationWaveResource[] = [];
  wave0Resources.push(makeResource('vpc', 'vpc', 'Production VPC', ''));
  for (const subnet of network.vlanAnalysis.recommendedVPCSubnets) {
    wave0Resources.push(makeResource(`subnet-${subnet.classicVlanNumber}`, 'subnet', subnet.vpcSubnetName, subnet.datacenter));
  }
  if (security.sshKeys.total > 0) {
    wave0Resources.push(makeResource('ssh-keys', 'sshKeys', `${security.sshKeys.total} SSH key(s)`, ''));
  }
  if (security.securityGroups.existingGroups > 0) {
    wave0Resources.push(makeResource('security-groups', 'securityGroups', `${security.securityGroups.vpcGroupsNeeded} security group(s)`, ''));
  }

  waves.push({
    waveNumber: 0,
    name: 'Foundation',
    description: 'Create VPC, subnets, security groups, and import SSH keys',
    resources: wave0Resources,
    prerequisites: ['VPC quotas approved', 'Network CIDR ranges planned'],
    estimatedDuration: '1-2 days',
    rollbackPlan: 'Delete VPC and all child resources',
    validationSteps: ['Verify VPC created', 'Verify subnets in correct zones', 'Verify security groups have correct rules'],
  });

  // Wave 1: Network — gateways, VPNs, load balancers
  const wave1Resources: MigrationWaveResource[] = [];
  for (const gw of network.gatewayAnalysis.assessments) {
    wave1Resources.push(makeResource(`gw-${gw.id}`, 'gateway', gw.name, ''));
  }
  for (const vpn of network.vpnAnalysis.assessments) {
    wave1Resources.push(makeResource(`vpn-${vpn.id}`, 'vpn', vpn.name, ''));
  }
  for (const lb of network.loadBalancerAnalysis.mappings) {
    wave1Resources.push(makeResource(`lb-${lb.classicId}`, 'loadBalancer', lb.classicName, ''));
  }

  if (wave1Resources.length > 0) {
    waves.push({
      waveNumber: 1,
      name: 'Network',
      description: 'Set up VPN gateways, load balancers, and gateway appliances',
      resources: wave1Resources,
      prerequisites: ['Foundation wave complete', 'VPN peer configurations available'],
      estimatedDuration: '2-3 days',
      rollbackPlan: 'Remove VPN gateways and load balancers',
      validationSteps: ['Verify VPN tunnels established', 'Verify load balancer health checks passing'],
    });
  }

  // Wave 2: Storage — block and file storage
  const wave2Resources: MigrationWaveResource[] = [];
  for (const vol of storage.blockStorage.volumeAssessments) {
    wave2Resources.push(makeResource(`block-${vol.id}`, 'blockStorage', vol.username, ''));
  }
  for (const vol of storage.fileStorage.volumeAssessments) {
    wave2Resources.push(makeResource(`file-${vol.id}`, 'fileStorage', vol.username, ''));
  }

  if (wave2Resources.length > 0) {
    waves.push({
      waveNumber: 2,
      name: 'Storage',
      description: 'Migrate block and file storage volumes',
      resources: wave2Resources,
      prerequisites: ['Foundation wave complete', 'Storage snapshots taken'],
      estimatedDuration: `${Math.max(1, Math.ceil(wave2Resources.length / 5))}-${Math.max(2, Math.ceil(wave2Resources.length / 3))} days`,
      rollbackPlan: 'Retain Classic volumes until VPC volumes validated',
      validationSteps: ['Verify volume sizes match', 'Verify IOPS performance', 'Verify data integrity'],
    });
  }

  // Wave 3: Database/stateful instances (instances with storage attachments)
  // Wave 4: Application + Web instances
  const readyVSIs = compute.vsiMigrations.filter((v) => v.status === 'ready' || v.status === 'needs-work');
  const readyBMs = compute.bareMetalMigrations.filter((b) => b.status !== 'blocked' && b.migrationPath !== 'powervs' && b.migrationPath !== 'powervs-sap');
  const oracleBMs = compute.bareMetalMigrations.filter((b) => b.migrationPath === 'powervs');
  const sapPowerVSBMs = compute.bareMetalMigrations.filter((b) => b.migrationPath === 'powervs-sap');

  const allCompute = [
    ...readyVSIs.map((v) => makeResource(`vsi-${v.id}`, 'vsi', v.hostname, v.datacenter)),
    ...readyBMs.map((b) => makeResource(`bm-${b.id}`, 'bareMetal', b.hostname, b.datacenter)),
  ];

  // Split compute into two waves if there are many
  if (allCompute.length > 10) {
    const half = Math.ceil(allCompute.length / 2);
    const firstBatch = allCompute.slice(0, half);
    const secondBatch = allCompute.slice(half);

    waves.push({
      waveNumber: 3,
      name: 'Compute - Batch 1',
      description: 'Migrate first batch of compute instances',
      resources: firstBatch,
      prerequisites: ['Storage wave complete', 'OS upgrades completed (if needed)'],
      estimatedDuration: `${Math.max(1, Math.ceil(firstBatch.length / 5))}-${Math.max(2, Math.ceil(firstBatch.length / 3))} days`,
      rollbackPlan: 'Keep Classic instances running, switch DNS back',
      validationSteps: ['Verify instances running', 'Verify application health', 'Verify connectivity'],
    });

    waves.push({
      waveNumber: 4,
      name: 'Compute - Batch 2',
      description: 'Migrate remaining compute instances',
      resources: secondBatch,
      prerequisites: ['Batch 1 validated'],
      estimatedDuration: `${Math.max(1, Math.ceil(secondBatch.length / 5))}-${Math.max(2, Math.ceil(secondBatch.length / 3))} days`,
      rollbackPlan: 'Keep Classic instances running, switch DNS back',
      validationSteps: ['Verify instances running', 'Verify application health', 'Verify connectivity'],
    });
  } else if (allCompute.length > 0) {
    waves.push({
      waveNumber: 3,
      name: 'Compute',
      description: 'Migrate compute instances',
      resources: allCompute,
      prerequisites: ['Storage wave complete', 'OS upgrades completed (if needed)'],
      estimatedDuration: `${Math.max(1, Math.ceil(allCompute.length / 5))}-${Math.max(2, Math.ceil(allCompute.length / 3))} days`,
      rollbackPlan: 'Keep Classic instances running, switch DNS back',
      validationSteps: ['Verify instances running', 'Verify application health', 'Verify connectivity'],
    });
  }

  // Oracle → PowerVS wave (separate from VPC compute)
  if (oracleBMs.length > 0) {
    const oracleResources = oracleBMs.map((b) => makeResource(`bm-${b.id}`, 'bareMetal', b.hostname, b.datacenter));
    waves.push({
      waveNumber: waves.length,
      name: 'Oracle → PowerVS',
      description: 'Migrate Oracle bare metal servers to IBM Power Virtual Server (PowerVS)',
      resources: oracleResources,
      prerequisites: ['Confirm Oracle workloads on identified servers', 'PowerVS workspace provisioned', 'Oracle licensing reviewed (BYOL)'],
      estimatedDuration: `${Math.max(2, oracleResources.length)}-${Math.max(5, oracleResources.length * 2)} days`,
      rollbackPlan: 'Retain Classic bare metal servers until PowerVS instances validated',
      validationSteps: ['Verify PowerVS instances running', 'Verify Oracle Database connectivity', 'Verify application performance on POWER architecture'],
    });
  }

  // SAP → PowerVS wave (large SAP configs exceeding VPC limits)
  if (sapPowerVSBMs.length > 0) {
    const sapResources = sapPowerVSBMs.map((b) => makeResource(`bm-${b.id}`, 'bareMetal', b.hostname, b.datacenter));
    waves.push({
      waveNumber: waves.length,
      name: 'SAP → PowerVS',
      description: 'Migrate large SAP HANA bare metal servers (>768 GB) to IBM Power Virtual Server (PowerVS)',
      resources: sapResources,
      prerequisites: ['Confirm SAP HANA workloads on identified servers', 'PowerVS workspace provisioned', 'SAP licensing reviewed', 'SAP migration plan established'],
      estimatedDuration: `${Math.max(3, sapResources.length * 2)}-${Math.max(7, sapResources.length * 3)} days`,
      rollbackPlan: 'Retain Classic bare metal servers until PowerVS SAP instances validated',
      validationSteps: ['Verify PowerVS instances running', 'Verify SAP HANA database connectivity', 'Verify SAP application performance', 'Run SAP HANA consistency checks'],
    });
  }

  // Final wave: Cutover (DNS, decommission)
  waves.push({
    waveNumber: waves.length,
    name: 'Cutover',
    description: 'Update DNS records, verify all services, decommission Classic resources',
    resources: [makeResource('cutover', 'cutover', 'DNS + Decommission', '')],
    prerequisites: ['All previous waves complete and validated'],
    estimatedDuration: '1-2 days',
    rollbackPlan: 'Revert DNS to Classic IPs',
    validationSteps: ['Verify DNS propagation', 'Verify all services accessible', 'Monitor for 24-48 hours', 'Cancel Classic resources'],
  });

  return waves;
}
