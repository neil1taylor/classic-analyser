export type ImportMethod = 'report' | 'mdl' | 'xlsx';

export function getImportMethod(importFilename: string | null): ImportMethod | null {
  if (!importFilename) return null;
  if (importFilename.startsWith('report:')) return 'report';
  if (importFilename.startsWith('mdl:')) return 'mdl';
  return 'xlsx';
}

const importWarnings: Record<string, Record<string, string>> = {
  report: {
    virtualServers:
      'IMS reports provide limited VSI data — disk utilization, block device details, and network storage associations are not available.',
    bareMetal:
      'IMS reports provide limited bare metal data — disk utilization and detailed hardware component information are not available.',
    vlans:
      'IMS reports provide basic VLAN data only — subnet details and associated resource counts are not available.',
    gateways:
      'IMS reports provide basic gateway data only — member details, inside VLANs, and status are not available.',
    subnets: 'Subnet data is not available from IMS report imports.',
    blockStorage:
      'IMS reports provide basic block storage data only — snapshot details and allowed hardware associations are not available.',
    fileStorage:
      'IMS reports provide basic file storage data only — snapshot details and allowed hardware associations are not available.',
    securityGroups:
      'IMS reports provide limited security group data — detailed rule definitions may be incomplete.',
    firewalls: 'Firewall data is not available from IMS report imports.',
    loadBalancers: 'Load balancer data is not available from IMS report imports.',
    sslCertificates: 'SSL certificate data is not available from IMS report imports.',
    sshKeys: 'SSH key data is not available from IMS report imports.',
    dnsDomains: 'DNS domain data is not available from IMS report imports.',
    dnsRecords: 'DNS record data is not available from IMS report imports.',
    vpnTunnels: 'VPN tunnel data is not available from IMS report imports.',
    billingItems: 'Billing data is not available from IMS report imports.',
    users: 'User data is not available from IMS report imports.',
    eventLog: 'Event log data is not available from IMS report imports.',
  },
  mdl: {
    virtualServers:
      'MDL imports do not include disk utilization data (requires live SSH access).',
    bareMetal:
      'MDL imports do not include disk utilization data (requires live SSH access).',
  },
};

export function getImportWarning(
  importMethod: ImportMethod | null,
  resourceKey: string,
): string | null {
  if (!importMethod) return null;
  return importWarnings[importMethod]?.[resourceKey] ?? null;
}
