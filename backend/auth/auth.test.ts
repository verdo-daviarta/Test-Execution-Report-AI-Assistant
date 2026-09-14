import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { openDatabase } from '../database';
import { createApiApp } from '../app';
import { insertInitialUsers, prepareInitialUsers } from './users';
import { createAuthService, SESSION_TTL_MS, tokenHash } from './service';
import { hashPassword, verifyPassword } from './password';

let accounts: Awaited<ReturnType<typeof prepareInitialUsers>>;
let db: ReturnType<typeof openDatabase>;
let server: Server;
let base: string;
let time: number;
const generate = vi.fn().mockResolvedValue({ scenarios: [], provider: 'gemini', isMock: true });
beforeAll(async () => { accounts = await prepareInitialUsers(); }, 15000);
beforeEach(async () => {
  time = Date.now();
  db = openDatabase(':memory:');
  insertInitialUsers(db, accounts);
  generate.mockClear();
  const app = createApiApp(db, generate, { secureCookies: true, now: () => time });
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  db.close();
});
function request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  return fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TestExecutionReport', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function login(index = 0, oldCookie?: string) {
  const account = accounts[index];
  const response = await request('/api/auth/login', 'POST', { username: account.username, password: account.password }, oldCookie ? { Cookie: oldCookie } : {});
  expect(response.status).toBe(200);
  const session = await response.json();
  const setCookie = response.headers.get('set-cookie')!;
  return { session, setCookie, headers: { Cookie: setCookie.split(';')[0], 'X-CSRF-Token': session.csrfToken } };
}

describe('local users and authenticated API', () => {
  it('persists manual coverage and creator without AI and rejects incomplete rows', async () => {
    const creator = await login(1);
    const editor = await login(2);
    await request('/api/projects', 'POST', { id: 'manual-project', name: 'Manual' }, creator.headers);
    const path = '/api/projects/manual-project/scenarios/manual-scenario';
    const scenario = { id: 'manual-scenario', name: 'Manual', testCases: [{
      id: 'draft', isManual: true, testId: 'CUSTOM-1', scenario: 'Boundary input',
      step: 'Enter maximum', expectedResult: 'Accepted', coverageType: 'Boundary', testerName: 'Forged',
    }] };
    const response = await request(path, 'PUT', { scenario }, creator.headers);
    expect(response.status).toBe(200);
    const saved = (await response.json()).scenarios[0];
    expect(saved.testCases[0]).toMatchObject({ isManual: true, coverageType: 'Boundary', testerName: creator.session.user.displayName });
    saved.testCases[0].testerName = 'Forged again';
    saved.testCases[0].coverageType = 'Negative';
    const edited = await request(path, 'PUT', { scenario: saved }, editor.headers);
    expect(edited.status).toBe(200);
    const projects = await (await request('/api/projects', 'GET', undefined, editor.headers)).json();
    expect(projects[0].scenarios[0].testCases[0]).toMatchObject({ isManual: true, coverageType: 'Negative', testerName: creator.session.user.displayName });
    saved.testCases[0].step = '';
    expect((await request(path, 'PUT', { scenario: saved }, editor.headers)).status).toBe(400);
    expect((db.prepare('SELECT step FROM project_test_cases WHERE scenario_id = ?').get('manual-scenario') as any).step).toBe('Enter maximum');
    expect(generate).not.toHaveBeenCalled();
  });

  it('attributes new cases to the session creator and preserves attribution across shared edits and copies', async () => {
    db.prepare('UPDATE users SET display_name = ? WHERE username = ?').run('Agung', 'qa2');
    db.prepare('UPDATE users SET display_name = ? WHERE username = ?').run('Sophia', 'qa4');
    const agung = await login(1);
    const sophia = await login(3);
    const input = {
      id: 'tester-generation', moduleName: 'Login', provider: 'gemini',
      scenarios: [{ id: 'tester-scenario', name: 'Login', description: '', testCases: [
        { id: 'tester-case', testId: 'TC-001', scenario: 'Valid login', step: 'Submit', expectedResult: 'Success', testerName: 'Verdo Daviarta' },
      ] }],
    };
    const created = await request('/api/generations', 'POST', input, agung.headers);
    expect(created.status).toBe(201);
    const saved = await created.json();
    expect(saved.scenarios[0].testCases[0].testerName).toBe('Agung');
    expect((await request('/api/generations', 'POST', input, sophia.headers)).status).toBe(409);
    const viewed = await (await request('/api/generations/tester-generation', 'GET', undefined, sophia.headers)).json();
    expect(viewed.scenarios[0].testCases[0].testerName).toBe('Agung');

    viewed.scenarios[0].testCases[0].testerName = 'Sophia';
    viewed.scenarios[0].testCases.push({ ...viewed.scenarios[0].testCases[0], id: 'sophia-case', testId: 'TC-002', testerName: 'Forged name' });
    const changed = await request('/api/generations/tester-generation', 'PUT', viewed, sophia.headers);
    expect(changed.status).toBe(200);
    const history = await changed.json();
    expect(history.scenarios[0].testCases.map((tc: any) => tc.testerName)).toEqual(['Agung', 'Sophia']);

    await request('/api/projects', 'POST', { id: 'tester-project', name: 'Shared' }, sophia.headers);
    const copied = await request('/api/projects/tester-project/scenarios', 'POST', {
      generationId: history.id, scenario: history.scenarios[0], moduleName: 'Login',
    }, sophia.headers);
    expect(copied.status).toBe(201);
    const projectScenario = (await copied.json()).scenarios[0];
    expect(projectScenario.testCases.map((tc: any) => tc.testerName)).toEqual(['Agung', 'Sophia']);

    const firstId = projectScenario.testCases[0].id;
    projectScenario.testCases[0].testerName = 'Verdo Daviarta';
    projectScenario.testCases.push({ ...projectScenario.testCases[0], id: 'new-project-case', testId: 'TC-003' });
    const updated = await request('/api/projects/tester-project/scenarios/' + projectScenario.id, 'PUT', { scenario: projectScenario }, agung.headers);
    expect(updated.status).toBe(200);
    const finalScenario = (await updated.json()).scenarios[0];
    expect(finalScenario.testCases[0].id).toBe(firstId);
    expect(finalScenario.testCases.map((tc: any) => tc.testerName)).toEqual(['Agung', 'Sophia', 'Agung']);
    const secondSave = await request('/api/projects/tester-project/scenarios/' + finalScenario.id, 'PUT', { scenario: finalScenario }, sophia.headers);
    expect((await secondSave.json()).scenarios[0].testCases.map((tc: any) => tc.testerName)).toEqual(['Agung', 'Sophia', 'Agung']);
  }, 15000);

  it('uses the session name for project scenarios without a persisted source', async () => {
    db.prepare('UPDATE users SET display_name = ? WHERE username = ?').run('Tania', 'qa3');
    const user = await login(2);
    await request('/api/projects', 'POST', { id: 'direct', name: 'Direct' }, user.headers);
    const response = await request('/api/projects/direct/scenarios', 'POST', { scenario: {
      name: 'Direct', testCases: [{ testId: 'TC-001', scenario: '', step: '', expectedResult: '', testerName: 'Verdo Daviarta' }],
    } }, user.headers);
    expect(response.status).toBe(201);
    expect((await response.json()).scenarios[0].testCases[0].testerName).toBe('Tania');
  });
  it('creates four unique salted accounts without changing existing users on rerun', async () => {
    expect(accounts.map(a => a.username)).toEqual(['qa1', 'qa2', 'qa3', 'qa4']);
    expect(new Set(accounts.map(a => a.passwordHash)).size).toBe(4);
    for (const a of accounts) {
      expect(a.passwordHash).not.toContain(a.password);
      expect(await verifyPassword(a.password, a.passwordHash)).toBe(true);
    }
    expect(() => insertInitialUsers(db, accounts)).toThrow('already exist');
    expect(db.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 4 });
    const first = await hashPassword('A-long-test-password');
    const second = await hashPassword('A-long-test-password');
    expect(first).not.toBe(second);
    expect(await verifyPassword('wrong', first)).toBe(false);
  }, 15000);

  it.each(['/api/generations', '/api/projects', '/api/health/database', '/api/auth/me'])('protects %s from anonymous access', async path => {
    expect((await request(path)).status).toBe(401);
  });
  it('protects generation, writes and deletes, including forged identity/API-key headers', async () => {
    const forged = { 'x-api-key': 'old-shared-key', 'x-user-id': accounts[0].id, 'x-team-id': 'shared', Cookie: 'ter_session=' + 'a'.repeat(64) };
    for (const [path, method] of [['/api/generate', 'POST'], ['/api/projects', 'POST'], ['/api/generations/fake', 'DELETE']]) {
      expect((await request(path, method, {}, forged)).status).toBe(401);
    }
    expect(generate).not.toHaveBeenCalled();
  });
  it('returns the same failure for unknown usernames and incorrect passwords', async () => {
    const a = await request('/api/auth/login', 'POST', { username: 'unknown', password: 'wrong' });
    const b = await request('/api/auth/login', 'POST', { username: 'qa1', password: 'wrong' });
    expect([a.status, b.status]).toEqual([401, 401]);
    expect(await a.json()).toEqual(await b.json());
  });
  it('logs in every user with the same permissions, but separate identities and sessions', async () => {
    const sessions = [];
    for (let i = 0; i < 4; i++) {
      const logged = await login(i);
      expect(logged.session.user).toMatchObject({ username: accounts[i].username, role: 'member', workspaceId: 'shared' });
      expect(logged.setCookie).toContain('HttpOnly');
      expect(logged.setCookie).toContain('SameSite=Strict');
      expect(logged.setCookie).toContain('Secure');
      expect(logged.session.user).not.toHaveProperty('password_hash');
      expect(JSON.stringify(logged.session)).not.toContain(accounts[i].password);
      const me = await request('/api/auth/me', 'GET', undefined, logged.headers);
      expect(me.headers.get('cache-control')).toBe('no-store');
      expect(await me.json()).toEqual(logged.session);
      sessions.push(logged.headers.Cookie);
    }
    expect(new Set(sessions).size).toBe(4);
  }, 15000);
  it('allows different users to read, update and delete the same project', async () => {
    const a = await login(0);
    const b = await login(1);
    const created = await request('/api/projects', 'POST', { id: 'shared-project', name: 'Shared project' }, a.headers);
    expect(created.status).toBe(201);
    expect((await (await request('/api/projects', 'GET', undefined, b.headers)).json())[0].name).toBe('Shared project');
    expect((await request('/api/projects/shared-project', 'PUT', { name: 'Edited by QA2' }, b.headers)).status).toBe(200);
    expect((await (await request('/api/projects', 'GET', undefined, a.headers)).json())[0].name).toBe('Edited by QA2');
    expect((await request('/api/projects/shared-project', 'DELETE', undefined, b.headers)).status).toBe(204);
  });
  it('enforces CSRF and rejects cross-origin login and writes', async () => {
    const a = await login(0);
    expect((await request('/api/projects', 'POST', { name: 'Bad' }, { Cookie: a.headers.Cookie })).status).toBe(403);
    expect((await request('/api/projects', 'POST', { name: 'Bad' }, { ...a.headers, 'X-CSRF-Token': 'wrong' })).status).toBe(403);
    expect((await request('/api/projects', 'POST', { name: 'Bad' }, { ...a.headers, Origin: 'https://attacker.example' })).status).toBe(403);
    expect((await request('/api/auth/login', 'POST', { username: 'qa1', password: 'wrong' }, { Origin: 'https://attacker.example' })).status).toBe(403);
    expect((await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status).toBe(403);
  });
  it('rotates session at login and revokes only the logged-out session', async () => {
    const a = await login(0);
    const otherDevice = await login(0);
    const rotated = await login(1, a.headers.Cookie);
    expect(rotated.headers.Cookie).not.toBe(a.headers.Cookie);
    expect((await request('/api/auth/me', 'GET', undefined, a.headers)).status).toBe(401);
    const logout = await request('/api/auth/logout', 'POST', undefined, rotated.headers);
    expect(logout.status).toBe(204);
    expect(logout.headers.get('set-cookie')).toContain('Expires=Thu, 01 Jan 1970');
    expect((await request('/api/auth/me', 'GET', undefined, rotated.headers)).status).toBe(401);
    expect((await request('/api/auth/me', 'GET', undefined, otherDevice.headers)).status).toBe(200);
  });
  it('stores only a digest of each token and rejects expired or disabled sessions', async () => {
    const a = await login();
    const raw = a.headers.Cookie.split('=')[1];
    const row = db.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };
    expect(row.token_hash).toBe(tokenHash(raw));
    expect(row.token_hash).not.toBe(raw);
    expect(createAuthService(db, () => time).resolve(raw)?.user.username).toBe('qa1');
    time += SESSION_TTL_MS + 1;
    expect((await request('/api/auth/me', 'GET', undefined, a.headers)).status).toBe(401);
    const fresh = await login();
    db.prepare('UPDATE users SET active = 0 WHERE username = ?').run('qa1');
    expect((await request('/api/auth/me', 'GET', undefined, fresh.headers)).status).toBe(401);
  });
  it('limits login attempts with Retry-After and recovers after the window', async () => {
    const auth = createAuthService(db, () => time);
    for (let i = 0; i < 10; i++) expect(auth.allowLogin('127.0.0.1', 'qa1')).toBe(0);
    const blocked = await request('/api/auth/login', 'POST', { username: 'qa1', password: accounts[0].password }, { 'X-Forwarded-For': 'spoofed' });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    time += 15 * 60 * 1000 + 1;
    expect((await login()).session.user.username).toBe('qa1');
  });
  it('returns safe errors for oversized or malformed login bodies', async () => {
    expect((await request('/api/auth/login', 'POST', { username: 'qa1', password: 'x'.repeat(9000) })).status).toBe(413);
    const broken = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TestExecutionReport' }, body: '{' });
    expect(broken.status).toBe(400);
    expect(await broken.json()).toEqual({ error: 'Invalid JSON.' });
    expect((await request('/api/auth/login', 'POST', { username: {}, password: 'x' })).status).toBe(400);
  });
});
