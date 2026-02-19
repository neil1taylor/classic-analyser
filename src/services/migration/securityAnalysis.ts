import type { SecurityAssessment, MigrationPreferences } from '@/types/migration';

function str(item: unknown, key: string): string {
  return String((item as Record<string, unknown>)[key] ?? '');
}

export function analyzeSecurity(
  collectedData: Record<string, unknown[]>,
  _preferences: MigrationPreferences,
): SecurityAssessment {
  const securityGroups = collectedData['securityGroups'] ?? [];
  const securityGroupRules = collectedData['securityGroupRules'] ?? [];
  const sslCertificates = collectedData['sslCertificates'] ?? [];
  const sshKeys = collectedData['sshKeys'] ?? [];

  // Security groups — can be migrated to VPC security groups
  const existingRules = securityGroupRules.length;
  const sgNotes: string[] = [];
  if (securityGroups.length > 0) {
    sgNotes.push(`${securityGroups.length} existing security group(s) can be mapped to VPC security groups`);
  }
  // VPC allows up to 5 security groups per interface and 25 rules per group
  const vpcGroupsNeeded = Math.max(securityGroups.length, 1);
  if (existingRules > vpcGroupsNeeded * 25) {
    sgNotes.push('Rule count exceeds 25 per group — will need to split across multiple security groups');
  }

  // Certificate assessment
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  let expiringSoon = 0;
  let expired = 0;
  const certNotes: string[] = [];

  for (const cert of sslCertificates) {
    const endStr = str(cert, 'validityEnd');
    if (endStr) {
      const endDate = new Date(endStr);
      if (endDate < now) {
        expired++;
      } else if (endDate.getTime() - now.getTime() < thirtyDays) {
        expiringSoon++;
      }
    }
  }

  if (expired > 0) certNotes.push(`${expired} certificate(s) already expired — renew before migration`);
  if (expiringSoon > 0) certNotes.push(`${expiringSoon} certificate(s) expiring within 30 days`);
  if (sslCertificates.length > 0) {
    certNotes.push('Import certificates to IBM Secrets Manager for use with VPC load balancers');
  }

  // SSH keys — direct migration
  const keyNotes: string[] = [];
  if (sshKeys.length > 0) {
    keyNotes.push(`${sshKeys.length} SSH key(s) can be imported directly into VPC`);
  }

  // Score
  let score = 90;
  if (expired > 0) score -= 15;
  if (expiringSoon > 0) score -= 5;
  if (existingRules > 50) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const recommendations: string[] = [];
  if (expired > 0) recommendations.push('Renew expired SSL certificates before migration');
  if (sslCertificates.length > 0) recommendations.push('Set up IBM Secrets Manager for certificate management in VPC');
  recommendations.push('Import SSH keys to VPC before provisioning instances');
  if (securityGroups.length > 0) recommendations.push('Recreate security group rules in VPC security groups');

  return {
    securityGroups: {
      existingGroups: securityGroups.length,
      existingRules,
      vpcGroupsNeeded,
      notes: sgNotes,
    },
    certificates: {
      total: sslCertificates.length,
      expiringSoon,
      expired,
      notes: certNotes,
    },
    sshKeys: {
      total: sshKeys.length,
      notes: keyNotes,
    },
    score,
    recommendations,
  };
}
