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
      Complete list of all Classic, VPC, PowerVS, and Platform Services resource types collected
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
          <tr><td style={tdStyle}>Block Storage</td><td style={tdStyle}>vBlockStorage</td><td style={tdStyle}>iSCSI block storage volumes (includes datacenter, encryption, snapshots)</td></tr>
          <tr><td style={tdStyle}>File Storage</td><td style={tdStyle}>vFileStorage</td><td style={tdStyle}>NFS file storage volumes (includes datacenter, encryption, bytes used, snapshots)</td></tr>
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
      <h3 style={headingStyle}>VPC Resource Types (26)</h3>

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
      <h3 style={headingStyle}>PowerVS Resource Types (22)</h3>

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
          <tr><td style={tdStyle}>PVM Instances</td><td style={tdStyle}>pPvsInstances</td><td style={tdStyle}>PowerVS virtual machine instances</td></tr>
          <tr><td style={tdStyle}>Shared Processor Pools</td><td style={tdStyle}>pPvsSPPools</td><td style={tdStyle}>Shared processor pools</td></tr>
          <tr><td style={tdStyle}>Placement Groups</td><td style={tdStyle}>pPvsPlacementGrps</td><td style={tdStyle}>Server placement groups</td></tr>
          <tr><td style={tdStyle}>Host Groups</td><td style={tdStyle}>pPvsHostGroups</td><td style={tdStyle}>Dedicated host groups</td></tr>
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
          <tr><td style={tdStyle}>Networks</td><td style={tdStyle}>pPvsNetworks</td><td style={tdStyle}>PowerVS networks</td></tr>
          <tr><td style={tdStyle}>Network Ports</td><td style={tdStyle}>pPvsNetPorts</td><td style={tdStyle}>Network port attachments</td></tr>
          <tr><td style={tdStyle}>Network Security Groups</td><td style={tdStyle}>pPvsNSGs</td><td style={tdStyle}>Network security groups</td></tr>
          <tr><td style={tdStyle}>Cloud Connections</td><td style={tdStyle}>pPvsCloudConns</td><td style={tdStyle}>Cloud connections to VPC/Classic</td></tr>
          <tr><td style={tdStyle}>DHCP Servers</td><td style={tdStyle}>pPvsDhcp</td><td style={tdStyle}>DHCP server configurations</td></tr>
          <tr><td style={tdStyle}>VPN Connections</td><td style={tdStyle}>pPvsVpnConns</td><td style={tdStyle}>VPN connections</td></tr>
          <tr><td style={tdStyle}>IKE Policies</td><td style={tdStyle}>pPvsIkePolicies</td><td style={tdStyle}>IKE policies for VPN</td></tr>
          <tr><td style={tdStyle}>IPSec Policies</td><td style={tdStyle}>pPvsIpsecPolicies</td><td style={tdStyle}>IPSec policies for VPN</td></tr>
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
          <tr><td style={tdStyle}>Volumes</td><td style={tdStyle}>pPvsVolumes</td><td style={tdStyle}>Storage volumes</td></tr>
          <tr><td style={tdStyle}>Volume Groups</td><td style={tdStyle}>pPvsVolGroups</td><td style={tdStyle}>Volume groups</td></tr>
          <tr><td style={tdStyle}>Snapshots</td><td style={tdStyle}>pPvsSnapshots</td><td style={tdStyle}>Volume snapshots</td></tr>
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
          <tr><td style={tdStyle}>SSH Keys</td><td style={tdStyle}>pPvsSshKeys</td><td style={tdStyle}>SSH public keys</td></tr>
          <tr><td style={tdStyle}>Workspaces</td><td style={tdStyle}>pPvsWorkspaces</td><td style={tdStyle}>PowerVS workspace instances</td></tr>
          <tr><td style={tdStyle}>System Pools</td><td style={tdStyle}>pPvsSystemPools</td><td style={tdStyle}>Available system pools</td></tr>
          <tr><td style={tdStyle}>SAP Profiles</td><td style={tdStyle}>pPvsSapProfiles</td><td style={tdStyle}>SAP-certified profiles</td></tr>
          <tr><td style={tdStyle}>Events</td><td style={tdStyle}>pPvsEvents</td><td style={tdStyle}>Workspace events</td></tr>
          <tr><td style={tdStyle}>Images</td><td style={tdStyle}>pPvsImages</td><td style={tdStyle}>Custom images</td></tr>
          <tr><td style={tdStyle}>Stock Images</td><td style={tdStyle}>pPvsStockImages</td><td style={tdStyle}>IBM-provided stock images</td></tr>
        </tbody>
      </table>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Platform Services</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Resource Type</th>
            <th style={thStyle}>Worksheet Name</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Service Instances</td>
            <td style={tdStyle}><code>sServiceInstances</code></td>
            <td style={tdStyle}>All IBM Cloud service instances (COS, Key Protect, SCC, databases, etc.) with service type identification and resource group name resolution</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Notes</h3>
      <ul style={listStyle}>
        <li>Classic worksheet names use the &quot;v&quot; prefix, PowerVS uses &quot;p&quot; prefix, and Platform Services uses &quot;s&quot; prefix.</li>
        <li>VPC resources include a <code>_region</code> field indicating the source region.</li>
        <li>Transit Gateways are global resources collected via <code>transit.cloud.ibm.com</code>.</li>
        <li>Platform Services instances include computed <code>_serviceType</code> and <code>_serviceCategory</code> fields from a known services map.</li>
        <li>The exact number of Classic resource types may vary as new types are added.</li>
      </ul>
    </section>
  </div>
);

export default ResourceReferenceSection;
