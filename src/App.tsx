import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import NewGeneration from './components/NewGeneration';
import LoadingScreen from './components/LoadingScreen';
import ResultEditor from './components/ResultEditor';
import HistoryList from './components/HistoryList';
import ProjectList from './components/ProjectList';
import { HistoryItem, Project, Scenario } from './types';
import {
  getHistoryFromApi,
  saveHistoryToApi,
  updateHistoryToApi,
  deleteHistoryFromApi,
  getProjectsFromApi, createProjectToApi, updateProjectToApi, deleteProjectFromApi, saveScenarioToProjectApi, updateProjectScenarioApi, deleteProjectScenarioApi,
} from './utils/api';
import { createId } from './utils/id';

export default function App() {
  const [activeTab, setActiveTab] = useState<'new_generation' | 'history' | 'project' | 'result_editor'>('new_generation');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [projectContext, setProjectContext] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGenerationParams, setCurrentGenerationParams] = useState<{
    moduleName: string;
    provider: 'openai' | 'gemini';
    requirement: string;
    businessRules: string;
    coverages: string[];
    screenshot: string | null;
    projectId: string;
  } | null>(null);
  const [regeneratePending, setRegeneratePending] = useState(false);
  const generationAbortRef = useRef<AbortController | null>(null);

  // Initialize history items from database API
useEffect(() => {
  getHistoryFromApi()
    .then(setHistoryItems)
    .catch((error) => {
      console.error(error);
      alert('History gagal dimuat dari database.');
    });
}, []);

  useEffect(() => { getProjectsFromApi().then(setProjects).catch(console.error); }, []);

  // Handle new generation request
  const handleGenerate = async (params: {
    moduleName: string;
    provider: 'openai' | 'gemini';
    requirement: string;
    businessRules: string;
    coverages: string[];
    screenshot: string | null;
    projectId: string;
  }) => {
    if (!params.projectId) {
      alert('Pilih atau buat Project terlebih dahulu sebelum melakukan generate.');
      setActiveTab('project');
      return;
    }
    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;
    setCurrentGenerationParams(params);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(import.meta.env.VITE_INTERNAL_API_KEY
            ? { 'x-api-key': import.meta.env.VITE_INTERNAL_API_KEY }
            : {}),
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Server responded with an error during generation');
      }

      const data = await response.json();
      const scenarios = data.scenarios || [];

      // Format custom date string, e.g. "Oct 24, 2023 · 14:32"
      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateString = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} · ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Calculate total testcase count
      const totalTCs = scenarios.reduce((sum: number, sc: any) => sum + (sc.testCases?.length || 0), 0);

      const newItem: HistoryItem = {
        id: createId('gen'),
        date: dateString,
        createdAt: now.toISOString(),
        moduleName: params.moduleName,
        scenarioCount: scenarios.length,
        testCaseCount: totalTCs,
        status: 'COMPLETED',
        scenarios: scenarios.map((sc: any, idx: number) => ({
          id: createId(`sc-${idx}`),
          name: sc.name || `Scenario Area #${idx + 1}`,
          count: sc.testCases?.length || 0,
          description: sc.description || 'Generated suite details...',
          testCases: (sc.testCases || []).map((tc: any, cIdx: number) => ({
            id: createId(`tc-${idx}-${cIdx}`),
            testId: tc.testId || `TC-${(cIdx + 1).toString().padStart(3, '0')}`,
            scenario: tc.scenario || 'Default case target',
            step: tc.step || '1. Perform operation',
            expectedResult: tc.expectedResult || 'Expected outcome validates successfully'
          }))
        })),
        requirement: params.requirement,
        businessRules: params.businessRules,
        coverages: params.coverages,
        isMock: data.isMock === true,
        provider: params.provider,
      };

      // Persistence
      const savedItem = await saveHistoryToApi(newItem);
      await Promise.all(scenarios.map((scenario: Scenario) => saveScenarioToProjectApi(params.projectId, savedItem.id, {
        ...scenario,
        testCases: (scenario.testCases || []).map((testCase) => ({ ...testCase, testerName: testCase.testerName || 'Verdo Daviarta' })),
      })));
      const updatedHistory = await getHistoryFromApi();

      setHistoryItems(updatedHistory);
      setSelectedItem(savedItem);
      setIsGenerating(false);
      setActiveTab('result_editor');

    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Core generation failure:', error);
      alert(`Testing Framework Interrupted: ${error.message || 'Check model environment configuration.'}`);
      setIsGenerating(false);
    }
  };

  // Regeneration callback inside editing window
  const handleRegenerate = () => {
    setRegeneratePending(true);
  };

  const confirmRegenerate = () => {
    setRegeneratePending(false);
    if (currentGenerationParams) {
      handleGenerate(currentGenerationParams);
    } else if (selectedItem) {
        // Fallback construct params from active selection metadata
        handleGenerate({
          moduleName: selectedItem.moduleName,
          provider: selectedItem.provider || 'openai',
          requirement: selectedItem.requirement || '',
          businessRules: selectedItem.businessRules || '',
          coverages: selectedItem.coverages || ['Positive', 'Negative'],
          screenshot: null,
          projectId: projectContext || projects[0]?.id || '',
        });
    } else {
      alert('Active requirement details are missing. Start a new generation from form.');
      setActiveTab('new_generation');
    }
  };

  // Selected item changes committed to database and state
const handleSaveResult = async (updatedItem: HistoryItem) => {
  if (projectContext) {
    try {
      await Promise.all(updatedItem.scenarios.map(scenario => updateProjectScenarioApi(projectContext, scenario)));
      setProjects(await getProjectsFromApi());
      setSelectedItem(updatedItem);
    } catch (error) { console.error(error); alert('Perubahan scenario project gagal disimpan.'); }
    return;
  }
  const editedAt = new Date().toISOString();

  const revision = {
    editedAt,
    scenarios: selectedItem?.scenarios || updatedItem.scenarios,
  };

  const withMetadata: HistoryItem = {
    ...updatedItem,
    lastEditedAt: editedAt,
    revisionHistory: [
      ...(updatedItem.revisionHistory || []),
      revision,
    ].slice(-10),
  };

  try {
    const savedItem = await updateHistoryToApi(withMetadata);
    const updatedHistory = await getHistoryFromApi();

    setHistoryItems(updatedHistory);
    setSelectedItem(savedItem);
  } catch (error) {
    console.error(error);
    alert('Perubahan gagal disimpan ke database.');
  }
};

  // Remove history key from storage
const handleDeleteHistory = async (id: string) => {
  try {
    await deleteHistoryFromApi(id);

    const updatedHistory = await getHistoryFromApi();
    setHistoryItems(updatedHistory);

    if (selectedItem?.id === id) {
      setSelectedItem(null);
      setActiveTab('new_generation');
    }
  } catch (error) {
    console.error(error);
    alert('History gagal dihapus.');
  }
};

  // Navigating directly between tabs
  const handleSelectHistoryItem = (item: HistoryItem) => {
    setProjectContext(null);
    setSelectedItem(item);
    setActiveTab('result_editor');
  };

  const handleCreateProject = async (name: string, description: string) => {
    const project = await createProjectToApi(name, description);
    setProjects(await getProjectsFromApi());
    setActiveTab('project');
    return project;
  };
  const handleOpenProjectScenario = (project: Project, scenario: Scenario & { sourceGenerationId?: string; moduleName?: string }) => {
    const now = new Date().toISOString();
    setProjectContext(project.id);
    setSelectedItem({ id: `project-${project.id}`, date: now, createdAt: now, moduleName: scenario.moduleName || project.name, scenarioCount: 1, testCaseCount: scenario.testCases.length, status: 'COMPLETED', scenarios: [scenario], provider: 'openai' });
    setActiveTab('result_editor');
  };
  const handleOpenProject = (project: Project) => {
    const now = new Date().toISOString();
    setProjectContext(project.id);
    setSelectedItem({ id: `project-${project.id}`, date: now, createdAt: now, moduleName: project.name, scenarioCount: project.scenarios.length, testCaseCount: project.scenarios.reduce((total, scenario) => total + scenario.testCases.length, 0), status: 'COMPLETED', scenarios: project.scenarios, provider: 'openai' });
    setActiveTab('result_editor');
  };
  const handleSaveToProject = async (scenarios: Scenario[], projectId: string) => {
    let project = projects.find(item => item.id === projectId);
    if (!project) { project = await handleCreateProject('My Project', ''); }
    await Promise.all(scenarios.map(scenario => saveScenarioToProjectApi(project!.id, selectedItem?.id || '', scenario)));
    setProjects(await getProjectsFromApi());
    alert(`${scenarios.length} scenario disimpan ke project "${project.name}".`);
  };

  // Loading Screen cancellation
  const handleCancelGeneration = () => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-900">
      
      {/* Sidebar Nav */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main workspace panels */}
      <main className="flex-1 pl-64 min-h-screen flex flex-col">
        
        {/* Top Navbar Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-10 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] bg-slate-100 font-mono py-1 px-2.5 rounded-lg text-slate-600 font-bold tracking-wider">
              WORKSPACE
            </span>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs text-blue-600 font-bold uppercase tracking-widest">
              {activeTab.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>Region: Southeast Asia (Singapore)</span>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            <span className="font-semibold text-slate-500">Local Server: ACTIVE (Port 3000)</span>
          </div>
        </header>

        {/* View switching panel routes */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/50">
          {isGenerating ? (
            <LoadingScreen
              moduleName={currentGenerationParams?.moduleName || 'New Module'}
              hasScreenshot={!!currentGenerationParams?.screenshot}
              onCancel={handleCancelGeneration}
            />
          ) : activeTab === 'new_generation' ? (
            <NewGeneration onGenerate={handleGenerate} projects={projects} />
          ) : activeTab === 'history' ? (
            <HistoryList
              items={historyItems}
              onSelectItem={handleSelectHistoryItem}
              onDeleteItem={handleDeleteHistory}
            />
          ) : activeTab === 'project' ? (
            <ProjectList projects={projects} onCreate={handleCreateProject} onUpdate={async (project) => { await updateProjectToApi(project); setProjects(await getProjectsFromApi()); }} onDelete={async (id) => { await deleteProjectFromApi(id); setProjects(await getProjectsFromApi()); }} onRemoveScenario={async (projectId, scenarioId) => { await deleteProjectScenarioApi(projectId, scenarioId); setProjects(await getProjectsFromApi()); }} onOpenScenario={handleOpenProjectScenario} onOpenProject={handleOpenProject} />
          ) : activeTab === 'result_editor' ? (
            selectedItem ? (
              <ResultEditor
                item={selectedItem}
                onSave={handleSaveResult}
                onRegenerate={handleRegenerate}
                onSaveToProject={projectContext ? undefined : handleSaveToProject}
                projects={projects}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="max-w-md space-y-4 bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                  <h3 className="font-sans font-bold text-lg text-slate-900">No Active Workspace</h3>
                  <p className="text-sm text-slate-500">
                    Select a previous run from the History records or launch a new generative session from the module wizard to edit test cases.
                  </p>
                  <button
                    onClick={() => setActiveTab('new_generation')}
                    className="mt-2 bg-blue-600 text-white text-xs font-bold px-5 py-3 rounded-lg transition-colors hover:bg-blue-700 shadow-sm shadow-blue-100 cursor-pointer"
                  >
                    Generate Test Cases
                  </button>
                </div>
              </div>
            )
          ) : null}
        </div>

      </main>
      {regeneratePending && (
        <div className="fixed inset-0 z-100 bg-slate-900/40 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="regenerate-title">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-6">
            <h2 id="regenerate-title" className="text-lg font-bold text-slate-900">Regenerate test cases?</h2>
            <p className="mt-2 text-sm text-slate-500">Manual changes in this editor will be discarded and a new generation will be created.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setRegeneratePending(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmRegenerate} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Regenerate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
