import { Paragraph, Table, HeadingLevel } from 'docx';
import type { CostAnalysis } from '@/types/migration';
import { heading, body, spacer, pageBreak } from '../utils/styles';
import { createStyledTable, fmt } from '../utils/tables';
import { aiNarrativeSection } from '../utils/aiSections';
import { buildPieChartImage } from '../utils/charts';
import { tableCaption, figureCaption } from '../utils/captions';

export async function buildCostAnalysis(
  cost: CostAnalysis,
  aiNarrative?: string,
): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Cost Analysis'),
    body('Comparison of estimated monthly costs between Classic and VPC infrastructure.'),
    spacer(),
  ];

  // Cost comparison table
  elements.push(heading('Cost Comparison', HeadingLevel.HEADING_2));

  const compHeaders = ['Metric', 'Value'];
  const compRows = [
    ['Classic Monthly Cost', fmt(cost.classicMonthlyCost)],
    ['VPC Monthly Cost', fmt(cost.vpcMonthlyCost)],
    [
      'Monthly Difference',
      `${fmt(cost.monthlyDifference)} (${cost.percentageChange >= 0 ? '+' : ''}${cost.percentageChange.toFixed(1)}%)`,
    ],
    ['Break-Even Period', `${cost.breakEvenMonths} months`],
    ['3-Year Savings', fmt(cost.threeYearSavings)],
  ];

  elements.push(tableCaption('Cost comparison summary'));
  elements.push(createStyledTable(compHeaders, compRows));
  elements.push(spacer());

  // Category breakdown
  elements.push(heading('Cost by Category', HeadingLevel.HEADING_2));

  const catHeaders = ['Category', 'Classic Monthly', 'VPC Monthly', 'Difference'];
  const categories: [string, { classic: number; vpc: number }][] = [
    ['Compute', cost.costByCategory.compute],
    ['Storage', cost.costByCategory.storage],
    ['Network', cost.costByCategory.network],
  ];

  const catRows = categories.map(([name, cat]) => [
    name,
    fmt(cat.classic),
    fmt(cat.vpc),
    fmt(cat.vpc - cat.classic),
  ]);

  elements.push(tableCaption('Cost breakdown by category'));
  elements.push(createStyledTable(catHeaders, catRows));
  elements.push(spacer());

  // Cost breakdown pie chart
  const classicSlices = categories
    .filter(([, cat]) => cat.classic > 0)
    .map(([name, cat]) => ({ label: `${name} (Classic)`, value: cat.classic }));

  if (classicSlices.length > 0) {
    try {
      const chart = await buildPieChartImage('Classic Cost Breakdown', classicSlices);
      elements.push(chart);
      elements.push(figureCaption('Classic infrastructure cost breakdown by category'));
    } catch {
      // Chart rendering failed — continue without it
    }
    elements.push(spacer());
  }

  if (aiNarrative) {
    elements.push(...aiNarrativeSection(aiNarrative));
  }

  return elements;
}
