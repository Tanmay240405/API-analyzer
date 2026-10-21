import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { HistoryItemSummary } from '../types/api';
import { getAnalysisHistory, deleteHistoricalComparison } from '../services/api';
import {
  History,
  Trash2,
  ExternalLink,
  ArrowRight,
  Calendar,
  RefreshCw,
  Clock,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const HistoryView: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteCandidate, setDeleteCandidate] = useState<HistoryItemSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const items = await getAnalysisHistory();
      setHistoryItems(items);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load analysis history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    try {
      await deleteHistoricalComparison(deleteCandidate.id);
      setHistoryItems(prev => prev.filter(item => item.id !== deleteCandidate.id));
      toast.success('Analysis record deleted successfully.');
      setDeleteCandidate(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete history record.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Analysis History & Archive
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Persisted in local SQLite database. Historical analyses survive application restarts.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading history records...</p>
        </div>
      ) : historyItems.length === 0 ? (
        <div className="text-center py-24 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No comparison runs recorded yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Run an analysis from the New Analysis page to save persistent reports here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {historyItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                  {item.name || item.v1_title}
                </h3>

                <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono mt-1 mb-4">
                  <span>v{item.v1_version}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">v{item.v2_version}</span>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400">Total Ops</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{item.total_endpoints}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-rose-600">Breaking</span>
                    <span className="font-mono font-bold text-rose-600 text-sm">{item.breaking_count}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-blue-600">Risk</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{item.risk_score}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={`/analysis/${item.id}`}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                  >
                    <span>View Report</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => setDeleteCandidate(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete the analysis record for{' '}
              <strong className="text-slate-900 dark:text-white">
                "{deleteCandidate.name || deleteCandidate.v1_title}"
              </strong>{' '}
              (v{deleteCandidate.v1_version} &rarr; v{deleteCandidate.v2_version}) from SQLite storage?
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
