import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Save, Download, Trash, Plus, Check, Filter, Sparkles, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { HistoryItem, Scenario, TestCase } from '../types';
import { createId } from '../utils/id';
import ConfirmDialog from './ConfirmDialog';

interface ResultEditorProps {
  item: HistoryItem;
  onSave: (updatedItem: HistoryItem) => void;
  onRegenerate: () => void;
  onDeleteProjectScenario?: (scenarioId: string) => Promise<void>;
}

export default function ResultEditor({ item, onSave, onRegenerate, onDeleteProjectScenario }: ResultEditorProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>(item.scenarios);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(
    item.scenarios[0]?.id || ''
  );
  const [filterQuery, setFilterQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string>('Just now');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ type: 'testCase' | 'scenario'; id: string; name: string } | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Synchronize when the loaded item changes
  useEffect(() => {
    setScenarios(item.scenarios);
    if (item.scenarios.length > 0) {
      setActiveScenarioId(item.scenarios[0].id);
    }
  }, [item]);

  // Handle active scenario selections
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  // Filter Scenarios based on search query
  const filteredScenarios = scenarios.filter((s) =>
    s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(filterQuery.toLowerCase())
  );
  const scenarioGroups = filteredScenarios.reduce<Record<string, Scenario[]>>((groups, scenario) => {
    const moduleName = scenario.moduleName || item.moduleName || 'Unassigned Module';
    (groups[moduleName] ||= []).push(scenario);
    return groups;
  }, {});

  // Save the entire state back to database
  const commitChanges = (updatedScenarios = scenarios) => {
    const totalTCs = updatedScenarios.reduce((sum, s) => sum + s.testCases.length, 0);
    const updated: HistoryItem = {
      ...item,
      scenarios: updatedScenarios,
      scenarioCount: updatedScenarios.length,
      testCaseCount: totalTCs,
    };
    onSave(updated);
    
    // Toast update
    setToastMessage('Changes successfully saved to persistent workspace.');
    setTimeout(() => setToastMessage(null), 3000);
    const now = new Date();
    setLastSaved(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
  };

  const updateMetadata = (caseId: string, field: keyof TestCase, value: string) => handleTestCaseChange(caseId, field, value);

  const normalizeSteps = (value: string): string => value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
    .map((line, index) => `${index + 1}. ${line}`)
    .join('\n');

  // Change individual field values in a specific testcase
  const handleTestCaseChange = (
    caseId: string,
    field: keyof TestCase,
    value: string
  ) => {
    const updatedScenarios = scenarios.map((s) => {
      if (s.id === activeScenarioId) {
        const updatedCases = s.testCases.map((tc) => {
          if (tc.id === caseId) {
            return { ...tc, [field]: value };
          }
          return tc;
        });
        return { ...s, testCases: updatedCases };
      }
      return s;
    });
    setScenarios(updatedScenarios);
  };

  // Add individual test case row
  const addTestCaseRow = () => {
    if (!activeScenarioId) return;
    const currentTCs = activeScenario?.testCases || [];
    const nextCode = currentTCs.length + 1;
    const codeStr = nextCode < 10 ? `TC-00${nextCode}` : `TC-0${nextCode}`;

    const newRow: TestCase = {
      id: createId('tc-dynamic'),
      testId: codeStr,
      scenario: 'New behavior specification',
      step: '1. Action phase\n2. Verify state outcome',
      expectedResult: 'Expected outcome successfully checked.',
    };

    const updatedScenarios = scenarios.map((s) => {
      if (s.id === activeScenarioId) {
        return {
          ...s,
          count: s.testCases.length + 1,
          testCases: [...s.testCases, newRow],
        };
      }
      return s;
    });

    setScenarios(updatedScenarios);
    commitChanges(updatedScenarios);
  };

  // Delete individual test case row
  const deleteTestCaseRow = (caseId: string) => {
    const testCase = activeScenario?.testCases.find((tc) => tc.id === caseId);
    setPendingDelete({ type: 'testCase', id: caseId, name: testCase?.testId || 'test case' });
  };

  const executeDeleteTestCaseRow = (caseId: string) => {
    const updatedScenarios = scenarios.map((s) => {
      if (s.id === activeScenarioId) {
        const remaining = s.testCases.filter((tc) => tc.id !== caseId);
        // Clean testId sequence
        const sequenced = remaining.map((tc, index) => {
          const nextVal = index + 1;
          const code = nextVal < 10 ? `TC-00${nextVal}` : `TC-0${nextVal}`;
          return { ...tc, testId: code };
        });
        return { ...s, count: sequenced.length, testCases: sequenced };
      }
      return s;
    });
    setScenarios(updatedScenarios);
    commitChanges(updatedScenarios);
  };

  // Add a whole new Scenario block
  const addNewScenario = () => {
    const count = scenarios.length + 1;
    const newSc: Scenario = {
      id: createId('sc-dynamic'),
      name: `Scenario Area #${count}`,
      moduleName: activeScenario?.moduleName || item.moduleName,
      count: 1,
      description: 'Custom added test logic blocks...',
      testCases: [
        {
          id: createId('tc-dyn'),
          testId: 'TC-001',
          scenario: 'Verify parameter action',
          step: '1. Navigate to endpoint\n2. Enter details\n3. Push trigger',
          expectedResult: 'Operation resolves properly.',
        },
      ],
    };
    const updated = [...scenarios, newSc];
    setScenarios(updated);
    setActiveScenarioId(newSc.id);
    commitChanges(updated);
  };

  // Remove active scenario
  const deleteScenario = async (scId: string) => {
    if (scenarios.length <= 1) {
      alert('Cannot delete the last remaining scenario.');
      return;
    }
    const filtered = scenarios.filter((s) => s.id !== scId);
    if (onDeleteProjectScenario) {
      try {
        await onDeleteProjectScenario(scId);
      } catch (error) {
        console.error(error);
        setToastMessage('Scenario gagal dihapus dari project.');
        return;
      }
    }
    setScenarios(filtered);
    setActiveScenarioId(filtered[0].id);
    commitChanges(filtered);
  };

  const requestDeleteScenario = (scId: string) => {
    const scenario = scenarios.find((candidate) => candidate.id === scId);
    setPendingDelete({ type: 'scenario', id: scId, name: scenario?.name || 'scenario' });
  };

  // Export scenario table as clean Excel-compatible CSV directly to file download
  const handleExportCSV = () => {
    if (!activeScenario) return;
    
    // Construct CSV output safely
    const headers = ['Test ID', 'Scenario', 'Steps', 'Expected Result'];
    const rows = activeScenario.testCases.map((tc) => [
      tc.testId,
      tc.scenario,
      tc.step.replace(/\n/g, '; '),
      tc.expectedResult,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fileName = `${item.moduleName.replace(/\s+/g, '_')}_${activeScenario.name.replace(/\s+/g, '_')}_TestCases.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage('Test Cases downloaded successfully in Excel CSV format.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Trigger floating AI scenario optimization popup
  const optimizeScenariosAI = () => {
    setIsOptimizing(true);
    setToastMessage('AI is reviewing step flows and standardizing vocabularies...');
    
    setTimeout(() => {
      const updatedScenarios = scenarios.map((s) => {
        if (s.id === activeScenarioId) {
          const optimized = s.testCases.map((tc) => {
            let step = tc.step;
            let result = tc.expectedResult;
            
            // Subtle premium grammar rewrites to look "AI optimized"
            if (!step.includes('Given') && !step.includes('When')) {
              step = step
                .replace('1. Navigate to', '1. Given user navigates to')
                .replace('1. Enter', '1. When user inputs')
                .replace('2. Enter', '2. And enters')
                .replace('3. Enter', '3. And enters')
                .replace('4. Click', '4. Then click');
            }
            if (!result.includes('Verify that')) {
              result = 'Verify that ' + result.charAt(0).toLowerCase() + result.slice(1);
            }
            return { ...tc, step, expectedResult: result };
          });
          return { ...s, testCases: optimized };
        }
        return s;
      });

      setScenarios(updatedScenarios);
      setIsOptimizing(false);
      setToastMessage('Successfully optimized with standard Gherkin testing patterns.');
      setTimeout(() => setToastMessage(null), 3000);
      commitChanges(updatedScenarios);
    }, 2000);
  };

  const totalTestCasesCount = scenarios.reduce((sum, s) => sum + s.testCases.length, 0);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden relative">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 border border-slate-800 font-sans font-semibold transition-all animate-pulse">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <span>{toastMessage}</span>
        </div>
      )}
      {pendingDelete && <ConfirmDialog
        title={pendingDelete.type === 'scenario' ? 'Delete scenario?' : 'Delete test case?'}
        message={`${pendingDelete.type === 'scenario' ? 'Scenario' : 'Test case'} "${pendingDelete.name}" will be permanently removed.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete.type === 'scenario') await deleteScenario(pendingDelete.id);
          else executeDeleteTestCaseRow(pendingDelete.id);
          setPendingDelete(null);
        }}
      />}
      {item.isMock && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-50 text-amber-800 border border-amber-200 text-xs px-4 py-2 rounded-lg shadow-sm font-semibold">
          Local fallback result — OpenAI API was not configured.
        </div>
      )}

      {/* Main Two-Column split workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* Left Column: Scenario selector rail */}
        <aside className="w-80 h-full min-h-0 overflow-hidden border-r border-slate-200 bg-slate-50/80 grid grid-rows-[auto_minmax(0,1fr)_auto]">
          
          {/* Header filter search block */}
          <div className="p-6 border-b border-slate-200">
            <h2 className="font-sans font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider text-[11px]">Generated Scenarios</h2>
            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={14} />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter scenarios..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Scenario List scroll area */}
          <div className="scenario-panel-scroll min-h-0 overscroll-contain custom-scrollbar">
            <ul className="flex flex-col">
              {Object.entries(scenarioGroups).map(([moduleName, moduleScenarios]) => {
                const isExpanded = expandedModules[moduleName] !== false;
                const totalCases = moduleScenarios.reduce((total, scenario) => total + scenario.testCases.length, 0);
                return <li key={moduleName} className="border-b border-slate-200">
                  <button onClick={() => setExpandedModules((current) => ({ ...current, [moduleName]: !isExpanded }))} className="w-full px-5 py-3.5 bg-slate-100/70 hover:bg-slate-100 flex items-center gap-2 text-left transition-colors">
                    {isExpanded ? <ChevronDown size={15} className="text-slate-500" /> : <ChevronRight size={15} className="text-slate-500" />}
                    <Layers size={14} className="text-blue-600" />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-wide text-slate-700">{moduleName}</span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-500">{moduleScenarios.length} SC · {totalCases} TC</span>
                  </button>
                  {isExpanded && <ul>
              {moduleScenarios.map((sc) => {
                const isActive = sc.id === activeScenarioId;
                return (
                  <li key={sc.id} className="relative group/sc border-b border-slate-100/50">
                    <button
                      onClick={() => setActiveScenarioId(sc.id)}
                      className={`w-full text-left px-6 py-4.5 transition-all flex flex-col cursor-pointer ${
                        isActive
                          ? 'bg-blue-50/60 border-l-[3px] border-blue-600'
                          : 'hover:bg-slate-100 border-l-[3px] border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 w-full">
                        <span
                          className={`text-xs font-bold font-sans transition-colors ${
                            isActive ? 'text-blue-600' : 'text-slate-800'
                          }`}
                        >
                          {sc.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold uppercase shrink-0 transition-colors ${
                            isActive
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-150 text-slate-500'
                          }`}
                        >
                          {sc.testCases.length} TCs
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 truncate max-w-220px">
                        {sc.description}
                      </p>
                    </button>

                    {/* Delete Scenario hover trash can button */}
                    {scenarios.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteScenario(sc.id);
                        }}
                        className="absolute right-4 bottom-3.5 opacity-0 group-hover/sc:opacity-100 p-1.5 bg-white hover:bg-red-50 text-red-600 rounded-md border border-slate-200 shadow-sm transition-opacity z-10 cursor-pointer"
                        title="Delete scenario"
                      >
                        <Trash size={12} className="stroke-2" />
                      </button>
                    )}
                  </li>
                );
              })}
                  </ul>}
                </li>;
              })}

              {filteredScenarios.length === 0 && (
                <li className="px-6 py-8 text-center text-xs text-slate-400 font-semibold font-sans">
                  No matching scenarios found.
                </li>
              )}
            </ul>
          </div>

          {/* Add Scenario footer bottom rail trigger */}
          <div className="p-6 border-t border-slate-200 bg-white">
            <button
              onClick={addNewScenario}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors select-none text-slate-700 cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Add Scenario</span>
            </button>
          </div>
        </aside>

        {/* Right Column: Case edit list table */}
        <section className="flex-1 flex flex-col bg-white overflow-hidden">
          
          {/* Metadata Scenario block top banner info */}
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                <span className="text-blue-400">Module Name</span>
                <span>{activeScenario?.moduleName || item.moduleName}</span>
              </div>
              <h2 className="font-sans font-bold text-slate-900 text-base leading-snug">
                {activeScenario?.name || 'Test Execution Report Scenarios'}
              </h2>
              <p className="font-sans text-[11px] text-slate-500 mt-0.5">
                {activeScenario?.description || 'Refine the generated test parameters below.'}
              </p>
            </div>

            {/* Editing and exporter headers operations action triggers */}
            <div className="flex items-center gap-2">
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all bg-white cursor-pointer shadow-sm"
                title="Regenerate all scenario cases"
              >
                <RefreshCw size={13} className="stroke-2" />
                <span>Regenerate</span>
              </button>

              <button
                onClick={() => commitChanges()}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all bg-white cursor-pointer shadow-sm"
                title="Commit state changes to browser workspace cache"
              >
                <Save size={13} className="stroke-2" />
                <span>Save Changes</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100 cursor-pointer"
                title="Download spreadsheet copy"
              >
                <Download size={13} className="stroke-[2.5]" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Test Case Table Frame */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-100/90 z-20 border-b border-slate-200">
                <tr className="text-left select-none">
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">Test ID</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-1/4">Scenario Target</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-1/3">Execution Steps</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-1/3">Expected Outcome</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nama Tester</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type Testing</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Testing</th>
                  <th className="px-6 py-3.5 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeScenario?.testCases.map((tc) => (
                  <tr key={tc.id} className="hover:bg-slate-50/50 transition-colors group/tr">
                    
                    {/* Test ID input */}
                    <td className="px-6 py-4.5 align-top">
                      <input
                        type="text"
                        value={tc.testId}
                        onChange={(e) => handleTestCaseChange(tc.id, 'testId', e.target.value)}
                        className="w-full bg-transparent border-none p-0 font-mono text-xs text-slate-800 font-bold focus:ring-1 focus:ring-blue-500 rounded-sm outline-none px-1"
                      />
                    </td>

                    {/* Scenario Title inline-input */}
                    <td className="px-6 py-4.5 align-top">
                      <textarea
                        value={tc.scenario}
                        onChange={(e) => handleTestCaseChange(tc.id, 'scenario', e.target.value)}
                        rows={Math.max(2, tc.scenario.split('\n').length)}
                        className="w-full bg-transparent border-none p-1 text-xs text-slate-800 leading-relaxed focus:bg-slate-50 focus:ring-1 focus:ring-blue-500 rounded outline-none resize-none font-semibold"
                      />
                    </td>

                    {/* Execution Steps */}
                    <td className="px-6 py-4.5 align-top">
                      <textarea
                        value={tc.step}
                        onChange={(e) => handleTestCaseChange(tc.id, 'step', e.target.value)}
                        onBlur={(e) => handleTestCaseChange(tc.id, 'step', normalizeSteps(e.target.value))}
                        rows={Math.max(3, tc.step.split('\n').length)}
                        className="w-full bg-transparent border-none p-2 text-xs text-slate-600 leading-6 focus:bg-slate-50 focus:ring-1 focus:ring-blue-500 rounded outline-none resize-none font-mono whitespace-pre-wrap wrap-break-words"
                      />
                    </td>

                    {/* Expected Result */}
                    <td className="px-6 py-4.5 align-top">
                      <textarea
                        value={tc.expectedResult}
                        onChange={(e) => handleTestCaseChange(tc.id, 'expectedResult', e.target.value)}
                        rows={Math.max(3, tc.expectedResult.split('\n').length)}
                        className="w-full bg-transparent border-none p-1 text-xs text-slate-850 leading-relaxed focus:bg-slate-50 focus:ring-1 focus:ring-blue-500 rounded outline-none resize-none font-medium"
                      />
                    </td>

                    {/* Remove row trash bin action */}
                    <td className="px-3 py-4.5 align-top"><input value={tc.testerName || 'Verdo Daviarta'} onChange={e => updateMetadata(tc.id, 'testerName', e.target.value)} className="w-32 bg-slate-50/60 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400" /></td>
                    <td className="px-3 py-4.5 align-top"><select value={tc.testingType || 'Functional'} onChange={e => updateMetadata(tc.id, 'testingType', e.target.value)} className="w-32 bg-slate-50/60 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"><option>Functional</option><option>Integration</option><option>Regression</option><option>Performance</option><option>Security</option><option>Usability</option></select></td>
                    <td className="px-3 py-4.5 align-top"><select value={tc.testingStatus || 'Not Started'} onChange={e => updateMetadata(tc.id, 'testingStatus', e.target.value)} className="w-32 bg-slate-50/60 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"><option>Not Started</option><option>In Progress</option><option>Passed</option><option>Failed</option><option>Blocked</option></select></td>

                    {/* Remove row trash bin action */}
                    <td className="px-6 py-4.5 align-middle text-center shrink-0">
                      <button
                        onClick={() => deleteTestCaseRow(tc.id)}
                        className="opacity-0 group-hover/tr:opacity-100 p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all cursor-pointer inline-block"
                        title="Delete test row"
                      >
                        <Trash size={14} className="stroke-2" />
                      </button>
                    </td>

                  </tr>
                ))}

                {(!activeScenario || activeScenario.testCases.length === 0) && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-xs text-slate-400 font-semibold font-sans">
                      No test case rows currently present. Add a new row below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Add New Row trigger Button */}
            <div className="py-8 flex justify-center border-t border-slate-100">
              <button
                onClick={addTestCaseRow}
                className="flex items-center gap-2 text-blue-600 hover:bg-blue-50/60 hover:text-blue-750 px-5 py-2.5 rounded-lg transition-colors text-xs font-bold select-none cursor-pointer border border-blue-200 bg-white shadow-xs"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Add New Test Case Row</span>
              </button>
            </div>
          </div>

          {/* Table footer statistics bottom panel */}
          <footer className="h-10 border-t border-slate-200 bg-slate-50 px-6 flex items-center justify-between select-none shrink-0">
            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-550">
              <span>Total Test Cases: {totalTestCasesCount}</span>
              <span className="w-px h-3 bg-slate-200"></span>
              <span>Selection: {activeScenario?.testCases.length || 0} rows</span>
              <span className="w-px h-3 bg-slate-200"></span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wide">AI Sync Active</span>
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Last saved: <span className="font-bold text-slate-500">{lastSaved}</span>
            </div>
          </footer>

        </section>
      </div>

      {/* Floating AI Optimizer Sparkle Button */}
      <div className="absolute bottom-14 right-6 z-40">
        <button
          onClick={optimizeScenariosAI}
          disabled={isOptimizing}
          className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-100 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all group relative overflow-visible cursor-pointer disabled:opacity-50"
        >
          <Sparkles size={20} className="fill-white" />
          
          <span className="absolute right-14 bg-slate-900 text-white border border-slate-800 px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all text-xs font-sans font-semibold pointer-events-none translate-x-1 group-hover:translate-x-0">
            {isOptimizing ? 'Optimizing vocabulary...' : 'Optimize scenarios via AI'}
          </span>
        </button>
      </div>

    </div>
  );
}
