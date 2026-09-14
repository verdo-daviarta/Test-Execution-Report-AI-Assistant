import type { RequestHandler } from 'express';

export const USER_RATE_LIMITS = { generation: 10, editing: 120, reading: 300 };
export function createUserRateLimiter(now = Date.now): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const userId = res.locals.user?.id;
    if (!userId) return res.status(401).json({ error: 'Please sign in.' });
    const category = req.method === 'POST' && /^\/generate\/?$/i.test(req.path)
      ? 'generation' : ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? 'reading' : 'editing';
    const time = now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= time) buckets.delete(key);
    const key = category + ':' + userId;
    const bucket = buckets.get(key) || { count: 0, resetAt: time + 60_000 };
    buckets.set(key, bucket);
    const limit = USER_RATE_LIMITS[category];
    if (bucket.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - time) / 1000));
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.', category, retryAfter });
    }
    bucket.count++;
    next();
  };
}
