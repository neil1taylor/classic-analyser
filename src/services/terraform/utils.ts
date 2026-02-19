/**
 * Sanitise a string into a valid Terraform / IBM Cloud resource name.
 * - Lowercase, replace non-alphanumeric with hyphens, collapse runs, trim hyphens
 * - Truncate to maxLen (default 63 — IBM Cloud limit)
 */
export function tfName(raw: string, maxLen = 63): string {
  let name = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!name || /^[0-9]/.test(name)) {
    name = `r-${name}`;
  }
  return name.slice(0, maxLen);
}

/** Deduplicate names by appending numeric suffixes. */
export function deduplicateNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const count = seen.get(n) ?? 0;
    seen.set(n, count + 1);
    if (count === 0) return n;
    return `${n}-${count}`;
  });
}

/** Indent every line of a multi-line string. */
export function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n');
}

/** Format an HCL map value for terraform.tfvars. */
export function hclString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Convert a VPC region name (e.g. "us-south") to a Terraform identifier slug (e.g. "us_south"). */
export function regionToSlug(region: string): string {
  return region.replace(/-/g, '_');
}
