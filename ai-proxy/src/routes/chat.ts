import { Router, Request, Response, NextFunction } from 'express';
import { generateText } from '../services/watsonx.js';
import { buildChatPrompt } from '../prompts/chat.js';
import { ChatRequest, ChatResponse } from '../types/index.js';

const router = Router();

router.post(
  '/api/chat',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messages, context } = req.body as ChatRequest;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'messages array is required and must not be empty' });
        return;
      }

      // Validate message structure
      for (const msg of messages) {
        if (!msg.role || !msg.content) {
          res.status(400).json({ error: 'Each message must have role and content' });
          return;
        }
        if (msg.role !== 'user' && msg.role !== 'assistant') {
          res.status(400).json({ error: 'Message role must be "user" or "assistant"' });
          return;
        }
      }

      // Build prompt and call watsonx (no caching for chat)
      const prompt = buildChatPrompt(messages, context || {});
      const responseText = await generateText(prompt, 2048);

      const result: ChatResponse = {
        response: responseText,
      };

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
