import type { OSCompatibility } from '@/types/migration';

export const OS_COMPATIBILITY: OSCompatibility[] = [
  // ── Red Hat Enterprise Linux ───────────────────────────────────────────
  { classicOS: 'RHEL 6', pattern: /red\s*hat.*6/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'RHEL 8 or 9', effort: 'significant', notes: 'RHEL 6 is EOL — no VPC image available. Upgrade to RHEL 8/9 required.', eolDate: '2020-11-30', imageType: 'none' },
  { classicOS: 'RHEL 7', pattern: /red\s*hat.*7/i, vpcAvailable: true, vpcImage: null, upgradeRequired: false, effort: 'moderate', notes: 'RHEL 7 EOL June 2024 — BYOL custom image only on VPC. Upgrade to RHEL 8/9 recommended.', eolDate: '2024-06-30', imageType: 'byol' },
  { classicOS: 'RHEL 8', pattern: /red\s*hat.*8/i, vpcAvailable: true, vpcImage: 'ibm-redhat-8-8-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },
  { classicOS: 'RHEL 9', pattern: /red\s*hat.*9/i, vpcAvailable: true, vpcImage: 'ibm-redhat-9-2-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },

  // ── CentOS ─────────────────────────────────────────────────────────────
  { classicOS: 'CentOS 5', pattern: /centos.*5/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'RHEL 8/9 or Rocky Linux 8/9', effort: 'significant', notes: 'CentOS 5 is long EOL — no VPC image available.', eolDate: '2017-03-31', imageType: 'none' },
  { classicOS: 'CentOS 6', pattern: /centos.*6/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'RHEL 8/9 or Rocky Linux 8/9', effort: 'significant', notes: 'CentOS 6 is EOL — no VPC image available.', eolDate: '2020-11-30', imageType: 'none' },
  { classicOS: 'CentOS 7', pattern: /centos.*7/i, vpcAvailable: true, vpcImage: null, upgradeRequired: false, effort: 'moderate', notes: 'CentOS 7 EOL June 2024 — BYOL custom image only. Migrate to CentOS Stream 9, Rocky Linux 9, or RHEL 9 recommended.', eolDate: '2024-06-30', imageType: 'byol' },
  { classicOS: 'CentOS 8', pattern: /centos.*8/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'RHEL 8/9, Rocky Linux 8/9, or AlmaLinux 8/9', effort: 'significant', notes: 'CentOS 8 is EOL (Dec 2021) — must upgrade to RHEL, Rocky Linux, or AlmaLinux.', eolDate: '2021-12-31', imageType: 'none' },

  // ── Ubuntu ─────────────────────────────────────────────────────────────
  { classicOS: 'Ubuntu 14.04', pattern: /ubuntu.*14/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Ubuntu 22.04 or 24.04', effort: 'significant', notes: 'Ubuntu 14.04 is EOL — no VPC image available.', eolDate: '2019-04-30', imageType: 'none' },
  { classicOS: 'Ubuntu 16.04', pattern: /ubuntu.*16/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Ubuntu 22.04 or 24.04', effort: 'significant', notes: 'Ubuntu 16.04 is EOL — no VPC image available.', eolDate: '2021-04-30', imageType: 'none' },
  { classicOS: 'Ubuntu 18.04', pattern: /ubuntu.*18/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Ubuntu 22.04 or 24.04', effort: 'significant', notes: 'Ubuntu 18.04 is EOL (May 2023) — no VPC image available.', eolDate: '2023-05-31', imageType: 'none' },
  { classicOS: 'Ubuntu 20.04', pattern: /ubuntu.*20/i, vpcAvailable: true, vpcImage: 'ibm-ubuntu-20-04-6-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },
  { classicOS: 'Ubuntu 22.04', pattern: /ubuntu.*22/i, vpcAvailable: true, vpcImage: 'ibm-ubuntu-22-04-3-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },
  { classicOS: 'Ubuntu 24.04', pattern: /ubuntu.*24/i, vpcAvailable: true, vpcImage: 'ibm-ubuntu-24-04-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },

  // ── Debian ─────────────────────────────────────────────────────────────
  { classicOS: 'Debian 9', pattern: /debian.*9/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Debian 11 or 12', effort: 'significant', notes: 'Debian 9 is EOL (Jun 2022) — no VPC image available.', eolDate: '2022-06-30', imageType: 'none' },
  { classicOS: 'Debian 10', pattern: /debian.*10/i, vpcAvailable: true, vpcImage: 'ibm-debian-10-13-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration — consider upgrading to Debian 11/12', imageType: 'stock' },
  { classicOS: 'Debian 11', pattern: /debian.*11/i, vpcAvailable: true, vpcImage: 'ibm-debian-11-7-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },
  { classicOS: 'Debian 12', pattern: /debian.*12/i, vpcAvailable: true, vpcImage: 'ibm-debian-12-minimal-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },

  // ── SUSE Linux Enterprise Server ───────────────────────────────────────
  { classicOS: 'SLES 11', pattern: /sles?\s*11|suse.*11/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'SLES 15', effort: 'significant', notes: 'SLES 11 is EOL (Mar 2022) — no VPC image available.', eolDate: '2022-03-31', imageType: 'none' },
  { classicOS: 'SLES 12', pattern: /sles?\s*12|suse.*12/i, vpcAvailable: true, vpcImage: 'ibm-sles-12-sp5-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration — consider upgrading to SLES 15', imageType: 'stock' },
  { classicOS: 'SLES 15', pattern: /sles?\s*15|suse.*15/i, vpcAvailable: true, vpcImage: 'ibm-sles-15-sp5-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },

  // ── Rocky Linux ────────────────────────────────────────────────────────
  { classicOS: 'Rocky Linux 8', pattern: /rocky.*8/i, vpcAvailable: true, vpcImage: 'ibm-rocky-linux-8-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },
  { classicOS: 'Rocky Linux 9', pattern: /rocky.*9/i, vpcAvailable: true, vpcImage: 'ibm-rocky-linux-9-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },

  // ── AlmaLinux ──────────────────────────────────────────────────────────
  { classicOS: 'AlmaLinux 8', pattern: /alma.*8/i, vpcAvailable: true, vpcImage: null, upgradeRequired: false, effort: 'minimal', notes: 'BYOL custom image — RHEL-compatible distribution', imageType: 'byol' },
  { classicOS: 'AlmaLinux 9', pattern: /alma.*9/i, vpcAvailable: true, vpcImage: null, upgradeRequired: false, effort: 'minimal', notes: 'BYOL custom image — RHEL-compatible distribution', imageType: 'byol' },

  // ── Oracle Linux ───────────────────────────────────────────────────────
  { classicOS: 'Oracle Linux 7', pattern: /oracle.*linux.*7|oracle.*7/i, vpcAvailable: true, vpcImage: null, upgradeRequired: false, effort: 'moderate', notes: 'BYOL custom image — consider upgrading to Oracle Linux 8/9', imageType: 'byol' },
  { classicOS: 'Oracle Linux 8', pattern: /oracle.*linux.*8|oracle.*8/i, vpcAvailable: true, vpcImage: null, upgradeRequired: false, effort: 'minimal', notes: 'BYOL custom image — RHEL-compatible distribution', imageType: 'byol' },
  { classicOS: 'Oracle Linux 9', pattern: /oracle.*linux.*9|oracle.*9/i, vpcAvailable: true, vpcImage: null, upgradeRequired: false, effort: 'minimal', notes: 'BYOL custom image — RHEL-compatible distribution', imageType: 'byol' },

  // ── Fedora ─────────────────────────────────────────────────────────────
  { classicOS: 'Fedora CoreOS', pattern: /fedora\s*core/i, vpcAvailable: true, vpcImage: 'ibm-fedora-coreos-stable-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration — container-optimized workloads', imageType: 'stock' },

  // ── Windows Server ─────────────────────────────────────────────────────
  // Order matters: specific versions before general patterns
  { classicOS: 'Windows Server 2003', pattern: /windows.*2003/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Windows Server 2019 or 2022', effort: 'significant', notes: 'No VirtIO drivers exist for Windows Server 2003 — VMs cannot boot on IBM Cloud VPC. Requires application modernization or re-platforming.', eolDate: '2015-07-14', imageType: 'none', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-create-windows-custom-image' },
  { classicOS: 'Windows Server 2008', pattern: /windows.*(2008|2008\s*r2)/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Windows Server 2019 or 2022', effort: 'significant', notes: 'VirtIO drivers dropped after virtio-win 0.1.173 (Dec 2021). IBM Cloud VPC requires virtio-win 1.9.24+ which has no 2008 drivers — VMs will not boot.', eolDate: '2020-01-14', imageType: 'none', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-create-windows-custom-image' },
  { classicOS: 'Windows Server 2012', pattern: /windows.*2012/i, vpcAvailable: true, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Windows Server 2019 or 2022', effort: 'significant', notes: 'BYOL custom image only — extended support ended Oct 2023. Upgrade to Windows Server 2019/2022 recommended.', eolDate: '2023-10-10', imageType: 'byol', docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-planning-custom-images' },
  { classicOS: 'Windows Server 2016', pattern: /windows.*2016/i, vpcAvailable: true, vpcImage: 'ibm-windows-server-2016-full-standard-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration — consider upgrading to Windows Server 2019/2022', imageType: 'stock' },
  { classicOS: 'Windows Server 2019', pattern: /windows.*2019/i, vpcAvailable: true, vpcImage: 'ibm-windows-server-2019-full-standard-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },
  { classicOS: 'Windows Server 2022', pattern: /windows.*2022/i, vpcAvailable: true, vpcImage: 'ibm-windows-server-2022-full-standard-amd64', upgradeRequired: false, effort: 'none', notes: 'Direct migration', imageType: 'stock' },

  // ── Non-x86 / Unsupported platforms ────────────────────────────────────
  { classicOS: 'FreeBSD', pattern: /freebsd/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Linux (RHEL, Ubuntu, or Debian)', effort: 'significant', notes: 'FreeBSD is not supported on IBM Cloud VPC.', imageType: 'none' },
  { classicOS: 'OpenBSD', pattern: /openbsd/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Linux (RHEL, Ubuntu, or Debian)', effort: 'significant', notes: 'OpenBSD is not supported on IBM Cloud VPC.', imageType: 'none' },
  { classicOS: 'Solaris', pattern: /solaris|sunos/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Linux (RHEL, Ubuntu, or Debian)', effort: 'significant', notes: 'Solaris is not supported on IBM Cloud VPC — requires re-platforming to Linux.', imageType: 'none' },
  { classicOS: 'AIX', pattern: /\baix\b/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'PowerVS for AIX workloads', effort: 'significant', notes: 'AIX is not supported on VPC — use IBM Power Virtual Server for AIX workloads.', imageType: 'none' },
  { classicOS: 'HP-UX', pattern: /hp[\s-]?ux/i, vpcAvailable: false, vpcImage: null, upgradeRequired: true, upgradeTarget: 'Linux (RHEL, Ubuntu, or Debian)', effort: 'significant', notes: 'HP-UX is not supported on IBM Cloud VPC.', imageType: 'none' },
  { classicOS: 'VMware ESXi / vSphere', pattern: /vmware|vsphere|esxi/i, vpcAvailable: false, vpcImage: null, upgradeRequired: false, effort: 'significant', notes: 'VMware/vSphere cannot run on VPC — VMs must be migrated individually to VPC VSIs or OpenShift Virtualization.', imageType: 'none' },
];

export function matchOS(osString: string): OSCompatibility | null {
  if (!osString) return null;
  return OS_COMPATIBILITY.find((entry) => entry.pattern.test(osString)) ?? null;
}
