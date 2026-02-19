import React from 'react';
import {
  sectionStyle,
  headingStyle,
  subHeadingStyle,
  paragraphStyle,
  listStyle,
} from '../docsStyles';

const VpcSection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      VPC Infrastructure
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      Collecting and exploring IBM Cloud VPC resources across all regions
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>VPC Dashboard</h3>
      <p style={paragraphStyle}>
        The VPC dashboard mirrors the Classic dashboard layout but focuses on VPC-specific resources.
        It shows resource counts, regional distribution, and collection status for all VPC resource types.
      </p>
      <ul style={listStyle}>
        <li><strong>Resource Cards:</strong> Count of each VPC resource type across all regions.</li>
        <li><strong>Regional Distribution:</strong> Charts showing how resources are spread across regions.</li>
        <li><strong>Collect VPC Data:</strong> Starts multi-region collection using SSE for real-time progress.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Multi-Region Collection</h3>
      <p style={paragraphStyle}>
        VPC data collection runs as a single phase across all auto-discovered regions with 10
        concurrent resource tasks. The collector:
      </p>
      <ol style={listStyle}>
        <li>Exchanges your API key for an IAM Bearer token.</li>
        <li>Discovers all available VPC regions via the regions API.</li>
        <li>Collects 21 resource types from each region in parallel.</li>
        <li>Injects a <code>_region</code> field into every resource for filtering.</li>
      </ol>

      <h4 style={subHeadingStyle}>Transit Gateways</h4>
      <p style={paragraphStyle}>
        Transit Gateways are global resources collected via a separate API endpoint
        (<code>transit.cloud.ibm.com</code>) rather than regional VPC endpoints. The collector
        also retrieves Transit Gateway connections, route report prefixes, and discovers VPN gateways
        from connected VPC regions.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>VPC Resource Types</h3>
      <ul style={listStyle}>
        <li><strong>Compute:</strong> Instances, Bare Metal Servers, Dedicated Hosts, Placement Groups</li>
        <li><strong>Network:</strong> VPCs, Subnets, Security Groups, Floating IPs, Public Gateways, Network ACLs, Load Balancers, VPN Gateways, Endpoint Gateways</li>
        <li><strong>Transit:</strong> Transit Gateways, Transit Gateway Connections, TGW Route Prefixes, TGW VPC VPN Gateways</li>
        <li><strong>Storage:</strong> Volumes</li>
        <li><strong>Security:</strong> SSH Keys, Images</li>
        <li><strong>Other:</strong> Flow Log Collectors</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Regional Data</h3>
      <p style={paragraphStyle}>
        Every VPC resource includes a <code>_region</code> field indicating which region it was
        collected from. You can filter data tables by region to focus on specific geographic areas.
        The Geography map visualises resource distribution across all collected regions.
      </p>
    </section>
  </div>
);

export default VpcSection;
