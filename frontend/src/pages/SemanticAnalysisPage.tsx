import React, { useState, useEffect } from 'react';
import { Sparkles, Play, RefreshCw } from 'lucide-react';
import { testSemanticAnalysis, getAnalysisHistory, getHistoricalComparison } from '../services/api';
import type { SemanticTestResponse, HistoryItemSummary, ComparisonResponse } from '../types/api';
import toast from 'react-hot-toast';

export const SemanticAnalysisPage: React.FC = () => {
  // Manual text-comparison mode states
  const [textV1, setTextV1] = useState(
    'Processes card payments synchronously and returns transaction receipt immediately upon settlement. Caller may optionally provide idempotency key.'
  );
  const [textV2, setTextV2] = useState(
    'Enqueues payment request into asynchronous background worker queue. Mandatory requirement: caller must provide valid idempotency_key in request headers. Strictly rate limited to 50 requests per minute.'
  );
  const [testResult, setTestResult] = useState<SemanticTestResponse | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Recent analysis selection
  const [historyList, setHistoryList] = useState<HistoryItemSummary[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ComparisonResponse | null>(null);

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

  const handleRunSemanticTest = async () => {
    if (!textV1.trim() || !textV2.trim()) {
      toast.error('Please enter both legacy and updated descriptions.');
      return;
    }

    setIsTesting(true);
    try {
      const res = await testSemanticAnalysis(textV1, textV2);
      setTestResult(res);
      toast.success('Semantic & linguistic analysis completed.');
    } catch (err) {
      console.error(err);
      toast.error('Semantic evaluation failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelectHistory = async (id: string) => {
    try {
      const res = await getHistoricalComparison(id);
      setSelectedAnalysis(res);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load selected analysis.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Semantic & Meaning Analysis
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Inspect natural language drift using Sentence Transformers (<span className="font-mono text-blue-600 dark:text-blue-400">all-MiniLM-L6-v2</span>) and test custom API text pairs in the independent sandbox.
        </p>
      </div>

      {/* SECTION 1: MANUAL TEXT-COMPARISON SANDBOX */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Independent Semantic Sandbox Mode
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Test any two API descriptions without uploading entire specifications
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Legacy API Description (v1)
            </label>
            <textarea
              value={textV1}
              onChange={(e) => setTextV1(e.target.value)}
              rows={4}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 p-3 font-sans text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">
              Updated API Description (v2)
            </label>
            <textarea
              value={textV2}
              onChange={(e) => setTextV2(e.target.value)}
              rows={4}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 p-3 font-sans text-xs text-slate-900 dark:text-white border border-blue-200 dark:border-blue-900 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleRunSemanticTest}
            disabled={isTesting}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>Evaluate Semantic Shift</span>
          </button>
        </div>

        {/* Sandbox Output Results */}
        {testResult && (
          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-200 dark:border-purple-900/40">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-[10px] text-purple-700 dark:text-purple-400 uppercase font-bold block">
                    Semantic Cosine Similarity
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    {(testResult.semantic_similarity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="border-l border-purple-200 dark:border-purple-800 pl-4">
                  <span className="text-[10px] text-purple-700 dark:text-purple-400 uppercase font-bold block">
                    Semantic Drift Score
                  </span>
                  <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-300">
                    {(testResult.semantic_drift * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                {testResult.is_breaking ? (
                  <span className="px-3 py-1 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-bold border border-rose-300 dark:border-rose-800">
                    ⚠️ Breaking Contract Shift
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                    ✅ Backward Compatible
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {testResult.explanation}
            </p>

            {/* Extracted Deontic Modalities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">
                  Legacy Deontic Modalities (v1)
                </span>
                <div className="space-y-1">
                  <div>Obligation: <span className="font-mono text-slate-700 dark:text-slate-300">{testResult.v1_contracts.modalities.obligation.length ? testResult.v1_contracts.modalities.obligation.join(', ') : 'None'}</span></div>
                  <div>Permission: <span className="font-mono text-slate-700 dark:text-slate-300">{testResult.v1_contracts.modalities.permission.length ? testResult.v1_contracts.modalities.permission.join(', ') : 'None'}</span></div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/40">
                <span className="font-bold text-purple-600 dark:text-purple-400 block mb-1 uppercase text-[10px]">
                  Updated Deontic Modalities (v2)
                </span>
                <div className="space-y-1">
                  <div>Obligation: <span className="font-mono text-purple-900 dark:text-purple-200 font-bold">{testResult.v2_contracts.modalities.obligation.length ? testResult.v2_contracts.modalities.obligation.join(', ') : 'None'}</span></div>
                  <div>Rate Limits: <span className="font-mono text-purple-900 dark:text-purple-200 font-bold">{testResult.v2_contracts.rate_limits.length ? testResult.v2_contracts.rate_limits.join(', ') : 'None'}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: SEMANTIC DRIFT ACROSS SELECTED STORED ANALYSIS */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Semantic Drift in Stored Analysis
            </h3>
            <p className="text-xs text-slate-500">
              Select any past comparison to inspect endpoint cosine distances and semantic drift
            </p>
          </div>

          {historyList.length > 0 && (
            <select
              value={selectedAnalysis?.id || ''}
              onChange={(e) => handleSelectHistory(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {historyList.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name || h.v1_title} ({new Date(h.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedAnalysis ? (
          <div className="space-y-3">
            {selectedAnalysis.endpoints.map((ep) => (
              <div
                key={`${ep.method} ${ep.path}`}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{ep.method}</span>
                    <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{ep.path}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                    "{ep.v2_description || ep.v1_description || 'No description'}"
                  </p>
                </div>

                <div className="flex items-center space-x-4 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Similarity</span>
                    <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                      {Math.round((ep.semantic_similarity || 0) * 100)}%
                    </span>
                  </div>
                  <div className="w-24 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        (ep.semantic_similarity || 0) >= 0.75 ? 'bg-emerald-500' :
                        (ep.semantic_similarity || 0) >= 0.50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.round((ep.semantic_similarity || 0) * 100)}%` }}
                    />
                  </div>
                  <div className="text-right min-w-[70px]">
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 block uppercase font-mono">Drift</span>
                    <span className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
                      {Math.round((ep.semantic_drift || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-500">
            No stored analysis runs found. Run an analysis from the New Analysis tab.
          </div>
        )}
      </div>
    </div>
  );
};
