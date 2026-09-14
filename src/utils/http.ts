let csrfToken = '';
export const AUTH_EXPIRED_EVENT = 'ter:auth-expired';
export function setCsrfToken(token: string) { csrfToken = token; }

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('X-Requested-With', 'TestExecutionReport');
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  const response = await fetch(url, {
    ...options, credentials: 'same-origin',
    headers: Object.fromEntries(headers.entries()),
  });
  if (response.status === 401) {
    csrfToken = '';
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return response;
}
