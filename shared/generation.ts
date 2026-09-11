export type ProviderName = 'openai' | 'gemini';
export interface GenerationInput {
  moduleName: string;
  requirement?: string;
  businessRules?: string;
  coverages?: string[];
  screenshot?: string | null;
  provider?: ProviderName;
}
export interface GeneratedTestCase {
  testId: string; scenario: string; step: string; expectedResult: string; coverageType?: string;
}
export interface GeneratedScenario {
  name: string; description: string; testCases: GeneratedTestCase[];
}
export interface GenerationPayload { scenarios: GeneratedScenario[] }
export interface GenerationResult extends GenerationPayload { provider: ProviderName; isMock: boolean }
