import express, { type ErrorRequestHandler } from 'express';
import type Database from 'better-sqlite3';
import type { GenerationInput, GenerationResult } from '../shared/generation';
import { installAuthentication } from './auth/http';
import { createUserRateLimiter } from './auth/rate-limit';
import { ManualCaseValidationError } from '../shared/manual-cases';
import { registerHistoryRoutes } from './routes/history';
import { registerProjectRoutes } from './routes/projects';
import { registerGenerationRoute } from './routes/generation';

export function createApiApp(
  db: Database.Database,
  generate: (input: GenerationInput) => Promise<GenerationResult>,
  options: { secureCookies?: boolean; now?: () => number } = {},
) {
  const app = express();
  app.disable('x-powered-by');
  installAuthentication(app, db, options);
  app.use('/api', express.json({ limit: '12mb' }));
  app.use('/api', createUserRateLimiter(options.now));
  registerHistoryRoutes(app, db);
  registerProjectRoutes(app, db);
  registerGenerationRoute(app, generate);
  app.get('/api/health/database', (_req, res) => {
    const result = db.prepare('SELECT 1 AS connected').get() as { connected: number };
    res.json({ database: result.connected === 1 ? 'connected' : 'disconnected' });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ManualCaseValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    const status = error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 500;
    res.status(status).json({ error: status === 413 ? 'Request payload is too large.' : status === 400 ? 'Invalid JSON.' : 'Internal server error.' });
  };
  app.use(handleError);
  return app;
}
