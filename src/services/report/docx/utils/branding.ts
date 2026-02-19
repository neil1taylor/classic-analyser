import type { ReportBranding } from '../types';

export function getReportBranding(): ReportBranding {
  return {
    clientName: localStorage.getItem('report_client_name') || 'Client',
    companyName: localStorage.getItem('report_company_name') || 'IBM',
    authorName:
      localStorage.getItem('report_author_name') || 'IBM Cloud Infrastructure Explorer',
  };
}
