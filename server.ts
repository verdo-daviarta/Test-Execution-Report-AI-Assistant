import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { openDatabase } from './backend/database';
import { createApiApp } from './backend/app';
import { createGenerationService } from './backend/services/generation';
import { createOpenAIAdapter } from './backend/providers/openai';
import { createGeminiAdapter } from './backend/providers/gemini';

const generate = createGenerationService({
 ...(process.env.OPENAI_API_KEY?.trim() ? {openai: createOpenAIAdapter(process.env.OPENAI_API_KEY.trim(), process.env.OPENAI_MODEL || 'gpt-4o-mini')} : {}),
 ...(process.env.GEMINI_API_KEY?.trim() ? {gemini: createGeminiAdapter(process.env.GEMINI_API_KEY.trim(), process.env.GEMINI_MODEL || 'gemini-2.0-flash')} : {})
}, process.env.AI_PROVIDER || 'gemini');
async function startServer() {
  const db = openDatabase();
  const PORT = 3000;
  const app = createApiApp(db, generate, {
    secureCookies: process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
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
