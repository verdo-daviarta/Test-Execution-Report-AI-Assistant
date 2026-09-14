import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import { createServer, type ViteDevServer } from 'vite';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DEV_FILE_DENY } from './dev-files';

let vite: ViteDevServer;
let server: Server;
let base: string;
beforeAll(async () => {
  vite = await createServer({
    configFile: false, logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null, fs: { deny: DEV_FILE_DENY } },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const app = express();
  app.use(vite.middlewares);
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
}, 15000);
afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (vite) await vite.close();
});
describe('development file boundary', () => {
  it.each([
    '/data/test-execution-report.db',
    '/data/initial-user-credentials.txt',
    '/data/test-execution-report.db?raw',
    '/DATA/test-execution-report.db',
    '/@fs/' + process.cwd().replaceAll('\\', '/') + '/data/test-execution-report.db',
    '/backend/auth/service.ts',
    '/.env',
  ])('blocks direct access to %s without returning file contents', async path => {
    const response = await fetch(base + path);
    expect(response.status).toBe(403);
    await response.body?.cancel();
  });
  it('still serves the login application shell', async () => {
    const response = await fetch(base + '/');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('id="root"');
  });
});
