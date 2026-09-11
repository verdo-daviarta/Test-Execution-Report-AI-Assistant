import express from 'express';
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
function getProjectById(db: Database.Database, id: string) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!project) return undefined;
  const scenarios = db.prepare(`SELECT * FROM project_scenarios WHERE project_id = ? ORDER BY sort_order`).all(id) as any[];
  return {
    id: project.id, name: project.name, description: project.description,
    createdAt: project.created_at, updatedAt: project.updated_at,
    scenarios: scenarios.map((scenario) => ({
      id: scenario.scenario_id, name: scenario.name, description: scenario.description, moduleName: scenario.module_name || project.name,
      sourceGenerationId: scenario.source_generation_id,
      count: (db.prepare('SELECT COUNT(*) AS count FROM project_test_cases WHERE scenario_id = ?').get(scenario.scenario_id) as any)?.count || 0,
      testCases: db.prepare(`SELECT id, test_id AS testId, scenario, step, expected_result AS expectedResult, coverage_type AS coverageType, tester_name AS testerName, testing_type AS testingType, testing_status AS testingStatus FROM project_test_cases WHERE scenario_id = ? ORDER BY sort_order`).all(scenario.scenario_id),
    })),
  };
}

export function registerProjectRoutes(app: express.Express, db: Database.Database) {
  app.get('/api/projects', (_req, res) => {
    const rows = db.prepare('SELECT id FROM projects ORDER BY updated_at DESC').all() as any[];
    res.json(rows.map((row) => getProjectById(db, row.id)));
  });
  app.post('/api/projects', (req, res) => {
    const now = new Date().toISOString();
    const id = req.body.id || `project-${Date.now()}`;
    db.prepare('INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, String(req.body.name || 'Untitled Project').trim(), req.body.description || '', now, now);
    res.status(201).json(getProjectById(db, id));
  });
  app.put('/api/projects/:id', (req, res) => {
    if (!getProjectById(db, req.params.id)) return res.status(404).json({ error: 'Project not found.' });
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Project name is required.' });
    db.prepare('UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?').run(name, req.body.description || '', new Date().toISOString(), req.params.id);
    res.json(getProjectById(db, req.params.id));
  });
  app.delete('/api/projects/:id', (req, res) => {
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Project not found.' });
    res.status(204).send();
  });
  app.post('/api/projects/:id/scenarios', (req, res) => {
    const project = getProjectById(db, req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const scenario = req.body.scenario;
    const now = new Date().toISOString();
    const sourceGenerationId = req.body.generationId || null;
    const moduleName = String(req.body.moduleName || project.name);
    const transaction = db.transaction(() => {
      // Every generation is appended as a new project scenario. Never reuse the
      // source scenario id, otherwise a later generation could replace existing data.
      let projectScenarioId = `ps-${req.params.id}-${randomUUID()}`;
      while (db.prepare('SELECT 1 FROM project_scenarios WHERE scenario_id = ?').get(projectScenarioId)) {
        projectScenarioId = `ps-${req.params.id}-${randomUUID()}`;
      }
      db.prepare('INSERT OR REPLACE INTO project_scenarios (project_id, scenario_id, source_generation_id, name, description, module_name, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(req.params.id, projectScenarioId, sourceGenerationId, scenario.name, scenario.description || '', moduleName, project.scenarios.length);
      (scenario.testCases || []).forEach((tc: any, index: number) => db.prepare('INSERT INTO project_test_cases (id, project_id, scenario_id, test_id, scenario, step, expected_result, sort_order, coverage_type, tester_name, testing_type, testing_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(`ptc-${randomUUID()}`, req.params.id, projectScenarioId, tc.testId, tc.scenario, tc.step, tc.expectedResult, index, tc.coverageType || 'Positive', tc.testerName || 'Verdo Daviarta', tc.testingType || 'Functional', tc.testingStatus || 'Not Started'));
      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, req.params.id);
    });
    transaction(); res.status(201).json(getProjectById(db, req.params.id));
  });
  app.put('/api/projects/:projectId/scenarios/:scenarioId', (req, res) => {
    if (!getProjectById(db, req.params.projectId)) return res.status(404).json({ error: 'Project not found.' });
    const scenario = req.body.scenario; const now = new Date().toISOString();
    const transaction = db.transaction(() => {
      const existing = db.prepare('SELECT 1 FROM project_scenarios WHERE project_id = ? AND scenario_id = ?').get(req.params.projectId, req.params.scenarioId);
      if (existing) {
        db.prepare('UPDATE project_scenarios SET name = ?, description = ?, module_name = ? WHERE project_id = ? AND scenario_id = ?').run(scenario.name, scenario.description || '', scenario.moduleName || '', req.params.projectId, req.params.scenarioId);
      } else {
        const count = (db.prepare('SELECT COUNT(*) AS count FROM project_scenarios WHERE project_id = ?').get(req.params.projectId) as { count: number }).count;
        db.prepare('INSERT INTO project_scenarios (project_id, scenario_id, source_generation_id, name, description, module_name, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(req.params.projectId, req.params.scenarioId, null, scenario.name, scenario.description || '', scenario.moduleName || '', count);
      }
       db.prepare('DELETE FROM project_test_cases WHERE project_id = ? AND scenario_id = ?').run(req.params.projectId, req.params.scenarioId);
       (scenario.testCases || []).forEach((tc: any, index: number) => db.prepare('INSERT INTO project_test_cases (id, project_id, scenario_id, test_id, scenario, step, expected_result, sort_order, coverage_type, tester_name, testing_type, testing_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(`ptc-${randomUUID()}`, req.params.projectId, req.params.scenarioId, tc.testId, tc.scenario, tc.step, tc.expectedResult, index, tc.coverageType || 'Positive', tc.testerName || 'Verdo Daviarta', tc.testingType || 'Functional', tc.testingStatus || 'Not Started'));
      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, req.params.projectId);
    });
    transaction(); res.json(getProjectById(db, req.params.projectId));
  });
  app.delete('/api/projects/:projectId/scenarios/:scenarioId', (req, res) => {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM project_test_cases WHERE project_id = ? AND scenario_id = ?').run(req.params.projectId, req.params.scenarioId);
      db.prepare('DELETE FROM project_scenarios WHERE project_id = ? AND scenario_id = ?').run(req.params.projectId, req.params.scenarioId);
      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.projectId);
    });
    transaction();
    res.status(204).send();
  });
}
