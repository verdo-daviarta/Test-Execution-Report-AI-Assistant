import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ResultEditor from './ResultEditor';
import type { HistoryItem } from '../types';

describe('tester attribution display', () => {
  it.each(['Agung', ''])('displays the persisted tester %j without replacing it with the viewer', testerName => {
    const item: HistoryItem = {
      id: 'g', date: '', moduleName: 'Login', scenarioCount: 1, testCaseCount: 1, status: 'COMPLETED',
      scenarios: [{ id: 's', name: 'Login', description: '', count: 1, testCases: [
        { id: 'tc', testId: 'TC-001', scenario: 'Valid', step: 'Submit', expectedResult: 'Success', testerName },
      ] }],
    };
    const html = renderToStaticMarkup(<ResultEditor item={item} currentTesterName="Sophia" onSave={vi.fn()} onRegenerate={vi.fn()} />);
    expect(html).not.toContain('Verdo Daviarta');
    expect(html).not.toContain('value="Sophia"');
    if (testerName) expect(html).toContain('value="Agung"');
    expect(html).toContain('Nama tester (pembuat test case)');
  });
});
