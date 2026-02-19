import type { OSCompatibility } from '@/types/migration';

export const OS_COMPATIBILITY: OSCompatibility[] = [
  { classicOS: 'RHEL 7', pattern: /red\s*hat.*7/i, vpcAvailable: true, vpcImage: 'ibm-redhat-7-9-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'RHEL 8', pattern: /red\s*hat.*8/i, vpcAvailable: true, vpcImage: 'ibm-redhat-8-8-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'RHEL 9', pattern: /red\s*hat.*9/i, vpcAvailable: true, vpcImage: 'ibm-redhat-9-2-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'Ubuntu 18.04', pattern: /ubuntu.*18/i, vpcAvailable: true, vpcImage: 'ibm-ubuntu-18-04-6-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'Ubuntu 20.04', pattern: /ubuntu.*20/i, vpcAvailable: true, vpcImage: 'ibm-ubuntu-20-04-6-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'Ubuntu 22.04', pattern: /ubuntu.*22/i, vpcAvailable: true, vpcImage: 'ibm-ubuntu-22-04-3-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'CentOS 7', pattern: /centos.*7/i, vpcAvailable: true, vpcImage: null, upgradeRequired: false, effort: 'moderate', notes: 'Community images only; consider migrating to RHEL' },
  { classicOS: 'CentOS 8', pattern: /centos.*8/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'RHEL 8 or Rocky Linux 8', effort: 'significant', notes: 'CentOS 8 is EOL — must upgrade to RHEL or Rocky Linux' },
  { classicOS: 'Debian 10', pattern: /debian.*10/i, vpcAvailable: true, vpcImage: 'ibm-debian-10-13-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'Debian 11', pattern: /debian.*11/i, vpcAvailable: true, vpcImage: 'ibm-debian-11-7-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'Windows 2016', pattern: /windows.*2016/i, vpcAvailable: true, vpcImage: 'ibm-windows-server-2016-full-standard-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'Windows 2019', pattern: /windows.*2019/i, vpcAvailable: true, vpcImage: 'ibm-windows-server-2019-full-standard-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'Windows 2022', pattern: /windows.*2022/i, vpcAvailable: true, vpcImage: 'ibm-windows-server-2022-full-standard-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration' },
  { classicOS: 'Windows 2012', pattern: /windows.*2012/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Windows Server 2019 or 2022', effort: 'significant', notes: 'Windows 2012 R2 not available in VPC — must upgrade' },
  { classicOS: 'FreeBSD', pattern: /freebsd/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Custom image required', effort: 'significant', notes: 'FreeBSD not available as stock VPC image' },
  { classicOS: 'VMware ESXi / vSphere', pattern: /vmware|vsphere|esxi/i, vpcAvailable: false, vpcImage: null, upgradeRequired: false, effort: 'significant', notes: 'VMware/vSphere cannot run on VPC — VMs must be migrated individually to VPC VSIs or OpenShift Virtualization' },
];

export function matchOS(osString: string): OSCompatibility | null {
  if (!osString) return null;
  return OS_COMPATIBILITY.find((entry) => entry.pattern.test(osString)) ?? null;
}
