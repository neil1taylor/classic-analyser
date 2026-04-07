import {
  Grid,
  Column,
  Tile,
  Tag,
  InlineNotification,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
} from '@carbon/react';
import { Information, ArrowLeft } from '@carbon/icons-react';
import { Link as RouterLink } from 'react-router-dom';
import './VSIProfileGuidePage.scss';

export default function VSIProfileGuidePage() {
  return (
    <div className="vsi-profile-guide">
      <Grid narrow>
        {/* Header */}
        <Column lg={16} md={8} sm={4}>
          <div className="vsi-profile-guide__header">
            <RouterLink to="/migration" className="vsi-profile-guide__back-link">
              <ArrowLeft size={16} />
              Back to Migration Assessment
            </RouterLink>
            <h1>VSI Profile Selection Guide</h1>
            <p className="vsi-profile-guide__subtitle">
              Comprehensive guide to selecting the right IBM Cloud VPC Virtual Server Instance profiles for Classic infrastructure migration
            </p>
          </div>
        </Column>

        {/* Overview */}
        <Column lg={16} md={8} sm={4}>
          <Tile className="vsi-profile-guide__overview">
            <div className="vsi-profile-guide__overview-icon">
              <Information size={24} />
            </div>
            <div>
              <h3>Profile Naming Convention</h3>
              <p>
                VPC VSI profiles follow the pattern: <code>&lt;family&gt;&lt;gen&gt;[variant]-&lt;vCPU&gt;x&lt;RAM&gt;</code>.
                For example, <code>bx3d-8x40</code> is a <strong>Balanced</strong> family, <strong>Gen3</strong>,
                with NVMe instance storage (<strong>d</strong> suffix), providing 8 vCPUs and 40 GiB RAM.
              </p>
            </div>
          </Tile>
        </Column>

        {/* Decision Flow SVG */}
        <Column lg={16} md={8} sm={4}>
          <Tile className="vsi-profile-guide__section">
            <div className="vsi-profile-guide__section-header">
              <h2>Profile Selection Decision Flow</h2>
              <Tag type="blue" size="md">Visual Guide</Tag>
            </div>
            <p className="vsi-profile-guide__section-desc">
              Use this flowchart to determine the right profile family based on your workload characteristics.
            </p>
            <div style={{ textAlign: 'center', margin: '1rem 0' }}>
              <img
                src="/vpc_vsi_profile_selection.svg"
                alt="VPC VSI Profile Selection Flowchart"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </Tile>
        </Column>

        {/* Profile Families */}
        <Column lg={16} md={8} sm={4}>
          <Tile className="vsi-profile-guide__section">
            <div className="vsi-profile-guide__section-header">
              <h2>Profile Families</h2>
              <Tag type="purple" size="md">7 Families</Tag>
            </div>
            <p className="vsi-profile-guide__section-desc">
              Each profile family is optimized for a different vCPU-to-memory ratio and workload type.
              The migration assessment automatically selects the best family based on your Classic VSI&apos;s CPU and RAM configuration.
            </p>

            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Family</StructuredListCell>
                  <StructuredListCell head>Prefix</StructuredListCell>
                  <StructuredListCell head>vCPU:RAM Ratio</StructuredListCell>
                  <StructuredListCell head>Use Cases</StructuredListCell>
                  <StructuredListCell head>Example Profiles</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                <StructuredListRow>
                  <StructuredListCell><strong>Balanced</strong></StructuredListCell>
                  <StructuredListCell>bx2, bx3d</StructuredListCell>
                  <StructuredListCell>1:4 to 1:5</StructuredListCell>
                  <StructuredListCell>General purpose: web servers, middleware, application tiers</StructuredListCell>
                  <StructuredListCell>bx3d-2x10, bx3d-8x40, bx2-16x64</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>Compute</strong></StructuredListCell>
                  <StructuredListCell>cx2, cx3d</StructuredListCell>
                  <StructuredListCell>1:2 to 1:2.5</StructuredListCell>
                  <StructuredListCell>CPU-bound: batch processing, analytics, CI/CD workers, HPC</StructuredListCell>
                  <StructuredListCell>cx3d-2x5, cx3d-8x20, cx2-16x32</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>Memory</strong></StructuredListCell>
                  <StructuredListCell>mx2, mx3d</StructuredListCell>
                  <StructuredListCell>1:8 to 1:10</StructuredListCell>
                  <StructuredListCell>Databases, in-memory caches, JVM-heavy apps, Redis/Memcached</StructuredListCell>
                  <StructuredListCell>mx3d-2x20, mx3d-8x80, mx2-16x128</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>Very High Memory</strong></StructuredListCell>
                  <StructuredListCell>vx2d</StructuredListCell>
                  <StructuredListCell>1:14</StructuredListCell>
                  <StructuredListCell>SAP HANA, large in-memory analytics, real-time OLAP</StructuredListCell>
                  <StructuredListCell>vx2d-2x28, vx2d-16x224</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>Ultra High Memory</strong></StructuredListCell>
                  <StructuredListCell>ux2d</StructuredListCell>
                  <StructuredListCell>1:28</StructuredListCell>
                  <StructuredListCell>Largest SAP configurations, extreme in-memory workloads</StructuredListCell>
                  <StructuredListCell>ux2d-2x56, ux2d-16x448</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>GPU</strong></StructuredListCell>
                  <StructuredListCell>gx2, gx3</StructuredListCell>
                  <StructuredListCell>Varies</StructuredListCell>
                  <StructuredListCell>AI/ML inference, GPU rendering, video transcoding</StructuredListCell>
                  <StructuredListCell>gx2-8x64x1v100, gx3-16x80x1l4</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>Flex</strong></StructuredListCell>
                  <StructuredListCell>bxf, cxf, mxf, nxf</StructuredListCell>
                  <StructuredListCell>Varies</StructuredListCell>
                  <StructuredListCell>Lower cost via flexible hardware placement; select sizes support burstable vCPU shares</StructuredListCell>
                  <StructuredListCell>bxf-2x8, cxf-4x8, mxf-2x16, nxf-2x1</StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
            </StructuredListWrapper>
          </Tile>
        </Column>

        {/* Generation & Variants */}
        <Column lg={8} md={8} sm={4}>
          <Tile className="vsi-profile-guide__section">
            <div className="vsi-profile-guide__section-header">
              <h2>Generation & Variants</h2>
              <Tag type="green" size="md">Gen3 Preferred</Tag>
            </div>
            <p className="vsi-profile-guide__section-desc">
              Gen3 profiles offer better price-performance and are preferred by the migration assessment for new deployments.
            </p>

            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Feature</StructuredListCell>
                  <StructuredListCell head>Gen3 (bx3d, cx3d, mx3d)</StructuredListCell>
                  <StructuredListCell head>Gen2 (bx2, cx2, mx2)</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                <StructuredListRow>
                  <StructuredListCell><strong>Processor</strong></StructuredListCell>
                  <StructuredListCell>4th Gen Intel Xeon (Sapphire Rapids)</StructuredListCell>
                  <StructuredListCell>2nd Gen Intel Xeon (Cascade Lake)</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>Memory</strong></StructuredListCell>
                  <StructuredListCell>DDR5</StructuredListCell>
                  <StructuredListCell>DDR4</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>PCIe</strong></StructuredListCell>
                  <StructuredListCell>Gen5</StructuredListCell>
                  <StructuredListCell>Gen4</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>NVMe Instance Storage</strong></StructuredListCell>
                  <StructuredListCell>Included (d-suffix)</StructuredListCell>
                  <StructuredListCell>Optional (d-suffix variants)</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>Boot Mode</strong></StructuredListCell>
                  <StructuredListCell>UEFI only (required)</StructuredListCell>
                  <StructuredListCell>BIOS or UEFI</StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
            </StructuredListWrapper>

            <div className="vsi-profile-guide__notes">
              <h4>Variant Suffixes</h4>
              <ul>
                <li><strong>d</strong> — NVMe instance storage included (ephemeral on stop/start)</li>
                <li><strong>dc</strong> — Confidential compute with Intel TDX</li>
                <li><strong>f</strong> — Flex profile with flexible hardware generation placement (select sizes support burstable vCPU)</li>
              </ul>
            </div>
          </Tile>
        </Column>

        {/* NVMe Instance Storage */}
        <Column lg={8} md={8} sm={4}>
          <Tile className="vsi-profile-guide__section">
            <div className="vsi-profile-guide__section-header">
              <h2>NVMe Instance Storage</h2>
              <Tag type="teal" size="md">High IOPS</Tag>
            </div>
            <p className="vsi-profile-guide__section-desc">
              Profiles with the d-suffix include local NVMe storage directly attached to the host.
              This provides very high IOPS and low latency, but the data is <strong>ephemeral</strong> — it is lost when the instance is stopped or restarted.
            </p>

            <h4>When to Use d-Profiles</h4>
            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Use Case</StructuredListCell>
                  <StructuredListCell head>Why NVMe Helps</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                <StructuredListRow>
                  <StructuredListCell><strong>Database scratch/temp</strong></StructuredListCell>
                  <StructuredListCell>Temp tables, sort spills, and intermediate query results benefit from ultra-low latency</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>WAL / Redo logs</strong></StructuredListCell>
                  <StructuredListCell>Write-ahead logs need sequential write throughput — NVMe delivers consistent IOPS</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>Kafka partitions</strong></StructuredListCell>
                  <StructuredListCell>Kafka brokers with local NVMe avoid network storage bottlenecks for log segments</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>Build artifacts / caches</strong></StructuredListCell>
                  <StructuredListCell>CI/CD build output and package caches that can be regenerated</StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
            </StructuredListWrapper>

            <div className="vsi-profile-guide__notes">
              <h4>Important</h4>
              <ul>
                <li>NVMe instance storage is <strong>not backed up</strong> and <strong>not replicated</strong></li>
                <li>Data is lost on instance stop, restart, or hardware failure</li>
                <li>Use block storage volumes for persistent data</li>
                <li>The migration assessment prefers non-d profiles when specs are equal, since most Classic workloads use network storage</li>
              </ul>
            </div>
          </Tile>
        </Column>

        {/* How the Assessment Selects Profiles */}
        <Column lg={8} md={8} sm={4}>
          <Tile className="vsi-profile-guide__section">
            <div className="vsi-profile-guide__section-header">
              <h2>How the Assessment Selects Profiles</h2>
              <Tag type="cyan" size="md">Selection Logic</Tag>
            </div>
            <p className="vsi-profile-guide__section-desc">
              The migration assessment maps each Classic VSI to a VPC profile using the following logic.
            </p>

            <h4>Selection Priority</h4>
            <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
              <li><strong>Family match</strong> — memory-to-vCPU ratio determines family (compute, balanced, memory, etc.)</li>
              <li><strong>Gen3 preferred</strong> — Sapphire Rapids profiles are tried first for better price-performance</li>
              <li><strong>Non-instance-storage preferred</strong> — avoids d-suffix when specs are equal (NVMe is ephemeral)</li>
              <li><strong>Closest fit</strong> — minimizes wasted vCPU + memory beyond what the Classic VSI uses</li>
            </ol>

            <h4>Flex Profile Detection</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '1rem' }}>
              The assessment scans VSI hostnames for network appliance patterns (firewall, load balancer, VPN) and enterprise
              app patterns (Oracle, SAP, SQL Server) to flag workloads where flex profiles are unsuitable.
              All other VSIs receive an informational note that flex profiles may reduce cost through flexible hardware placement.
            </p>
          </Tile>
        </Column>

        {/* Network Bandwidth */}
        <Column lg={8} md={8} sm={4}>
          <Tile className="vsi-profile-guide__section">
            <div className="vsi-profile-guide__section-header">
              <h2>Network Bandwidth</h2>
              <Tag type="blue" size="md">Scales with vCPU</Tag>
            </div>
            <p className="vsi-profile-guide__section-desc">
              Network bandwidth is allocated proportionally to vCPU count. Larger profiles receive more network capacity.
            </p>

            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Profile Size</StructuredListCell>
                  <StructuredListCell head>Typical Bandwidth</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                <StructuredListRow>
                  <StructuredListCell><strong>2 vCPU</strong></StructuredListCell>
                  <StructuredListCell>4 Gbps</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>4-8 vCPU</strong></StructuredListCell>
                  <StructuredListCell>8-16 Gbps</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>16-32 vCPU</strong></StructuredListCell>
                  <StructuredListCell>32-64 Gbps</StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell><strong>64+ vCPU</strong></StructuredListCell>
                  <StructuredListCell>80-200 Gbps</StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
            </StructuredListWrapper>

            <div className="vsi-profile-guide__notes">
              <h4>Classic vs VPC</h4>
              <ul>
                <li>Classic VSIs have network bandwidth limits per port (1 Gbps or 10 Gbps uplinks)</li>
                <li>VPC profiles provide dedicated bandwidth that scales with instance size</li>
                <li>If your Classic workload is network-bound, the VPC profile may provide significantly more bandwidth</li>
              </ul>
            </div>
          </Tile>
        </Column>

        {/* Flex rule of thumb */}
        <Column lg={16} md={8} sm={4}>
          <InlineNotification
            kind="info"
            title="Flex profile rule of thumb"
            subtitle="Flex profiles offer lower cost through flexible hardware placement. Select sizes also support burstable vCPU shares (10-50% baseline) for variable workloads. Network appliances, databases, and enterprise applications should use standard (dedicated) profiles."
            hideCloseButton
            lowContrast
            style={{ maxWidth: '100%', marginBottom: '1rem' }}
          />
        </Column>
      </Grid>
    </div>
  );
}
