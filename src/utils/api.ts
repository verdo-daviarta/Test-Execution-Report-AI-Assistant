import { HistoryItem } from '../types';

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
