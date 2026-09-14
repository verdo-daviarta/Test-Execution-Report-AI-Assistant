import { useState, type FormEvent } from 'react';
import { LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import type { AuthSession } from '../../shared/auth';
import { signIn } from '../utils/auth';

export default function Login({ onSuccess }: { onSuccess: (session: AuthSession) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      onSuccess(await signIn(username.trim(), password));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login gagal. Silakan coba lagi.');
    } finally {
      setPassword('');
      setPending(false);
    }
  }
  return (
    <main className="min-h-screen bg-slate-950 text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
        <section className="bg-slate-900 p-8 md:p-12 text-white flex flex-col justify-between gap-12">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mb-8"><ShieldCheck aria-hidden="true" /></div>
            <p className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-3">Shared QA Workspace</p>
            <h1 className="text-3xl font-bold leading-tight">Test Execution Report<br />AI Assistant</h1>
            <p className="text-slate-400 mt-5 text-sm leading-relaxed">Satu workspace untuk berkolaborasi menyusun scenario, meninjau hasil, dan mengelola Project tim QA.</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">Semua anggota memiliki permission yang sama. History dan Project dibagikan kepada seluruh anggota workspace.</p>
        </section>
        <section className="bg-white p-8 md:p-12">
          <LockKeyhole className="text-blue-600 mb-5" aria-hidden="true" />
          <h2 className="text-2xl font-bold">Masuk ke workspace</h2>
          <p className="text-sm text-slate-500 mt-2 mb-8">Gunakan akun yang diberikan pengelola aplikasi.</p>
          <form onSubmit={submit} className="space-y-5" aria-label="Login">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold mb-2">Username</label>
              <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
                required maxLength={32} value={username} onChange={e => setUsername(e.target.value)} disabled={pending}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-2">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password"
                required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} disabled={pending}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
            <button type="submit" disabled={pending} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-4 py-3 disabled:opacity-60">
              <LogIn size={18} aria-hidden="true" />{pending ? 'Memeriksa akun...' : 'Masuk'}
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-6">Belum memiliki akun? Hubungi pengelola. Registrasi publik tidak tersedia.</p>
        </section>
      </div>
    </main>
  );
}
