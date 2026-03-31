import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import collectRouter from './routes/collect.js';
import exportRouter from './routes/export.js';
import pricingRouter from './routes/pricing.js';
import vpcAuthRouter from './routes/vpc-auth.js';
import vpcCollectRouter from './routes/vpc-collect.js';
import vpcExportRouter from './routes/vpc-export.js';
import aiProxyRouter from './routes/ai-proxy.js';
import powerVsAuthRouter from './routes/powervs-auth.js';
import powerVsCollectRouter from './routes/powervs-collect.js';
import powerVsExportRouter from './routes/powervs-export.js';
import platformCollectRouter from './routes/platform-collect.js';
import platformExportRouter from './routes/platform-export.js';
import convertRouter from './routes/convert.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || (isProduction ? '8080' : '3001'), 10);

// Security headers with CSP configured for Carbon Design System
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Compression — skip for SSE streams (text/event-stream) to avoid buffering
app.use(compression({
  filter: (req, res) => {
    if (req.headers.accept === 'text/event-stream') {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// JSON body parser with 50MB limit for export data
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/collect', collectRouter);
app.use('/api/export', exportRouter);
app.use('/api/migration', pricingRouter);
app.use('/api/vpc/auth', vpcAuthRouter);
app.use('/api/vpc/collect', vpcCollectRouter);
app.use('/api/vpc/export', vpcExportRouter);
app.use('/api/ai', aiProxyRouter);
app.use('/api/powervs/auth', powerVsAuthRouter);
app.use('/api/powervs/collect', powerVsCollectRouter);
app.use('/api/powervs/export', powerVsExportRouter);
app.use('/api/platform/collect', platformCollectRouter);
app.use('/api/platform/export', platformExportRouter);
app.use('/api/convert', convertRouter);

// Serve static files in production
if (isProduction) {
  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));

  // SPA fallback: serve index.html for any non-API route
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 handler for unmatched API routes
app.use('/api/*', notFoundHandler);

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: isProduction ? 'production' : 'development',
    nodeVersion: process.version,
  });
});

export default app;
