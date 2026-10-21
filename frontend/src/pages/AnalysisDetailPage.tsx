import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ComparisonResponse } from '../types/api';
import {
  getHistoricalComparison,
  getExportUrl
} from '../services/api';
import {
  AlertTriangle,
  CheckCircle,
  Layers,
  Copy,
  Check,
  Search,
  ShieldAlert,
  Code2,
  FileText,
  Sparkles,
  FileSpreadsheet,
  Printer,
  ArrowRight,
  AlertCircle
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

export const AnalysisDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<'overview' | 'structural' | 'semantic' | 'behavioral' | 'impact' | 'migration' | 'raw'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [breakingFilter, setBreakingFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  // Multi-Language Code snippets state
  const [codeSnippetLangs, setCodeSnippetLangs] = useState<Record<string, 'curl' | 'python' | 'typescript'>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getHistoricalComparison(id)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load analysis details.');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const setCodeLang = (key: string, lang: 'curl' | 'python' | 'typescript') => {
    setCodeSnippetLangs(prev => ({ ...prev, [key]: lang }));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="text-center py-24">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Retrieving analysis report...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Analysis Report Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">The requested analysis run ID could not be located in SQLite storage.</p>
        <Link to="/history" className="text-xs font-semibold text-blue-600 hover:underline">
          &larr; Back to Analysis History
        </Link>
      </div>
    );
  }

  // Safe extracted variables with complete fallback hierarchy
  const endpoints = data.endpoints || [];
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
    NON_BREAKING: 0,
    UNCHANGED: 0
  };
  const v1Filename = data.v1_filename || data.metadata?.v1_filename || 'api_v1.yaml';
  const v2Filename = data.v2_filename || data.metadata?.v2_filename || 'api_v2.yaml';
  const v1Title = data.v1_title || data.metadata?.v1_title || 'API v1';
  const v2Title = data.v2_title || data.metadata?.v2_title || 'API v2';
  const v1Version = data.v1_version || data.metadata?.v1_version || '1.0.0';
  const v2Version = data.v2_version || data.metadata?.v2_version || '2.0.0';
  const totalEndpoints = data.total_endpoints ?? data.summary?.total_endpoints ?? endpoints.length;
  const structChangesCount = data.structural_changes_count ?? data.summary?.structural_changes_count ?? data.structural_breaking_count ?? 0;
  const semanticChangesCount = data.semantic_changes_count ?? data.summary?.semantic_drift_count ?? data.behavioral_breaking_count ?? 0;
  const breakingCount = data.breaking_count ?? data.summary?.breaking_count ?? 0;
  const nonBreakingCount = data.non_breaking_count ?? data.summary?.non_breaking_count ?? 0;
  const riskScore = data.risk_score ?? data.summary?.overall_risk_score ?? 0;
  const execSummary = data.executive_summary || `Comparison of ${v1Title} (v${v1Version}) to ${v2Title} (v${v2Version}) identified ${breakingCount} breaking changes across ${totalEndpoints} operations.`;

  const structuralChanges: any[] = data.structural_changes || [];
  const semanticFindings: any[] = data.semantic_findings || [];
  const behavioralFindings: any[] = data.behavioral_findings || [];
  const impactRecords: any[] = data.impact_records || [];

  // Filter endpoints
  const filteredEndpoints = endpoints.filter(ep => {
    const key = `${ep.method || ''} ${ep.path || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || key.includes(searchQuery.toLowerCase()) || 
      (ep.v1_description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ep.v2_description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBreaking = 
      breakingFilter === 'ALL' ? true :
      breakingFilter === 'BREAKING_ONLY' ? ep.is_breaking :
      breakingFilter === 'NON_BREAKING' ? !ep.is_breaking :
      ep.breaking_type === breakingFilter;

    const matchesSeverity = 
      severityFilter === 'ALL' ? true : ep.severity === severityFilter;

    const matchesMethod =
      methodFilter === 'ALL' ? true : ep.method === methodFilter;

    return matchesSearch && matchesBreaking && matchesSeverity && matchesMethod;
  });

  // Filter structural changes
  const filteredStructural = structuralChanges.filter(s => {
    const key = `${s.http_method || ''} ${s.endpoint_path || ''} ${s.explanation || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || key.includes(searchQuery.toLowerCase());
    const matchesBreaking = 
      breakingFilter === 'ALL' ? true :
      breakingFilter === 'BREAKING_ONLY' ? (s.preliminary_classification === 'BREAKING') :
      breakingFilter === 'NON_BREAKING' ? (s.preliminary_classification !== 'BREAKING') : true;
    const matchesMethod = methodFilter === 'ALL' ? true : (s.http_method || '').toUpperCase() === methodFilter;
    return matchesSearch && matchesBreaking && matchesMethod;
  });

  // Filter semantic findings
  const filteredSemantic = semanticFindings.filter(sem => {
    const key = `${sem.http_method || ''} ${sem.endpoint_path || ''} ${sem.explanation || ''} ${sem.old_text || ''} ${sem.new_text || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || key.includes(searchQuery.toLowerCase());
    const matchesMethod = methodFilter === 'ALL' ? true : (sem.http_method || '').toUpperCase() === methodFilter;
    return matchesSearch && matchesMethod;
  });

  // Filter behavioral findings
  const filteredBehavioral = behavioralFindings.filter(b => {
    const key = `${b.http_method || ''} ${b.endpoint_path || ''} ${b.explanation || ''} ${b.evidence || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || key.includes(searchQuery.toLowerCase());
    const matchesMethod = methodFilter === 'ALL' ? true : (b.http_method || '').toUpperCase() === methodFilter;
    return matchesSearch && matchesMethod;
  });

  // Chart Data
  const severityChartData = [
    { name: 'Critical', value: severityBreakdown['CRITICAL'] || 0, color: '#ef4444' },
    { name: 'High', value: severityBreakdown['HIGH'] || 0, color: '#f97316' },
    { name: 'Medium', value: severityBreakdown['MEDIUM'] || 0, color: '#eab308' },
    { name: 'Low', value: severityBreakdown['LOW'] || 0, color: '#3b82f6' },
    { name: 'Info', value: severityBreakdown['INFO'] || 0, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const categoryChartData = [
    { name: 'Dual Breaking', count: categoryBreakdown['DUAL_BREAKING'] || 0, fill: '#ec4899' },
    { name: 'Structural Break', count: categoryBreakdown['STRUCTURAL_BREAKING'] || 0, fill: '#ef4444' },
    { name: 'Behavioral Break', count: categoryBreakdown['BEHAVIORAL_BREAKING'] || 0, fill: '#8b5cf6' },
    { name: 'Non-Breaking', count: categoryBreakdown['NON_BREAKING'] || 0, fill: '#10b981' },
  ].filter(d => d.count > 0);

  const getMethodBadgeColor = (method: string) => {
    switch ((method || '').toUpperCase()) {
      case 'GET': return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40';
      case 'POST': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40';
      case 'PUT': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40';
      case 'DELETE': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40';
      case 'PATCH': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch ((severity || '').toUpperCase()) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800/50">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-300 dark:border-orange-800/50">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-300 dark:border-blue-800/50">LOW</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">INFO</span>;
    }
  };

  const getBreakingTypeBadge = (type: string) => {
    switch (type) {
      case 'DUAL_BREAKING':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300 border border-pink-200 dark:border-pink-800/40 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> DUAL BREAKING</span>;
      case 'STRUCTURAL_BREAKING':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> STRUCTURAL BREAK</span>;
      case 'BEHAVIORAL_BREAKING':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> BEHAVIORAL BREAK (NLP)</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> NON-BREAKING</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-2">
              <span className="font-mono">{v1Filename}</span>
              <span>&rarr;</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">{v2Filename}</span>
              <span>&bull;</span>
              <span>{new Date(data.created_at).toLocaleDateString()}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center flex-wrap gap-2">
              <span>{data.name || v1Title}</span>
              <span className="text-slate-400 text-sm font-mono font-normal">v{v1Version} &rarr; v{v2Version}</span>
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              {execSummary}
            </p>
          </div>

          {/* Export Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={getExportUrl(data.id, 'html')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Printable HTML / PDF</span>
            </a>

            <a
              href={getExportUrl(data.id, 'csv')}
              download
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </a>

            <a
              href={getExportUrl(data.id, 'json')}
              download
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              <span>Export JSON</span>
            </a>
          </div>
        </div>

        {/* Executive Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Ops</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono block mt-1">{totalEndpoints}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Structural Diffs</span>
            <span className="text-2xl font-black text-slate-700 dark:text-slate-300 font-mono block mt-1">{structuralChanges.length || structChangesCount}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Semantic Flags</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono block mt-1">{semanticFindings.length || semanticChangesCount}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Breaking Changes</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-300 font-mono block mt-1">{breakingCount}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Non-Breaking</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-300 font-mono block mt-1">{nonBreakingCount}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Risk Score</span>
            <span className={`text-2xl font-black font-mono block mt-1 ${
              riskScore >= 70 ? 'text-rose-600 dark:text-rose-400' :
              riskScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {riskScore}/100
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center space-x-1 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview & Charts', icon: Layers },
          { key: 'structural', label: `Structural Changes (${structuralChanges.length || structChangesCount})`, icon: Layers },
          { key: 'semantic', label: `Semantic Drift (${semanticFindings.length || semanticChangesCount})`, icon: Sparkles },
          { key: 'behavioral', label: `Behavioral Contracts (${behavioralFindings.length || endpoints.filter(e => e.behavioral_changes?.length).length})`, icon: ShieldAlert },
          { key: 'impact', label: `Consumer Impact (${breakingCount})`, icon: AlertTriangle },
          { key: 'migration', label: `Migration Actions (${endpoints.filter(e => e.is_breaking).length})`, icon: Code2 },
          { key: 'raw', label: 'Raw Diff', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters & Search Toolbar (shown for change-oriented tabs) */}
      {activeTab !== 'raw' && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search path, description, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={breakingFilter}
              onChange={(e) => setBreakingFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Classifications</option>
              <option value="BREAKING_ONLY">Breaking Only</option>
              <option value="NON_BREAKING">Non-Breaking Only</option>
              <option value="DUAL_BREAKING">Dual Breaking</option>
              <option value="STRUCTURAL_BREAKING">Structural Only</option>
              <option value="BEHAVIORAL_BREAKING">Behavioral Only (NLP)</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & CHARTS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
                Changes by Severity Level
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {severityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
                Change Classification Taxonomy
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cat-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Operations Overview Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">API Operations Matrix</h3>
                <p className="text-xs text-slate-500 mt-0.5">High-level summary of all parsed endpoints and detected version changes</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {filteredEndpoints.length} Operations
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Method & Path</th>
                    <th className="px-4 py-3">Summary / Meaning</th>
                    <th className="px-4 py-3">Operation Status</th>
                    <th className="px-4 py-3">Breaking Type</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3 text-right">Quick Jump</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEndpoints.map((ep) => {
                    const epKey = `${ep.method} ${ep.path}`;
                    return (
                      <tr key={epKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border mr-2 ${getMethodBadgeColor(ep.method)}`}>
                            {ep.method}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">{ep.path}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {ep.v2_summary || ep.v1_summary || ep.v2_description || ep.v1_description || 'No description'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            ep.change_type === 'ADDED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                            ep.change_type === 'REMOVED' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                            'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {ep.change_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getBreakingTypeBadge(ep.breaking_type)}
                        </td>
                        <td className="px-4 py-3">
                          {getSeverityBadge(ep.severity)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {(ep.structural_changes?.length ?? 0) > 0 && (
                              <button
                                onClick={() => setActiveTab('structural')}
                                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-[10px] font-semibold"
                                title="View Structural Changes"
                              >
                                Structural
                              </button>
                            )}
                            {ep.semantic_similarity !== undefined && (
                              <button
                                onClick={() => setActiveTab('semantic')}
                                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950 text-slate-600 dark:text-slate-300 hover:text-purple-600 text-[10px] font-semibold"
                                title="View Semantic Analysis"
                              >
                                Semantic
                              </button>
                            )}
                            {ep.is_breaking && (
                              <button
                                onClick={() => setActiveTab('migration')}
                                className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[10px] font-semibold"
                                title="View Migration Code"
                              >
                                Migration
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STRUCTURAL CHANGES (STUDENT 1) */}
      {/* ========================================================================= */}
      {activeTab === 'structural' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Structural OpenAPI Differences
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Detects added, removed, and modified endpoints, parameters, data types, and default values.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              {filteredStructural.length} Structural Findings
            </span>
          </div>

          {filteredStructural.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No structural changes detected for the selected filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredStructural.map((s: any, idx: number) => (
                <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getMethodBadgeColor(s.http_method)}`}>
                        {s.http_method}
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {s.endpoint_path}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {s.change_type}
                      </span>
                      {s.preliminary_classification === 'BREAKING' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                          BREAKING
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                          NON-BREAKING
                        </span>
                      )}
                      {getSeverityBadge(s.severity)}
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {s.explanation}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 font-mono text-[11px] border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-sans font-bold uppercase text-slate-400 block mb-0.5">Component Path</span>
                      <span className="text-slate-700 dark:text-slate-300 break-all">{s.component_path}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 font-mono text-[11px] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-sans font-bold uppercase text-slate-400 block mb-0.5">Before (v1)</span>
                        <span className="text-slate-600 dark:text-slate-400">{String(s.old_value ?? 'None')}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 mx-2 shrink-0" />
                      <div>
                        <span className="text-[10px] font-sans font-bold uppercase text-blue-600 dark:text-blue-400 block mb-0.5">After (v2)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{String(s.new_value ?? 'None')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SEMANTIC CHANGES (STUDENT 2) */}
      {/* ========================================================================= */}
      {activeTab === 'semantic' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                NLP Semantic Meaning Analysis & Documentation Drift
              </h3>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                Evaluates documentation changes using sentence embeddings (all-MiniLM-L6-v2) to detect semantic drift and meaning shifts.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
              {filteredSemantic.length} Semantic Findings
            </span>
          </div>

          {filteredSemantic.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No semantic drift detected between documentation texts.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSemantic.map((sem: any, idx: number) => {
                const simPercent = Math.round(sem.similarity_score * 100);
                return (
                  <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getMethodBadgeColor(sem.http_method)}`}>
                          {sem.http_method}
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {sem.endpoint_path}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          [{sem.field_name}]
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {sem.meaning_change_suspected && (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Meaning Shift Suspected
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                          Drift: {sem.semantic_drift.toFixed(3)}
                        </span>
                      </div>
                    </div>

                    {/* Similarity Visual Gauge */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-400">Embedding Cosine Similarity</span>
                        <span className={simPercent < 60 ? 'text-rose-600 font-bold' : simPercent < 80 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                          {simPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            simPercent < 60 ? 'bg-rose-500' : simPercent < 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${simPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Side-by-Side Natural Language Diff */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Specification v1 Documentation
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 italic">
                          "{sem.old_text || 'None'}"
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40">
                        <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block mb-1">
                          Specification v2 Documentation
                        </span>
                        <p className="text-slate-900 dark:text-white font-medium italic">
                          "{sem.new_text || 'None'}"
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-bold text-purple-700 dark:text-purple-400 block mb-0.5">NLP Semantic Finding:</span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{sem.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BEHAVIORAL CONTRACTS (STUDENT 3) */}
      {/* ========================================================================= */}
      {activeTab === 'behavioral' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                Behavioral Contracts & Deontic Modalities
              </h3>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                Evaluates deontic rules (obligations MUST, permissions MAY, prohibitions MUST NOT), preconditions, and response guarantees.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              {filteredBehavioral.length} Behavioral Shifts
            </span>
          </div>

          {filteredBehavioral.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No behavioral contract violations detected.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBehavioral.map((b: any, idx: number) => (
                <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getMethodBadgeColor(b.http_method)}`}>
                        {b.http_method}
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {b.endpoint_path}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                        {b.category}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                        {b.classification}
                      </span>
                      {getSeverityBadge(b.severity)}
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {b.explanation}
                  </p>

                  {b.evidence && (
                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs font-mono text-indigo-900 dark:text-indigo-200">
                      <span className="text-[10px] uppercase font-sans font-bold text-indigo-500 block mb-1">Contract Evidence / Trigger Phrase:</span>
                      "{b.evidence}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CONSUMER IMPACT (STUDENT 3) */}
      {/* ========================================================================= */}
      {activeTab === 'impact' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Downstream Consumer Impact Assessment
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Evaluates failure modes, HTTP 400 rejection scenarios, and deserialization risks for client applications.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
              {impactRecords.length || filteredEndpoints.filter(e => e.is_breaking).length} Breaking Impact Risks
            </span>
          </div>

          <div className="space-y-4">
            {filteredEndpoints.filter(e => e.consumer_impact || e.is_breaking).map((ep) => {
              const epKey = `${ep.method} ${ep.path}`;
              return (
                <div key={epKey} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getMethodBadgeColor(ep.method)}`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {ep.path}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getBreakingTypeBadge(ep.breaking_type)}
                      {getSeverityBadge(ep.severity)}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs">
                    <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 block mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Consumer Impact Assessment
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {ep.consumer_impact || 'No breaking impact identified on downstream consumers.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Target Affected Consumer Groups
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Mobile App Clients
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        SDK Consumers
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Third-Party Web Integrations
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: MIGRATION ACTIONS (STUDENT 3) */}
      {/* ========================================================================= */}
      {activeTab === 'migration' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-600" />
                Actionable Migration Guidance & Client Code Adaptation
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Step-by-step developer remediation actions and interactive multi-language code snippets.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
              {filteredEndpoints.filter(e => e.migration_recommendation).length} Migration Guides
            </span>
          </div>

          <div className="space-y-6">
            {filteredEndpoints.map((ep) => {
              const epKey = `${ep.method} ${ep.path}`;
              const selectedLang = codeSnippetLangs[epKey] || 'curl';
              const codeObj = ep.code_migration?.[selectedLang];

              return (
                <div key={epKey} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getMethodBadgeColor(ep.method)}`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {ep.path}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getBreakingTypeBadge(ep.breaking_type)}
                    </div>
                  </div>

                  {/* Migration Remediation Text */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block mb-1 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Migration Remediation Action
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {ep.migration_recommendation || 'No code changes required for this operation.'}
                    </p>
                  </div>

                  {/* Code Migration Snippets */}
                  {ep.code_migration && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          Client Code Adaptation ({selectedLang.toUpperCase()})
                        </span>
                        <div className="flex space-x-1">
                          {(['curl', 'python', 'typescript'] as const).map(lang => (
                            <button
                              key={lang}
                              onClick={() => setCodeLang(epKey, lang)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                selectedLang === lang
                                  ? 'bg-blue-600 text-white font-bold'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                              }`}
                            >
                              {lang.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {codeObj && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 font-mono text-xs">
                          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-950/50">
                            <span className="text-[10px] text-slate-400 block mb-1 font-sans font-bold uppercase">Before (v1)</span>
                            <pre className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{codeObj.v1_snippet}</pre>
                          </div>
                          <div className="p-3.5 bg-blue-50/20 dark:bg-blue-950/20 relative group">
                            <div className="flex items-center justify-between mb-1 font-sans">
                              <span className="text-[10px] text-blue-600 font-bold uppercase">After (v2)</span>
                              <button
                                onClick={() => copyToClipboard(codeObj.v2_snippet, `${epKey}-${selectedLang}`)}
                                className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] flex items-center gap-1 shadow-xs"
                              >
                                {copiedKey === `${epKey}-${selectedLang}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>Copy v2</span>
                              </button>
                            </div>
                            <pre className="text-blue-950 dark:text-blue-200 whitespace-pre-wrap">{codeObj.v2_snippet}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: RAW SPECIFICATION DIFF */}
      {/* ========================================================================= */}
      {activeTab === 'raw' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-300 block mb-2 font-sans">
              Raw Specification 1 ({v1Filename})
            </span>
            <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 max-h-[500px] overflow-auto whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {data.raw_v1 || '# Raw v1 content was not recorded'}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs">
            <span className="font-bold text-blue-600 dark:text-blue-400 block mb-2 font-sans">
              Raw Specification 2 ({v2Filename})
            </span>
            <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 max-h-[500px] overflow-auto whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {data.raw_v2 || '# Raw v2 content was not recorded'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
