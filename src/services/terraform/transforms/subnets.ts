import type {
  ClassicSubnetRecommendation,
  TerraformSubnetConfig,
} from '../types';
import { tfName, deduplicateNames } from '../utils';

/**
 * Convert SubnetRecommendation[] from migration analysis into a
 * Terraform-ready subnet config map.
 */
export function transformSubnets(
  recommendations: ClassicSubnetRecommendation[],
): Record<string, TerraformSubnetConfig> {
  if (!recommendations || recommendations.length === 0) return {};

  const rawNames = recommendations.map((r) => tfName(r.vpcSubnetName));
  const uniqueNames = deduplicateNames(rawNames);

  const result: Record<string, TerraformSubnetConfig> = {};
  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    result[uniqueNames[i]] = {
      zone: rec.vpcZone,
      cidr: rec.vpcSubnetCIDR,
    };
  }

  return result;
}
