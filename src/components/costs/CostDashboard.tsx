import React from 'react';
import { DonutChart, StackedBarChart } from '@carbon/charts-react';
import { ScaleTypes } from '@carbon/charts';
import { Grid, Column } from '@carbon/react';
import { useUI } from '@/contexts/UIContext';
import { useData } from '@/contexts/DataContext';
import { useCostData } from '@/hooks/useCostData';
import CostTreemap from './CostTreemap';
import '@carbon/charts-react/styles.css';

const COLORS = ['#6929c4', '#1192e8', '#005d5d', '#9f1853', '#fa4d56', '#198038', '#002d9c', '#ee538b', '#b28600', '#009d9a'];

const CostDashboard: React.FC = () => {
  const { collectedData } = useData();
  const hasData = Object.keys(collectedData).length > 0;
  const { theme } = useUI();
  const chartsTheme = theme === 'g100' ? 'g90' : 'white';
  const { totalCost, costByCategory, stackedBarData, treemap } = useCostData();

  const { dataSource, importFilename } = useData();
  const isReportImport = dataSource === 'imported' && (importFilename?.startsWith('report:') || importFilename?.startsWith('mdl:'));

  if (!hasData) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Cost Analysis</h3>
        <p>Collect data first to view cost analysis.</p>
      </div>
    );
  }

  if (isReportImport && totalCost === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Cost Analysis</h3>
        <p>Cost data is not available for IMS report imports. Billing information is only collected via live API connection.</p>
      </div>
    );
  }

  const donutColorScale: Record<string, string> = {};
  costByCategory.forEach((c, i) => {
    donutColorScale[c.group] = COLORS[i % COLORS.length];
  });

  const stackedColorScale: Record<string, string> = {};
  [...new Set(stackedBarData.map(d => d.group))].forEach((g, i) => {
    const palette: Record<string, string> = { Compute: '#6929c4', Storage: '#1192e8', Network: '#005d5d' };
    stackedColorScale[g] = palette[g] ?? COLORS[i % COLORS.length];
  });

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Cost Analysis</h3>
        <span style={{ fontSize: '1.5rem', fontWeight: 300, color: 'var(--cds-text-primary)' }}>
          Total: ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
        </span>
      </div>

      <Grid>
        {/* Donut by category */}
        <Column lg={8} md={4} sm={4}>
          {costByCategory.length > 0 && (
            <DonutChart
              data={costByCategory}
              options={{
                title: 'Monthly Cost by Resource Type',
                theme: chartsTheme as 'white' | 'g90',
                resizable: true,
                donut: {
                  center: {
                    label: 'per month',
                    number: totalCost,
                    numberFontSize: () => 20,
                  },
                  alignment: 'center',
                },
                pie: { labels: { enabled: false } },
                legend: { alignment: 'center', position: 'bottom' },
                height: '320px',
                color: { scale: donutColorScale },
              }}
            />
          )}
        </Column>

        {/* Stacked bar by DC */}
        <Column lg={8} md={4} sm={4}>
          {stackedBarData.length > 0 && (
            <StackedBarChart
              data={stackedBarData}
              options={{
                title: 'Cost by Datacenter',
                theme: chartsTheme as 'white' | 'g90',
                resizable: true,
                axes: {
                  left: { mapsTo: 'key', scaleType: ScaleTypes.LABELS },
                  bottom: { mapsTo: 'value', stacked: true },
                },
                legend: { alignment: 'center', position: 'bottom' },
                height: '320px',
                color: { scale: stackedColorScale },
                bars: { maxWidth: 40 },
              }}
            />
          )}
        </Column>
      </Grid>

      {/* Treemap */}
      {treemap.children && treemap.children.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Cost Breakdown Treemap
          </h4>
          <CostTreemap data={treemap} width={Math.min(1200, window.innerWidth - 350)} height={400} />
        </div>
      )}
    </div>
  );
};

export default CostDashboard;
