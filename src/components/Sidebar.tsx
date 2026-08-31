import React from 'react';
import { Bot, History, PlusCircle, Settings, HelpCircle, Briefcase } from 'lucide-react';

interface SidebarProps {
  activeTab: 'new_generation' | 'history' | 'result_editor';
  setActiveTab: (tab: 'new_generation' | 'history' | 'result_editor') => void;
  userRole?: string;
  plan?: string;
}

export default function Sidebar({ activeTab, setActiveTab, userRole = "Verdo Daviarta", plan = "Team Leader" }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50 text-slate-400">
      {/* Brand Header */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-blue-900">
            <Bot size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-white text-base leading-none tracking-tight">AI SIT Assistant</h1>
            <p className="font-sans text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">Automated Testing</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="mt-4 flex-1 space-y-1.5 px-4">
        {/* New Generation */}
        <button
          onClick={() => setActiveTab('new_generation')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors text-left font-semibold cursor-pointer ${
            activeTab === 'new_generation'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <PlusCircle size={18} className={activeTab === 'new_generation' ? 'text-blue-500' : 'opacity-80'} />
          <span>New Generation</span>
        </button>

        {/* History */}
        <button
          onClick={() => setActiveTab('history')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors text-left font-semibold cursor-pointer ${
            activeTab === 'history'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <History size={18} className={activeTab === 'history' ? 'text-blue-500' : 'opacity-80'} />
          <span>History</span>
        </button>
      </nav>

      {/* Footer Settings & Account */}
      <div className="mt-auto border-t border-slate-800 p-4">
        <button className="w-full flex items-center gap-3 text-slate-400 px-4 py-2 hover:bg-slate-800 hover:text-white transition-colors rounded-lg text-sm text-left font-semibold cursor-pointer">
          <Settings size={18} className="opacity-80" />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 text-slate-400 px-4 py-2 hover:bg-slate-800 hover:text-white transition-colors rounded-lg text-sm text-left font-semibold cursor-pointer">
          <HelpCircle size={18} className="opacity-80" />
          <span>Support</span>
        </button>

        {/* Profile Card */}
        <div className="mt-4 flex items-center gap-3 p-3 bg-slate-800 border-none rounded-xl">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0 font-bold text-xs uppercase shadow-inner">
            {userRole.slice(0, 2)}
          </div>
          <div className="overflow-hidden">
            <p className="font-sans text-sm font-semibold text-white truncate leading-snug">{userRole}</p>
            <p className="font-sans text-[10px] text-slate-500 font-bold tracking-wide uppercase leading-none mt-0.5">{plan}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
