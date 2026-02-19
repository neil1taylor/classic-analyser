import React, { useMemo } from 'react';
import { DonutChart, StackedBarChart } from '@carbon/charts-react';
import { ScaleTypes } from '@carbon/charts';
import { Grid, Column } from '@carbon/react';
import { useUI } from '@/contexts/UIContext';
import { useData } from '@/contexts/DataContext';
import type { DistributionEntry } from '@/hooks/useDashboardMetrics';
import '@carbon/charts-react/styles.css';

const COLORS = [
  '#6929c4', '#1192e8', '#005d5d', '#9f1853', '#fa4d56',
  '#198038', '#002d9c', '#ee538b', '#b28600', '#009d9a',
];

function buildColorScale(data: DistributionEntry[]): Record<string, string> {
  const scale: Record<string, string> = {};
  data.forEach((entry, i) => {
    scale[entry.group] = COLORS[i % COLORS.length];
  });
  return scale;
}

interface DistributionChartsProps {
  osDist: DistributionEntry[];
  dcDist: DistributionEntry[];
  cpuDist: DistributionEntry[];
  totalServers: number;
}

function str(item: unknown, key: string): string {
  return String((item as Record<string, unknown>)[key] ?? '');
}

function num(item: unknown, key: string): number {
  return Number((item as Record<string, unknown>)[key] ?? 0);
}

const DistributionCharts: React.FC<DistributionChartsProps> = ({
  osDist,
  dcDist,
  cpuDist,
  totalServers,
}) => {
  const { theme } = useUI();
  const { collectedData } = useData();
  const chartsTheme = theme === 'g100' ? 'g90' : 'white';

  const makeDonutOptions = (title: string, data: DistributionEntry[]) => ({
    title,
    theme: chartsTheme as 'white' | 'g90',
    resizable: true,
    donut: {
      center: {
        label: 'servers',
        number: totalServers,
        numberFontSize: () => 24,
      },
      alignment: 'center' as const,
    },
    pie: { labels: { enabled: false } },
    legend: { alignment: 'center' as const, position: 'bottom' as const },
    height: '280px',
    color: { scale: buildColorScale(data) },
  });

  // Stacked bar: servers by DC and type
  const stackedBarData = useMemo(() => {
    const vsis = collectedData['virtualServers'] ?? [];
    const bms = collectedData['bareMetal'] ?? [];
    const dcCounts = new Map<string, { vsi: number; bm: number }>();

    for (const item of vsis) {
      const dc = str(item, 'datacenter') || 'Unknown';
      const entry = dcCounts.get(dc) ?? { vsi: 0, bm: 0 };
      entry.vsi += 1;
      dcCounts.set(dc, entry);
    }
    for (const item of bms) {
      const dc = str(item, 'datacenter') || 'Unknown';
      const entry = dcCounts.get(dc) ?? { vsi: 0, bm: 0 };
      entry.bm += 1;
      dcCounts.set(dc, entry);
    }

    const result: { group: string; key: string; value: number }[] = [];
    const sorted = Array.from(dcCounts.entries())
      .sort((a, b) => (b[1].vsi + b[1].bm) - (a[1].vsi + a[1].bm));

    for (const [dc, counts] of sorted) {
      if (counts.vsi > 0) result.push({ group: 'Virtual Servers', key: dc, value: counts.vsi });
      if (counts.bm > 0) result.push({ group: 'Bare Metal', key: dc, value: counts.bm });
    }
    return result;
  }, [collectedData]);

  // Gauge: total vCPU allocation, total memory, total storage
  const gaugeData = useMemo(() => {
    const vsis = collectedData['virtualServers'] ?? [];
    const blockStorage = collectedData['blockStorage'] ?? [];
    const fileStorage = collectedData['fileStorage'] ?? [];

    const totalVCPU = vsis.reduce((s: number, v) => s + num(v, 'maxCpu'), 0);
    const totalMemoryMB = vsis.reduce((s: number, v) => s + num(v, 'maxMemory'), 0);
    const totalMemoryGB = Math.round(totalMemoryMB / 1024);
    const totalStorageGB = blockStorage.reduce((s: number, v) => s + num(v, 'capacityGb'), 0)
      + fileStorage.reduce((s: number, v) => s + num(v, 'capacityGb'), 0);
    const totalStorageTB = Math.round(totalStorageGB / 1024 * 10) / 10;

    return { totalVCPU, totalMemoryGB, totalStorageTB };
  }, [collectedData]);

  if (totalServers === 0) return null;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--cds-text-primary)' }}>
        Resource Distribution
      </h4>

      {/* Donut row */}
      <Grid>
        <Column lg={5} md={4} sm={4}>
          {osDist.length > 0 && (
            <DonutChart data={osDist} options={makeDonutOptions('By Operating System', osDist)} />
          )}
        </Column>
        <Column lg={5} md={4} sm={4}>
          {dcDist.length > 0 && (
            <DonutChart data={dcDist} options={makeDonutOptions('By Datacenter', dcDist)} />
          )}
        </Column>
        <Column lg={5} md={4} sm={4}>
          {cpuDist.length > 0 && (
            <DonutChart data={cpuDist} options={makeDonutOptions('By CPU Allocation', cpuDist)} />
          )}
        </Column>
      </Grid>

      {/* Stacked bar: servers by DC and type */}
      {stackedBarData.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <Grid>
            <Column lg={10} md={8} sm={4}>
              <StackedBarChart
                data={stackedBarData}
                options={{
                  title: 'Servers by Datacenter and Type',
                  theme: chartsTheme as 'white' | 'g90',
                  resizable: true,
                  axes: {
                    left: { mapsTo: 'key', scaleType: ScaleTypes.LABELS },
                    bottom: { mapsTo: 'value', stacked: true },
                  },
                  legend: { alignment: 'center' as const, position: 'bottom' as const },
                  height: '300px',
                  color: { scale: Object.fromEntries(
                    [...new Set(stackedBarData.map(d => d.group))].map((g, i) => [g, ['#6929c4', '#1192e8'][i] ?? COLORS[i % COLORS.length]])
                  ) },
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>vCPUs across {totalServers} servers</div>
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
                      ~{totalServers > 0 ? Math.round(gaugeData.totalMemoryGB / totalServers) : 0} GB avg per server
                    </div>
                  </div>
                )}
                {gaugeData.totalStorageTB > 0 && (
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
                        : `${Math.round(gaugeData.totalStorageTB * 1024)} GB`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>Block + File storage</div>
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

export default DistributionCharts;
