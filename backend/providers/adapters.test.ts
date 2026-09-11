import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ openai: vi.fn(), gemini: vi.fn() }));
vi.mock('openai', () => ({ default: class { chat = { completions: { create: mocks.openai } }; } }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class { models = { generateContent: mocks.gemini }; },
  Type: { OBJECT: 'OBJECT', ARRAY: 'ARRAY', STRING: 'STRING' },
}));
import { createOpenAIAdapter } from './openai';
import { createGeminiAdapter } from './gemini';

beforeEach(() => vi.resetAllMocks());

describe('SDK adapters (no network)', () => {
  const payload = { scenarios: [{ name: 'Test', description: '', testCases: [] }] };
  const screenshot = 'data:image/png;base64,YQ==';

  it('maps OpenAI chat output and screenshot into the internal contract', async () => {
    mocks.openai.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(payload) } }] });
    expect(await createOpenAIAdapter('test-only', 'test-model').generate({ promptText: 'Spec', screenshot })).toEqual(payload);
    const request = mocks.openai.mock.calls[0][0];
    expect(request.model).toBe('test-model');
    expect(request.messages[1].content).toContainEqual({ type: 'image_url', image_url: { url: screenshot, detail: 'high' } });
    expect(request.response_format).toMatchObject({ type: 'json_schema', json_schema: { strict: true } });
  });

  it('maps Gemini output and inline image into the same contract', async () => {
    mocks.gemini.mockResolvedValue({ text: JSON.stringify(payload) });
    expect(await createGeminiAdapter('test-only', 'test-model').generate({ promptText: 'Spec', screenshot })).toEqual(payload);
    expect(mocks.gemini.mock.calls[0][0]).toMatchObject({
      model: 'test-model',
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: 'YQ==' } }, { text: 'Spec' }] }],
      config: { responseMimeType: 'application/json' },
    });
  });

  it.each(['openai', 'gemini'] as const)('rejects invalid JSON from %s', async provider => {
    mocks.openai.mockResolvedValue({ choices: [{ message: { content: 'not JSON' } }] });
    mocks.gemini.mockResolvedValue({ text: 'not JSON' });
    const adapter = provider === 'openai' ? createOpenAIAdapter('test-only', 'test') : createGeminiAdapter('test-only', 'test');
    await expect(adapter.generate({ promptText: 'Spec' })).rejects.toThrow();
  });
});
