import express from 'express';
import type Database from 'better-sqlite3';
import { assignTesters, sessionTester } from '../services/tester';
function getGenerationById(db: Database.Database, id: string) {
  const generation = db
    .prepare('SELECT * FROM generations WHERE id = ?')
    .get(id) as any;

  if (!generation) return undefined;

  const scenarios = db
    .prepare(`
      SELECT *
      FROM scenarios
      WHERE generation_id = ?
      ORDER BY sort_order
    `)
    .all(id) as any[];

  return {
    id: generation.id,
    date: generation.created_at,
    createdAt: generation.created_at,
    moduleName: generation.module_name,
    requirement: generation.requirement || '',
    businessRules: generation.business_rules || '',
    provider: generation.provider,
    status: generation.status,
    isMock: Boolean(generation.is_mock),
    scenarioCount: scenarios.length,
    testCaseCount: scenarios.reduce((total, scenario) => {
      const cases = db
        .prepare(`
          SELECT *
          FROM test_cases
          WHERE scenario_id = ?
          ORDER BY sort_order
        `)
        .all(scenario.id) as any[];

      return total + cases.length;
    }, 0),
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      count: (db
        .prepare('SELECT COUNT(*) AS count FROM test_cases WHERE scenario_id = ?')
        .get(scenario.id) as { count: number }).count,
      testCases: db
        .prepare(`
          SELECT
            id,
            test_id AS testId,
            scenario,
            step,
            expected_result AS expectedResult,
            coverage_type AS coverageType,
            tester_name AS testerName,
            is_manual AS isManual,
            testing_type AS testingType,
            testing_status AS testingStatus
          FROM test_cases
          WHERE scenario_id = ?
          ORDER BY sort_order
        `)
        .all(scenario.id).map((tc: any) => ({ ...tc, isManual: Boolean(tc.isManual) })),
    })),
  };
}

export function registerHistoryRoutes(app: express.Express, db: Database.Database) {
app.get('/api/generations/:id', (req, res) => {
 const item = getGenerationById(db, req.params.id);
 if (!item) return res.status(404).json({error: 'Generation not found.'});
 res.json(item);
});
app.get('/api/generations', (_req, res) => {
  const generations = db
    .prepare(`
      SELECT id
      FROM generations
      ORDER BY created_at DESC
    `)
    .all() as Array<{ id: string }>;

  res.json(
    generations
      .map((generation) => getGenerationById(db, generation.id))
      .filter(Boolean)
  );
});

  const saveGeneration = (input: any, actor: string) => {
    const previous = getGenerationById(db, input.id);
    const existingCases = previous?.scenarios.flatMap(s => s.testCases) || [];
    const item = { ...input, scenarios: (input.scenarios || []).map((s: any) => assignTesters(s, actor, existingCases)) };
    const createdAt = item.createdAt || new Date().toISOString();
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT OR REPLACE INTO generations
          (id, module_name, requirement, business_rules, provider, status, is_mock, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.id,
        item.moduleName,
        item.requirement || '',
        item.businessRules || '',
        item.provider || 'openai',
        item.status || 'COMPLETED',
        item.isMock ? 1 : 0,
        createdAt,
        new Date().toISOString(),
      );

      db.prepare('DELETE FROM scenarios WHERE generation_id = ?').run(item.id);
      const insertScenario = db.prepare(`
        INSERT INTO scenarios (id, generation_id, name, description, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `);
      const insertTestCase = db.prepare(`
        INSERT INTO test_cases (id, scenario_id, test_id, scenario, step, expected_result, sort_order, coverage_type, tester_name, testing_type, testing_status, is_manual)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      (item.scenarios || []).forEach((scenario: any, scenarioIndex: number) => {
        insertScenario.run(scenario.id, item.id, scenario.name, scenario.description || '', scenarioIndex);
        (scenario.testCases || []).forEach((testCase: any, testCaseIndex: number) => {
          insertTestCase.run(
            testCase.id,
            scenario.id,
            testCase.testId,
            testCase.scenario,
            testCase.step,
            testCase.expectedResult,
            testCaseIndex,
            testCase.coverageType || 'Positive',
            testCase.testerName,
            testCase.testingType || 'Functional',
            testCase.testingStatus || 'Not Started',
            testCase.isManual ? 1 : 0,
          );
        });
      });
    });

    transaction();
    return getGenerationById(db, item.id);
  };

  app.post('/api/generations', (req, res) => {
    if (getGenerationById(db, req.body.id)) return res.status(409).json({ error: 'Generation already exists.' });
    const saved = saveGeneration(req.body, sessionTester(res.locals.user));
    res.status(201).json(saved);
  });

  app.put('/api/generations/:id', (req, res) => {
    if (req.params.id !== req.body.id) {
      return res.status(400).json({ error: 'Generation ID mismatch.' });
    }
    if (!getGenerationById(db, req.params.id)) {
      return res.status(404).json({ error: 'Generation not found.' });
    }
    res.json(saveGeneration(req.body, sessionTester(res.locals.user)));
  });

app.delete('/api/generations/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM generations WHERE id = ?')
    .run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({
      error: 'Generation not found.',
    });
  }

  res.status(204).send();
});
}
