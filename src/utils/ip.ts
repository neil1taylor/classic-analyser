/**
 * Compute subnet fields (gateway, broadcast, IP counts) from network identifier and CIDR.
 */
export function computeSubnetFields(
  networkIdentifier: string,
  cidr: number,
): { gateway: string; broadcastAddress: string; usableIpAddressCount: number; totalIpAddresses: number } {
  const octets = networkIdentifier.split('.').map(Number);
  const ip = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  const size = 1 << (32 - cidr);
  const network = ip;
  const broadcast = (network + size - 1) >>> 0;
  const gateway = (network + 1) >>> 0;

  const toStr = (n: number) =>
    `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`;

  return {
    gateway: toStr(gateway),
    broadcastAddress: toStr(broadcast),
    totalIpAddresses: size,
    usableIpAddressCount: Math.max(size - 3, 0),
  };
}
