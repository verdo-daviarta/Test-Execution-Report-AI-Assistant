// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ResultEditor from './ResultEditor';
import type { HistoryItem } from '../types';
import { ApiError } from '../utils/apiError';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const item = { id: 'h', moduleName: 'Login', scenarios: [{ id: 's', name: 'Login', description: '', testCases: [] }] } as unknown as HistoryItem;
function setup(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(<ResultEditor item={item} currentTesterName="Tania" onSave={onSave} onRegenerate={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Add New Test Case Row' }));
  return onSave;
}
function fill() {
  for (const label of ['Test ID', 'Scenario Target', 'Execution Steps', 'Expected Outcome']) {
    fireEvent.change(screen.getByLabelText(label), { target: { value: label + ' manual' } });
  }
  fireEvent.change(screen.getByLabelText('Coverage Test'), { target: { value: 'Boundary' } });
}
it('honors Retry-After without dropping the manual draft', async () => {
  vi.useFakeTimers();
  const save = setup(vi.fn().mockRejectedValueOnce(new ApiError('Wait before retry', 429, 2)).mockResolvedValue(undefined));
  fill();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); });
  expect((screen.getByRole('button', { name: 'Save Changes' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByLabelText('Test ID') as HTMLInputElement).value).toBe('Test ID manual');
  await act(async () => { vi.advanceTimersByTime(2000); });
  expect((screen.getByRole('button', { name: 'Save Changes' }) as HTMLButtonElement).disabled).toBe(false);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save Changes' })); });
  expect(save).toHaveBeenCalledTimes(2);
});
it('creates blank manual drafts without saving and validates required fields', async () => {
  const save = setup();
  for (const label of ['Test ID', 'Scenario Target', 'Execution Steps', 'Expected Outcome', 'Coverage Test']) {
    expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('');
  }
  expect(save).not.toHaveBeenCalled();
  expect((screen.getByLabelText('Nama tester (pembuat test case)') as HTMLInputElement).value).toBe('Tania');
  expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(expect.arrayContaining(['POSITIVE', 'NEGATIVE', 'VALIDATION', 'BOUNDARY']));
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});
it('awaits persistence, prevents duplicate saves and preserves manually entered steps', async () => {
  let resolve!: () => void;
  const save = setup(vi.fn(() => new Promise<void>(done => { resolve = done; })));
  fill();
  fireEvent.blur(screen.getByLabelText('Execution Steps'));
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saving...' }));
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Changes successfully saved to database.')).toBeNull();
  expect(screen.getByLabelText('Test ID').closest('fieldset')?.disabled).toBe(true);
  expect(save.mock.calls[0][0].scenarios[0].testCases[0]).toMatchObject({ isManual: true, testerName: 'Tania', coverageType: 'Boundary', step: 'Execution Steps manual' });
  resolve();
  expect(await screen.findByText('Changes successfully saved to database.')).toBeTruthy();
});
it('keeps the draft after failure and supports retry', async () => {
  const save = setup(vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(undefined));
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Offline');
  expect((screen.getByLabelText('Test ID') as HTMLInputElement).value).toBe('Test ID manual');
  expect(screen.queryByText('Changes successfully saved to database.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
});
