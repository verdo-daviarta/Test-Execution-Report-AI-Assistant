import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDirectory = path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const databasePath = path.join(dataDirectory, 'test-execution-report.db');

export const db = new Database(databasePath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    module_name TEXT NOT NULL,
    requirement TEXT,
    business_rules TEXT,
    provider TEXT NOT NULL,
    status TEXT NOT NULL,
    is_mock INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    generation_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS test_cases (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    test_id TEXT NOT NULL,
    scenario TEXT NOT NULL,
    step TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    coverage_type TEXT NOT NULL DEFAULT 'Positive',
    tester_name TEXT NOT NULL DEFAULT 'Verdo Daviarta',
    testing_type TEXT NOT NULL DEFAULT 'Functional',
    testing_status TEXT NOT NULL DEFAULT 'Not Started',
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_scenarios (
    project_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    source_generation_id TEXT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    module_name TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    PRIMARY KEY (project_id, scenario_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_test_cases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    test_id TEXT NOT NULL,
    scenario TEXT NOT NULL,
    step TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    coverage_type TEXT NOT NULL DEFAULT 'Positive',
    tester_name TEXT NOT NULL DEFAULT 'Verdo Daviarta',
    testing_type TEXT NOT NULL DEFAULT 'Functional',
    testing_status TEXT NOT NULL DEFAULT 'Not Started',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

for (const column of [
  "coverage_type TEXT NOT NULL DEFAULT 'Positive'",
  "tester_name TEXT NOT NULL DEFAULT 'Verdo Daviarta'",
  "testing_type TEXT NOT NULL DEFAULT 'Functional'",
  "testing_status TEXT NOT NULL DEFAULT 'Not Started'",
]) {
  try { db.exec(`ALTER TABLE test_cases ADD COLUMN ${column}`); } catch { /* existing database already migrated */ }
}

try { db.exec("ALTER TABLE project_test_cases ADD COLUMN coverage_type TEXT NOT NULL DEFAULT 'Positive'"); } catch { /* existing database already migrated */ }
try { db.exec("ALTER TABLE project_scenarios ADD COLUMN module_name TEXT NOT NULL DEFAULT ''"); } catch { /* existing database already migrated */ }
