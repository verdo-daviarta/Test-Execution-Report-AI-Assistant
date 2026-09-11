import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateScenariosFromApi } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('generation API client', () => {
  it('sends the common request and cancellation signal', async () => {
    const result = { scenarios: [], provider: 'gemini', isMock: false };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const input = { moduleName: 'Login', provider: 'gemini' as const };
    const controller = new AbortController();
    expect(await generateScenariosFromApi(input, controller.signal)).toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      method: 'POST', body: JSON.stringify(input), signal: controller.signal,
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });
  it('surfaces server errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Provider failed', { status: 502 })));
    await expect(generateScenariosFromApi({ moduleName: 'Login' })).rejects.toThrow('Provider failed');
  });
  it('preserves AbortError so the UI can distinguish cancellation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')));
    await expect(generateScenariosFromApi({ moduleName: 'Login' })).rejects.toMatchObject({ name: 'AbortError' });
  });
});
