import type { Project, Scenario } from '../types';

export async function saveChangedProjectScenarios(
  projectId: string,
  previous: Scenario[],
  next: Scenario[],
  save: (projectId: string, scenario: Scenario) => Promise<Project>,
): Promise<Project | undefined> {
  const baseline = new Map(previous.map(scenario => [scenario.id, JSON.stringify(scenario)]));
  let result: Project | undefined;
  // Stop at the first error. Never burst-save every scenario using Promise.all.
  for (const scenario of next) {
    if (baseline.get(scenario.id) !== JSON.stringify(scenario)) {
      result = await save(projectId, scenario);
    }
  }
  return result;
}
