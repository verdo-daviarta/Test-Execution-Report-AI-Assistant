import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { openDatabase } from '../database';
import { registerHistoryRoutes } from './history';
import { registerProjectRoutes } from './projects';
import { registerGenerationRoute } from './generation';
import { createGenerationService } from '../services/generation';

const db = openDatabase(':memory:');
let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  registerHistoryRoutes(app, db);
  registerProjectRoutes(app, db);
  registerGenerationRoute(app, createGenerationService({ openai: { async generate() { throw new Error('private upstream detail'); } } }));
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
});
afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  db.close();
});
function request(path: string, method = 'GET', body?: unknown) {
  return fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}

describe('HTTP routes with isolated SQLite', () => {
  it('persists nested History, returns consistent list/detail, updates and deletes', async () => {
    const item = {
      id: 'generation-test', moduleName: 'Login', provider: 'gemini', createdAt: '2026-09-11T00:00:00.000Z',
      scenarios: [{ id: 'scenario-test', name: 'Login suite', description: 'Description', testCases: [
        { id: 'case-test', testId: 'TC-001', scenario: 'Invalid login', step: 'Submit', expectedResult: 'Rejected', coverageType: 'Negative',
          testerName: 'QA', testingType: 'Functional', testingStatus: 'Passed' },
      ] }],
    };
    const saved = await request('/api/generations', 'POST', item);
    expect(saved.status).toBe(201);
    const result = await saved.json();
    expect(result).toMatchObject({ scenarioCount: 1, testCaseCount: 1, provider: 'gemini', scenarios: item.scenarios });
    expect(await (await request('/api/generations/' + item.id)).json()).toEqual(result);
    expect(await (await request('/api/generations')).json()).toEqual([result]);
    item.scenarios[0].testCases[0].expectedResult = 'Updated';
    expect((await request('/api/generations/' + item.id, 'PUT', item)).status).toBe(200);
    expect(db.prepare('SELECT expected_result FROM test_cases WHERE id = ?').get('case-test')).toEqual({ expected_result: 'Updated' });
    expect((await request('/api/generations/' + item.id, 'PUT', { ...item, id: 'wrong' })).status).toBe(400);
    expect((await request('/api/generations/' + item.id, 'DELETE')).status).toBe(204);
    expect((await request('/api/generations/' + item.id)).status).toBe(404);
    expect(db.prepare('SELECT COUNT(*) AS count FROM test_cases').get()).toEqual({ count: 0 });
  });

  it('preserves Project scenario append and metadata editing', async () => {
    const response = await request('/api/projects', 'POST', { id: 'project-test', name: 'QA Project' });
    expect(response.status).toBe(201);
    const scenario = { name: 'Suite', description: '', testCases: [
      { testId: 'TC-001', scenario: 'Valid', step: 'Submit', expectedResult: 'Success', coverageType: 'Positive', testerName: 'QA' },
    ] };
    for (let i = 0; i < 2; i++) expect((await request('/api/projects/project-test/scenarios', 'POST', { scenario, generationId: 'source', moduleName: 'Login' })).status).toBe(201);
    const project = (await (await request('/api/projects')).json())[0];
    expect(project.scenarios).toHaveLength(2);
    expect(project.scenarios[0].id).not.toBe(project.scenarios[1].id);
    const changed = { ...project.scenarios[0], name: 'Edited suite' };
    const updated = await request('/api/projects/project-test/scenarios/' + changed.id, 'PUT', { scenario: changed });
    expect(updated.status).toBe(200);
    expect((await updated.json()).scenarios[0]).toMatchObject({ name: 'Edited suite', testCases: [{ testerName: 'QA', coverageType: 'Positive' }] });
    expect((await request('/api/projects/project-test/scenarios/' + changed.id, 'DELETE')).status).toBe(204);
    expect((await request('/api/projects/project-test', 'DELETE')).status).toBe(204);
    expect(db.prepare('SELECT COUNT(*) AS count FROM project_test_cases').get()).toEqual({ count: 0 });
  });

  it('returns 400 for bad input and 502 without exposing upstream details', async () => {
    expect((await request('/api/generate', 'POST', {})).status).toBe(400);
    const failed = await request('/api/generate', 'POST', { moduleName: 'Login' });
    expect(failed.status).toBe(502);
    expect(await failed.text()).not.toContain('private upstream detail');
    const mock = await request('/api/generate', 'POST', { moduleName: 'Login', provider: 'gemini' });
    expect(mock.status).toBe(200);
    expect(await mock.json()).toMatchObject({ isMock: true, provider: 'gemini' });
  });
});
