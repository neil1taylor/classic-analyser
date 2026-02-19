import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/error.js';
import healthRouter from './routes/health.js';
import insightsRouter from './routes/insights.js';
import chatRouter from './routes/chat.js';
import costOptimizationRouter from './routes/costOptimization.js';
import reportNarrativesRouter from './routes/reportNarratives.js';

const app = express();

// Global middleware
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Health route (no auth required)
app.use(healthRouter);

// Auth and rate limiting for API routes
app.use('/api/*', rateLimiter);
app.use('/api/*', authMiddleware);

// API routes
app.use(insightsRouter);
app.use(chatRouter);
app.use(costOptimizationRouter);
app.use(reportNarrativesRouter);

// Error handler
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`AI proxy server listening on port ${config.PORT}`);
});

export default app;
