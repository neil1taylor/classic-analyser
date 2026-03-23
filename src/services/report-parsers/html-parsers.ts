import type { ReportParserResult } from './types';
import type { AccountInfo } from '@/types/resources';
import { createLogger } from '@/utils/logger';

const log = createLogger('ReportHTML');

/**
 * Parse the warnings HTML ({id}.html).
 * Extracts embedded JS arrays: `var Baremetalservers = [...]` and `var Storage = [...]`
 * Also extracts account info from the page header.
 */
export function parseWarningsHtml(text: string): ReportParserResult {
  const accountInfo = extractAccountInfoFromHeader(text);
  const data: Record<string, unknown[]> = {};

  // Extract JS arrays like: var Baremetalservers = [{id: "1537377", name: "...", ...}];
  const varPattern = /var\s+(\w+)\s*=\s*\[([\s\S]*?)\];/g;
  const warningSummaries: unknown[] = [];

  let match;
  while ((match = varPattern.exec(text)) !== null) {
    const varName = match[1];
    const arrayContent = match[2].trim();

    if (!arrayContent) continue;

    // The JS objects use unquoted keys — convert to valid JSON
    const jsonStr = '[' + arrayContent.replace(/(\w+)\s*:/g, '"$1":') + ']';

    try {
      const items = JSON.parse(jsonStr);
      log.info(`Extracted ${items.length} items from var ${varName}`);

      // Add resourceType to each warning summary
      for (const item of items) {
        item.resourceType = varName;
        warningSummaries.push(item);
      }
    } catch (err) {
      log.warn(`Failed to parse var ${varName}:`, err);
    }
  }

  if (warningSummaries.length > 0) {
    data.reportWarningSummaries = warningSummaries;
  }

  return { data, accountInfo };
}

/**
 * Parse the overview HTML ({id}_overview.html).
 * Extracts Chart.js data (datacenter distributions, cost breakdown) and account info.
 */
export function parseOverviewHtml(text: string): ReportParserResult {
  const accountInfo = extractAccountInfoFromHeader(text);
  const data: Record<string, unknown[]> = {};

  // Extract Chart.js chart data
  const chartPattern = /new\s+Chart\(\$\("#(\w+)"\),\s*\{[\s\S]*?text:\s*'([^']+)'[\s\S]*?labels:\s*\[([^\]]*)\][\s\S]*?data:\s*\[([^\]]*)\][\s\S]*?\}\)\);/g;

  const distributions: unknown[] = [];
  const costs: unknown[] = [];

  let match;
  while ((match = chartPattern.exec(text)) !== null) {
    const chartId = match[1];
    const title = match[2];
    const labelsStr = match[3];
    const dataStr = match[4];

    const labels = labelsStr.split(',').map(s => s.trim().replace(/"/g, '').replace(/'/g, '')).filter(Boolean);
    const values = dataStr.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (chartId === 'mrr_chart') {
      // Cost breakdown
      for (let i = 0; i < labels.length && i < values.length; i++) {
        costs.push({ category: labels[i], monthlyCost: values[i] });
      }
    } else if (chartId !== 'Legend') {
      // Resource distribution by datacenter
      const totalMatch = title.match(/\((\d[\d,]*)\s*(?:GB)?\)/);
      distributions.push({
        chartId,
        title,
        total: totalMatch ? parseInt(totalMatch[1].replace(/,/g, '')) : 0,
        distribution: Object.fromEntries(
          labels.map((label, i) => [label, values[i] || 0])
        ),
      });
    }
  }

  if (distributions.length > 0) {
    data.reportDistributions = distributions;
  }
  if (costs.length > 0) {
    data.reportCosts = costs;
  }

  // Extract recurring cost from account info table
  const costMatch = text.match(/Recurring Costs[\s\S]*?\$([\d,]+\.?\d*)/);
  if (costMatch && accountInfo) {
    (accountInfo as Record<string, unknown>).recurringCost = parseFloat(costMatch[1].replace(/,/g, ''));
  }

  return { data, accountInfo };
}

/**
 * Parse the summary HTML ({id}_summary.html).
 * Extracts: Resources Analyzed table, Summary of Warnings, Checks Performed.
 */
export function parseSummaryHtml(text: string): ReportParserResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  const data: Record<string, unknown[]> = {};
  const accountInfo = extractAccountInfoFromHeader(text);

  // Extract VRF status
  if (text.includes('VRF enabled') && accountInfo) {
    (accountInfo as Record<string, unknown>).vrfEnabled = true;
  }

  const tables = doc.querySelectorAll('table');

  // Table 1: Resources Analyzed
  if (tables.length >= 1) {
    const resourceCounts = parseHtmlTable(tables[0]);
    if (resourceCounts.length > 0) {
      data.reportResourceCounts = resourceCounts.map(row => ({
        resource: row['Resource'],
        total: Number(row['Total']) || 0,
        warned: Number(row['Warned']) || 0,
        count: Number(row['Count']) || 0,
        critical: Number(row['Critical']) || 0,
        important: Number(row['Important']) || 0,
        warnings: Number(row['Warnings']) || 0,
      }));
    }
  }

  // Table 2: Summary of Warnings
  if (tables.length >= 2) {
    const warningSummary = parseHtmlTable(tables[1]);
    if (warningSummary.length > 0) {
      data.reportWarningSummary = warningSummary.map(row => ({
        warning: row['Warning'],
        resource: row['Resource'],
        issue: row['Issue'],
        priority: row['Priority'],
        count: Number(row['Count']) || 0,
      }));
    }
  }

  // Table 3: Checks Performed
  if (tables.length >= 3) {
    const checks = parseChecksTable(tables[2]);
    if (checks.length > 0) {
      data.reportChecks = checks;
    }
  }

  log.info(`Parsed summary: ${data.reportResourceCounts?.length || 0} resource types, ${data.reportChecks?.length || 0} checks`);

  return { data, accountInfo };
}

/**
 * Parse the inventory HTML ({id}_inventory.html).
 * This is the richest data source — extracts full resource inventory from
 * nested <li><b>key</b>: value tree structures.
 */
export function parseInventoryHtml(text: string): ReportParserResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  const data: Record<string, unknown[]> = {};

  // Account info from the header table
  const accountInfo = extractAccountInfoFromInventory(doc);

  // The inventory uses nested <ul> / <li> with <span class="caret"> for sections.
  // Top-level sections represent resource instances.
  // We look for all top-level <span class="caret"> elements and parse their subtrees.

  const allCarets = doc.querySelectorAll('span.caret');
  const bareMetals: unknown[] = [];
  const virtualServers: unknown[] = [];
  const vlans: unknown[] = [];
  const gateways: unknown[] = [];
  const storageDevices: unknown[] = [];
  const securityGroups: unknown[] = [];

  for (const caret of allCarets) {
    const label = caret.textContent?.trim() || '';
    const li = caret.closest('li');
    if (!li) continue;

    const nestedUl = li.querySelector(':scope > ul.nested');
    if (!nestedUl) continue;

    // Parse the key-value tree under this caret
    const obj = parseNestedList(nestedUl);

    // Classify by examining properties or caret context
    if (obj.id === undefined && obj.accountId === undefined) continue;

    // Determine resource type from properties
    if (obj.processorPhysicalCoreAmount !== undefined || obj.hardwareStatus !== undefined) {
      bareMetals.push(normalizeBareMetalFromInventory(obj, label));
    } else if (obj.maxCpu !== undefined || obj.startCpus !== undefined) {
      virtualServers.push(normalizeVsiFromInventory(obj, label));
    } else if (obj.vlanNumber !== undefined) {
      vlans.push(normalizeVlanFromInventory(obj, label));
    } else if (obj.networkSpace !== undefined && obj.members !== undefined) {
      gateways.push(normalizeGatewayFromInventory(obj, label));
    } else if (obj.capacityGb !== undefined || obj.nasType !== undefined) {
      storageDevices.push(normalizeStorageFromInventory(obj, label));
    } else if (
      label.toLowerCase().includes('security group') ||
      obj.rules !== undefined
    ) {
      securityGroups.push(normalizeSecurityGroupFromInventory(obj, label));
    }
  }

  if (bareMetals.length > 0) data.bareMetal = bareMetals;
  if (virtualServers.length > 0) data.virtualServers = virtualServers;
  if (vlans.length > 0) data.vlans = vlans;
  if (gateways.length > 0) data.gateways = gateways;
  if (storageDevices.length > 0) data.fileStorage = storageDevices;
  if (securityGroups.length > 0) data.securityGroups = securityGroups;

  const total = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
  log.info(`Parsed inventory: ${total} resources across ${Object.keys(data).length} types`);

  return { data, accountInfo };
}

// --- Helpers ---

function extractAccountInfoFromHeader(text: string): Partial<AccountInfo> | undefined {
  const info: Partial<AccountInfo> = {};

  // Account name: in <h5> tag text before the account ID
  const nameMatch = text.match(
    /font-weight-normal[^>]*text-center[^>]*>([^<]+)<p[^>]*text-center[^>]*>(\d+)<\/p>/
  );
  if (nameMatch) {
    info.companyName = nameMatch[1].trim();
    info.id = parseInt(nameMatch[2]);
  }

  // Fallback: look for standalone patterns
  if (!info.companyName) {
    const companyMatch = text.match(/<h[2-5][^>]*>([^<]+)<\/h[2-5]>\s*<span[^>]*>Account\s+(\d+)/);
    if (companyMatch) {
      info.companyName = companyMatch[1].trim();
      info.id = parseInt(companyMatch[2]);
    }
  }

  if (!info.id) {
    const idMatch = text.match(/Account\s+(\d+)/);
    if (idMatch) info.id = parseInt(idMatch[1]);
  }

  // Owner
  const ownerMatch = text.match(/<b>Owner<\/b>[\s\S]*?<li>([^<]+)/);
  if (ownerMatch) {
    const ownerParts = ownerMatch[1].trim().split(',');
    const nameParts = ownerParts[0].trim().split(/\s+/);
    info.firstName = nameParts[0];
    info.lastName = nameParts.slice(1).join(' ');
    if (ownerParts[1]) {
      info.email = ownerParts[1].trim();
    }
  }

  return Object.keys(info).length > 0 ? info : undefined;
}

function extractAccountInfoFromInventory(doc: Document): Partial<AccountInfo> | undefined {
  const info: Partial<AccountInfo> = {};

  // Look for account properties table
  const bTags = doc.querySelectorAll('b');
  for (const b of bTags) {
    const key = b.textContent?.trim().replace(/:$/, '');
    const parent = b.parentElement;
    if (!parent) continue;

    const text = parent.textContent?.replace(b.textContent || '', '').trim().replace(/^:\s*/, '');

    if (key === 'companyName' && text) info.companyName = text;
    if (key === 'id' && text && !info.id) info.id = parseInt(text);
    if (key === 'email' && text) info.email = text;
  }

  return Object.keys(info).length > 0 ? info : undefined;
}

function parseHtmlTable(table: Element): Record<string, string>[] {
  const rows = table.querySelectorAll('tr');
  if (rows.length < 2) return [];

  // Extract headers from first row
  const headerCells = rows[0].querySelectorAll('td, th');
  const headers = Array.from(headerCells).map(cell => cell.textContent?.trim() || '');

  const results: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('td');
    const obj: Record<string, string> = {};
    let hasValue = false;

    for (let j = 0; j < headers.length && j < cells.length; j++) {
      const value = cells[j].textContent?.trim() || '';
      if (headers[j]) {
        obj[headers[j]] = value;
        if (value) hasValue = true;
      }
    }

    if (hasValue) results.push(obj);
  }

  return results;
}

function parseChecksTable(table: Element): unknown[] {
  const rows = table.querySelectorAll('tr');
  const checks: unknown[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('td');
    if (cells.length < 4) continue;

    const checkText = cells[3].textContent?.trim() || '';
    const parts = checkText.split(/\bRecommendation:\s*/);
    const check = parts[0]?.trim();
    let recommendation = parts[1]?.trim() || '';

    // Also extract Rational/Rationale if present
    const rationalMatch = recommendation.match(/\s*(?:Rational|Rationale):\s*(.*)/s);
    let rationale = '';
    if (rationalMatch) {
      recommendation = recommendation.replace(rationalMatch[0], '').trim();
      rationale = rationalMatch[1].trim();
    }

    checks.push({
      priority: cells[0].textContent?.trim() || '',
      issue: cells[1].textContent?.trim() || '',
      type: cells[2].textContent?.trim() || '',
      check,
      recommendation,
      rationale,
    });
  }

  return checks;
}

/**
 * Recursively parse a nested <ul>/<li> structure into an object.
 * Handles: <li><b>key</b>: value</li>
 *   and:   <li><span class="caret">[N]</span><ul class="nested">...</ul></li>
 */
function parseNestedList(ul: Element): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  for (const li of ul.children) {
    if (li.tagName !== 'LI') continue;

    const bold = li.querySelector(':scope > b');
    const nestedUl = li.querySelector(':scope > ul.nested');

    if (bold) {
      const key = bold.textContent?.trim().replace(/:$/, '') || '';
      if (!key) continue;

      if (nestedUl) {
        // Check if this is an array (caret says [N])
        const caret = li.querySelector(':scope > span.caret');
        if (caret) {
          const arrayMatch = caret.textContent?.match(/\[(\d+)\]/);
          if (arrayMatch) {
            // This is an array — parse children as indexed objects
            obj[key] = parseNestedListAsArray(nestedUl);
          } else {
            obj[key] = parseNestedList(nestedUl);
          }
        } else {
          obj[key] = parseNestedList(nestedUl);
        }
      } else {
        // Simple key: value — extract text after the <b> tag
        const text = li.textContent?.replace(bold.textContent || '', '').trim().replace(/^:\s*/, '') || '';
        // Try numeric conversion
        if (text !== '' && !isNaN(Number(text))) {
          obj[key] = Number(text);
        } else if (text.toLowerCase() === 'true') {
          obj[key] = true;
        } else if (text.toLowerCase() === 'false') {
          obj[key] = false;
        } else {
          obj[key] = text;
        }
      }
    }
  }

  return obj;
}

function parseNestedListAsArray(ul: Element): unknown[] {
  const items: unknown[] = [];

  for (const li of ul.children) {
    if (li.tagName !== 'LI') continue;
    const nestedUl = li.querySelector(':scope > ul.nested');
    if (nestedUl) {
      items.push(parseNestedList(nestedUl));
    }
  }

  return items;
}

function normalizeBareMetalFromInventory(
  obj: Record<string, unknown>,
  _label: string
): Record<string, unknown> {
  const datacenter = typeof obj.datacenter === 'object' && obj.datacenter
    ? (obj.datacenter as Record<string, unknown>).name
    : obj.datacenter;

  const os = typeof obj.operatingSystem === 'object' && obj.operatingSystem
    ? extractDeepValue(obj.operatingSystem as Record<string, unknown>, 'longDescription')
    : undefined;

  return {
    id: obj.id,
    hostname: obj.hostname || obj.fullyQualifiedDomainName,
    domain: obj.domain,
    primaryIpAddress: obj.primaryIpAddress,
    primaryBackendIpAddress: obj.primaryBackendIpAddress,
    processorPhysicalCoreAmount: obj.processorPhysicalCoreAmount,
    memoryCapacity: obj.memoryCapacity,
    datacenter: datacenter || '',
    operatingSystemReferenceCode: os || '',
    hardwareStatusId: obj.hardwareStatusId,
    provisionDate: obj.provisionDate,
    notes: obj.notes,
  };
}

function normalizeVsiFromInventory(
  obj: Record<string, unknown>,
  _label: string
): Record<string, unknown> {
  const datacenter = typeof obj.datacenter === 'object' && obj.datacenter
    ? (obj.datacenter as Record<string, unknown>).name
    : obj.datacenter;

  const os = typeof obj.operatingSystem === 'object' && obj.operatingSystem
    ? extractDeepValue(obj.operatingSystem as Record<string, unknown>, 'longDescription')
    : undefined;

  return {
    id: obj.id,
    hostname: obj.hostname || obj.fullyQualifiedDomainName,
    domain: obj.domain,
    primaryIpAddress: obj.primaryIpAddress,
    primaryBackendIpAddress: obj.primaryBackendIpAddress,
    maxCpu: obj.maxCpu || obj.startCpus,
    maxMemory: obj.maxMemory,
    datacenter: datacenter || '',
    operatingSystemReferenceCode: os || '',
    dedicatedHost: obj.dedicatedHost,
    localDiskFlag: obj.localDiskFlag,
    notes: obj.notes,
  };
}

function normalizeVlanFromInventory(
  obj: Record<string, unknown>,
  _label: string
): Record<string, unknown> {
  const datacenter = typeof obj.primaryRouter === 'object' && obj.primaryRouter
    ? (obj.primaryRouter as Record<string, unknown>).datacenter
    : undefined;
  const dcName = typeof datacenter === 'object' && datacenter
    ? (datacenter as Record<string, unknown>).name
    : datacenter;

  return {
    id: obj.id,
    vlanNumber: obj.vlanNumber,
    name: obj.name,
    datacenter: dcName || '',
    networkSpace: obj.networkSpace,
    subnetCount: obj.subnetCount,
  };
}

function normalizeGatewayFromInventory(
  obj: Record<string, unknown>,
  _label: string
): Record<string, unknown> {
  return {
    id: obj.id,
    name: obj.name,
    networkSpace: obj.networkSpace,
    publicIpAddress: obj.publicIpAddress,
    privateIpAddress: obj.privateIpAddress,
    status: obj.status,
  };
}

function normalizeStorageFromInventory(
  obj: Record<string, unknown>,
  _label: string
): Record<string, unknown> {
  return {
    id: obj.id,
    hostname: obj.hostname || obj.nasType,
    datacenter: typeof obj.serviceResource === 'object' && obj.serviceResource
      ? (obj.serviceResource as Record<string, unknown>).datacenter
      : '',
    nasType: obj.nasType,
    storageType: obj.storageType,
    capacityGb: obj.capacityGb,
    totalBytesUsed: obj.totalBytesUsed,
    iops: obj.provisionedIops || obj.iops,
    notes: obj.notes,
  };
}

function normalizeSecurityGroupFromInventory(
  obj: Record<string, unknown>,
  _label: string
): Record<string, unknown> {
  return {
    id: obj.id,
    name: obj.name,
    description: obj.description,
    rules: obj.rules,
  };
}

/**
 * Recursively search an object for a key and return its value.
 */
function extractDeepValue(obj: Record<string, unknown>, targetKey: string): unknown {
  if (obj[targetKey] !== undefined) return obj[targetKey];
  for (const val of Object.values(obj)) {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      const found = extractDeepValue(val as Record<string, unknown>, targetKey);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}
