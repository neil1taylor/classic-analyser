import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../utils/logger.js';
import { apiKeyMiddleware } from '../middleware/apiKey.js';

const router = Router();

// ── Configuration ────────────────────────────────────────────────────────
// Legacy external AI proxy (optional)
const AI_PROXY_URL = process.env.AI_PROXY_URL;
const AI_PROXY_SECRET = process.env.AI_PROXY_SECRET;

// watsonx.ai direct integration
const WATSONX_PROJECT_ID = process.env.WATSONX_PROJECT_ID;
const WATSONX_URL = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
const WATSONX_API_VERSION = '2024-05-31';

const TIMEOUT_MS = 30_000;
const STREAM_TIMEOUT_MS = 60_000;
const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';

// Model tiers
const MODELS = {
  fast: 'ibm/granite-8b-code-instruct',
  complex: 'ibm/granite-34b-code-instruct',
} as const;

type ModelTier = keyof typeof MODELS;

// ── IAM Token Exchange ───────────────────────────────────────────────────

async function exchangeApiKeyForToken(apiKey: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
    apikey: apiKey,
  });

  const response = await fetch(IAM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `IAM token exchange failed: ${response.status} ${errorBody.substring(0, 200)}`,
    );
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getApiKey(req: Request): string | null {
  if (req.iamToken) return null; // already have a token
  return req.apiKey || null;
}

function getIamToken(req: Request): string | null {
  return req.iamToken || null;
}

async function resolveToken(req: Request): Promise<string> {
  const existingToken = getIamToken(req);
  if (existingToken) return existingToken;

  const apiKey = getApiKey(req);
  if (!apiKey) {
    throw new Error('No API key or IAM token available');
  }
  return exchangeApiKeyForToken(apiKey);
}

function selectModel(tier?: string): string {
  if (tier && tier in MODELS) {
    return MODELS[tier as ModelTier];
  }
  return MODELS.complex;
}

// ── Legacy Proxy Helpers ─────────────────────────────────────────────────

function isLegacyProxyConfigured(): boolean {
  return !!(AI_PROXY_URL && AI_PROXY_SECRET);
}

function isWatsonxConfigured(): boolean {
  return !!WATSONX_PROJECT_ID;
}

async function forwardToLegacyProxy(
  subPath: string,
  req: Request,
  res: Response,
): Promise<void> {
  const targetUrl = `${AI_PROXY_URL}/api/${subPath}`;
  logger.info('AI legacy proxy forwarding', { method: 'POST', subPath, targetUrl });

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': AI_PROXY_SECRET!,
    },
    body: JSON.stringify(req.body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = await response.json();
  logger.info('AI legacy proxy response', { subPath, status: response.status });
  res.status(response.status).json(data);
}

// ── watsonx.ai Direct Calls ─────────────────────────────────────────────

interface WatsonxGenerationRequest {
  model_id: string;
  input: string;
  parameters: {
    decoding_method: string;
    max_new_tokens: number;
    temperature: number;
    top_p: number;
    repetition_penalty: number;
    stop_sequences?: string[];
  };
  project_id: string;
}

interface WatsonxGenerationResult {
  generated_text: string;
  generated_token_count: number;
  input_token_count: number;
  stop_reason: string;
}

interface WatsonxGenerationResponse {
  results: WatsonxGenerationResult[];
  model_id: string;
  created_at: string;
}

function buildWatsonxPrompt(
  messages: Array<{ role: string; content: string }>,
  context?: Record<string, unknown>,
): string {
  let prompt = '';

  if (context) {
    prompt +=
      'You are an IBM Cloud infrastructure assistant. ' +
      'Answer questions about the user\'s IBM Cloud environment based on the following context.\n\n' +
      'Context:\n' +
      JSON.stringify(context, null, 2) +
      '\n\n';
  } else {
    prompt +=
      'You are an IBM Cloud infrastructure assistant. ' +
      'Help users understand and optimize their IBM Cloud infrastructure.\n\n';
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      prompt += `User: ${msg.content}\n`;
    } else if (msg.role === 'assistant') {
      prompt += `Assistant: ${msg.content}\n`;
    }
  }

  prompt += 'Assistant: ';
  return prompt;
}

async function callWatsonx(
  token: string,
  prompt: string,
  modelTier: ModelTier = 'complex',
): Promise<string> {
  const modelId = selectModel(modelTier);
  const url = `${WATSONX_URL}/ml/v1/text/generation?version=${WATSONX_API_VERSION}`;

  const requestBody: WatsonxGenerationRequest = {
    model_id: modelId,
    input: prompt,
    parameters: {
      decoding_method: 'greedy',
      max_new_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.1,
      stop_sequences: ['User:', '\n\nUser:'],
    },
    project_id: WATSONX_PROJECT_ID!,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    logger.error('watsonx.ai generation failed', {
      status: response.status,
      error: errorBody.substring(0, 500),
    });
    throw new Error(`watsonx.ai request failed: ${response.status}`);
  }

  const data = (await response.json()) as WatsonxGenerationResponse;
  if (!data.results || data.results.length === 0) {
    throw new Error('watsonx.ai returned no results');
  }

  return data.results[0].generated_text.trim();
}

async function streamWatsonx(
  token: string,
  prompt: string,
  modelTier: ModelTier,
  res: Response,
): Promise<void> {
  const modelId = selectModel(modelTier);
  const url = `${WATSONX_URL}/ml/v1/text/generation_stream?version=${WATSONX_API_VERSION}`;

  const requestBody: WatsonxGenerationRequest = {
    model_id: modelId,
    input: prompt,
    parameters: {
      decoding_method: 'greedy',
      max_new_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.1,
      stop_sequences: ['User:', '\n\nUser:'],
    },
    project_id: WATSONX_PROJECT_ID!,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    logger.error('watsonx.ai stream failed', {
      status: response.status,
      error: errorBody.substring(0, 500),
    });
    throw new Error(`watsonx.ai stream failed: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('watsonx.ai stream returned no body');
  }

  // Pipe SSE from watsonx.ai to the client
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE events from watsonx.ai and re-emit to client
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;
            const parsed = JSON.parse(jsonStr) as {
              results?: Array<{ generated_text?: string }>;
            };
            if (parsed.results?.[0]?.generated_text) {
              res.write(
                `data: ${JSON.stringify({ text: parsed.results[0].generated_text })}\n\n`,
              );
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  res.write('data: [DONE]\n\n');
}

// ── Routes ───────────────────────────────────────────────────────────────

// Config check (no auth required)
router.get('/config', (_req: Request, res: Response): void => {
  res.json({
    configured: isLegacyProxyConfigured() || isWatsonxConfigured(),
    watsonx: isWatsonxConfigured(),
    legacyProxy: isLegacyProxyConfigured(),
  });
});

// Health check (no auth required)
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  if (isWatsonxConfigured()) {
    // For watsonx.ai, we just report configured status since health
    // depends on user's API key for auth
    res.json({ status: 'healthy', backend: 'watsonx' });
    return;
  }

  if (isLegacyProxyConfigured()) {
    try {
      const response = await fetch(`${AI_PROXY_URL}/health`, {
        method: 'GET',
        headers: { 'X-API-Key': AI_PROXY_SECRET! },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err) {
      logger.error('AI proxy health check failed', { error: (err as Error).message });
      res.status(502).json({ error: 'AI proxy unreachable' });
    }
    return;
  }

  res.status(503).json({ error: 'No AI backend configured' });
});

// Chat endpoint (auth required for watsonx.ai direct)
router.post('/chat', apiKeyMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { messages, context, modelTier } = req.body as {
    messages: Array<{ role: string; content: string }>;
    context?: Record<string, unknown>;
    modelTier?: string;
  };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  // Try watsonx.ai direct first
  if (isWatsonxConfigured()) {
    try {
      const token = await resolveToken(req);
      const prompt = buildWatsonxPrompt(messages, context);
      const tier = (modelTier as ModelTier) || 'complex';
      const responseText = await callWatsonx(token, prompt, tier);
      res.json({ response: responseText });
      return;
    } catch (err) {
      logger.error('watsonx.ai chat failed', { error: (err as Error).message });
      // Fall through to legacy proxy if available
      if (!isLegacyProxyConfigured()) {
        res.status(503).json({
          error: 'AI service unavailable',
          message: 'watsonx.ai is currently unreachable. The application continues to work normally.',
        });
        return;
      }
    }
  }

  // Fall back to legacy proxy
  if (isLegacyProxyConfigured()) {
    try {
      await forwardToLegacyProxy('chat', req, res);
    } catch (err) {
      logger.error('AI legacy proxy chat failed', { error: (err as Error).message });
      res.status(502).json({ error: 'AI proxy request failed' });
    }
    return;
  }

  res.status(503).json({
    error: 'AI service unavailable',
    message: 'No AI backend is configured.',
  });
});

// Streaming chat endpoint
router.post(
  '/chat/stream',
  apiKeyMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { messages, context, modelTier } = req.body as {
      messages: Array<{ role: string; content: string }>;
      context?: Record<string, unknown>;
      modelTier?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    if (!isWatsonxConfigured()) {
      res.status(503).json({
        error: 'Streaming requires watsonx.ai direct integration',
        message: 'Set WATSONX_PROJECT_ID to enable streaming.',
      });
      return;
    }

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      const token = await resolveToken(req);
      const prompt = buildWatsonxPrompt(messages, context);
      const tier = (modelTier as ModelTier) || 'complex';
      await streamWatsonx(token, prompt, tier, res);
    } catch (err) {
      logger.error('watsonx.ai stream failed', { error: (err as Error).message });
      res.write(
        `data: ${JSON.stringify({ error: 'AI streaming failed' })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
    }

    res.end();
  },
);

// Insights endpoint
router.post('/insights', apiKeyMiddleware, async (req: Request, res: Response): Promise<void> => {
  if (isWatsonxConfigured()) {
    try {
      const token = await resolveToken(req);
      const { analysisData } = req.body as { analysisData: Record<string, unknown> };

      const prompt =
        'You are an IBM Cloud migration expert. Analyze the following infrastructure assessment data ' +
        'and provide: 1) An executive summary (2-3 sentences), 2) A list of risks with severity ' +
        '(low/medium/high/critical) and description, 3) Key recommendations.\n\n' +
        'Assessment data:\n' +
        JSON.stringify(analysisData, null, 2) +
        '\n\nProvide your response as JSON with this structure:\n' +
        '{"executiveSummary": "...", "risks": [{"title": "...", "severity": "...", "description": "..."}], ' +
        '"recommendations": ["...", "..."]}\n\nJSON response:';

      const responseText = await callWatsonx(token, prompt, 'complex');

      // Try to parse as JSON, fall back to wrapping in structure
      try {
        const parsed = JSON.parse(responseText);
        res.json(parsed);
      } catch {
        res.json({
          executiveSummary: responseText,
          risks: [],
          recommendations: [],
        });
      }
      return;
    } catch (err) {
      logger.error('watsonx.ai insights failed', { error: (err as Error).message });
      if (!isLegacyProxyConfigured()) {
        res.status(503).json({
          error: 'AI service unavailable',
          message: 'watsonx.ai is currently unreachable.',
        });
        return;
      }
    }
  }

  if (isLegacyProxyConfigured()) {
    try {
      await forwardToLegacyProxy('insights', req, res);
    } catch (err) {
      logger.error('AI legacy proxy insights failed', { error: (err as Error).message });
      res.status(502).json({ error: 'AI proxy request failed' });
    }
    return;
  }

  res.status(503).json({ error: 'No AI backend configured' });
});

// Cost optimization endpoint
router.post(
  '/cost-optimization',
  apiKeyMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    if (isWatsonxConfigured()) {
      try {
        const token = await resolveToken(req);
        const { costData } = req.body as { costData: Record<string, unknown> };

        const prompt =
          'You are an IBM Cloud cost optimization expert. Analyze the following cost data and provide ' +
          'a narrative summary and specific savings opportunities.\n\n' +
          'Cost data:\n' +
          JSON.stringify(costData, null, 2) +
          '\n\nProvide your response as JSON with this structure:\n' +
          '{"narrative": "...", "savings": [{"area": "...", "description": "...", "estimatedSaving": "..."}]}\n\n' +
          'JSON response:';

        const responseText = await callWatsonx(token, prompt, 'complex');

        try {
          const parsed = JSON.parse(responseText);
          res.json(parsed);
        } catch {
          res.json({ narrative: responseText, savings: [] });
        }
        return;
      } catch (err) {
        logger.error('watsonx.ai cost optimization failed', { error: (err as Error).message });
        if (!isLegacyProxyConfigured()) {
          res.status(503).json({ error: 'AI service unavailable' });
          return;
        }
      }
    }

    if (isLegacyProxyConfigured()) {
      try {
        await forwardToLegacyProxy('cost-optimization', req, res);
      } catch (err) {
        logger.error('AI legacy proxy cost-optimization failed', {
          error: (err as Error).message,
        });
        res.status(502).json({ error: 'AI proxy request failed' });
      }
      return;
    }

    res.status(503).json({ error: 'No AI backend configured' });
  },
);

// Report narratives endpoint
router.post(
  '/report-narratives',
  apiKeyMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    if (isWatsonxConfigured()) {
      try {
        const token = await resolveToken(req);
        const { sectionType, data } = req.body as {
          sectionType: string;
          data: Record<string, unknown>;
        };

        const prompt =
          `You are an IBM Cloud infrastructure report writer. Write a professional narrative ` +
          `for the "${sectionType}" section of a migration assessment report.\n\n` +
          'Data:\n' +
          JSON.stringify(data, null, 2) +
          '\n\nWrite a concise, professional narrative (2-4 paragraphs):';

        const responseText = await callWatsonx(token, prompt, 'complex');
        res.json({ narrative: responseText });
        return;
      } catch (err) {
        logger.error('watsonx.ai report narrative failed', { error: (err as Error).message });
        if (!isLegacyProxyConfigured()) {
          res.status(503).json({ error: 'AI service unavailable' });
          return;
        }
      }
    }

    if (isLegacyProxyConfigured()) {
      try {
        await forwardToLegacyProxy('report-narratives', req, res);
      } catch (err) {
        logger.error('AI legacy proxy report-narratives failed', {
          error: (err as Error).message,
        });
        res.status(502).json({ error: 'AI proxy request failed' });
      }
      return;
    }

    res.status(503).json({ error: 'No AI backend configured' });
  },
);

export default router;
