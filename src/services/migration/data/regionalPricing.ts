export const REGION_PRICE_UPLIFT: Record<string, number> = {
  'us-south': 0.00,
  'us-east': 0.00,
  'ca-tor': 0.06,
  'eu-gb': 0.13,
  'eu-de': 0.16,
  'eu-es': 0.16,
  'jp-osa': 0.20,
  'jp-tok': 0.20,
  'au-syd': 0.20,
  'br-sao': 0.32,
};

export function getRegionalMultiplier(region: string): number {
  const uplift = REGION_PRICE_UPLIFT[region];
  return 1 + (uplift ?? 0);
}

export function applyRegionalUplift(baseCost: number, region: string): number {
  return baseCost * getRegionalMultiplier(region);
}
