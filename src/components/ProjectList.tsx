import React, { useState } from 'react';
import { FolderKanban, Plus, Trash2, Pencil, Eye, X } from 'lucide-react';
import { Project, Scenario } from '../types';

interface Props {
  projects: Project[];
  onCreate: (name: string, description: string) => void;
  onUpdate: (project: Project) => Promise<void>;
  onDelete: (id: string) => void;
  onRemoveScenario: (projectId: string, scenarioId: string) => void;
  onOpenScenario: (project: Project, scenario: Scenario & { sourceGenerationId?: string; moduleName?: string }) => void;
  onOpenProject: (project: Project) => void;
}

export default function ProjectList({ projects, onCreate, onUpdate, onDelete, onRemoveScenario, onOpenScenario, onOpenProject }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError('Nama project wajib diisi.'); return; }
    try {
      setError(null);
      await onCreate(name.trim(), description.trim());
      setName(''); setDescription(''); setIsCreating(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Project gagal dibuat.');
    }
  };
  return <div className="max-w-6xl mx-auto px-10 py-10 space-y-8">
    <div className="flex items-end justify-between">
      <div><h1 className="font-bold text-3xl text-slate-900">Projects</h1><p className="text-sm text-slate-500 mt-1">Save and manage selected test scenarios by project.</p></div>
      <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-blue-700"><Plus size={15}/> New Project</button>
    </div>
    {isCreating && <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex justify-between"><h2 className="font-bold">Create project</h2><button type="button" onClick={() => setIsCreating(false)}><X size={17}/></button></div>
      <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Project name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button className="bg-slate-900 text-white rounded-lg px-4 py-2 text-xs font-bold">Create</button>
    </form>}
    {projects.length === 0 ? <div className="bg-white border border-dashed border-slate-300 rounded-xl p-14 text-center text-sm text-slate-500">Belum ada project. Simpan scenario dari editor untuk memulai.</div> : <div className="grid gap-5 md:grid-cols-2">
      {projects.map(project => <section key={project.id} className="project-card bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
         <div className="float-right m-3 flex items-center gap-2"><button onClick={() => onOpenProject(project)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100" title="Open project">Open Project</button><button onClick={async () => { const nextName = window.prompt('Nama project:', project.name); if (nextName?.trim() && nextName.trim() !== project.name) await onUpdate({ ...project, name: nextName.trim() }); }} className="p-1.5 text-slate-400 hover:text-blue-600" title="Edit project" aria-label={`Edit ${project.name}`}><Pencil size={16}/></button><button onClick={() => onDelete(project.id)} className="p-1.5 text-slate-400 hover:text-red-600" title="Delete project" aria-label={`Delete ${project.name}`}><Trash2 size={16}/></button></div>
        <div className="p-5 border-b border-slate-100 flex items-start justify-between"><div className="flex gap-3"><FolderKanban className="text-blue-600" size={21}/><div><h2 className="font-bold text-slate-900">{project.name}</h2><p className="text-xs text-slate-500 mt-1">{project.description || 'No description'} · {project.scenarios.length} scenario</p></div></div><button onClick={() => onDelete(project.id)} className="text-slate-400 hover:text-red-600" title="Delete project"><Trash2 size={16}/></button></div>
        <div className="divide-y divide-slate-100">{project.scenarios.map(scenario => <div key={scenario.id} className="p-4 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-800">{scenario.name}</p><p className="text-[11px] text-slate-500">{scenario.testCases.length} test cases{scenario.moduleName ? ` · ${scenario.moduleName}` : ''}</p></div><div className="flex gap-1"><button onClick={() => onOpenScenario(project, scenario)} className="p-2 text-slate-400 hover:text-blue-600" title="Edit scenario"><Pencil size={14}/></button><button onClick={() => onRemoveScenario(project.id, scenario.id)} className="p-2 text-slate-400 hover:text-red-600" title="Remove scenario"><Trash2 size={14}/></button></div></div>)}</div>
      </section>)}
    </div>}
  </div>;
}
