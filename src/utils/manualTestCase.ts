import type { TestCase } from '../types';
import { createId } from './id';

export function createManualTestCase(testerName: string): TestCase {
  return {
    id: createId('tc-manual'), isManual: true,
    testId: '', scenario: '', step: '', expectedResult: '',
    coverageType: undefined, testerName,
  };
}
