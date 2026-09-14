import { expect, it, vi } from 'vitest';
import { createUserRateLimiter } from './rate-limit';

it('isolates AI, edits, reads and users, enforces limits and resets the window', () => {
  let now = 0;
  const limiter = createUserRateLimiter(() => now);
  function call(user = 'a', method = 'PUT', path = '/projects/p/scenarios/s') {
    const next = vi.fn();
    const res: any = { locals: { user: { id: user } }, status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
    limiter({ method, path, ip: 'shared-ip' } as any, res, next);
    return { next, res };
  }
  for (let i = 0; i < 10; i++) expect(call('a', 'POST', '/generate').next).toHaveBeenCalled();
  expect(call('a', 'POST', '/generate').res.status).toHaveBeenCalledWith(429);
  for (let i = 0; i < 120; i++) expect(call().next).toHaveBeenCalled();
  const rejected = call();
  expect(rejected.res.status).toHaveBeenCalledWith(429);
  expect(rejected.res.setHeader).toHaveBeenCalledWith('Retry-After', 60);
  expect(call('b').next).toHaveBeenCalled();
  expect(call('a', 'GET', '/projects').next).toHaveBeenCalled();
  now = 60_000;
  expect(call().next).toHaveBeenCalled();
});
