import type { PreReqCheckResults } from '@/types/migration';
import type { AccountInfo } from '@/types/resources';
import { runComputeChecks } from './computeChecks';
import { runStorageChecks } from './storageChecks';
import { runNetworkChecks } from './networkChecks';
import { runSecurityChecks } from './securityChecks';

export function runAllPreReqChecks(collectedData: Record<string, unknown[]>, accountInfo?: AccountInfo): PreReqCheckResults {
  return {
    compute: runComputeChecks(collectedData),
    storage: runStorageChecks(collectedData),
    network: runNetworkChecks(collectedData, accountInfo),
    security: runSecurityChecks(collectedData),
  };
}

export { runComputeChecks, runStorageChecks, runNetworkChecks, runSecurityChecks };
