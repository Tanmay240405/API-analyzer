import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  PlusCircle,
  Clock,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { getDashboardStats } from '../services/api';
import type { DashboardStatsResponse } from '../types/api';

export const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then((data) => setStats(data))
      .catch((err) => console.error('Failed to load dashboard stats:', err));
  }, []);

  const hasData = stats && stats.total_analyses > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome Banner */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3 border border-blue-200 dark:border-blue-800/40">
            <span>Production API Evolution Platform</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            API Semantic & Behavioral Impact Analysis
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Compare OpenAPI & Swagger specifications to detect structural breaks, subtle natural language meaning drift, and altered behavioral contracts using machine learning and NLP.
          </p>
        </div>

        <Link
          to="/new-analysis"
          className="inline-flex items-center space-x-2.5 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Analyze API Versions</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Analyses */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Analyses
          </span>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {stats ? stats.total_analyses : 0}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Recorded in SQLite</span>
        </div>

        {/* Metric 2: Structural Changes */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Structural Changes</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </span>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {stats ? stats.total_structural_changes : 0}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Schema & parameter diffs</span>
        </div>

        {/* Metric 3: Semantic Changes Flagged */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between">
            <span>Semantic Changes</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </span>
          <div className="my-2">
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {stats ? stats.total_semantic_changes : 0}
            </span>
          </div>
          <span className="text-[11px] text-purple-500/80">NLP Drift detected</span>
        </div>

        {/* Metric 4: Potential Breaking Changes */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
            <span>Breaking Changes</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </span>
          <div className="my-2">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {stats ? stats.total_breaking_changes : 0}
            </span>
          </div>
          <span className="text-[11px] text-rose-500/80">Client disruption risk</span>
        </div>

        {/* Metric 5: Analyses Completed */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>Completed Successfully</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </span>
          <div className="my-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {stats ? stats.successful_analyses : 0}
            </span>
          </div>
          <span className="text-[11px] text-emerald-500/80">Zero failures</span>
        </div>
      </div>

      {/* Visualizations Row */}
      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Change Categories */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Changes by Category
              </h3>
              <span className="text-xs text-slate-400">Aggregated across all runs</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.category_distribution}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {stats.category_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Breaking vs Non-Breaking */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Breaking vs Non-Breaking Classification
              </h3>
              <span className="text-xs text-slate-400">Consumer impact ratio</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.breaking_vs_non_breaking.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.breaking_vs_non_breaking.map((entry, index) => (
                      <Cell key={`pie-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Analysis Data Available Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
            Run your first API comparison to view real aggregate metric graphs, breakdown charts, and persistent history.
          </p>
          <Link
            to="/new-analysis"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start First Analysis</span>
          </Link>
        </div>
      )}

      {/* Recent Analyses Table */}
      {hasData && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Analyses</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest version comparisons recorded in SQLite</p>
            </div>
            <Link
              to="/history"
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>View All History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Analysis Name</th>
                  <th className="py-3 px-4">Versions</th>
                  <th className="py-3 px-4 text-center">Operations</th>
                  <th className="py-3 px-4 text-center">Breaking</th>
                  <th className="py-3 px-4 text-center">Risk Score</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {stats.recent_analyses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.name || item.v1_title}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      v{item.v1_version} &rarr; <span className="text-blue-600 dark:text-blue-400">v{item.v2_version}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">{item.total_endpoints}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.breaking_count > 0
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}>
                        {item.breaking_count} Breaking
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      <span className={item.risk_score >= 70 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}>
                        {item.risk_score}/100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/analysis/${item.id}`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
