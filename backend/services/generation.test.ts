import { describe, expect, it, vi } from 'vitest';
import { createGenerationService } from './generation';
import type { GenerationInput } from '../../shared/generation';

const payload = () => ({ scenarios: [{ name: 'Login', description: 'Login suite', testCases: [
  { testId: 'TC-001', scenario: 'Valid login', step: 'Submit', expectedResult: 'Success', coverageType: 'Positive' },
  { testId: 'TC-002', scenario: 'Invalid login', step: 'Submit', expectedResult: 'Error', coverageType: 'Negative' },
] }] });

describe('generation service', () => {
  it.each(['openai', 'gemini'] as const)('selects only %s with a common contract', async provider => {
    const adapters = { openai: { generate: vi.fn().mockResolvedValue(payload()) }, gemini: { generate: vi.fn().mockResolvedValue(payload()) } };
    const screenshot = 'data:image/png;base64,YQ==';
    const result = await createGenerationService(adapters)({ moduleName: 'Login', provider, screenshot });
    expect(result).toEqual({ ...payload(), provider, isMock: false });
    expect(adapters[provider].generate).toHaveBeenCalledWith({ promptText: expect.stringContaining('Module Name: Login'), screenshot });
    expect(adapters[provider === 'openai' ? 'gemini' : 'openai'].generate).not.toHaveBeenCalled();
  });

  it('uses the configured default and keeps selection independent between requests', async () => {
    const adapters = { openai: { generate: vi.fn().mockResolvedValue(payload()) }, gemini: { generate: vi.fn().mockResolvedValue(payload()) } };
    const generate = createGenerationService(adapters, 'gemini');
    const results = await Promise.all([generate({ moduleName: 'A' }), generate({ moduleName: 'B', provider: 'openai' })]);
    expect(results.map(r => r.provider)).toEqual(['gemini', 'openai']);
  });

  it('uses explicitly marked local output only when the selected adapter is unconfigured', async () => {
    const other = { generate: vi.fn() };
    const result = await createGenerationService({ openai: other })({ moduleName: 'Login', provider: 'gemini', coverages: ['Boundary'] });
    expect(result).toMatchObject({ provider: 'gemini', isMock: true });
    expect(result.scenarios[0].testCases[0].coverageType).toBe('Boundary');
    expect(other.generate).not.toHaveBeenCalled();
  });

  it('does not silently switch provider or return mock output on billing errors', async () => {
    const error = new Error('quota exceeded');
    const other = { generate: vi.fn() };
    const generate = createGenerationService({ openai: { generate: vi.fn().mockRejectedValue(error) }, gemini: other });
    await expect(generate({ moduleName: 'Login' })).rejects.toBe(error);
    expect(other.generate).not.toHaveBeenCalled();
  });

  it.each([null, {}, { moduleName: ' ' }, { moduleName: 1 }, { moduleName: 'X', provider: 'invalid' },
    { moduleName: 'X', coverages: 'Positive' }, { moduleName: 'X', coverages: ['invalid'] },
    { moduleName: 'X', requirement: {} }, { moduleName: 'X', screenshot: 'https://example.com/image.png' },
  ])('rejects invalid input %j before calling a provider', async input => {
    const adapter = { generate: vi.fn() };
    await expect(createGenerationService({ openai: adapter })(input as GenerationInput)).rejects.toMatchObject({ status: 400 });
    expect(adapter.generate).not.toHaveBeenCalled();
  });

  it.each([null, {}, { scenarios: [null] }, { scenarios: [{ name: 'X', description: '', testCases: [null] }] },
    { scenarios: [{ name: 'X', description: '', testCases: [{}] }] },
  ])('rejects malformed provider response %j', async response => {
    await expect(createGenerationService({ openai: { generate: vi.fn().mockResolvedValue(response) } })({ moduleName: 'X' })).rejects.toMatchObject({ status: 502 });
  });

  it('normalizes coverage in one place for both providers', async () => {
    const response = payload();
    response.scenarios[0].testCases.forEach(tc => { tc.coverageType = 'unknown'; });
    const result = await createGenerationService({ openai: { generate: vi.fn().mockResolvedValue(response) } })({ moduleName: 'Login' });
    expect(result.scenarios[0].testCases.map(tc => tc.coverageType)).toEqual(['Positive', 'Negative']);
  });
});
