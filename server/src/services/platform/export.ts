import type { Worksheet } from 'exceljs';
import logger from '../../utils/logger.js';

async function getExcelJS() {
  return (await import('exceljs')).default;
}

function addHeaderStyle(worksheet: Worksheet): void {
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F62FE' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 24;
}

function autoWidth(worksheet: Worksheet): void {
  worksheet.columns.forEach((col) => {
    let maxLen = (col.header?.toString().length ?? 10) + 2;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value?.toString().length ?? 0;
      if (len > maxLen) maxLen = Math.min(len, 60);
    });
    col.width = maxLen + 2;
  });
}

interface PlatformExportData {
  data: Record<string, unknown[]>;
  accountName?: string;
}

export async function generatePlatformExcelExport(exportData: PlatformExportData) {
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IBM Platform Services Explorer';
  workbook.created = new Date();

  const { data, accountName } = exportData;

  // Summary sheet
  const wsSummary = workbook.addWorksheet('Summary');
  wsSummary.columns = [
    { header: 'Property', key: 'property', width: 25 },
    { header: 'Value', key: 'value', width: 40 },
  ];
  addHeaderStyle(wsSummary);

  const summaryRows = [
    { property: 'Account', value: accountName ?? 'N/A' },
    { property: 'Export Date', value: new Date().toISOString() },
    { property: 'Service Instances', value: data.serviceInstances?.length ?? 0 },
  ];

  for (const row of summaryRows) {
    wsSummary.addRow(row);
  }
  autoWidth(wsSummary);

  // sServiceInstances worksheet
  const wsInstances = workbook.addWorksheet('sServiceInstances');
  wsInstances.columns = [
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Service', key: '_serviceType', width: 28 },
    { header: 'Category', key: '_serviceCategory', width: 16 },
    { header: 'State', key: 'state', width: 12 },
    { header: 'Location', key: 'location', width: 16 },
    { header: 'Resource Group', key: '_resourceGroupName', width: 25 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Created', key: 'created_at', width: 22 },
    { header: 'Updated', key: 'updated_at', width: 22 },
    { header: 'GUID', key: 'guid', width: 36 },
    { header: 'CRN', key: 'crn', width: 80 },
  ];
  addHeaderStyle(wsInstances);

  for (const item of (data.serviceInstances ?? []) as Record<string, unknown>[]) {
    wsInstances.addRow({
      name: item.name ?? '',
      _serviceType: item._serviceType ?? '',
      _serviceCategory: item._serviceCategory ?? '',
      state: item.state ?? '',
      location: item.location ?? '',
      _resourceGroupName: item._resourceGroupName ?? item.resource_group_id ?? '',
      type: item.type ?? '',
      created_at: item.created_at ?? '',
      updated_at: item.updated_at ?? '',
      guid: item.guid ?? '',
      crn: item.crn ?? '',
    });
  }
  autoWidth(wsInstances);

  logger.info('Platform Services XLSX export generated', {
    serviceInstances: (data.serviceInstances ?? []).length,
  });

  return workbook;
}
