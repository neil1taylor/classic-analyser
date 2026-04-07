// IBM Cost Transfer Guidance discount rates (fraction retained, not discount percentage)
// e.g., 0.50 means the internal cost is 50% of list price

export const INTERNAL_DISCOUNT_RATES: Record<string, number> = {
  'Classic Bare Metal': 0.50,
  'Classic VSI': 0.50,
  'Classic Block/File Storage': 0.65,
  'Classic Third Party and Standalone Licensing': 0.25,
  'Network (Classic)': 0.55,
  'Cloud Object Storage': 0.35,
  'vCloud Director (vCD)': 0.40,
  'VMware Solutions Shared': 0.40,
  'Skytap': 0.25,
  'Power VS': 0.55,
  'PaaS': 0.35,
  'PaaS, Other NextGen': 0.35,
  'Virtual Private Cloud (VPC)': 0.80,
  'VPC Compute L4': 0.70,
  'VPC Compute L40': 0.70,
  'Network - VPC': 0.35,
  'Storage - VPC': 0.35,
  'Bare Metal Server for VPC': 0.80,
  'IKS/ROKS on Classic': 0.50,
  'IKS/ROKS on GPU H100/200': 0.70,
  'IKS/ROKS on VPC': 0.55,
  'OpenShift': 1.00,
  'RHEL - SW VPC/Classic': 1.00,
  '3rd party SW on VPC': 0.35,
  'NextGen Third Party, Licensing/Royalty': 0.25,
  'Cloud for Education': 0.00,
  'Cloud Database Services': 0.00,
  'SaaS': 0.35,
};

export const DISCOUNT_CATEGORY_ALIASES: Record<string, string> = {
  'bare metal': 'Classic Bare Metal',
  'bm': 'Classic Bare Metal',
  'vsi': 'Classic VSI',
  'vpc': 'Virtual Private Cloud (VPC)',
  'vpc compute': 'Virtual Private Cloud (VPC)',
  'vpc storage': 'Storage - VPC',
  'vpc network': 'Network - VPC',
  'vpc bm': 'Bare Metal Server for VPC',
  'iks': 'IKS/ROKS on VPC',
  'roks': 'IKS/ROKS on VPC',
  'power': 'Power VS',
  'paas': 'PaaS',
  'storage': 'Classic Block/File Storage',
  'cos': 'Cloud Object Storage',
};

export function getDiscountRate(category: string): number {
  const lower = category.toLowerCase();
  const aliasKey = DISCOUNT_CATEGORY_ALIASES[lower];
  if (aliasKey && aliasKey in INTERNAL_DISCOUNT_RATES) {
    return INTERNAL_DISCOUNT_RATES[aliasKey];
  }
  if (category in INTERNAL_DISCOUNT_RATES) {
    return INTERNAL_DISCOUNT_RATES[category];
  }
  const ciMatch = Object.keys(INTERNAL_DISCOUNT_RATES).find(
    (k) => k.toLowerCase() === lower,
  );
  if (ciMatch) {
    return INTERNAL_DISCOUNT_RATES[ciMatch];
  }
  return 0;
}

export function applyDiscount(listPrice: number, category: string): number {
  return listPrice * (1 - getDiscountRate(category));
}
