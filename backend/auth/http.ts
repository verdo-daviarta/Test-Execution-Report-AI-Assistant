import express, { type Express, type Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type Database from 'better-sqlite3';
import { createAuthService, SESSION_TTL_MS } from './service';

const COOKIE_NAME = 'ter_session';
function readToken(req: Request) {
  const matches = (req.headers.cookie || '').split(';').map(s => s.trim()).filter(s => s.startsWith(COOKIE_NAME + '='));
  if (matches.length !== 1) return undefined;
  const value = matches[0].slice(COOKIE_NAME.length + 1);
  return /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
function sameToken(actual: string | undefined, expected: string) {
  return !!actual && actual.length === expected.length &&
    Buffer.byteLength(actual) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
export function installAuthentication(
  app: Express, db: Database.Database,
  options: { secureCookies?: boolean; now?: () => number } = {},
) {
  const auth = createAuthService(db, options.now);
  const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: options.secureCookies ?? false, path: '/' };
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if (origin && origin !== req.protocol + '://' + req.get('host')) {
        return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
      }
      if (req.get('x-requested-with') !== 'TestExecutionReport') {
        return res.status(403).json({ error: 'Missing request verification header.' });
      }
    }
    next();
  });
  app.post('/api/auth/login', express.json({ limit: '8kb' }), async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_-]{1,32}$/.test(username.trim()) ||
        typeof password !== 'string' || password.length < 1 || password.length > 128) {
      return res.status(400).json({ error: 'Username/password format is invalid.' });
    }
    const normalized = username.trim().toLowerCase();
    const retryAfter = auth.allowLogin(req.ip || 'unknown', normalized);
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    }
    try {
      const result = await auth.login(normalized, password, readToken(req));
      if (!result) return res.status(401).json({ error: 'Username or password is incorrect.' });
      if ('busy' in result) {
        res.setHeader('Retry-After', '2');
        return res.status(429).json({ error: 'Login service is busy. Try again shortly.' });
      }
      res.cookie(COOKIE_NAME, result.token, { ...cookieOptions, maxAge: SESSION_TTL_MS });
      return res.json(result.session);
    } catch {
      return res.status(500).json({ error: 'Unable to sign in. Please try again.' });
    }
  });
  // All other API routes require a real server-side session.
  app.use('/api', (req, res, next) => {
    const session = auth.resolve(readToken(req));
    if (!session) {
      res.clearCookie(COOKIE_NAME, cookieOptions);
      return res.status(401).json({ error: 'Please sign in.' });
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !sameToken(req.get('x-csrf-token'), session.csrfToken)) {
      return res.status(403).json({ error: 'Session verification failed. Reload the page.' });
    }
    res.locals.user = session.user;
    res.locals.session = session;
    next();
  });
  app.get('/api/auth/me', (_req, res) => res.json(res.locals.session));
  app.post('/api/auth/logout', (req, res) => {
    auth.revoke(readToken(req));
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.status(204).send();
  });
  return auth;
}
