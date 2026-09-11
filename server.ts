import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { openDatabase } from './backend/database';
import { registerHistoryRoutes } from './backend/routes/history';
import { registerProjectRoutes } from './backend/routes/projects';
import { registerGenerationRoute } from './backend/routes/generation';
import { createGenerationService } from './backend/services/generation';
import { createOpenAIAdapter } from './backend/providers/openai';
import { createGeminiAdapter } from './backend/providers/gemini';

const generate = createGenerationService({
 ...(process.env.OPENAI_API_KEY?.trim() ? {openai: createOpenAIAdapter(process.env.OPENAI_API_KEY.trim(), process.env.OPENAI_MODEL || 'gpt-4o-mini')} : {}),
 ...(process.env.GEMINI_API_KEY?.trim() ? {gemini: createGeminiAdapter(process.env.GEMINI_API_KEY.trim(), process.env.GEMINI_MODEL || 'gemini-2.0-flash')} : {})
}, process.env.AI_PROVIDER || 'gemini');
async function startServer() {
  const db = openDatabase();
  const app = express();
  const PORT = 3000;
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  // Global Middlewares
  app.use(express.json({ limit: "12mb" }));

  app.use('/api', (req, res, next) => {
    const configuredKey = process.env.INTERNAL_API_KEY?.trim();
    if (configuredKey && req.header('x-api-key') !== configuredKey) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    const now = Date.now();
    const clientKey = req.ip || 'unknown';
    const current = requestCounts.get(clientKey);
    if (!current || current.resetAt <= now) {
      requestCounts.set(clientKey, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    if (current.count >= 30) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }
    current.count += 1;
    return next();
  });

  registerHistoryRoutes(app, db);
  registerProjectRoutes(app, db);

  registerGenerationRoute(app, generate);

  app.get('/api/health/database', (_req, res) => {
    const result = db.prepare('SELECT 1 AS connected').get() as { connected: number };
    res.json({ database: result.connected === 1 ? 'connected' : 'disconnected' });
  });

  // Serve Vite or static compilation
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on host 0.0.0.0 port ${PORT}`);
  });
}


startServer();
