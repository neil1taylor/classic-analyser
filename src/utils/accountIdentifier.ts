// Account fingerprinting for localStorage scoping
// Ensures preferences are isolated per IBM Cloud account

export function getAccountFingerprint(accountId: string, accountName?: string): string {
  // Use account ID as the primary identifier (unique across IBM Cloud)
  const normalized = accountId.trim().toLowerCase();
  // Simple hash to keep the fingerprint compact
  let hash = 0;
  const input = accountName ? `${normalized}:${accountName.trim()}` : normalized;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return `ibm-${Math.abs(hash).toString(36)}`;
}

export function fingerprintsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return a === b;
}
