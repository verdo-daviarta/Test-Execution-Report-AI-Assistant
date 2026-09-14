import { useEffect, useRef, useState } from 'react';
import App from './App';
import Login from './components/Login';
import type { AuthSession } from '../shared/auth';
import { getSession, signOut } from './utils/auth';
import { AUTH_EXPIRED_EVENT, setCsrfToken } from './utils/http';

export default function AuthShell() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const version = useRef(0);

  function acceptSession(next: AuthSession | null) {
    setCsrfToken(next?.csrfToken || '');
    setSession(next);
  }
  async function refresh() {
    const current = ++version.current;
    try {
      const next = await getSession();
      if (current === version.current) { acceptSession(next); setError(''); }
    } catch (error) {
      if (current === version.current) setError(error instanceof Error ? error.message : 'Server tidak dapat dihubungi.');
    } finally {
      if (current === version.current) setChecking(false);
    }
  }
  useEffect(() => {
    const expired = () => {
      version.current++;
      acceptSession(null);
      setChecking(false);
    };
    void refresh();
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    window.addEventListener('focus', refresh);
    return () => {
      version.current++;
      window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    const timeout = window.setTimeout(() => {
      version.current++;
      acceptSession(null);
    }, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [session]);

  async function logout() {
    if (loggingOut) return;
    version.current++;
    setLoggingOut(true);
    setError('');
    try { await signOut(); version.current++; acceptSession(null); }
    catch (error) { setError(error instanceof Error ? error.message : 'Logout gagal.'); }
    finally { setLoggingOut(false); }
  }
  if (checking) return <div role="status" className="min-h-screen grid place-items-center bg-slate-950 text-white">Memeriksa session...</div>;
  return (
    <>
      {error && <div role="alert" className="fixed top-4 right-4 z-[100] max-w-md bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 shadow-lg">
        {error}<button onClick={() => { setChecking(!session); void refresh(); }} className="ml-3 underline font-semibold">Coba lagi</button>
      </div>}
      {session
        ? <App key={session.user.id} user={session.user} onLogout={logout} loggingOut={loggingOut} />
        : <Login onSuccess={next => { version.current++; acceptSession(next); setError(''); }} />}
    </>
  );
}
