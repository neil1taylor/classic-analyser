import { Router, Request, Response, NextFunction } from 'express';
import { generateText } from '../services/watsonx.js';
import { cacheGet, cacheSet } from '../services/cache.js';
import { buildReportNarrativePrompt } from '../prompts/reportNarratives.js';
import { ReportNarrativeRequest, ReportNarrativeResponse } from '../types/index.js';
import crypto from 'node:crypto';

const router = Router();

const VALID_SECTION_TYPES = [
  'executive_summary',
  'environment_overview',
  'migration_readiness',
  'compute_assessment',
  'network_assessment',
  'storage_assessment',
  'security_assessment',
  'cost_analysis',
  'recommendations',
];

router.post(
  '/api/report-narratives',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sectionType, data } = req.body as ReportNarrativeRequest;

      if (!sectionType || typeof sectionType !== 'string') {
        res.status(400).json({ error: 'sectionType string is required' });
        return;
      }

      if (!VALID_SECTION_TYPES.includes(sectionType)) {
        res.status(400).json({
          error: `Invalid sectionType. Valid types: ${VALID_SECTION_TYPES.join(', ')}`,
        });
        return;
      }

      if (!data || typeof data !== 'object') {
        res.status(400).json({ error: 'data object is required' });
        return;
      }

      // Check cache
      const cacheKey = `report:${sectionType}:${crypto
        .createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex')}`;

      const cached = cacheGet(cacheKey) as ReportNarrativeResponse | undefined;
      if (cached) {
        res.json(cached);
        return;
      }

      // Build prompt and call watsonx
      const prompt = buildReportNarrativePrompt(sectionType, data);
      const narrative = await generateText(prompt, 3072);

      const result: ReportNarrativeResponse = { narrative };

      // Cache and return
      cacheSet(cacheKey, result);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
