import { HistoryItem, Project, Scenario } from '../types';

function apiHeaders(includeJson = false): HeadersInit {
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(import.meta.env.VITE_INTERNAL_API_KEY
      ? { 'x-api-key': import.meta.env.VITE_INTERNAL_API_KEY }
      : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'API request failed.');
  }

  return response.json();
}

export async function getHistoryFromApi(): Promise<HistoryItem[]> {
  const response = await fetch('/api/generations', { headers: apiHeaders() });
  return parseResponse<HistoryItem[]>(response);
}

export async function saveHistoryToApi(
  item: HistoryItem
): Promise<HistoryItem> {
  const response = await fetch('/api/generations', {
    method: 'POST',
    headers: apiHeaders(true),
    body: JSON.stringify(item),
  });

  return parseResponse<HistoryItem>(response);
}

export async function updateHistoryToApi(
  item: HistoryItem
): Promise<HistoryItem> {
  const response = await fetch(`/api/generations/${item.id}`, {
    method: 'PUT',
    headers: apiHeaders(true),
    body: JSON.stringify(item),
  });

  return parseResponse<HistoryItem>(response);
}

export async function deleteHistoryFromApi(id: string): Promise<void> {
  const response = await fetch(`/api/generations/${id}`, {
    method: 'DELETE',
    headers: apiHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete generation.');
  }
}

export async function getProjectsFromApi(): Promise<Project[]> {
  return parseResponse<Project[]>(await fetch('/api/projects', { headers: apiHeaders() }));
}

export async function createProjectToApi(name: string, description = ''): Promise<Project> {
  return parseResponse<Project>(await fetch('/api/projects', { method: 'POST', headers: apiHeaders(true), body: JSON.stringify({ name, description }) }));
}

export async function updateProjectToApi(project: Project): Promise<Project> {
  return parseResponse<Project>(await fetch(`/api/projects/${project.id}`, { method: 'PUT', headers: apiHeaders(true), body: JSON.stringify({ name: project.name, description: project.description }) }));
}

export async function deleteProjectFromApi(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: apiHeaders() });
  if (!response.ok) throw new Error('Failed to delete project.');
}

export async function saveScenarioToProjectApi(projectId: string, generationId: string, scenario: Scenario, moduleName: string): Promise<Project> {
  return parseResponse<Project>(await fetch(`/api/projects/${projectId}/scenarios`, { method: 'POST', headers: apiHeaders(true), body: JSON.stringify({ generationId, scenario, moduleName }) }));
}

export async function updateProjectScenarioApi(projectId: string, scenario: Scenario): Promise<Project> {
  return parseResponse<Project>(await fetch(`/api/projects/${projectId}/scenarios/${scenario.id}`, { method: 'PUT', headers: apiHeaders(true), body: JSON.stringify({ scenario }) }));
}

export async function deleteProjectScenarioApi(projectId: string, scenarioId: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/scenarios/${scenarioId}`, { method: 'DELETE', headers: apiHeaders() });
  if (!response.ok) throw new Error('Failed to remove scenario from project.');
}
