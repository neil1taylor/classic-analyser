import React from 'react';
import {
  sectionStyle,
  headingStyle,
  subHeadingStyle,
  listStyle,
} from '../docsStyles';

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
  marginBottom: '1rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  borderBottom: '2px solid var(--cds-border-subtle)',
  fontWeight: 600,
  color: 'var(--cds-text-primary)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid var(--cds-border-subtle)',
  color: 'var(--cds-text-primary)',
};

const ResourceReferenceSection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      Resource Reference
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      Complete list of all Classic and VPC resource types collected
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Classic Resource Types (27+)</h3>

      <h4 style={subHeadingStyle}>Compute</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Virtual Servers</td><td style={tdStyle}>vVirtualServers</td><td style={tdStyle}>Cloud virtual server instances (VSIs)</td></tr>
          <tr><td style={tdStyle}>Bare Metal Servers</td><td style={tdStyle}>vBareMetalServers</td><td style={tdStyle}>Dedicated physical servers</td></tr>
          <tr><td style={tdStyle}>Dedicated Hosts</td><td style={tdStyle}>vDedicatedHosts</td><td style={tdStyle}>Hosts for dedicated VSI placement</td></tr>
          <tr><td style={tdStyle}>Image Templates</td><td style={tdStyle}>vImageTemplates</td><td style={tdStyle}>Server images for provisioning</td></tr>
        </tbody>
      </table>

      <h4 style={subHeadingStyle}>Network</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>VLANs</td><td style={tdStyle}>vVLANs</td><td style={tdStyle}>Virtual local area networks</td></tr>
          <tr><td style={tdStyle}>Subnets</td><td style={tdStyle}>vSubnets</td><td style={tdStyle}>IP address subnets</td></tr>
          <tr><td style={tdStyle}>Network Gateways</td><td style={tdStyle}>vNetworkGateways</td><td style={tdStyle}>Gateway appliances</td></tr>
          <tr><td style={tdStyle}>Firewalls</td><td style={tdStyle}>vFirewalls</td><td style={tdStyle}>Hardware and software firewalls</td></tr>
          <tr><td style={tdStyle}>Security Groups</td><td style={tdStyle}>vSecurityGroups</td><td style={tdStyle}>Network security group rules</td></tr>
          <tr><td style={tdStyle}>Load Balancers</td><td style={tdStyle}>vLoadBalancers</td><td style={tdStyle}>Local and global load balancers</td></tr>
          <tr><td style={tdStyle}>VPN Tunnels</td><td style={tdStyle}>vVPNTunnels</td><td style={tdStyle}>IPsec VPN tunnel connections</td></tr>
        </tbody>
      </table>

      <h4 style={subHeadingStyle}>Storage</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Block Storage</td><td style={tdStyle}>vBlockStorage</td><td style={tdStyle}>iSCSI block storage volumes</td></tr>
          <tr><td style={tdStyle}>File Storage</td><td style={tdStyle}>vFileStorage</td><td style={tdStyle}>NFS file storage volumes</td></tr>
          <tr><td style={tdStyle}>Object Storage</td><td style={tdStyle}>vObjectStorage</td><td style={tdStyle}>S3-compatible object storage</td></tr>
        </tbody>
      </table>

      <h4 style={subHeadingStyle}>Security</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>SSL Certificates</td><td style={tdStyle}>vSSLCertificates</td><td style={tdStyle}>SSL/TLS certificates</td></tr>
          <tr><td style={tdStyle}>SSH Keys</td><td style={tdStyle}>vSSHKeys</td><td style={tdStyle}>SSH public keys for server access</td></tr>
        </tbody>
      </table>

      <h4 style={subHeadingStyle}>DNS</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>DNS Domains</td><td style={tdStyle}>vDNSDomains</td><td style={tdStyle}>DNS zones</td></tr>
          <tr><td style={tdStyle}>DNS Records</td><td style={tdStyle}>vDNSRecords</td><td style={tdStyle}>DNS resource records (A, CNAME, MX, etc.)</td></tr>
        </tbody>
      </table>

      <h4 style={subHeadingStyle}>Other</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Billing Items</td><td style={tdStyle}>vBillingItems</td><td style={tdStyle}>Active billing line items</td></tr>
          <tr><td style={tdStyle}>Placement Groups</td><td style={tdStyle}>vPlacementGroups</td><td style={tdStyle}>VSI placement groups</td></tr>
          <tr><td style={tdStyle}>Reserved Capacity</td><td style={tdStyle}>vReservedCapacity</td><td style={tdStyle}>Reserved compute capacity</td></tr>
          <tr><td style={tdStyle}>Users</td><td style={tdStyle}>vUsers</td><td style={tdStyle}>Account users</td></tr>
          <tr><td style={tdStyle}>Event Log</td><td style={tdStyle}>vEventLog</td><td style={tdStyle}>Account audit events</td></tr>
        </tbody>
      </table>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>VPC Resource Types (21)</h3>

      <h4 style={subHeadingStyle}>Compute</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Instances</td><td style={tdStyle}>vVpcInstances</td><td style={tdStyle}>VPC virtual server instances</td></tr>
          <tr><td style={tdStyle}>Bare Metal Servers</td><td style={tdStyle}>vVpcBareMetalServers</td><td style={tdStyle}>VPC bare metal servers</td></tr>
          <tr><td style={tdStyle}>Dedicated Hosts</td><td style={tdStyle}>vVpcDedicatedHosts</td><td style={tdStyle}>VPC dedicated hosts</td></tr>
          <tr><td style={tdStyle}>Placement Groups</td><td style={tdStyle}>vVpcPlacementGroups</td><td style={tdStyle}>VPC placement groups</td></tr>
        </tbody>
      </table>

      <h4 style={subHeadingStyle}>Network</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>VPCs</td><td style={tdStyle}>vVpcVPCs</td><td style={tdStyle}>Virtual Private Clouds</td></tr>
          <tr><td style={tdStyle}>Subnets</td><td style={tdStyle}>vVpcSubnets</td><td style={tdStyle}>VPC subnets</td></tr>
          <tr><td style={tdStyle}>Security Groups</td><td style={tdStyle}>vVpcSecurityGroups</td><td style={tdStyle}>VPC security groups</td></tr>
          <tr><td style={tdStyle}>Floating IPs</td><td style={tdStyle}>vVpcFloatingIPs</td><td style={tdStyle}>Public floating IP addresses</td></tr>
          <tr><td style={tdStyle}>Public Gateways</td><td style={tdStyle}>vVpcPublicGateways</td><td style={tdStyle}>Subnet public gateways</td></tr>
          <tr><td style={tdStyle}>Network ACLs</td><td style={tdStyle}>vVpcNetworkACLs</td><td style={tdStyle}>Network access control lists</td></tr>
          <tr><td style={tdStyle}>Load Balancers</td><td style={tdStyle}>vVpcLoadBalancers</td><td style={tdStyle}>VPC load balancers</td></tr>
          <tr><td style={tdStyle}>VPN Gateways</td><td style={tdStyle}>vVpcVPNGateways</td><td style={tdStyle}>VPN gateway connections</td></tr>
          <tr><td style={tdStyle}>Endpoint Gateways</td><td style={tdStyle}>vVpcEndpointGateways</td><td style={tdStyle}>Virtual private endpoint gateways</td></tr>
        </tbody>
      </table>

      <h4 style={subHeadingStyle}>Transit</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Transit Gateways</td><td style={tdStyle}>vVpcTransitGateways</td><td style={tdStyle}>Global transit gateways</td></tr>
          <tr><td style={tdStyle}>TGW Connections</td><td style={tdStyle}>vVpcTGWConnections</td><td style={tdStyle}>Transit gateway connections</td></tr>
          <tr><td style={tdStyle}>TGW Route Prefixes</td><td style={tdStyle}>vVpcTGWRoutePrefixes</td><td style={tdStyle}>Transit gateway route prefixes</td></tr>
          <tr><td style={tdStyle}>TGW VPC VPN Gateways</td><td style={tdStyle}>vVpcTGWVPNGateways</td><td style={tdStyle}>VPN gateways discovered from TGW VPC connections</td></tr>
        </tbody>
      </table>

      <h4 style={subHeadingStyle}>Storage, Security &amp; Other</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Volumes</td><td style={tdStyle}>vVpcVolumes</td><td style={tdStyle}>Block storage volumes</td></tr>
          <tr><td style={tdStyle}>SSH Keys</td><td style={tdStyle}>vVpcSSHKeys</td><td style={tdStyle}>SSH public keys</td></tr>
          <tr><td style={tdStyle}>Images</td><td style={tdStyle}>vVpcImages</td><td style={tdStyle}>Custom and stock images</td></tr>
          <tr><td style={tdStyle}>Flow Log Collectors</td><td style={tdStyle}>vVpcFlowLogCollectors</td><td style={tdStyle}>VPC flow log collectors</td></tr>
        </tbody>
      </table>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Notes</h3>
      <ul style={listStyle}>
        <li>All worksheet names use the &quot;v&quot; prefix convention for spreadsheet compatibility.</li>
        <li>VPC resources include a <code>_region</code> field indicating the source region.</li>
        <li>Transit Gateways are global resources collected via <code>transit.cloud.ibm.com</code>.</li>
        <li>The exact number of Classic resource types may vary as new types are added.</li>
      </ul>
    </section>
  </div>
);

export default ResourceReferenceSection;
