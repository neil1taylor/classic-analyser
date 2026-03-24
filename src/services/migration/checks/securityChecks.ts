import type { CheckResult, PreRequisiteCheck, AffectedResource } from '@/types/migration';
import { evaluateCheck } from './checkUtils';

const SSL_CERT_EXPIRY: PreRequisiteCheck = {
  id: 'sec-ssl-expiry',
  name: 'SSL Certificate Expiry',
  category: 'security',
  description: 'SSL certificates expiring within 90 days should be renewed before or during migration to avoid service disruption.',
  threshold: '90 days',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-load-balancers#ssl-offloading',
  remediationSteps: [
    'Renew certificates that expire within 90 days before migration.',
    'Upload renewed certificates to IBM Certificate Manager or Secrets Manager.',
    'Update VPC load balancer listeners with the new certificates.',
  ],
};

const SSH_KEY_COMPAT: PreRequisiteCheck = {
  id: 'sec-ssh-key-compat',
  name: 'SSH Key Compatibility',
  category: 'security',
  description: 'Classic SSH keys can be directly imported into VPC. RSA and Ed25519 key types are supported.',
  docsUrl: 'https://cloud.ibm.com/docs/vpc?topic=vpc-ssh-keys',
  remediationSteps: [
    'Import existing SSH keys into VPC using the console or CLI.',
    'Verify key types are RSA (2048/4096) or Ed25519.',
  ],
};

const HSM_DETECTED: PreRequisiteCheck = {
  id: 'sec-hsm-detected',
  name: 'Hardware Security Module (HSM)',
  category: 'security',
  description: 'Hardware Security Module (HSM) devices detected on Classic infrastructure. VPC does not support dedicated HSM appliances — migrate to IBM Key Protect (FIPS 140-2 Level 3) or IBM Cloud Hyper Protect Crypto Services (FIPS 140-2 Level 4) for key management and cryptographic operations.',
  docsUrl: 'https://cloud.ibm.com/docs/key-protect',
  remediationSteps: [
    'Inventory all keys and cryptographic material stored on the HSM.',
    'Evaluate IBM Key Protect for standard key management needs.',
    'For FIPS 140-2 Level 4 requirements, use IBM Cloud Hyper Protect Crypto Services (dedicated HSM-backed).',
    'Plan key migration with zero-downtime key rotation strategy.',
  ],
};

export function runSecurityChecks(collectedData: Record<string, unknown[]>): CheckResult[] {
  const results: CheckResult[] = [];
  const certs = (collectedData['sslCertificates'] ?? []) as Record<string, unknown>[];
  const sshKeys = (collectedData['sshKeys'] ?? []) as Record<string, unknown>[];

  // SSL certificates expiring within 90 days
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  const expiringAffected: AffectedResource[] = [];

  for (const cert of certs) {
    const expDateStr = toStr(cert['validityEnd']) || toStr(cert['notAfter']) || toStr(cert['validDateEnd']);
    if (expDateStr) {
      const expDate = new Date(expDateStr).getTime();
      if (!Number.isNaN(expDate) && expDate - now < ninetyDays) {
        const daysLeft = Math.max(0, Math.round((expDate - now) / (24 * 60 * 60 * 1000)));
        expiringAffected.push({
          id: toNum(cert['id']),
          hostname: toStr(cert['commonName']) || toStr(cert['notes']) || `Cert ${toNum(cert['id'])}`,
          detail: daysLeft <= 0 ? 'Expired' : `Expires in ${daysLeft} days`,
        });
      }
    }
  }
  results.push(evaluateCheck(SSL_CERT_EXPIRY, 'warning', certs.length, expiringAffected));

  // SSH keys — always passed (direct import supported)
  results.push(evaluateCheck(SSH_KEY_COMPAT, 'passed', sshKeys.length, []));

  // HSM detection — check billing items and bare metal hostname/notes
  const billingItems = (collectedData['billingItems'] ?? []) as Record<string, unknown>[];
  const bms = (collectedData['bareMetal'] ?? collectedData['hardware'] ?? []) as Record<string, unknown>[];
  const hsmAffected: AffectedResource[] = [];
  const hsmSeenIds = new Set<number>();

  // Check billing items for HSM category codes or descriptions
  for (const item of billingItems) {
    const catCode = toStr(item['categoryCode']);
    const desc = toStr(item['description']);
    if (/security_module|hsm/i.test(catCode) || /\bhsm\b|hardware security module/i.test(desc)) {
      const id = toNum(item['id']);
      if (!hsmSeenIds.has(id)) {
        hsmSeenIds.add(id);
        hsmAffected.push({
          id,
          hostname: desc || `Billing item ${id}`,
          detail: `Billing category: ${catCode || 'unknown'} — ${desc || 'HSM detected'}`,
        });
      }
    }
  }

  // Check bare metal hostname and notes for HSM
  for (const bm of bms) {
    const hostname = toStr(bm['hostname']);
    const notes = toStr(bm['notes']);
    const tags = toStr(bm['tagReferences']);
    const combined = `${hostname} ${notes} ${tags}`;
    if (/\bhsm\b/i.test(combined)) {
      const id = toNum(bm['id']);
      if (!hsmSeenIds.has(id)) {
        hsmSeenIds.add(id);
        hsmAffected.push({
          id,
          hostname: hostname || `BM ${id}`,
          detail: 'Hostname/notes/tags contain "HSM"',
        });
      }
    }
  }

  const totalChecked = billingItems.length + bms.length;
  results.push(evaluateCheck(HSM_DETECTED, 'warning', totalChecked, hsmAffected));

  return results;
}

function toNum(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function toStr(val: unknown): string {
  return typeof val === 'string' ? val : '';
}
