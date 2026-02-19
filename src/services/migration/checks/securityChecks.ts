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
