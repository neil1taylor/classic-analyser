import { Client as SSHClient } from 'ssh2';
import type { SoftLayerClient } from './client.js';
import type { SLVirtualGuest, SLHardware, SLOperatingSystem } from './types.js';
import { ConcurrencyLimiter } from '../../utils/concurrency.js';
import logger from '../../utils/logger.js';

export interface DiskUtilization {
  mountPoint: string;
  totalGB: number;
  usedGB: number;
  availableGB: number;
  usedPercent: number;
}

export type DiskUtilStatus =
  | 'collected'
  | 'unavailable'
  | 'timeout'
  | 'auth_failed'
  | 'unsupported_os'
  | 'skipped'
  | 'no_credentials'
  | 'no_ip';

export interface DiskUtilResult {
  utilization: DiskUtilization[];
  status: DiskUtilStatus;
  totalGB: number;
  usedGB: number;
  usedPercent: number;
}

type OsFamily = 'linux' | 'windows' | 'unknown';

const LINUX_OS_PATTERNS = [
  'linux', 'centos', 'red hat', 'redhat', 'rhel', 'ubuntu', 'debian',
  'suse', 'sles', 'rocky', 'alma', 'cloudlinux', 'coreos', 'fedora',
  'oracle linux',
];

const SSH_CONNECT_TIMEOUT_MS = 5000;
const SSH_COMMAND_TIMEOUT_MS = 5000;
const SSH_CONCURRENCY = 5;

export function detectOsFamily(operatingSystem?: SLOperatingSystem): OsFamily {
  const name = operatingSystem?.softwareDescription?.name?.toLowerCase() ?? '';
  if (!name) return 'unknown';

  for (const pattern of LINUX_OS_PATTERNS) {
    if (name.includes(pattern)) return 'linux';
  }
  if (name.includes('windows')) return 'windows';
  return 'unknown';
}

interface OsCredential {
  username: string;
  password: string;
  port: number;
}

export async function fetchOsCredentials(
  client: SoftLayerClient,
  machines: Array<{ id: number; type: 'vsi' | 'bm' }>,
): Promise<Map<number, OsCredential>> {
  const credentialMap = new Map<number, OsCredential>();
  const limiter = new ConcurrencyLimiter(SSH_CONCURRENCY);
  const mask = 'mask[operatingSystem[passwords[username,password,port]]]';

  await Promise.all(
    machines.map(machine =>
      limiter.run(async () => {
        try {
          const service = machine.type === 'vsi'
            ? 'SoftLayer_Virtual_Guest'
            : 'SoftLayer_Hardware_Server';

          const result = await client.request<{
            operatingSystem?: {
              passwords?: Array<{ username?: string; password?: string; port?: number }>;
            };
          }>({
            service,
            method: 'getObject',
            resourceId: machine.id,
            objectMask: mask,
          });

          const passwords = result?.operatingSystem?.passwords;
          if (passwords && passwords.length > 0) {
            // Prefer root/Administrator, fall back to first entry
            const rootCred = passwords.find(p =>
              p.username?.toLowerCase() === 'root' || p.username?.toLowerCase() === 'administrator'
            ) ?? passwords[0];

            if (rootCred.username && rootCred.password) {
              credentialMap.set(machine.id, {
                username: rootCred.username,
                password: rootCred.password,
                port: rootCred.port ?? 22,
              });
            }
          }
        } catch {
          // Silently skip — credential fetch failures are expected
          logger.debug('Could not fetch credentials for machine', {
            id: machine.id,
            type: machine.type,
          });
        }
      })
    )
  );

  return credentialMap;
}

function sshRunCommand(host: string, port: number, username: string, password: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();
    let output = '';
    let settled = false;

    const commandTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        conn.end();
        reject(new Error('SSH command timeout'));
      }
    }, SSH_COMMAND_TIMEOUT_MS);

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(commandTimer);
          settled = true;
          conn.end();
          reject(err);
          return;
        }

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });
        stream.stderr.on('data', () => {
          // Ignore stderr
        });
        stream.on('close', () => {
          clearTimeout(commandTimer);
          if (!settled) {
            settled = true;
            conn.end();
            resolve(output);
          }
        });
      });
    });

    conn.on('error', (err: Error) => {
      clearTimeout(commandTimer);
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    conn.connect({
      host,
      port,
      username,
      password,
      readyTimeout: SSH_CONNECT_TIMEOUT_MS,
      // Accept any host key — we're connecting to inventory machines, not verifying identity
      hostVerifier: () => true,
    });
  });
}

export function parseDfOutput(stdout: string): DiskUtilization[] {
  const lines = stdout.trim().split('\n');
  const results: DiskUtilization[] = [];

  for (const line of lines) {
    // POSIX df -P format: Filesystem 1G-blocks Used Available Capacity Mounted_on
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) continue;

    // Skip pseudo-filesystems
    const filesystem = parts[0];
    if (filesystem === 'tmpfs' || filesystem === 'devtmpfs' || filesystem.startsWith('overlay')) continue;

    const totalGB = parseInt(parts[1], 10);
    const usedGB = parseInt(parts[2], 10);
    const availableGB = parseInt(parts[3], 10);
    const mountPoint = parts[5];

    if (isNaN(totalGB) || totalGB === 0) continue;

    const usedPercent = Math.round((usedGB / totalGB) * 100);
    results.push({ mountPoint, totalGB, usedGB, availableGB, usedPercent });
  }

  return results;
}

export function parsePowershellOutput(stdout: string): DiskUtilization[] {
  const results: DiskUtilization[] = [];

  try {
    const parsed = JSON.parse(stdout);
    const disks = Array.isArray(parsed) ? parsed : [parsed];

    for (const disk of disks) {
      const totalBytes = Number(disk.Size);
      const freeBytes = Number(disk.FreeSpace);
      if (!totalBytes || totalBytes === 0) continue;

      const totalGB = Math.round(totalBytes / (1024 * 1024 * 1024));
      const usedGB = Math.round((totalBytes - freeBytes) / (1024 * 1024 * 1024));
      const availableGB = Math.round(freeBytes / (1024 * 1024 * 1024));
      const usedPercent = Math.round(((totalBytes - freeBytes) / totalBytes) * 100);

      results.push({
        mountPoint: disk.DeviceID ?? 'Unknown',
        totalGB,
        usedGB,
        availableGB,
        usedPercent,
      });
    }
  } catch {
    // Unparseable output
  }

  return results;
}

// SSH commands are hardcoded strings — no user input, no injection risk
const LINUX_DF_COMMAND = 'df -P --block-size=1G | tail -n +2';
const WINDOWS_DISK_COMMAND = 'powershell -Command "Get-WmiObject Win32_LogicalDisk | Select-Object DeviceID,Size,FreeSpace | ConvertTo-Json"';

async function collectSingleMachine(
  host: string,
  port: number,
  username: string,
  password: string,
  osFamily: OsFamily,
): Promise<DiskUtilResult> {
  const command = osFamily === 'linux' ? LINUX_DF_COMMAND : WINDOWS_DISK_COMMAND;

  const stdout = await sshRunCommand(host, port, username, password, command);

  const utilization = osFamily === 'linux'
    ? parseDfOutput(stdout)
    : parsePowershellOutput(stdout);

  if (utilization.length === 0) {
    return { utilization: [], status: 'unavailable', totalGB: 0, usedGB: 0, usedPercent: 0 };
  }

  const totalGB = utilization.reduce((sum, d) => sum + d.totalGB, 0);
  const usedGB = utilization.reduce((sum, d) => sum + d.usedGB, 0);
  const usedPercent = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;

  return { utilization, status: 'collected', totalGB, usedGB, usedPercent };
}

export interface MachineInfo {
  id: number;
  type: 'vsi' | 'bm';
  primaryBackendIpAddress?: string;
  operatingSystem?: SLOperatingSystem;
}

export async function collectDiskUtilization(
  client: SoftLayerClient,
  machines: MachineInfo[],
  onProgress?: (completed: number, total: number) => void,
): Promise<Map<number, DiskUtilResult>> {
  const resultMap = new Map<number, DiskUtilResult>();
  const total = machines.length;

  // Determine which machines are eligible
  const eligible: Array<MachineInfo & { osFamily: OsFamily }> = [];
  for (const machine of machines) {
    const osFamily = detectOsFamily(machine.operatingSystem);
    if (osFamily === 'unknown') {
      resultMap.set(machine.id, {
        utilization: [], status: 'unsupported_os', totalGB: 0, usedGB: 0, usedPercent: 0,
      });
      continue;
    }
    if (!machine.primaryBackendIpAddress) {
      resultMap.set(machine.id, {
        utilization: [], status: 'no_ip', totalGB: 0, usedGB: 0, usedPercent: 0,
      });
      continue;
    }
    eligible.push({ ...machine, osFamily });
  }

  if (eligible.length === 0) {
    onProgress?.(total, total);
    return resultMap;
  }

  // Fetch credentials for eligible machines
  logger.info('Fetching OS credentials for disk utilization', { machineCount: eligible.length });
  const credentials = await fetchOsCredentials(
    client,
    eligible.map(m => ({ id: m.id, type: m.type })),
  );

  // SSH into each machine
  const limiter = new ConcurrencyLimiter(SSH_CONCURRENCY);
  let completed = resultMap.size; // already have results for ineligible machines

  await Promise.all(
    eligible.map(machine =>
      limiter.run(async () => {
        const cred = credentials.get(machine.id);
        if (!cred) {
          resultMap.set(machine.id, {
            utilization: [], status: 'no_credentials', totalGB: 0, usedGB: 0, usedPercent: 0,
          });
        } else {
          try {
            const result = await collectSingleMachine(
              machine.primaryBackendIpAddress!,
              cred.port,
              cred.username,
              cred.password,
              machine.osFamily,
            );
            resultMap.set(machine.id, result);
          } catch (err) {
            const error = err as Error;
            const status: DiskUtilStatus = error.message.includes('timeout')
              ? 'timeout'
              : error.message.includes('Authentication') || error.message.includes('auth')
                ? 'auth_failed'
                : 'unavailable';
            resultMap.set(machine.id, {
              utilization: [], status, totalGB: 0, usedGB: 0, usedPercent: 0,
            });
          }
        }

        completed++;
        onProgress?.(completed, total);
      })
    )
  );

  // Clear credential references — defense-in-depth
  credentials.clear();

  logger.info('Disk utilization collection complete', {
    total: machines.length,
    collected: Array.from(resultMap.values()).filter(r => r.status === 'collected').length,
    unavailable: Array.from(resultMap.values()).filter(r => r.status !== 'collected').length,
  });

  return resultMap;
}

/**
 * Merge disk utilization results into VSI/BM objects.
 * Attaches _diskUtil* fields for frontend consumption.
 * NEVER attaches credentials.
 */
export function mergeDiskUtilization(
  machines: Array<SLVirtualGuest | SLHardware>,
  results: Map<number, DiskUtilResult>,
): void {
  for (const machine of machines) {
    if (!machine.id) continue;
    const result = results.get(machine.id);
    if (result) {
      const m = machine as Record<string, unknown>;
      m._diskUtilization = result.utilization;
      m._diskUtilTotalGB = result.totalGB;
      m._diskUtilUsedGB = result.usedGB;
      m._diskUtilUsedPercent = result.usedPercent;
      m._diskUtilStatus = result.status;
    }
  }
}
