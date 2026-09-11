import type { Express } from 'express';
import { GenerationError } from '../services/generation';
import type { GenerationInput, GenerationResult } from '../../shared/generation';

export function registerGenerationRoute(
  app: Express,
  generate: (input: GenerationInput) => Promise<GenerationResult>,
) {
  app.post('/api/generate', async (req, res) => {
    try {
      res.json(await generate(req.body));
    } catch (error) {
      // Never expose raw SDK errors, request payloads, or credentials to clients.
      const knownError = error instanceof GenerationError;
      res.status(knownError ? error.status : 502).json({
        error: knownError ? error.message : 'AI provider request failed. Check provider quota or configuration.',
      });
    }
  });
}
