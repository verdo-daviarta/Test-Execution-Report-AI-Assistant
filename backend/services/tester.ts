import type { AuthUser } from '../../shared/auth';
import { validateManualCases } from '../../shared/manual-cases';

export function sessionTester(user: AuthUser): string {
  if (!user?.id) throw new Error('Authenticated user is required.');
  return user.displayName?.trim() || user.username;
}

// Existing case attribution is a snapshot, not the identity of its current viewer.
export function assignTesters(scenario: any, actor: string, existing: any[] = []) {
  const names = new Map(existing.map(tc => [tc.id, tc.testerName ?? tc.tester_name ?? '']));
  const manual = new Map(existing.map(tc => [tc.id, Boolean(tc.isManual ?? tc.is_manual)]));
  const result = {
    ...scenario,
    testCases: (scenario.testCases || []).map((tc: any) => ({
      ...tc,
      testerName: names.has(tc.id) ? names.get(tc.id) : actor,
      isManual: manual.has(tc.id) ? manual.get(tc.id) : tc.isManual === true,
    })),
  };
  validateManualCases([result]);
  return result;
}
