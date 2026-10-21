import React, { useState, useEffect } from 'react';
import { getAnalysisHistory, getHistoricalComparison, runBehavioralAnalysis } from '../services/api';
import type { HistoryItemSummary, ComparisonResponse } from '../types/api';
import { Play, RefreshCw, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export const BehavioralImpactPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'sandbox' | 'history'>('sandbox');

  // Sandbox state for Student 3 demonstration
  const [textV1, setTextV1] = useState(
    'Processes card payments synchronously and returns transaction receipt immediately upon authorization. Caller may optionally provide idempotency key.'
  );
  const [textV2, setTextV2] = useState(
    'Enqueues payment request into asynchronous background worker queue. Mandatory requirement: caller must provide valid idempotency_key in request headers. Strictly rate limited to 50 requests per minute.'
  );

  const [behavioralResult, setBehavioralResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // History state
  const [historyList, setHistoryList] = useState<HistoryItemSummary[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getAnalysisHistory()
      .then((items) => {
        setHistoryList(items);
        if (items.length > 0) {
          getHistoricalComparison(items[0].id).then(setSelectedAnalysis);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleRunBehavioralSandbox = async () => {
    setIsAnalyzing(true);
    try {
      const res = await runBehavioralAnalysis(textV1, textV2);
      setBehavioralResult(res);
      toast.success('Behavioral contract analysis completed.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to analyze behavioral contracts.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectHistory = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await getHistoricalComparison(id);
      setSelectedAnalysis(res);
    } catch (err) {
      toast.error('Failed to load selected analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[11px] font-bold uppercase tracking-wider mb-2 border border-purple-200 dark:border-purple-800/40">
            <span>Student 3 Module — Behavioral & Impact Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Behavioral Contract Impact & Migration
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Independent demonstration of deontic logic extraction (Obligation, Prohibition, Permission), precondition auditing, and grounded migration recommendations.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveMode('sandbox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'sandbox'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Live Sandbox Demo
          </button>
          <button
            onClick={() => setActiveMode('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'history'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Saved Analysis Archive
          </button>
        </div>
      </div>

      {activeMode === 'sandbox' ? (
        /* Student 3 Live Sandbox Demo */
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Interactive Deontic Logic & Behavioral Modality Tester
              </span>
            </div>
            <button
              onClick={handleRunBehavioralSandbox}
              disabled={isAnalyzing}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Extract Behavioral Shifts</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Baseline API Behavior (v1 Documentation)
              </label>
              <textarea
                value={textV1}
                onChange={(e) => setTextV1(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 p-3 font-sans text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-purple-500 leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1.5">
                Target API Behavior (v2 Documentation)
              </label>
              <textarea
                value={textV2}
                onChange={(e) => setTextV2(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 p-3 font-sans text-xs text-slate-900 dark:text-white border border-purple-200 dark:border-purple-900 focus:outline-none focus:border-purple-500 leading-relaxed"
              />
            </div>
          </div>

          {behavioralResult && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Detected Behavioral Shifts ({behavioralResult.findings?.length || 0})
                </span>
                <span className="text-xs text-slate-500 font-mono">POST /api/analyses/behavioral</span>
              </div>

              {/* Behavioral Differences Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {behavioralResult.findings?.map((f: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">
                        {f.category.replace(/_/g, ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        {f.classification}
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{f.explanation}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">Evidence: "{f.evidence}"</p>
                  </div>
                ))}
              </div>

              {/* Extracted Deontic Statement Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">Obligations (Must / Mandatory)</span>
                  {behavioralResult.v2_contracts?.modalities?.obligation?.map((s: string, i: number) => (
                    <div key={i} className="text-[11px] text-slate-700 dark:text-slate-300">&bull; {s}</div>
                  )) || <div className="text-[11px] text-slate-400 italic">None</div>}
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">Prohibitions (Must Not / Forbidden)</span>
                  {behavioralResult.v2_contracts?.modalities?.prohibition?.map((s: string, i: number) => (
                    <div key={i} className="text-[11px] text-slate-700 dark:text-slate-300">&bull; {s}</div>
                  )) || <div className="text-[11px] text-slate-400 italic">None</div>}
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-600 block">Permissions (May / Optional)</span>
                  {behavioralResult.v2_contracts?.modalities?.permission?.map((s: string, i: number) => (
                    <div key={i} className="text-[11px] text-slate-700 dark:text-slate-300">&bull; {s}</div>
                  )) || <div className="text-[11px] text-slate-400 italic">None</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Saved Analysis Archive Mode */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Historical Comparison Runs:</span>
            {historyList.length > 0 && (
              <select
                value={selectedAnalysis?.id || ''}
                onChange={(e) => handleSelectHistory(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none shadow-xs"
              >
                {historyList.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name || h.v1_title} ({new Date(h.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-xs text-slate-400">Loading behavioral records...</div>
          ) : selectedAnalysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedAnalysis.endpoints.map((ep) => (
                <div
                  key={`${ep.method} ${ep.path}`}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">{ep.method}</span>
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{ep.path}</span>
                    </div>
                    {ep.is_breaking ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                        {ep.breaking_type.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Non-Breaking
                      </span>
                    )}
                  </div>

                  {/* Behavioral differences */}
                  {ep.behavioral_changes.length > 0 ? (
                    <div className="space-y-2">
                      {ep.behavioral_changes.map((b, i) => (
                        <div key={i} className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">
                              {b.category.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase">{b.severity}</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200">{b.explanation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No behavioral contract differences detected.</div>
                  )}

                  {/* Migration snippet preview */}
                  {ep.migration_recommendation && (
                    <div className="pt-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/40">
                      <strong>Remediation:</strong> {ep.migration_recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">No historical analyses found. Run a comparison to view historical records.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
