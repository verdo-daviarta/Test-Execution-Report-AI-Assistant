import { createHash, randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { AuthSession, AuthUser } from '../../shared/auth';
import { verifyPassword } from './password';

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const csrfFor = (token: string) => tokenHash('csrf:' + token);
// A well-formed dummy verifier keeps unknown usernames on the same expensive path.
const DUMMY_HASH = 'scrypt-32768-8-3$' + '0'.repeat(32) + '$' + '0'.repeat(128);

export function createAuthService(db: Database.Database, now = Date.now) {
  let inFlight = 0;
  const toUser = (row: any): AuthUser => ({
    id: row.id, username: row.username, displayName: row.display_name,
    role: 'member', workspaceId: 'shared',
  });
  function resolve(token: string | undefined): AuthSession | null {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const row = db.prepare(`
      SELECT u.id, u.username, u.display_name, s.expires_at
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
    `).get(tokenHash(token), now()) as any;
    return row ? { user: toUser(row), csrfToken: csrfFor(token), expiresAt: row.expires_at } : null;
  }
  function revoke(token: string | undefined) {
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
  }
  function allowLogin(ip: string, username: string): number {
    const time = now();
    return db.transaction(() => {
      db.prepare('DELETE FROM login_attempts WHERE reset_at <= ?').run(time);
      for (const [key, limit] of [[tokenHash('ip:' + ip), 20], [tokenHash('user:' + username), 10]] as const) {
        const row = db.prepare('SELECT attempts, reset_at FROM login_attempts WHERE bucket = ?').get(key) as any;
        if (row && row.attempts >= limit) return Math.max(1, Math.ceil((row.reset_at - time) / 1000));
      }
      for (const key of [tokenHash('ip:' + ip), tokenHash('user:' + username)]) {
        db.prepare(`INSERT INTO login_attempts (bucket, attempts, reset_at) VALUES (?, 1, ?)
          ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1`).run(key, time + 15 * 60 * 1000);
      }
      return 0;
    })();
  }
  async function login(username: string, password: string, oldToken?: string) {
    if (inFlight >= 4) return { busy: true } as const;
    inFlight++;
    try {
      const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      const valid = await verifyPassword(password, row?.password_hash || DUMMY_HASH);
      if (!valid || !row || row.active !== 1) return null;
      const token = randomBytes(32).toString('hex');
      const expiresAt = now() + SESSION_TTL_MS;
      db.transaction(() => {
        revoke(oldToken); // Rotate the current browser session at every login.
        db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
        db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash(token), row.id, expiresAt);
      })();
      return { token, session: { user: toUser(row), csrfToken: csrfFor(token), expiresAt } satisfies AuthSession };
    } finally { inFlight--; }
  }
  return { resolve, revoke, allowLogin, login };
}
