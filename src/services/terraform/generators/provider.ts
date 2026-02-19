import type { TerraformMultiRegionInput } from '../types';
import { regionToSlug } from '../utils';

export function generateProviderTf(input: TerraformMultiRegionInput): string {
  const lines: string[] = [];

  lines.push(`# --------------------------------------------------------------------------`);
  lines.push(`# IBM Cloud provider — one alias per VPC region`);
  lines.push(`# When running in IBM Cloud Schematics the API key is injected automatically.`);
  lines.push(`# For local runs, export IC_API_KEY or set ibmcloud_api_key here.`);
  lines.push(`# --------------------------------------------------------------------------`);
  lines.push('');

  // Default provider (first region)
  const defaultRegion = input.regions[0];
  lines.push(`provider "ibm" {`);
  lines.push(`  region = "${defaultRegion}"`);
  lines.push(`}`);
  lines.push('');

  // Aliased providers for each region
  for (const region of input.regions) {
    const slug = regionToSlug(region);
    lines.push(`provider "ibm" {`);
    lines.push(`  alias  = "${slug}"`);
    lines.push(`  region = "${region}"`);
    lines.push(`}`);
    lines.push('');
  }

  return lines.join('\n');
}
