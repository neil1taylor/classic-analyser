import { Paragraph, Table, HeadingLevel } from 'docx';
import type { CostAnalysis } from '@/types/migration';
import { RESOURCE_TYPES } from '@/types/resources';
import { heading, body, spacer, pageBreak } from '../utils/styles';
import { createStyledTable, fmt } from '../utils/tables';
import { aiNarrativeSection } from '../utils/aiSections';
import { buildPieChartImage } from '../utils/charts';
import { tableCaption, figureCaption } from '../utils/captions';

export async function buildEnvironmentOverview(
  collectedData: Record<string, unknown[]>,
  costAnalysis?: CostAnalysis,
  aiNarrative?: string,
): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('Environment Overview'),
    body(
      'The following summarizes the Classic infrastructure resources discovered during the scan.',
    ),
    spacer(),
  ];

  // Resource counts table
  elements.push(heading('Resource Inventory Summary', HeadingLevel.HEADING_2));

  const rows: string[][] = [];
  const categoryCounts: Record<string, number> = {};
  for (const rt of RESOURCE_TYPES) {
    const data = collectedData[rt.key];
    if (data && data.length > 0) {
      rows.push([rt.category, rt.label, String(data.length)]);
      categoryCounts[rt.category] = (categoryCounts[rt.category] || 0) + data.length;
    }
  }

  if (rows.length > 0) {
    const table = createStyledTable(['Category', 'Resource Type', 'Count'], rows);
    const totalResources = rows.reduce((sum, r) => sum + Number(r[2]), 0);
    elements.push(
      body(`Total resource types with data: ${rows.length}. Total resources: ${totalResources}.`),
    );
    elements.push(tableCaption('Resource Inventory Summary'));
    elements.push(table);
  } else {
    elements.push(body('No resources were found in the collected data.'));
  }

  elements.push(spacer());

  // Resource distribution pie chart
  if (Object.keys(categoryCounts).length > 1) {
    const slices = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));

    try {
      const chartParagraph = await buildPieChartImage('Resource Distribution by Category', slices);
      elements.push(chartParagraph);
      elements.push(figureCaption('Resource distribution by category'));
    } catch {
      // Chart rendering failed — continue without it
    }
    elements.push(spacer());
  }

  // Datacenter distribution
  elements.push(heading('Datacenter Distribution', HeadingLevel.HEADING_2));
  const dcCounts: Record<string, number> = {};
  for (const rt of RESOURCE_TYPES) {
    const data = collectedData[rt.key] as Record<string, unknown>[] | undefined;
    if (!data) continue;
    for (const item of data) {
      const dc = (item.datacenter as string) || (item.location as string);
      if (dc) {
        dcCounts[dc] = (dcCounts[dc] || 0) + 1;
      }
    }
  }

  const sortedDCs = Object.entries(dcCounts).sort((a, b) => b[1] - a[1]);
  if (sortedDCs.length > 0) {
    // Datacenter table
    const dcRows = sortedDCs.slice(0, 20).map(([dc, count]) => [dc, String(count)]);
    elements.push(tableCaption('Datacenter distribution'));
    elements.push(createStyledTable(['Datacenter', 'Resource Count'], dcRows));

    if (sortedDCs.length > 20) {
      elements.push(body(`... and ${sortedDCs.length - 20} more datacenters`));
    }

    // Datacenter pie chart (top 8)
    const dcSlices = sortedDCs.slice(0, 8).map(([label, value]) => ({ label, value }));
    if (sortedDCs.length > 8) {
      const otherCount = sortedDCs.slice(8).reduce((sum, [, c]) => sum + c, 0);
      dcSlices.push({ label: 'Other', value: otherCount });
    }

    try {
      const dcChart = await buildPieChartImage('Datacenter Spread', dcSlices);
      elements.push(dcChart);
      elements.push(figureCaption('Datacenter spread'));
    } catch {
      // Chart rendering failed — continue without it
    }
  } else {
    elements.push(body('No datacenter information available.'));
  }

  elements.push(spacer());

  // Cost summary
  if (costAnalysis) {
    elements.push(heading('Cost Summary', HeadingLevel.HEADING_2));
    elements.push(
      body(`Current Classic monthly cost: ${fmt(costAnalysis.classicMonthlyCost)}`),
      body(`Estimated VPC monthly cost: ${fmt(costAnalysis.vpcMonthlyCost)}`),
      body(
        `Monthly difference: ${fmt(costAnalysis.monthlyDifference)} (${costAnalysis.percentageChange >= 0 ? '+' : ''}${costAnalysis.percentageChange.toFixed(1)}%)`,
      ),
    );
    elements.push(spacer());
  }

  // AI narrative
  if (aiNarrative) {
    elements.push(...aiNarrativeSection(aiNarrative));
  }

  return elements;
}
