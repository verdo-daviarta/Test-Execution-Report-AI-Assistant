import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// OWASP's 32 MiB scrypt profile; asynchronous hashing keeps the event loop free.
const PREFIX = 'scrypt-32768-8-3';
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
}
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 15 || password.length > 128) {
    throw new Error('Password must contain 15 to 128 characters.');
  }
  const salt = randomBytes(16).toString('hex');
  return [PREFIX, salt, (await derive(password, salt)).toString('hex')].join('$');
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [prefix, salt, hash] = stored.split('$');
  if (prefix !== PREFIX || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hash || '')) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
