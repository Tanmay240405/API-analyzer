import React, { useState } from 'react';
import type {
  ComparisonResponse
} from '../types/api';
import {
  AlertTriangle,
  CheckCircle,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Code2,
  FileText,
  Sparkles,
  RefreshCw
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
import toast from 'react-hot-toast';

interface Props {
  data: ComparisonResponse;
  onReset?: () => void;
}

export const ComparisonResults: React.FC<Props> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'nlp' | 'structural' | 'migration'>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [breakingFilter, setBreakingFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({
    // Expand first breaking endpoint by default
    [data.endpoints.find(e => e.is_breaking)?.path + ' ' + data.endpoints.find(e => e.is_breaking)?.method || '']: true
  });
  const [codeSnippetLangs, setCodeSnippetLangs] = useState<Record<string, 'curl' | 'python' | 'typescript'>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleExpand = (key: string) => {
    setExpandedEndpoints(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setCodeLang = (key: string, lang: 'curl' | 'python' | 'typescript') => {
    setCodeSnippetLangs(prev => ({ ...prev, [key]: lang }));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const exportMarkdownReport = () => {
    let md = `# API Version Comparison & Behavioral Impact Report\n\n`;
    md += `**API**: ${data.v1_title} (v${data.v1_version}) -> ${data.v2_title} (v${data.v2_version})\n`;
    md += `**Generated At**: ${new Date(data.created_at).toLocaleString()}\n`;
    md += `**Risk Score**: ${data.risk_score}/100\n`;
    md += `**Breaking Changes**: ${data.breaking_count} / ${data.total_endpoints} operations\n\n`;
    md += `## Executive Summary\n${data.executive_summary}\n\n`;
    md += `## Endpoint Breaking Changes Breakdown\n\n`;

    data.endpoints.forEach((ep) => {
      md += `### [${ep.method}] ${ep.path}\n`;
      md += `- **Status**: ${ep.is_breaking ? '⚠️ BREAKING' : '✅ NON-BREAKING'} (${ep.breaking_type})\n`;
      md += `- **Severity**: ${ep.severity} | **Confidence**: ${(ep.confidence_score * 100).toFixed(0)}%\n`;
      if (ep.semantic_similarity !== undefined) {
        md += `- **Semantic Similarity**: ${(ep.semantic_similarity * 100).toFixed(1)}% | **Semantic Drift**: ${((ep.semantic_drift || 0) * 100).toFixed(1)}%\n`;
      }
      if (ep.structural_changes.length > 0) {
        md += `\n**Structural Changes:**\n`;
        ep.structural_changes.forEach(c => md += `  - ${c}\n`);
      }
      if (ep.behavioral_changes.length > 0) {
        md += `\n**NLP Behavioral Contract Shifts:**\n`;
        ep.behavioral_changes.forEach(b => md += `  - [${b.category}] ${b.explanation}\n`);
      }
      md += `\n**Consumer Impact:**\n> ${ep.consumer_impact}\n\n`;
      md += `**Migration Guidance:**\n${ep.migration_recommendation}\n\n`;
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api_migration_report_${data.v1_version}_to_${data.v2_version}.md`;
    a.click();
    toast.success('Report exported as Markdown file!');
  };

  const exportJSONReport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api_diff_${data.v1_version}_to_${data.v2_version}.json`;
    a.click();
    toast.success('Report exported as JSON!');
  };

  // Filter endpoints
  const filteredEndpoints = data.endpoints.filter(ep => {
    const key = `${ep.method} ${ep.path}`.toLowerCase();
    const matchesSearch = key.includes(searchQuery.toLowerCase()) || 
      (ep.v1_description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ep.v2_description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBreaking = 
      breakingFilter === 'ALL' ? true :
      breakingFilter === 'BREAKING_ONLY' ? ep.is_breaking :
      breakingFilter === 'NON_BREAKING' ? !ep.is_breaking :
      ep.breaking_type === breakingFilter;

    const matchesSeverity = 
      severityFilter === 'ALL' ? true : ep.severity === severityFilter;

    return matchesSearch && matchesBreaking && matchesSeverity;
  });

  // Chart Data with safe fallbacks
  const severityBreakdown = data.severity_breakdown || {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0
  };
  const categoryBreakdown = data.category_breakdown || {
    DUAL_BREAKING: 0,
    STRUCTURAL_BREAKING: 0,
    BEHAVIORAL_BREAKING: 0,
    NON_BREAKING: 0
  };

  const severityChartData = [
    { name: 'Critical', value: severityBreakdown['CRITICAL'] || 0, color: '#ef4444' },
    { name: 'High', value: severityBreakdown['HIGH'] || 0, color: '#f97316' },
    { name: 'Medium', value: severityBreakdown['MEDIUM'] || 0, color: '#eab308' },
    { name: 'Low', value: severityBreakdown['LOW'] || 0, color: '#3b82f6' },
    { name: 'Info', value: severityBreakdown['INFO'] || 0, color: '#64748b' },
  ].filter(d => d.value > 0);

  const categoryChartData = [
    { name: 'Dual Breaking', count: categoryBreakdown['DUAL_BREAKING'] || 0, fill: '#ec4899' },
    { name: 'Structural Break', count: categoryBreakdown['STRUCTURAL_BREAKING'] || 0, fill: '#f43f5e' },
    { name: 'Behavioral Break', count: categoryBreakdown['BEHAVIORAL_BREAKING'] || 0, fill: '#8b5cf6' },
    { name: 'Non-Breaking', count: categoryBreakdown['NON_BREAKING'] || 0, fill: '#10b981' },
  ].filter(d => d.count > 0);

  const getMethodBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'POST': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'PUT': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'DELETE': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'PATCH': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">LOW</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">INFO</span>;
    }
  };

  const getBreakingTypeBadge = (type: string) => {
    switch (type) {
      case 'DUAL_BREAKING':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> DUAL BREAKING</span>;
      case 'STRUCTURAL_BREAKING':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> STRUCTURAL BREAK</span>;
      case 'BEHAVIORAL_BREAKING':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> BEHAVIORAL BREAK (NLP)</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> BACKWARD COMPATIBLE</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 text-xs text-indigo-400 font-medium uppercase tracking-wider mb-2">
              <span>Analysis Completed</span>
              <span>•</span>
              <span>{new Date(data.created_at).toLocaleDateString()} at {new Date(data.created_at).toLocaleTimeString()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center flex-wrap gap-2">
              <span>{data.v1_title}</span>
              <span className="text-slate-400 text-lg font-mono">v{data.v1_version}</span>
              <ArrowRight className="w-5 h-5 text-indigo-400 mx-1" />
              <span>{data.v2_title}</span>
              <span className="text-indigo-400 text-lg font-mono">v{data.v2_version}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-3xl leading-relaxed">
              {data.executive_summary}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportMarkdownReport}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-sm transition-all hover:scale-[1.02]"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Export Markdown</span>
            </button>
            <button
              onClick={exportJSONReport}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 shadow-sm transition-all hover:scale-[1.02]"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Export JSON</span>
            </button>
            {onReset && (
              <button
                onClick={onReset}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>New Comparison</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          {/* Risk Score Dial Card */}
          <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Breaking Risk Index</span>
            <div className="my-2 flex items-baseline space-x-2">
              <span className={`text-4xl font-black font-mono tracking-tight ${
                data.risk_score >= 70 ? 'text-rose-400' :
                data.risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {data.risk_score}
              </span>
              <span className="text-slate-500 text-sm">/ 100</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  data.risk_score >= 70 ? 'bg-rose-500' :
                  data.risk_score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, data.risk_score))}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-2">
              {data.risk_score >= 70 ? 'High Consumer Disruption' :
               data.risk_score >= 40 ? 'Moderate Integration Changes' : 'Safe / Low Friction'}
            </span>
          </div>

          {/* Metric 2: Total Operations */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Operations</span>
            <span className="text-3xl font-black text-white font-mono my-2">{data.total_endpoints}</span>
            <span className="text-[11px] text-slate-500">Across API specifications</span>
          </div>

          {/* Metric 3: Breaking Changes */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/30 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center justify-between">
              <span>Breaking Changes</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </span>
            <span className="text-3xl font-black text-rose-300 font-mono my-2">{data.breaking_count}</span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-rose-400 font-semibold">{data.structural_breaking_count} struct</span>
              <span>•</span>
              <span className="text-purple-400 font-semibold">{data.behavioral_breaking_count} behav (NLP)</span>
            </div>
          </div>

          {/* Metric 4: Backward Compatible */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span>Non-Breaking</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <span className="text-3xl font-black text-emerald-300 font-mono my-2">{data.non_breaking_count}</span>
            <span className="text-[11px] text-emerald-400/80">Additions & safe updates</span>
          </div>

          {/* Metric 5: NLP Model Status */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/30 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
              <span>NLP Embeddings</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </span>
            <span className="text-sm font-semibold text-slate-200 my-2 font-mono truncate" title="all-MiniLM-L6-v2">
              all-MiniLM-L6-v2
            </span>
            <span className="text-[11px] text-indigo-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 384-dim Dense Vectors
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Chart */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 text-sm tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Impact Severity Distribution
            </h3>
            <span className="text-xs text-slate-500">By classification level</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Chart */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 text-sm tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Change Category Breakdown
            </h3>
            <span className="text-xs text-slate-500">Structural vs Behavioral</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'matrix'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Endpoint Breaking Matrix ({data.endpoints.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('nlp')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'nlp'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>NLP Semantic & Contracts</span>
        </button>

        <button
          onClick={() => setActiveTab('migration')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'migration'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span>Actionable Migration Guide</span>
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search endpoint path, method, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Breaking status filter */}
          <select
            value={breakingFilter}
            onChange={(e) => setBreakingFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Changes</option>
            <option value="BREAKING_ONLY">Breaking Only</option>
            <option value="DUAL_BREAKING">Dual Breaking</option>
            <option value="STRUCTURAL_BREAKING">Structural Only</option>
            <option value="BEHAVIORAL_BREAKING">Behavioral Only (NLP)</option>
            <option value="NON_BREAKING">Backward Compatible</option>
          </select>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* TAB 1: ALL ENDPOINTS & BREAKING MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {filteredEndpoints.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
              <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 font-medium text-sm">No endpoints match the selected filter criteria.</p>
            </div>
          ) : (
            filteredEndpoints.map((ep) => {
              const epKey = `${ep.method} ${ep.path}`;
              const isExpanded = !!expandedEndpoints[epKey];
              const selectedLang = codeSnippetLangs[epKey] || 'curl';
              const codeObj = ep.code_migration?.[selectedLang];

              return (
                <div
                  key={epKey}
                  className={`rounded-xl border transition-all ${
                    ep.is_breaking
                      ? 'bg-slate-900/80 border-rose-900/30 hover:border-rose-700/50'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header Accordion Trigger */}
                  <div
                    onClick={() => toggleExpand(epKey)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center space-x-3.5">
                      <button className="text-slate-400 hover:text-slate-200 transition-transform">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-indigo-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${getMethodBadgeColor(ep.method)}`}>
                        {ep.method}
                      </span>

                      <div>
                        <span className="font-mono text-sm sm:text-base font-semibold text-slate-100">
                          {ep.path}
                        </span>
                        {ep.v2_summary || ep.v1_summary ? (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {ep.v2_summary || ep.v1_summary}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pl-8 md:pl-0">
                      {/* Semantic Similarity Bar */}
                      {ep.semantic_similarity !== undefined && ep.semantic_similarity !== null && (
                        <div
                          className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs"
                          title={`Cosine Semantic Similarity: ${(ep.semantic_similarity * 100).toFixed(1)}%`}
                        >
                          <span className="text-slate-400 text-[11px]">Similarity</span>
                          <div className="w-14 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                ep.semantic_similarity >= 0.80 ? 'bg-emerald-400' :
                                ep.semantic_similarity >= 0.60 ? 'bg-amber-400' : 'bg-rose-400'
                              }`}
                              style={{ width: `${Math.round(ep.semantic_similarity * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono font-semibold text-slate-200 text-[11px]">
                            {Math.round(ep.semantic_similarity * 100)}%
                          </span>
                        </div>
                      )}

                      {getSeverityBadge(ep.severity)}
                      {getBreakingTypeBadge(ep.breaking_type)}
                    </div>
                  </div>

                  {/* Expanded Body Content */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-2 border-t border-slate-800/80 space-y-5 text-sm animate-in fade-in duration-300">
                      {/* Side-by-Side Documentation Comparison */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800/80">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                            <span>v1 Specification (Previous)</span>
                            <span className="text-slate-500 font-mono">v{data.v1_version}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed italic">
                            "{ep.v1_description || ep.v1_summary || 'No documentation provided in v1.'}"
                          </p>
                        </div>

                        <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800/80">
                          <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 mb-2">
                            <span>v2 Specification (Updated)</span>
                            <span className="text-indigo-400 font-mono">v{data.v2_version}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed italic">
                            "{ep.v2_description || ep.v2_summary || 'No documentation provided in v2.'}"
                          </p>
                        </div>
                      </div>

                      {/* Structural Changes List */}
                      {ep.structural_changes.length > 0 && (
                        <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            Structural Diffs
                          </h4>
                          <ul className="space-y-1.5">
                            {ep.structural_changes.map((change, i) => (
                              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="text-rose-400 font-bold">•</span>
                                <span>{change}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* NLP Behavioral Shifts List */}
                      {ep.behavioral_changes.length > 0 && (
                        <div className="p-4 rounded-lg bg-purple-950/15 border border-purple-900/30">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 mb-2.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            NLP Behavioral Contract Changes
                          </h4>
                          <div className="space-y-2">
                            {ep.behavioral_changes.map((diff, i) => (
                              <div key={i} className="p-2.5 rounded-md bg-purple-950/30 border border-purple-800/30 text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-mono text-purple-300 font-bold uppercase text-[10px]">
                                    {diff.category.replace(/_/g, ' ')}
                                  </span>
                                  {diff.is_breaking && (
                                    <span className="text-[10px] text-rose-400 font-semibold uppercase">Breaking shift</span>
                                  )}
                                </div>
                                <p className="text-slate-300 leading-relaxed">{diff.explanation}</p>
                                {diff.v2_context && (
                                  <div className="mt-1.5 text-[11px] text-purple-200 font-mono bg-black/40 px-2 py-1 rounded">
                                    Trigger: "{diff.v2_context}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Consumer Impact & Remediation Guidance */}
                      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            Client Integration Impact
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {ep.consumer_impact}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Recommended Developer Remediation
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {ep.migration_recommendation}
                          </p>
                        </div>
                      </div>

                      {/* Before vs After Code Migration Snippets */}
                      {ep.code_migration && (
                        <div className="rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                            <div className="flex items-center space-x-2">
                              <Code2 className="w-4 h-4 text-indigo-400" />
                              <span className="text-xs font-semibold text-slate-200">Before & After Client Code</span>
                            </div>

                            {/* Language switcher */}
                            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-md border border-slate-800">
                              {(['curl', 'python', 'typescript'] as const).map(lang => (
                                <button
                                  key={lang}
                                  onClick={() => setCodeLang(epKey, lang)}
                                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                                    selectedLang === lang
                                      ? 'bg-indigo-600 text-white font-semibold'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {lang.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>

                          {codeObj && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 font-mono text-xs">
                              {/* Before Snippet */}
                              <div className="p-4 bg-slate-950/40 relative group">
                                <div className="flex items-center justify-between text-slate-500 mb-2 font-sans font-semibold text-[11px]">
                                  <span>v1 (Legacy Call)</span>
                                </div>
                                <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                  {codeObj.v1_snippet}
                                </pre>
                              </div>

                              {/* After Snippet */}
                              <div className="p-4 bg-indigo-950/10 relative group">
                                <div className="flex items-center justify-between text-indigo-400 mb-2 font-sans font-semibold text-[11px]">
                                  <span>v2 (Updated Call)</span>
                                  <button
                                    onClick={() => copyToClipboard(codeObj.v2_snippet, `${epKey}-${selectedLang}`)}
                                    className="opacity-80 group-hover:opacity-100 flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all text-[11px]"
                                  >
                                    {copiedKey === `${epKey}-${selectedLang}` ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy v2</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="text-indigo-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                  {codeObj.v2_snippet}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: NLP SEMANTIC & CONTRACTS DEEP-DIVE */}
      {activeTab === 'nlp' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 leading-relaxed text-sm text-slate-300">
            <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Linguistic & Behavioral Contract Extraction Methodology
            </h3>
            <p className="text-xs text-slate-400">
              The NLP engine utilizes <span className="text-indigo-400 font-mono">spaCy</span> for syntactic tokenization, dependency parsing, and deontic modality extraction (obligation, prohibition, permission) coupled with dense sentence embeddings via <span className="text-indigo-400 font-mono">sentence-transformers/all-MiniLM-L6-v2</span> to evaluate semantic cosine distance and contract alterations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.endpoints.map(ep => (
              <div key={`${ep.method} ${ep.path}`} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getMethodBadgeColor(ep.method)}`}>
                      {ep.method}
                    </span>
                    <span className="font-mono text-sm font-semibold text-slate-200">{ep.path}</span>
                  </div>
                  <span className="text-xs font-mono text-purple-400 font-bold">
                    Drift: {((ep.semantic_drift || 0) * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Deontic Modalities in v2 */}
                {ep.v2_contracts?.modalities && (
                  <div className="space-y-2 text-xs">
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                      Extracted Deontic Modalities (v2)
                    </span>
                    {ep.v2_contracts.modalities.obligation.length > 0 && (
                      <div className="p-2 rounded bg-rose-950/20 border border-rose-900/30 text-rose-300">
                        <span className="font-bold block text-[10px] uppercase">Obligation (Must / Required):</span>
                        {ep.v2_contracts.modalities.obligation.map((s, idx) => (
                          <div key={idx} className="italic text-[11px] mt-0.5">• "{s}"</div>
                        ))}
                      </div>
                    )}
                    {ep.v2_contracts.modalities.prohibition.length > 0 && (
                      <div className="p-2 rounded bg-orange-950/20 border border-orange-900/30 text-orange-300">
                        <span className="font-bold block text-[10px] uppercase">Prohibition (Must Not / Forbidden):</span>
                        {ep.v2_contracts.modalities.prohibition.map((s, idx) => (
                          <div key={idx} className="italic text-[11px] mt-0.5">• "{s}"</div>
                        ))}
                      </div>
                    )}
                    {ep.v2_contracts.modalities.permission.length > 0 && (
                      <div className="p-2 rounded bg-blue-950/20 border border-blue-900/30 text-blue-300">
                        <span className="font-bold block text-[10px] uppercase">Permission (May / Optional):</span>
                        {ep.v2_contracts.modalities.permission.map((s, idx) => (
                          <div key={idx} className="italic text-[11px] mt-0.5">• "{s}"</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Preconditions */}
                {ep.v2_contracts?.preconditions && ep.v2_contracts.preconditions.length > 0 && (
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider mb-1">
                      Documented Preconditions (v2)
                    </span>
                    {ep.v2_contracts.preconditions.map((p, idx) => (
                      <div key={idx} className="text-slate-300">• {p}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIONABLE MIGRATION GUIDE */}
      {activeTab === 'migration' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 border border-indigo-900/40">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              API Client Migration Checklist
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Step-by-step developer checklist for upgrading API client consumers to version {data.v2_version}. Follow the prioritized items below to resolve all breaking contracts before deploying to production.
            </p>
          </div>

          <div className="space-y-4">
            {data.endpoints.filter(e => e.is_breaking).map((ep, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getMethodBadgeColor(ep.method)}`}>
                      {ep.method}
                    </span>
                    <span className="font-mono text-sm font-bold text-white">{ep.path}</span>
                    {getSeverityBadge(ep.severity)}
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    {ep.migration_recommendation}
                  </p>
                  <p className="text-xs text-slate-500">
                    <strong className="text-slate-400">Failure Risk:</strong> {ep.consumer_impact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
