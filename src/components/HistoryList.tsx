import React, { useState } from 'react';
import { Search, Filter, Trash2, Eye, RefreshCw, BarChart2, CheckCircle2, HardDrive, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryListProps {
  items: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
}

export default function HistoryList({ items, onSelectItem, onDeleteItem }: HistoryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | HistoryItem['status']>('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  const itemsPerPage = 5;

  // Handles filtering
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesQuery = [
      item.moduleName,
      item.requirement || '',
      ...item.scenarios.map((scenario) => scenario.name),
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery && (statusFilter === 'ALL' || item.status === statusFilter);
  });

  // Handles sorting by Date
  const sortedItems = [...filteredItems].sort((a, b) => {
    const termA = a.createdAt ? Date.parse(a.createdAt) : 0;
    const termB = b.createdAt ? Date.parse(b.createdAt) : 0;
    return sortAsc ? termA - termB : termB - termA;
  });

  // Handles pagination
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);

  const handleDelete = (id: string, moduleName: string) => {
    if (confirm(`Confirm permanent removal of "${moduleName}" and all associated test scenarios?`)) {
      onDeleteItem(id);
      setNotification(`Successfully cleared "${moduleName}" from history.`);
      setTimeout(() => setNotification(null), 3000);
      // Reset page if needed
      if (currentPage > 1 && currentItems.length === 1) {
        setCurrentPage((p) => p - 1);
      }
    }
  };

  // Metrics derived from actual local history.
  const totalGeneratesCount = items.length;
  const totalTestCasesSum = items.reduce((sum, item) => sum + item.testCaseCount, 0);
  const averageTCs = items.length > 0 ? (totalTestCasesSum / items.length).toFixed(1) : '0.0';
  const storageBytes = new Blob([JSON.stringify(items)]).size;
  const storageLabel = storageBytes < 1024 * 1024
    ? `${(storageBytes / 1024).toFixed(1)} KB`
    : `${(storageBytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="max-w-6xl mx-auto px-10 py-10 space-y-8">
      
      {/* Toast notifier */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3.5 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2 font-semibold">
          <CheckCircle2 size={16} className="text-green-500" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="font-sans font-bold text-3xl text-slate-900">Generation History</h1>
          <p className="font-sans text-sm text-slate-500">
            Review, manage, and download previously generated Test Execution Report scopes.
          </p>
        </div>

        {/* Search tool & filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search modules or scenarios..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
          
          <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
            <Filter size={16} />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1); }} className="bg-transparent outline-none cursor-pointer">
              <option value="ALL">All status</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
              <option value="FAILED">Failed</option>
              <option value="IN_PROGRESS">In progress</option>
            </select>
          </label>
        </div>
      </div>

      {/* Grid statistics summaries bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <BarChart2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Generates</p>
            <h3 className="text-3xl font-bold text-slate-900 leading-none mt-2">{totalGeneratesCount}</h3>
          </div>
          <p className="text-[11px] text-green-600 font-bold flex items-center gap-0.5">
            <span>+12% from last month</span>
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Avg. Test Cases / Module</p>
            <h3 className="text-3xl font-bold text-slate-900 leading-none mt-2">{averageTCs}</h3>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold leading-none">Based on all completed components</p>
        </div>

        {/* Card 3 */}
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
            <HardDrive size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Workspace Storage</p>
            <h3 className="text-3xl font-bold text-slate-900 leading-none mt-2">{storageLabel}</h3>
          </div>
          <div className="pt-1.5 bg-white">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* Table grid layout container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 select-none text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">
                  <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="flex items-center gap-1 hover:text-slate-900 transition-colors font-bold cursor-pointer"
                  >
                    <span>Date</span>
                    <ArrowUpDown size={12} className="opacity-80" />
                  </button>
                </th>
                <th className="px-6 py-4 w-1/3">Module Target Name</th>
                <th className="px-6 py-4 text-center">Scenarios</th>
                <th className="px-6 py-4 text-center">Test Cases</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {currentItems.map((item) => {
                const isFail = item.status === 'FAILED';
                const isArchived = item.status === 'ARCHIVED';

                let statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold tracking-wide uppercase text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-200"></span> Completed
                  </span>
                );

                if (isFail) {
                  statusBadge = (
                     <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold tracking-wide uppercase text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Failed
                    </span>
                  );
                } else if (isArchived) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold tracking-wide uppercase text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Archived
                    </span>
                  );
                }

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-slate-500 font-mono whitespace-nowrap">{item.date}</td>
                    <td className="px-6 py-4 text-slate-900 font-bold">{item.moduleName}</td>
                    <td className="px-6 py-4 font-mono text-center text-slate-600">{item.scenarioCount}</td>
                    <td className="px-6 py-4 font-mono text-center text-blue-600 font-bold">{item.testCaseCount}</td>
                    <td className="px-6 py-4">{statusBadge}</td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isFail ? (
                          <button
                            onClick={() => onSelectItem(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="Retry Generation"
                          >
                            <RefreshCw size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelectItem(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="View Editor"
                          >
                            <Eye size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(item.id, item.moduleName)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Run"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {currentItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400 font-medium font-sans">
                    No historic entries found. Create a new generation to start!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination element */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between select-none">
            <span className="text-[11px] font-mono text-slate-500">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedItems.length)} of {sortedItems.length} records
            </span>
            
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1 text-xs">
                {Array.from({ length: totalPages }).map((_, index) => {
                  const pNum = index + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-7 h-7 rounded-lg font-bold transition-all cursor-pointer ${
                        currentPage === pNum
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                          : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
