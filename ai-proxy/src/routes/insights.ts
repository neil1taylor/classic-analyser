import { Router, Request, Response, NextFunction } from 'express';
import { generateText } from '../services/watsonx.js';
import { cacheGet, cacheSet } from '../services/cache.js';
import { buildInsightsPrompt } from '../prompts/insights.js';
import { InsightsRequest, InsightsResponse } from '../types/index.js';
import crypto from 'node:crypto';

const router = Router();

router.post(
  '/api/insights',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { analysisData } = req.body as InsightsRequest;

      if (!analysisData || typeof analysisData !== 'object') {
        res.status(400).json({ error: 'analysisData object is required' });
        return;
      }

      // Check cache
      const cacheKey = `insights:${crypto
        .createHash('sha256')
        .update(JSON.stringify(analysisData))
        .digest('hex')}`;

      const cached = cacheGet(cacheKey) as InsightsResponse | undefined;
      if (cached) {
        res.json(cached);
        return;
      }

      // Build prompt and call watsonx
      const prompt = buildInsightsPrompt(analysisData);
      const rawResponse = await generateText(prompt);

      // Parse JSON response
      let parsed: InsightsResponse;
      try {
        // Try to extract JSON from the response in case there is surrounding text
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON object found in response');
        }
        parsed = JSON.parse(jsonMatch[0]) as InsightsResponse;
      } catch {
        parsed = {
          executiveSummary: rawResponse,
          risks: [],
          recommendations: [],
        };
      }

      // Validate structure
      if (!parsed.executiveSummary) parsed.executiveSummary = '';
      if (!Array.isArray(parsed.risks)) parsed.risks = [];
      if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];

      // Cache and return
      cacheSet(cacheKey, parsed);
      res.json(parsed);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
