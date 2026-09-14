import type { AuthSession } from '../../shared/auth';
import { apiFetch, setCsrfToken } from './http';

export async function getSession(): Promise<AuthSession | null> {
  const response = await apiFetch('/api/auth/me');
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Tidak dapat memeriksa session. Periksa koneksi server.');
  return response.json();
}
export async function signIn(username: string, password: string): Promise<AuthSession> {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error('Terlalu banyak percobaan login. Coba lagi setelah ' + (response.headers.get('Retry-After') || 'beberapa') + ' detik.');
    if (response.status === 401) throw new Error('Username atau password salah.');
    throw new Error('Login gagal. Periksa koneksi dan format username/password.');
  }
  return response.json();
}
export async function signOut(): Promise<void> {
  const response = await apiFetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok && response.status !== 401) throw new Error('Logout gagal. Coba lagi; session belum diakhiri.');
  setCsrfToken('');
}
