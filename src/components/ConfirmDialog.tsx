import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return <div className="fixed inset-0 z-100 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
      <div className="p-6 flex gap-4">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle size={20} /></div>
        <div className="flex-1"><div className="flex items-start justify-between gap-4"><h2 id="confirm-dialog-title" className="text-base font-bold text-slate-900">{title}</h2><button onClick={onCancel} className="text-slate-400 hover:text-slate-700" aria-label="Close confirmation"><X size={18}/></button></div><p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p></div>
      </div>
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3"><button onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100">Cancel</button><button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700">Delete</button></div>
    </div>
  </div>;
}
