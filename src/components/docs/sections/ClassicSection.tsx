import React from 'react';
import {
  sectionStyle,
  headingStyle,
  subHeadingStyle,
  paragraphStyle,
  listStyle,
} from '../docsStyles';

const ClassicSection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      Classic Infrastructure
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      Collecting and exploring IBM Cloud Classic (SoftLayer) resources
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Dashboard</h3>
      <p style={paragraphStyle}>
        The Classic dashboard provides an overview of your infrastructure resources:
      </p>
      <ul style={listStyle}>
        <li><strong>Account Info:</strong> Displays your account name, number, and email address.</li>
        <li><strong>Collect Data:</strong> Starts data collection from the SoftLayer API using Server-Sent Events for real-time progress.</li>
        <li><strong>Export All:</strong> Exports all collected data to an XLSX file.</li>
        <li><strong>Resource Cards:</strong> Shows the count of each resource type. Click a card to navigate to its data table.</li>
        <li><strong>Distribution Charts:</strong> Donut and bar charts showing resource distribution by datacenter, status, and type.</li>
        <li><strong>Progress Indicator:</strong> Shows collection progress across resource types during data collection.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Data Collection</h3>
      <p style={paragraphStyle}>
        Classic data collection uses Server-Sent Events (SSE) to stream real-time progress to the browser.
        Collection runs in multiple phases:
      </p>

      <h4 style={subHeadingStyle}>Phase 1: Shallow Scan</h4>
      <p style={paragraphStyle}>
        Discovers all resources across 27+ types by calling SoftLayer list/getAll endpoints. This phase
        runs with 10 concurrent API calls and returns basic resource data (IDs, names, statuses).
      </p>

      <h4 style={subHeadingStyle}>Phase 2: Deep Scan</h4>
      <p style={paragraphStyle}>
        Enriches each discovered resource with full details by calling individual getObject endpoints
        with object masks. This phase also runs with 10 concurrent API calls. Deep scan adds properties
        like network components, software descriptions, billing information, and related resource IDs.
      </p>

      <h4 style={subHeadingStyle}>Phase 3: Billing &amp; Nested Details</h4>
      <p style={paragraphStyle}>
        Collects billing items, per-volume storage snapshots (concurrency 5), VMware nested resources,
        and Transit Gateway connections. These are the slowest API calls and depend on Phase 2 results.
      </p>

      <h4 style={subHeadingStyle}>Phase 4: TGW Route Reports</h4>
      <p style={paragraphStyle}>
        Generates Transit Gateway route reports (async POST + poll) and fetches VPN gateways for
        VPC-connected Transit Gateways.
      </p>

      <h4 style={subHeadingStyle}>Phase 5: Disk Utilization (opt-in)</h4>
      <p style={paragraphStyle}>
        When the <strong>Disk util</strong> toggle is enabled, the collector SSHs into each Virtual Server
        and Bare Metal server via its private IP to collect real filesystem usage. OS credentials are
        fetched transiently from the SoftLayer API, used for the SSH connection, then immediately
        discarded &mdash; they are never displayed, stored, logged, or exported. Linux machines
        use <code>df</code> and Windows machines use PowerShell. Machines that are unreachable,
        lack credentials, or run unsupported operating systems are gracefully skipped with a status
        indicator. New columns (hidden by default): Disk Used %, Disk Used / Total, Disk Util Status,
        and Disk Util Details.
      </p>

      <p style={paragraphStyle}>
        Resources that fail during collection (e.g., due to permissions) are shown as warnings on the
        dashboard. Successfully collected resources remain available for browsing and export.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Resource Categories</h3>
      <ul style={listStyle}>
        <li><strong>Compute:</strong> Virtual Servers (VSIs), Bare Metal Servers, Dedicated Hosts, Image Templates</li>
        <li><strong>Network:</strong> VLANs, Subnets, Network Gateways, Firewalls, Security Groups, Load Balancers, VPN Tunnels</li>
        <li><strong>Storage:</strong> Block Storage, File Storage, Object Storage</li>
        <li><strong>Security:</strong> SSL Certificates, SSH Keys</li>
        <li><strong>DNS:</strong> DNS Domains, DNS Records</li>
        <li><strong>Other:</strong> Billing Items, Placement Groups, Reserved Capacity, Dedicated Hosts, IPsec VPN, Users, Event Log</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Relationship Mapping</h3>
      <p style={paragraphStyle}>
        The explorer maps 13 parent-child resource relationships, enabling you to understand
        how resources are connected:
      </p>
      <ul style={listStyle}>
        <li>VLAN &rarr; Subnet</li>
        <li>VLAN &rarr; Virtual Server</li>
        <li>VLAN &rarr; Bare Metal Server</li>
        <li>Virtual Server &rarr; Block Storage</li>
        <li>Virtual Server &rarr; Security Group</li>
        <li>Bare Metal &rarr; Block Storage</li>
        <li>Subnet &rarr; IP Address</li>
        <li>Network Gateway &rarr; VLAN</li>
        <li>Firewall &rarr; VLAN</li>
        <li>Load Balancer &rarr; Virtual Server</li>
        <li>DNS Domain &rarr; DNS Record</li>
        <li>Dedicated Host &rarr; Virtual Server</li>
        <li>Placement Group &rarr; Virtual Server</li>
      </ul>
      <p style={paragraphStyle}>
        These relationships power the Topology diagram and dependency analysis in the Migration view.
      </p>
    </section>
  </div>
);

export default ClassicSection;
