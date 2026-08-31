import { HistoryItem } from '../types';
import { initialHistory } from '../data/initialData';

const STORAGE_KEY = 'ai_sit_assistant_history';

export function getHistory(): HistoryItem[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialHistory));
    return initialHistory;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse history from storage:', e);
    return initialHistory;
  }
}

export function saveHistory(history: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function getHistoryItem(id: string): HistoryItem | undefined {
  const history = getHistory();
  return history.find(item => item.id === id);
}

export function updateHistoryItem(updatedItem: HistoryItem): void {
  const history = getHistory();
  const index = history.findIndex(item => item.id === updatedItem.id);
  if (index !== -1) {
    history[index] = updatedItem;
    saveHistory(history);
  }
}

export function addHistoryItem(newItem: HistoryItem): void {
  const history = getHistory();
  // Insert at front
  history.unshift(newItem);
  saveHistory(history);
}

export function deleteHistoryItem(id: string): void {
  const history = getHistory();
  const filtered = history.filter(item => item.id !== id);
  saveHistory(filtered);
}
