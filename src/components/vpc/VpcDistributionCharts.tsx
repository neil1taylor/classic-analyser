import React, { useMemo } from 'react';
import { DonutChart, StackedBarChart } from '@carbon/charts-react';
import { ScaleTypes } from '@carbon/charts';
import { Grid, Column } from '@carbon/react';
import { useUI } from '@/contexts/UIContext';
import { useVpcData } from '@/contexts/VpcDataContext';
import type { VpcDistributionEntry } from '@/hooks/useVpcDashboardMetrics';
import '@carbon/charts-react/styles.css';

const COLORS = [
  '#6929c4', '#1192e8', '#005d5d', '#9f1853', '#fa4d56',
  '#198038', '#002d9c', '#ee538b', '#b28600', '#009d9a',
];

function buildColorScale(data: VpcDistributionEntry[]): Record<string, string> {
  const scale: Record<string, string> = {};
  data.forEach((entry, i) => {
    scale[entry.group] = COLORS[i % COLORS.length];
  });
  return scale;
}

function str(item: unknown, key: string): string {
  return String((item as Record<string, unknown>)[key] ?? '');
}

function num(item: unknown, key: string): number {
  return Number((item as Record<string, unknown>)[key] ?? 0);
}

interface VpcDistributionChartsProps {
  regionDist: VpcDistributionEntry[];
  vpcDist: VpcDistributionEntry[];
  profileDist: VpcDistributionEntry[];
  totalInstances: number;
  totalResources: number;
}

const VpcDistributionCharts: React.FC<VpcDistributionChartsProps> = ({
  regionDist,
  vpcDist,
  profileDist,
  totalInstances,
  totalResources,
}) => {
  const { theme } = useUI();
  const { vpcCollectedData } = useVpcData();
  const chartsTheme = theme === 'g100' ? 'g90' : 'white';

  const centerLabel = totalInstances > 0 ? 'instances' : 'resources';
  const centerNumber = totalInstances > 0 ? totalInstances : totalResources;

  const makeDonutOptions = (title: string, data: VpcDistributionEntry[]) => ({
    title,
    theme: chartsTheme as 'white' | 'g90',
    resizable: true,
    donut: {
      center: {
        label: centerLabel,
        number: centerNumber,
        numberFontSize: () => 24,
      },
      alignment: 'center' as const,
    },
    pie: { labels: { enabled: false } },
    legend: { alignment: 'center' as const, position: 'bottom' as const },
    height: '280px',
    color: { scale: buildColorScale(data) },
  });

  // Stacked bar: instances by region and type (VPC Instances vs Bare Metal)
  const stackedBarData = useMemo(() => {
    const instances = vpcCollectedData['vpcInstances'] ?? [];
    const bareMetals = vpcCollectedData['vpcBareMetalServers'] ?? [];
    const regionCounts = new Map<string, { instance: number; bareMetal: number }>();

    for (const item of instances) {
      const region = str(item, 'region') || 'Unknown';
      const entry = regionCounts.get(region) ?? { instance: 0, bareMetal: 0 };
      entry.instance += 1;
      regionCounts.set(region, entry);
    }
    for (const item of bareMetals) {
      const region = str(item, 'region') || 'Unknown';
      const entry = regionCounts.get(region) ?? { instance: 0, bareMetal: 0 };
      entry.bareMetal += 1;
      regionCounts.set(region, entry);
    }

    const result: { group: string; key: string; value: number }[] = [];
    const sorted = Array.from(regionCounts.entries())
      .sort((a, b) => (b[1].instance + b[1].bareMetal) - (a[1].instance + a[1].bareMetal));

    for (const [region, counts] of sorted) {
      if (counts.instance > 0) result.push({ group: 'VPC Instances', key: region, value: counts.instance });
      if (counts.bareMetal > 0) result.push({ group: 'Bare Metal', key: region, value: counts.bareMetal });
    }
    return result;
  }, [vpcCollectedData]);

  // Summary gauge data: vCPU, memory, storage
  const gaugeData = useMemo(() => {
    const instances = vpcCollectedData['vpcInstances'] ?? [];
    const volumes = vpcCollectedData['vpcVolumes'] ?? [];

    const totalVCPU = instances.reduce((s: number, v) => s + num(v, 'vcpu'), 0);
    const totalMemoryGB = instances.reduce((s: number, v) => s + num(v, 'memory'), 0);
    const totalStorageGB = volumes.reduce((s: number, v) => s + num(v, 'capacity'), 0);
    const totalStorageTB = Math.round(totalStorageGB / 1024 * 10) / 10;

    return { totalVCPU, totalMemoryGB, totalStorageTB, totalStorageGB };
  }, [vpcCollectedData]);

  const hasChartData = regionDist.length > 0 || vpcDist.length > 0 || profileDist.length > 0;
  if (!hasChartData) return null;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--cds-text-primary)' }}>
        Resource Distribution
      </h4>

      {/* Donut row */}
      <Grid>
        <Column lg={5} md={4} sm={4}>
          {regionDist.length > 0 && (
            <DonutChart data={regionDist} options={makeDonutOptions('By Region', regionDist)} />
          )}
        </Column>
        <Column lg={5} md={4} sm={4}>
          {vpcDist.length > 0 && (
            <DonutChart data={vpcDist} options={makeDonutOptions('By VPC', vpcDist)} />
          )}
        </Column>
        <Column lg={5} md={4} sm={4}>
          {profileDist.length > 0 && (
            <DonutChart data={profileDist} options={makeDonutOptions('By Profile', profileDist)} />
          )}
        </Column>
      </Grid>

      {/* Stacked bar: instances by region and type */}
      {stackedBarData.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <Grid>
            <Column lg={10} md={8} sm={4}>
              <StackedBarChart
                data={stackedBarData}
                options={{
                  title: 'Instances by Region and Type',
                  theme: chartsTheme as 'white' | 'g90',
                  resizable: true,
                  axes: {
                    left: { mapsTo: 'key', scaleType: ScaleTypes.LABELS },
                    bottom: { mapsTo: 'value', stacked: true },
                  },
                  legend: { alignment: 'center' as const, position: 'bottom' as const },
                  height: '300px',
                  color: { scale: { 'VPC Instances': '#6929c4', 'Bare Metal': '#1192e8' } },
                  bars: { maxWidth: 40 },
                }}
              />
            </Column>

            {/* Resource total summary tiles */}
            <Column lg={5} md={4} sm={4}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {gaugeData.totalVCPU > 0 && (
                  <div style={{
                    background: 'var(--cds-layer)',
                    border: '1px solid var(--cds-border-subtle)',
                    borderLeft: '4px solid #6929c4',
                    borderRadius: 4,
                    padding: '1rem',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: 4 }}>Total vCPU Allocation</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--cds-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {gaugeData.totalVCPU.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>vCPUs across {totalInstances} instances</div>
                  </div>
                )}
                {gaugeData.totalMemoryGB > 0 && (
                  <div style={{
                    background: 'var(--cds-layer)',
                    border: '1px solid var(--cds-border-subtle)',
                    borderLeft: '4px solid #1192e8',
                    borderRadius: 4,
                    padding: '1rem',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: 4 }}>Total Memory</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--cds-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {gaugeData.totalMemoryGB.toLocaleString()} GB
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>
                      ~{totalInstances > 0 ? Math.round(gaugeData.totalMemoryGB / totalInstances) : 0} GB avg per instance
                    </div>
                  </div>
                )}
                {gaugeData.totalStorageGB > 0 && (
                  <div style={{
                    background: 'var(--cds-layer)',
                    border: '1px solid var(--cds-border-subtle)',
                    borderLeft: '4px solid #005d5d',
                    borderRadius: 4,
                    padding: '1rem',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: 4 }}>Total Storage</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 300, color: 'var(--cds-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {gaugeData.totalStorageTB >= 1
                        ? `${gaugeData.totalStorageTB.toLocaleString()} TB`
                        : `${gaugeData.totalStorageGB.toLocaleString()} GB`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>VPC Block volumes</div>
                  </div>
                )}
              </div>
            </Column>
          </Grid>
        </div>
      )}
    </div>
  );
};

export default VpcDistributionCharts;
