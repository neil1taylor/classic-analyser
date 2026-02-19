import React from 'react';
import { Tag, Tile, Tooltip as CarbonTooltip } from '@carbon/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CostAnalysis } from '@/types/migration';

interface Props {
  costAnalysis: CostAnalysis;
}

const CostComparisonPanel: React.FC<Props> = ({ costAnalysis }) => {
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const barData = [
    {
      category: 'Compute',
      Classic: costAnalysis.costByCategory.compute.classic,
      VPC: costAnalysis.costByCategory.compute.vpc,
    },
    {
      category: 'Storage',
      Classic: costAnalysis.costByCategory.storage.classic,
      VPC: costAnalysis.costByCategory.storage.vpc,
    },
    {
      category: 'Network',
      Classic: costAnalysis.costByCategory.network.classic,
      VPC: costAnalysis.costByCategory.network.vpc,
    },
  ];

  const savingsPositive = costAnalysis.monthlyDifference > 0;

  return (
    <div className="cost-comparison-panel">
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Tile style={{ padding: '1rem' }}>
          <CarbonTooltip label="Estimated current monthly cost of Classic infrastructure" align="bottom">
            <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>Classic Monthly</div>
          </CarbonTooltip>
          <div style={{ fontSize: '1.5rem', fontWeight: 300 }}>{fmt(costAnalysis.classicMonthlyCost)}</div>
        </Tile>
        <Tile style={{ padding: '1rem' }}>
          <CarbonTooltip label="Estimated monthly cost after migration to VPC" align="bottom">
            <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>VPC Monthly</div>
          </CarbonTooltip>
          <div style={{ fontSize: '1.5rem', fontWeight: 300 }}>{fmt(costAnalysis.vpcMonthlyCost)}</div>
        </Tile>
        <Tile style={{ padding: '1rem' }}>
          <CarbonTooltip label="Projected monthly cost difference — positive means savings" align="bottom">
            <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>Monthly Savings</div>
          </CarbonTooltip>
          <div style={{ fontSize: '1.5rem', fontWeight: 300, color: savingsPositive ? '#24a148' : '#da1e28' }}>
            {savingsPositive ? '' : '-'}{fmt(Math.abs(costAnalysis.monthlyDifference))}
          </div>
          <CarbonTooltip label="Percentage change in monthly cost after migration" align="bottom">
            <Tag type={savingsPositive ? 'green' : 'red'} size="sm">
              {costAnalysis.percentageChange > 0 ? '+' : ''}{costAnalysis.percentageChange}%
            </Tag>
          </CarbonTooltip>
        </Tile>
        <Tile style={{ padding: '1rem' }}>
          <CarbonTooltip label="Cumulative projected savings over 36 months" align="bottom">
            <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>3-Year Savings</div>
          </CarbonTooltip>
          <div style={{ fontSize: '1.5rem', fontWeight: 300, color: costAnalysis.threeYearSavings > 0 ? '#24a148' : '#da1e28' }}>
            {fmt(Math.abs(costAnalysis.threeYearSavings))}
          </div>
          {costAnalysis.breakEvenMonths > 0 && (
            <CarbonTooltip label="Months until migration investment is recovered through savings" align="bottom">
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>
                Break-even: {costAnalysis.breakEvenMonths} months
              </div>
            </CarbonTooltip>
          )}
        </Tile>
      </div>

      {/* Bar chart comparison */}
      <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
        Cost by Category: Classic vs VPC
      </h5>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--cds-border-subtle)" />
          <XAxis dataKey="category" tick={{ fill: 'var(--cds-text-secondary)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--cds-text-secondary)', fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
          <Tooltip
            formatter={(value: number) => fmt(value)}
            contentStyle={{ background: 'var(--cds-layer)', border: '1px solid var(--cds-border-subtle)' }}
          />
          <Legend />
          <Bar dataKey="Classic" fill="#6929c4" radius={[4, 4, 0, 0]} />
          <Bar dataKey="VPC" fill="#1192e8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CostComparisonPanel;
