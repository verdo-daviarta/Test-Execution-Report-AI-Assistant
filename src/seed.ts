import { db } from './database';
import { initialHistory } from './data/initialData';

type CoverageType = 'Positive' | 'Negative' | 'Validation' | 'Boundary';

function inferCoverageType(testCase: { scenario: string; step: string }): CoverageType {
  const content = `${testCase.scenario} ${testCase.step}`.toLowerCase();
  if (/(injection|saniti[sz]|special character|data type)/.test(content)) return 'Validation';
  if (/(invalid|incorrect|empty|conflict|declin|lockout|fail)/.test(content)) return 'Negative';
  if (/(minimum|maximum|threshold|limit|overflow)/.test(content)) return 'Boundary';
  return 'Positive';
}

const seed = db.transaction(() => {
  db.exec(`
    DELETE FROM project_test_cases;
    DELETE FROM project_scenarios;
    DELETE FROM projects;
    DELETE FROM test_cases;
    DELETE FROM scenarios;
    DELETE FROM generations;
  `);

  const insertGeneration = db.prepare(`
    INSERT INTO generations (id, module_name, requirement, business_rules, provider, status, is_mock, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertScenario = db.prepare(`
    INSERT INTO scenarios (id, generation_id, name, description, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertTestCase = db.prepare(`
    INSERT INTO test_cases (id, scenario_id, test_id, scenario, step, expected_result, sort_order, coverage_type, tester_name, testing_type, testing_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertProjectScenario = db.prepare(`
    INSERT INTO project_scenarios (project_id, scenario_id, source_generation_id, name, description, module_name, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProjectTestCase = db.prepare(`
    INSERT INTO project_test_cases (id, project_id, scenario_id, test_id, scenario, step, expected_result, sort_order, coverage_type, tester_name, testing_type, testing_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  initialHistory.forEach((generation, generationIndex) => {
    const timestamp = generation.createdAt || new Date().toISOString();
    insertGeneration.run(
      generation.id,
      generation.moduleName,
      generation.requirement || '',
      generation.businessRules || '',
      generation.provider || 'openai',
      generation.status,
      generation.isMock ? 1 : 0,
      timestamp,
      timestamp,
    );

    const projectId = `seed-project-${generationIndex + 1}`;
    insertProject.run(projectId, generation.moduleName, generation.requirement || 'Seeded project data.', timestamp, timestamp);

    generation.scenarios.forEach((scenario, scenarioIndex) => {
      insertScenario.run(scenario.id, generation.id, scenario.name, scenario.description, scenarioIndex);

      const projectScenarioId = `seed-ps-${generationIndex + 1}-${scenarioIndex + 1}`;
      insertProjectScenario.run(projectId, projectScenarioId, generation.id, scenario.name, scenario.description, generation.moduleName, scenarioIndex);

      scenario.testCases.forEach((testCase, testCaseIndex) => {
        const coverageType = testCase.coverageType || inferCoverageType(testCase);
        insertTestCase.run(
          testCase.id,
          scenario.id,
          testCase.testId,
          testCase.scenario,
          testCase.step,
          testCase.expectedResult,
          testCaseIndex,
          coverageType,
          testCase.testerName || 'Verdo Daviarta',
          testCase.testingType || 'Functional',
          testCase.testingStatus || 'Not Started',
        );
        insertProjectTestCase.run(
          `seed-ptc-${generationIndex + 1}-${scenarioIndex + 1}-${testCaseIndex + 1}`,
          projectId,
          projectScenarioId,
          testCase.testId,
          testCase.scenario,
          testCase.step,
          testCase.expectedResult,
          testCaseIndex,
          coverageType,
          testCase.testerName || 'Verdo Daviarta',
          testCase.testingType || 'Functional',
          testCase.testingStatus || 'Not Started',
        );
      });
    });
  });
});

seed();
console.log(`Database reseeded with ${initialHistory.length} generations and ${initialHistory.length} projects.`);
