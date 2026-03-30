import React from 'react';
import { Link } from '@carbon/react';
import {
  sectionStyle,
  headingStyle,
  subHeadingStyle,
  paragraphStyle,
  listStyle,
  linkListStyle,
} from '../docsStyles';

const MigrationSection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      Migration Analysis
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      Classic-to-VPC readiness assessment and migration planning tools
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Overview</h3>
      <p style={paragraphStyle}>
        The Migration Analysis view provides comprehensive Classic-to-VPC readiness assessment
        and planning tools. It analyses your collected Classic infrastructure data and produces
        readiness scores, migration plans, and cost projections.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Assessment Tabs</h3>
      <p style={paragraphStyle}>
        The migration view contains 9 assessment tabs:
      </p>
      <ul style={listStyle}>
        <li><strong>Compute:</strong> VSI and Bare Metal readiness &mdash; boot disk limits, vCPU/memory maximums, OS compatibility, 32-bit/EOL OS detection, hypervisor detection (VMware, XenServer, Hyper-V), IKS/ROKS worker node detection, local disk usage.</li>
        <li><strong>Network:</strong> VLAN, subnet, and gateway assessment &mdash; IP address compatibility, public IP detection, VPC reserved IP conflicts, IPv6 subnet detection, VRRP HA pattern.</li>
        <li><strong>Storage:</strong> Block and file storage analysis &mdash; volume sizes, IOPS tiers, datacenter location, encryption status, per-volume snapshots, NFS usage, multi-attach volume detection, portable storage identification on VSIs.</li>
        <li><strong>Security:</strong> Security group rules, SSL certificates, SSH key compatibility, and HSM device detection.</li>
        <li><strong>Feature Gaps:</strong> Features available in Classic but not yet in VPC (e.g., specific hardware configurations).</li>
        <li><strong>Costs:</strong> Classic vs VPC monthly and 3-year cost projections with break-even analysis.</li>
        <li><strong>Migration Waves:</strong> Resources grouped by dependency and priority into planned migration waves.</li>
        <li><strong>Dependencies:</strong> Interactive dependency graph showing resource relationships that affect migration ordering.</li>
        <li><strong>VPC Pricing:</strong> VPC profile pricing catalog for cost estimation.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Readiness Scoring</h3>
      <p style={paragraphStyle}>
        Each resource receives a 0&ndash;100% readiness score across 5 dimensions. The score
        reflects 43 automated checks including:
      </p>
      <ul style={listStyle}>
        <li>Boot disk size within VPC limits</li>
        <li>vCPU and memory within VPC profile maximums</li>
        <li>Operating system supported on VPC</li>
        <li>32-bit or end-of-life OS detection</li>
        <li>Hypervisor detection (VMware, XenServer, Hyper-V)</li>
        <li>Datacenter availability in VPC regions</li>
        <li>Multi-attach block storage detection</li>
        <li>IPv6 subnet usage</li>
        <li>IKS/ROKS worker node detection</li>
        <li>HSM device detection (Key Protect / HPCS migration)</li>
        <li>IP address compatibility and conflicts</li>
      </ul>
      <p style={paragraphStyle}>
        Resources with blockers are flagged with remediation checklists showing what needs to be
        addressed before migration.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Terraform Export</h3>
      <p style={paragraphStyle}>
        The migration view can generate Terraform HCL configuration files for VPC resources based
        on your Classic infrastructure. This provides a starting point for infrastructure-as-code
        migration.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>DOCX Reports</h3>
      <p style={paragraphStyle}>
        Export a full migration assessment report as a DOCX document for offline sharing with
        stakeholders. The report includes executive summary, readiness scores, cost projections,
        wave plans, and remediation recommendations.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>IBM Migration Resources</h3>

      <h4 style={subHeadingStyle}>Virtualization Solutions Guide</h4>
      <ul style={linkListStyle}>
        <li><Link href="https://cloud.ibm.com/docs/virtualization-solutions" target="_blank" rel="noopener noreferrer" inline>IBM Cloud Virtualization Solutions</Link> &mdash; main landing page</li>
        <li><Link href="https://cloud.ibm.com/docs/virtualization-solutions?topic=virtualization-solutions-reference-architecture-vsi" target="_blank" rel="noopener noreferrer" inline>VSI Architecture Reference</Link></li>
        <li><Link href="https://cloud.ibm.com/docs/virtualization-solutions?topic=virtualization-solutions-migration-design-1-premigration" target="_blank" rel="noopener noreferrer" inline>Pre-migration Planning</Link></li>
        <li><Link href="https://cloud.ibm.com/docs/virtualization-solutions?topic=virtualization-solutions-migration-design-2-wave" target="_blank" rel="noopener noreferrer" inline>Wave Planning</Link></li>
        <li><Link href="https://cloud.ibm.com/docs/virtualization-solutions?topic=virtualization-solutions-migration-design-3-postmigration" target="_blank" rel="noopener noreferrer" inline>Post-migration</Link></li>
      </ul>

      <h4 style={subHeadingStyle}>Migration Documentation</h4>
      <ul style={linkListStyle}>
        <li><Link href="https://cloud.ibm.com/docs/vpc?topic=vpc-migrate-vsi-to-vpc" target="_blank" rel="noopener noreferrer" inline>Migrating VSI to VPC</Link></li>
        <li><Link href="https://cloud.ibm.com/docs/cloud-infrastructure?topic=cloud-infrastructure-data-migration-classic-to-vpc" target="_blank" rel="noopener noreferrer" inline>Migrating Data from Classic to VPC</Link></li>
        <li><Link href="https://cloud.ibm.com/docs/vpc?topic=vpc-setting-up-access-to-classic-infrastructure" target="_blank" rel="noopener noreferrer" inline>Setting Up Classic-to-VPC Access</Link></li>
      </ul>

      <h4 style={subHeadingStyle}>Migration Tools</h4>
      <ul style={linkListStyle}>
        <li><Link href="https://www.rackwareinc.com/ibm" target="_blank" rel="noopener noreferrer" inline>RackWare CloudMotion for IBM Cloud</Link> &mdash; automated live migration</li>
        <li><Link href="https://cloud.ibm.com/catalog/services/vpc-cloud-migration" target="_blank" rel="noopener noreferrer" inline>Wanclouds VPC+ Cloud Migration</Link> &mdash; SaaS-based automated discovery and migration</li>
        <li><Link href="https://github.com/IBM-Cloud/vpc-migration-tools" target="_blank" rel="noopener noreferrer" inline>vpc-migration-tools</Link> &mdash; open-source pre-checks and scripts</li>
        <li><Link href="https://cloud.ibm.com/catalog?category=migration_tools" target="_blank" rel="noopener noreferrer" inline>IBM Cloud Migration Tools Catalog</Link></li>
      </ul>
    </section>
  </div>
);

export default MigrationSection;
