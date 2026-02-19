import React from 'react';
import {
  sectionStyle,
  headingStyle,
  subHeadingStyle,
  paragraphStyle,
  listStyle,
} from '../docsStyles';

const VisualizationsSection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      Visualizations
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      Topology diagrams, geography maps, and cost analysis charts
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Topology Diagrams</h3>
      <p style={paragraphStyle}>
        The Topology view provides interactive diagrams showing how your infrastructure resources
        are connected. Both Classic and VPC have dedicated topology views.
      </p>

      <h4 style={subHeadingStyle}>Classic Topology</h4>
      <p style={paragraphStyle}>
        Visualises the 13 parent-child relationships between Classic resources. Nodes represent
        individual resources, coloured by category (Compute, Network, Storage, etc.). Edges show
        the dependency and ownership relationships.
      </p>
      <ul style={listStyle}>
        <li><strong>Pan and zoom:</strong> Drag to pan, scroll to zoom. Use the controls panel for fit-to-view.</li>
        <li><strong>Node details:</strong> Click a node to see resource details in a side panel.</li>
        <li><strong>Filtering:</strong> Toggle resource categories on/off to focus on specific relationships.</li>
        <li><strong>Layout:</strong> Automatic hierarchical layout with manual repositioning support.</li>
      </ul>

      <h4 style={subHeadingStyle}>VPC Topology</h4>
      <p style={paragraphStyle}>
        Shows VPC-specific relationships: VPCs containing subnets, instances connected to security groups,
        floating IPs attached to instances, load balancers fronting pools, and Transit Gateway connections
        linking VPCs across regions.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Geography Maps</h3>
      <p style={paragraphStyle}>
        The Geography view displays a world map with markers at each datacenter or region where
        your resources are deployed. Available for both Classic and VPC.
      </p>
      <ul style={listStyle}>
        <li><strong>Datacenter markers:</strong> Sized proportionally to the number of resources at each location.</li>
        <li><strong>Hover details:</strong> Hover over a marker to see resource counts by type.</li>
        <li><strong>Regional grouping:</strong> VPC resources are grouped by their <code>_region</code> field.</li>
        <li><strong>Zoom controls:</strong> Zoom into specific regions for detailed views.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Cost Analysis</h3>
      <p style={paragraphStyle}>
        The Cost Analysis view provides financial insights into your infrastructure spending.
        Available for both Classic and VPC resources.
      </p>

      <h4 style={subHeadingStyle}>Treemap</h4>
      <p style={paragraphStyle}>
        A hierarchical treemap where tile size represents relative cost. Resources are grouped
        by category, then by type. Click a tile to drill down into that category.
      </p>

      <h4 style={subHeadingStyle}>Cost Charts</h4>
      <ul style={listStyle}>
        <li><strong>Donut chart:</strong> Cost distribution by resource category (Compute, Network, Storage, etc.).</li>
        <li><strong>Bar chart:</strong> Top resources by monthly recurring cost.</li>
        <li><strong>Summary cards:</strong> Total monthly cost, resource count, and average cost per resource.</li>
      </ul>

      <h4 style={subHeadingStyle}>Cost Data Source</h4>
      <p style={paragraphStyle}>
        Classic costs are derived from Billing Items collected during the data scan. VPC costs use
        the pricing catalog to estimate monthly costs based on resource profiles and configurations.
      </p>
    </section>
  </div>
);

export default VisualizationsSection;
