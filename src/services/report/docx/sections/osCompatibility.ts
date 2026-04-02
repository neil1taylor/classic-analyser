import { Paragraph, Table, HeadingLevel } from 'docx';
import type { ComputeAssessment } from '@/types/migration';
import { heading, body, spacer, pageBreak } from '../utils/styles';
import { createStyledTable } from '../utils/tables';
import { tableCaption } from '../utils/captions';

export function buildOsCompatibility(
  compute: ComputeAssessment,
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    pageBreak(),
    heading('OS Compatibility'),
    body(
      'This section assesses operating system compatibility with IBM Cloud VPC. OS versions that are not directly available as VPC stock images may require upgrade or BYOL (Bring Your Own License).',
    ),
    spacer(),
  ];

  // Build OS matrix from VSI migrations
  const osMap = new Map<string, { count: number; compatible: boolean; upgrade: string }>();

  for (const v of compute.vsiMigrations) {
    const key = v.os || 'Unknown';
    const existing = osMap.get(key) || { count: 0, compatible: false, upgrade: '' };
    existing.count++;
    existing.compatible = existing.compatible || v.osCompatible;
    if (v.osUpgradeTarget && !existing.upgrade) {
      existing.upgrade = v.osUpgradeTarget;
    }
    osMap.set(key, existing);
  }

  for (const bm of compute.bareMetalMigrations) {
    const key = bm.os || 'Unknown';
    const existing = osMap.get(key) || { count: 0, compatible: false, upgrade: '' };
    existing.count++;
    osMap.set(key, existing);
  }

  if (osMap.size === 0) {
    elements.push(body('No operating system data available.'));
    return elements;
  }

  // Supported OS
  const supported = Array.from(osMap.entries())
    .filter(([, v]) => v.compatible)
    .sort((a, b) => b[1].count - a[1].count);

  if (supported.length > 0) {
    elements.push(heading('Compatible Operating Systems', HeadingLevel.HEADING_2));
    elements.push(tableCaption('VPC-Compatible Operating Systems'));
    elements.push(
      createStyledTable(
        ['Operating System', 'Instances', 'Upgrade Target'],
        supported.map(([os, v]) => [os, String(v.count), v.upgrade || 'None required']),
      ),
    );
    elements.push(spacer());
  }

  // Unsupported OS
  const unsupported = Array.from(osMap.entries())
    .filter(([, v]) => !v.compatible)
    .sort((a, b) => b[1].count - a[1].count);

  if (unsupported.length > 0) {
    elements.push(heading('Incompatible Operating Systems', HeadingLevel.HEADING_2));
    elements.push(
      body(
        'The following operating systems do not have a direct VPC stock image and require remediation (upgrade, BYOL, or re-platform).',
      ),
    );
    elements.push(tableCaption('Incompatible Operating Systems'));
    elements.push(
      createStyledTable(
        ['Operating System', 'Instances', 'Recommended Action'],
        unsupported.map(([os, v]) => [
          os,
          String(v.count),
          v.upgrade ? `Upgrade to ${v.upgrade}` : 'BYOL or re-platform',
        ]),
      ),
    );
    elements.push(spacer());
  }

  // Summary
  const totalInstances = Array.from(osMap.values()).reduce((s, v) => s + v.count, 0);
  const compatibleCount = supported.reduce((s, [, v]) => s + v.count, 0);
  const pct = totalInstances > 0 ? Math.round((compatibleCount / totalInstances) * 100) : 0;
  elements.push(
    body(
      `${compatibleCount} of ${totalInstances} instances (${pct}%) run a VPC-compatible operating system.`,
    ),
  );

  return elements;
}
