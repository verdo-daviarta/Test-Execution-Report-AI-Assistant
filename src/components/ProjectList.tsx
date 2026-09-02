import React, { useState } from 'react';
import { FolderKanban, Plus, Trash2, Pencil, X } from 'lucide-react';
import { Project } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  projects: Project[];
  onCreate: (name: string, description: string) => Promise<Project>;
  onUpdate: (project: Project) => Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onOpenProject: (project: Project) => void;
}

export default function ProjectList({ projects, onCreate, onUpdate, onDelete, onOpenProject }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; action: () => void | Promise<void> } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError('Nama project wajib diisi.'); return; }
    try {
      setError(null);
      await onCreate(name.trim(), description.trim());
      setName('');
      setDescription('');
      setIsCreating(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Project gagal dibuat.');
    }
  };

  return <div className="max-w-6xl mx-auto px-10 py-10 space-y-8">
    {confirmation && <ConfirmDialog title={confirmation.title} message={confirmation.message} onCancel={() => setConfirmation(null)} onConfirm={async () => { await confirmation.action(); setConfirmation(null); }} />}
    <div className="flex items-end justify-between">
      <div><h1 className="font-bold text-3xl text-slate-900">Projects</h1><p className="text-sm text-slate-500 mt-1">Manage your test execution projects.</p></div>
      <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-blue-700"><Plus size={15} /> New Project</button>
    </div>
    {isCreating && <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex justify-between"><h2 className="font-bold">Create project</h2><button type="button" onClick={() => setIsCreating(false)}><X size={17} /></button></div>
      <input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Project name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button className="bg-slate-900 text-white rounded-lg px-4 py-2 text-xs font-bold">Create</button>
    </form>}
    {projects.length === 0 ? <div className="bg-white border border-dashed border-slate-300 rounded-xl p-14 text-center text-sm text-slate-500">Belum ada project.</div> : <div className="grid gap-5 md:grid-cols-2">
      {projects.map(project => <section key={project.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex items-start justify-between gap-4">
        <div className="flex gap-3 min-w-0"><FolderKanban className="shrink-0 text-blue-600" size={21} /><div className="min-w-0"><h2 className="font-bold text-slate-900 truncate">{project.name}</h2><p className="text-xs text-slate-500 mt-1 leading-relaxed">{project.description || 'No description'}</p></div></div>
        <div className="flex shrink-0 gap-2"><button onClick={() => onOpenProject(project)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100">Open Project</button><button onClick={() => { const nextName = window.prompt('Nama project:', project.name); if (nextName?.trim() && nextName.trim() !== project.name) void onUpdate({ ...project, name: nextName.trim() }); }} className="p-1.5 text-slate-400 hover:text-blue-600" title="Edit project"><Pencil size={16} /></button><button onClick={() => setConfirmation({ title: 'Delete project?', message: `Project "${project.name}" and its scenarios will be permanently removed.`, action: () => onDelete(project.id) })} className="p-1.5 text-slate-400 hover:text-red-600" title="Delete project"><Trash2 size={16} /></button></div>
      </section>)}
    </div>}
  </div>;
}
