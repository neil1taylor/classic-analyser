import { Router, Request, Response, NextFunction } from 'express';
import { generateText } from '../services/watsonx.js';
import { cacheGet, cacheSet } from '../services/cache.js';
import { buildCostPrompt } from '../prompts/costOptimization.js';
import { CostOptimizationRequest, CostOptimizationResponse } from '../types/index.js';
import crypto from 'node:crypto';

const router = Router();

router.post(
  '/api/cost-optimization',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { costData } = req.body as CostOptimizationRequest;

      if (!costData || typeof costData !== 'object') {
        res.status(400).json({ error: 'costData object is required' });
        return;
      }

      // Check cache
      const cacheKey = `cost:${crypto
        .createHash('sha256')
        .update(JSON.stringify(costData))
        .digest('hex')}`;

      const cached = cacheGet(cacheKey) as CostOptimizationResponse | undefined;
      if (cached) {
        res.json(cached);
        return;
      }

      // Build prompt and call watsonx
      const prompt = buildCostPrompt(costData);
      const rawResponse = await generateText(prompt);

      // Parse JSON response
      let parsed: CostOptimizationResponse;
      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON object found in response');
        }
        parsed = JSON.parse(jsonMatch[0]) as CostOptimizationResponse;
      } catch {
        parsed = {
          narrative: rawResponse,
          savings: [],
        };
      }

      // Validate structure
      if (!parsed.narrative) parsed.narrative = '';
      if (!Array.isArray(parsed.savings)) parsed.savings = [];

      // Cache and return
      cacheSet(cacheKey, parsed);
      res.json(parsed);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
