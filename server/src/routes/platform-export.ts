import { Router } from 'express';
import type { Request, Response } from 'express';
import { apiKeyMiddleware } from '../middleware/apiKey.js';
import { generatePlatformExcelExport } from '../services/platform/export.js';
import logger from '../utils/logger.js';

const router = Router();

router.post('/', apiKeyMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, accountName } = req.body as { data: Record<string, unknown[]>; accountName?: string };

    if (!data || typeof data !== 'object') {
      res.status(400).json({
        error: 'Invalid data',
        message: 'Request body must contain Platform Services collected data.',
      });
      return;
    }

    const sanitizedAccountName = (accountName ?? 'Platform').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `IBMPlatform_Export_${dateStr}_${sanitizedAccountName}.xlsx`;

    logger.info('Generating Platform Services XLSX export', { fileName });

    const workbook = await generatePlatformExcelExport({ data, accountName });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store');

    await workbook.xlsx.write(res);
    res.end();

    logger.info('Platform Services XLSX export completed', { fileName });
  } catch (err) {
    const error = err as Error;
    logger.error('Platform Services export failed', { message: error.message });
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Export failed',
        message: 'Failed to generate Platform Services XLSX export.',
      });
    }
  }
});

export default router;
