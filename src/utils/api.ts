import { HistoryItem, Project, Scenario } from '../types';
import { apiFetch } from './http';
import { responseError } from './apiError';
import type { GenerationInput, GenerationResult } from '../../shared/generation';

export async function generateScenariosFromApi(input: GenerationInput, signal?: AbortSignal): Promise<GenerationResult> {
  return parseResponse<GenerationResult>(await apiFetch('/api/generate', {
    method: 'POST',
    headers: apiHeaders(true),
    body: JSON.stringify(input),
    signal,
  }));
}

function apiHeaders(includeJson = false): HeadersInit {
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await responseError(response);
  }

  return response.json();
}

export async function getHistoryFromApi(): Promise<HistoryItem[]> {
  const response = await apiFetch('/api/generations', { headers: apiHeaders() });
  return parseResponse<HistoryItem[]>(response);
}

export async function saveHistoryToApi(
  item: HistoryItem
): Promise<HistoryItem> {
  const response = await apiFetch('/api/generations', {
    method: 'POST',
    headers: apiHeaders(true),
    body: JSON.stringify(item),
  });

  return parseResponse<HistoryItem>(response);
}

export async function updateHistoryToApi(
  item: HistoryItem
): Promise<HistoryItem> {
  const response = await apiFetch(`/api/generations/${item.id}`, {
    method: 'PUT',
    headers: apiHeaders(true),
    body: JSON.stringify(item),
  });

  return parseResponse<HistoryItem>(response);
}

export async function deleteHistoryFromApi(id: string): Promise<void> {
  const response = await apiFetch(`/api/generations/${id}`, {
    method: 'DELETE',
    headers: apiHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete generation.');
  }
}

export async function getProjectsFromApi(): Promise<Project[]> {
  return parseResponse<Project[]>(await apiFetch('/api/projects', { headers: apiHeaders() }));
}

export async function createProjectToApi(name: string, description = ''): Promise<Project> {
  return parseResponse<Project>(await apiFetch('/api/projects', { method: 'POST', headers: apiHeaders(true), body: JSON.stringify({ name, description }) }));
}

export async function updateProjectToApi(project: Project): Promise<Project> {
  return parseResponse<Project>(await apiFetch(`/api/projects/${project.id}`, { method: 'PUT', headers: apiHeaders(true), body: JSON.stringify({ name: project.name, description: project.description }) }));
}

export async function deleteProjectFromApi(id: string): Promise<void> {
  const response = await apiFetch(`/api/projects/${id}`, { method: 'DELETE', headers: apiHeaders() });
  if (!response.ok) throw new Error('Failed to delete project.');
}

export async function saveScenarioToProjectApi(projectId: string, generationId: string, scenario: Scenario, moduleName: string): Promise<Project> {
  return parseResponse<Project>(await apiFetch(`/api/projects/${projectId}/scenarios`, { method: 'POST', headers: apiHeaders(true), body: JSON.stringify({ generationId, scenario, moduleName }) }));
}

export async function updateProjectScenarioApi(projectId: string, scenario: Scenario): Promise<Project> {
  return parseResponse<Project>(await apiFetch(`/api/projects/${projectId}/scenarios/${scenario.id}`, { method: 'PUT', headers: apiHeaders(true), body: JSON.stringify({ scenario }) }));
}

export async function deleteProjectScenarioApi(projectId: string, scenarioId: string): Promise<void> {
  const response = await apiFetch(`/api/projects/${projectId}/scenarios/${scenarioId}`, { method: 'DELETE', headers: apiHeaders() });
  if (!response.ok) throw new Error('Failed to remove scenario from project.');
}
