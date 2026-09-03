export interface TestCase {
  id: string;
  testId: string;
  scenario: string;
  step: string;
  expectedResult: string;
  coverageType?: 'Positive' | 'Negative' | 'Validation' | 'Boundary';
  testerName?: string;
  testingType?: 'Functional' | 'Integration' | 'Regression' | 'Performance' | 'Security' | 'Usability';
  testingStatus?: 'Not Started' | 'In Progress' | 'Passed' | 'Failed' | 'Blocked';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  scenarios: Array<Scenario & { sourceGenerationId?: string; moduleName?: string }>;
}

export interface Scenario {
  id: string;
  name: string;
  moduleName?: string;
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
