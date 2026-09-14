import { expect, it, vi } from 'vitest';
import { saveChangedProjectScenarios } from './projectSave';
import type { Scenario, Project } from '../types';
const scenarios = Array.from({ length: 40 }, (_, i) => ({ id: String(i), name: 'Case', description: '', testCases: [] } as Scenario));
it('saves only the changed scenario, and does nothing for unchanged data', async () => {
  const save = vi.fn().mockResolvedValue({ id: 'p' } as Project);
  await saveChangedProjectScenarios('p', scenarios, scenarios, save);
  expect(save).not.toHaveBeenCalled();
  const next = scenarios.map(s => s.id === '20' ? { ...s, name: 'Edited' } : s);
  await saveChangedProjectScenarios('p', scenarios, next, save);
  expect(save).toHaveBeenCalledExactlyOnceWith('p', next[20]);
});
it('stops and propagates an error instead of firing concurrent requests', async () => {
  const save = vi.fn().mockRejectedValue(new Error('429'));
  await expect(saveChangedProjectScenarios('p', [], scenarios, save)).rejects.toThrow('429');
  expect(save).toHaveBeenCalledTimes(1);
});
