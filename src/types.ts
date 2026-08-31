export interface TestCase {
  id: string;
  testId: string;
  scenario: string;
  step: string;
  expectedResult: string;
}

export interface Scenario {
  id: string;
  name: string;
  count: number;
  description: string;
  testCases: TestCase[];
}

export interface HistoryItem {
  id: string;
  date: string;
  createdAt?: string;
  moduleName: string;
  scenarioCount: number;
  testCaseCount: number;
  status: 'COMPLETED' | 'ARCHIVED' | 'FAILED' | 'IN_PROGRESS';
  scenarios: Scenario[];
  requirement?: string;
  businessRules?: string;
  coverages?: string[];
  screenshotUrl?: string;
  isMock?: boolean;
  provider?: 'openai' | 'gemini';
  lastEditedAt?: string;
  revisionHistory?: Array<{ editedAt: string; scenarios: Scenario[] }>;
}
