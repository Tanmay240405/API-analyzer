import React, { useState, useEffect } from 'react';
import { getAnalysisHistory, getHistoricalComparison, runStructuralDiff } from '../services/api';
import type { HistoryItemSummary, ComparisonResponse } from '../types/api';
import { Play, RefreshCw, CheckCircle2, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const StructuralDiffPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'sandbox' | 'history'>('sandbox');

  // Sandbox state for Student 1 demonstration
  const [specV1, setSpecV1] = useState<string>(`openapi: 3.0.0
info:
  title: Product Catalog API
  version: 1.0.0
paths:
  /products:
    get:
      summary: List products
      parameters:
        - name: warehouse_id
          in: query
          required: false
          schema:
            type: string
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            default: 50
      responses:
        '200':
          description: OK
  /obsolete_feed:
    get:
      summary: Deprecated feed
      responses:
        '200':
          description: OK`);

  const [specV2, setSpecV2] = useState<string>(`openapi: 3.0.0
info:
  title: Product Catalog API
  version: 2.0.0
paths:
  /products:
    get:
      summary: List products
      parameters:
        - name: warehouse_id
          in: query
          required: true
          schema:
            type: string
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: OK
  /products/{id}/restock:
    post:
      summary: Restock items
      responses:
        '200':
          description: OK`);

  const [sandboxResults, setSandboxResults] = useState<any[] | null>(null);
  const [isDiffing, setIsDiffing] = useState(false);

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

  const handleRunSandboxDiff = async () => {
    setIsDiffing(true);
    try {
      const results = await runStructuralDiff(specV1, specV2);
      setSandboxResults(results);
      toast.success(`Structural diff complete: ${results.length} changes detected.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to execute structural diff.');
    } finally {
      setIsDiffing(false);
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
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-2 border border-blue-200 dark:border-blue-800/40">
            <span>Student 1 Module — Structural Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Structural Diff Inspector & Sandbox
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Independent demonstration of OpenAPI specification parsing, normalization, route diffing, parameter validation, and AST schema comparison.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveMode('sandbox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'sandbox'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Live Sandbox Demo
          </button>
          <button
            onClick={() => setActiveMode('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'history'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Saved Analysis Archive
          </button>
        </div>
      </div>

      {activeMode === 'sandbox' ? (
        /* Student 1 Live Sandbox Demo */
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Interactive OpenAPI Specification Comparator
              </span>
            </div>
            <button
              onClick={handleRunSandboxDiff}
              disabled={isDiffing}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isDiffing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Run Structural Diff</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                Base Specification (v1 YAML / JSON)
              </label>
              <textarea
                value={specV1}
                onChange={(e) => setSpecV1(e.target.value)}
                rows={12}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 p-3 font-mono text-[11px] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5 font-mono">
                Target Specification (v2 YAML / JSON)
              </label>
              <textarea
                value={specV2}
                onChange={(e) => setSpecV2(e.target.value)}
                rows={12}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 p-3 font-mono text-[11px] text-slate-900 dark:text-white border border-blue-200 dark:border-blue-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {sandboxResults && (
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Detected Structural Changes ({sandboxResults.length})
                </span>
                <span className="text-xs text-slate-500 font-mono">POST /api/analyses/structural</span>
              </div>

              {sandboxResults.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>No structural changes detected. Specifications are structurally identical.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {sandboxResults.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{item.http_method}</span>
                          <span className="font-mono text-slate-600 dark:text-slate-400">{item.endpoint_path}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            {item.change_type}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{item.explanation}</p>
                        <span className="text-[10px] font-mono text-slate-400 block">{item.component_path}</span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          item.preliminary_classification === 'BREAKING'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {item.preliminary_classification}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">
                          {item.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            <div className="text-center py-20 text-xs text-slate-400">Loading structural records...</div>
          ) : selectedAnalysis ? (
            <div className="space-y-6">
              {/* Quick Summary Pill Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Endpoints Added
                  </span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {selectedAnalysis.endpoints.filter(e => e.change_type === 'ADDED').length}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Endpoints Removed
                  </span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                    {selectedAnalysis.endpoints.filter(e => e.change_type === 'REMOVED').length}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Endpoints Modified
                  </span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    {selectedAnalysis.endpoints.filter(e => e.change_type === 'MODIFIED').length}
                  </span>
                </div>
              </div>

              {/* Endpoints List */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Detailed Operations Structural Inventory
                  </span>
                  <span className="text-xs font-mono text-slate-500">{selectedAnalysis.endpoints.length} Operations</span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {selectedAnalysis.endpoints.map((ep) => (
                    <div key={`${ep.method} ${ep.path}`} className="p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {ep.method}
                          </span>
                          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                            {ep.path}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ep.change_type === 'REMOVED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                            ep.change_type === 'ADDED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {ep.change_type}
                          </span>
                          {ep.is_breaking && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                              Breaking
                            </span>
                          )}
                        </div>
                      </div>

                      {ep.structural_changes.length > 0 ? (
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                          <ul className="space-y-1">
                            {ep.structural_changes.map((change, i) => (
                              <li key={i} className="text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                <span className="text-blue-600 font-bold">&bull;</span>
                                <span>{change}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No structural schema modifications detected.</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">No historical analyses found. Run a comparison to view historical structural diffs.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
