export const MANUAL_COVERAGES = ['Positive', 'Negative', 'Validation', 'Boundary'] as const;
export class ManualCaseValidationError extends Error {}
export function validateManualCases(scenarios: Array<{ testCases: any[] }>) {
  for (const scenario of scenarios) {
    for (const tc of scenario.testCases) {
      if (!tc.isManual) continue;
      if (['testId', 'scenario', 'step', 'expectedResult'].some(key => typeof tc[key] !== 'string' || !tc[key].trim()) ||
          !MANUAL_COVERAGES.includes(tc.coverageType)) {
        throw new ManualCaseValidationError('Lengkapi TEST ID, SCENARIO TARGET, EXECUTION STEPS, EXPECTED OUTCOME, dan COVERAGE TEST pada setiap test case manual.');
      }
    }
  }
}
