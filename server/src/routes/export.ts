import { Router } from 'express';
import type { Request, Response } from 'express';
import { apiKeyMiddleware } from '../middleware/apiKey.js';
import { generateExcelExport } from '../services/export.js';
import type { CollectedData } from '../services/softlayer/types.js';
import logger from '../utils/logger.js';

const router = Router();

// Reverse map: frontend keys → backend CollectedData keys
// The frontend remaps keys via transform.ts RESOURCE_KEY_MAP before storing in context
const FRONTEND_TO_BACKEND_KEY: Record<string, string> = {
  virtualServers: 'virtualGuests',
  bareMetal: 'hardware',
  dnsDomains: 'domains',
  // Keys that are the same on both sides don't need mapping
};

function reverseMapKey(frontendKey: string): string {
  return FRONTEND_TO_BACKEND_KEY[frontendKey] ?? frontendKey;
}

function buildCollectedData(data: Record<string, unknown[]>): CollectedData {
  // Reverse-map frontend keys back to backend keys
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    mapped[reverseMapKey(key)] = value;
  }

  // Provide defaults for metadata fields that the frontend doesn't track
  const emptyArr: unknown[] = [];
  return {
    account: undefined,
    virtualGuests: (mapped.virtualGuests as CollectedData['virtualGuests']) ?? emptyArr,
    hardware: (mapped.hardware as CollectedData['hardware']) ?? emptyArr,
    dedicatedHosts: (mapped.dedicatedHosts as CollectedData['dedicatedHosts']) ?? emptyArr,
    placementGroups: (mapped.placementGroups as CollectedData['placementGroups']) ?? emptyArr,
    reservedCapacity: (mapped.reservedCapacity as CollectedData['reservedCapacity']) ?? emptyArr,
    imageTemplates: (mapped.imageTemplates as CollectedData['imageTemplates']) ?? emptyArr,
    vlans: (mapped.vlans as CollectedData['vlans']) ?? emptyArr,
    subnets: (mapped.subnets as CollectedData['subnets']) ?? emptyArr,
    gateways: (mapped.gateways as CollectedData['gateways']) ?? emptyArr,
    firewalls: (mapped.firewalls as CollectedData['firewalls']) ?? emptyArr,
    securityGroups: (mapped.securityGroups as CollectedData['securityGroups']) ?? emptyArr,
    loadBalancers: (mapped.loadBalancers as CollectedData['loadBalancers']) ?? emptyArr,
    vpnTunnels: (mapped.vpnTunnels as CollectedData['vpnTunnels']) ?? emptyArr,
    blockStorage: (mapped.blockStorage as CollectedData['blockStorage']) ?? emptyArr,
    fileStorage: (mapped.fileStorage as CollectedData['fileStorage']) ?? emptyArr,
    objectStorage: (mapped.objectStorage as CollectedData['objectStorage']) ?? emptyArr,
    sslCertificates: (mapped.sslCertificates as CollectedData['sslCertificates']) ?? emptyArr,
    sshKeys: (mapped.sshKeys as CollectedData['sshKeys']) ?? emptyArr,
    domains: (mapped.domains as CollectedData['domains']) ?? emptyArr,
    dnsRecords: (mapped.dnsRecords as CollectedData['dnsRecords']) ?? emptyArr,
    securityGroupRules: (mapped.securityGroupRules as CollectedData['securityGroupRules']) ?? emptyArr,
    billingItems: (mapped.billingItems as CollectedData['billingItems']) ?? emptyArr,
    users: (mapped.users as CollectedData['users']) ?? emptyArr,
    eventLog: (mapped.eventLog as CollectedData['eventLog']) ?? emptyArr,
    relationships: (mapped.relationships as CollectedData['relationships']) ?? emptyArr,
    vmwareInstances: mapped.vmwareInstances as CollectedData['vmwareInstances'],
    vmwareClusters: mapped.vmwareClusters as CollectedData['vmwareClusters'],
    vmwareHosts: mapped.vmwareHosts as CollectedData['vmwareHosts'],
    vmwareVlans: mapped.vmwareVlans as CollectedData['vmwareVlans'],
    vmwareSubnets: mapped.vmwareSubnets as CollectedData['vmwareSubnets'],
    directorSites: mapped.directorSites as CollectedData['directorSites'],
    pvdcs: mapped.pvdcs as CollectedData['pvdcs'],
    vcfClusters: mapped.vcfClusters as CollectedData['vcfClusters'],
    vdcs: mapped.vdcs as CollectedData['vdcs'],
    multitenantSites: mapped.multitenantSites as CollectedData['multitenantSites'],
    vmwareCrossReferences: mapped.vmwareCrossReferences as CollectedData['vmwareCrossReferences'],
    collectionTimestamp: new Date().toISOString(),
    collectionDurationMs: 0,
    errors: [],
  } as CollectedData;
}

router.post('/', apiKeyMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Frontend sends { data: Record<string, unknown[]>, accountName: string }
    const rawData = req.body.data ?? req.body;

    if (!rawData || typeof rawData !== 'object') {
      res.status(400).json({
        error: 'Invalid data',
        message: 'Request body must contain collected infrastructure data.',
      });
      return;
    }

    // If the data already has collectionTimestamp, it's a full CollectedData object (e.g. from import)
    // Otherwise, it's a flat Record<string, unknown[]> from the frontend context
    const collectedData: CollectedData = rawData.collectionTimestamp
      ? rawData as CollectedData
      : buildCollectedData(rawData as Record<string, unknown[]>);

    const accountName = (req.body.accountName as string) || collectedData.account?.companyName || 'Unknown';
    const sanitizedAccountName = accountName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `IBMClassic_Export_${dateStr}_${sanitizedAccountName}.xlsx`;

    logger.info('Generating XLSX export', {
      accountName: sanitizedAccountName,
      fileName,
    });

    const workbook = await generateExcelExport(collectedData, accountName);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store');

    await workbook.xlsx.write(res);
    res.end();

    logger.info('XLSX export completed', { fileName });
  } catch (err) {
    const error = err as Error;
    logger.error('Export failed', { message: error.message });
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Export failed',
        message: 'Failed to generate XLSX export.',
      });
    }
  }
});

export default router;
