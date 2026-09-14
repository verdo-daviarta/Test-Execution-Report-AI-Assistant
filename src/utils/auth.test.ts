import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, AUTH_EXPIRED_EVENT, setCsrfToken } from './http';
import { getSession, signIn, signOut } from './auth';

afterEach(() => { setCsrfToken(''); vi.unstubAllGlobals(); });
describe('browser authentication client', () => {
  it('sends CSRF verification in headers and a same-origin cookie request', async () => {
    const spy = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', spy);
    setCsrfToken('csrf-test');
    await apiFetch('/api/projects', { method: 'POST', body: '{}' });
    const options = spy.mock.calls[0][1];
    expect(options.credentials).toBe('same-origin');
    expect(new Headers(options.headers).get('x-csrf-token')).toBe('csrf-test');
    expect(new Headers(options.headers).has('x-api-key')).toBe(false);
  });
  it('notifies the UI and clears CSRF on unauthorized responses', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    const spy = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401 })).mockResolvedValueOnce(new Response('{}'));
    vi.stubGlobal('fetch', spy);
    setCsrfToken('expired-token');
    await apiFetch('/api/projects');
    expect(dispatchEvent.mock.calls[0][0].type).toBe(AUTH_EXPIRED_EVENT);
    await apiFetch('/api/projects');
    expect(new Headers(spy.mock.calls[1][1].headers).has('x-csrf-token')).toBe(false);
  });
  it('returns null for a missing session and a generic message for bad login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    expect(await getSession()).toBeNull();
    await expect(signIn('qa1', 'wrong')).rejects.toThrow('Username atau password salah.');
  });
  it('does not claim logout succeeded when the server could not revoke the session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    await expect(signOut()).rejects.toThrow('session belum diakhiri');
  });
});
