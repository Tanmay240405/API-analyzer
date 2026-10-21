import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, AlertCircle } from 'lucide-react';
import { checkHealth } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface TopNavProps {
  onToggleSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    checkHealth()
      .then((data) => setHealthStatus(data))
      .catch(() => setHealthStatus({ status: 'error' }));
  }, []);

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/': return 'Overview Dashboard';
      case '/new-analysis': return 'New API Analysis';
      case '/structural-diff': return 'Structural Diff Inspector';
      case '/semantic-analysis': return 'Semantic & Meaning Analysis';
      case '/behavioral-impact': return 'Behavioral Contract Impact';
      case '/history': return 'Analysis History & Archive';
      case '/evaluation': return 'Academic Evaluation & Benchmarks';
      case '/documentation': return 'System Architecture & Documentation';
      default:
        if (pathname.startsWith('/analysis/')) return 'Analysis Report Details';
        return 'API Behavioral Impact Analysis';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">
            {getPageTitle(location.pathname)}
          </h1>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            Automated Semantic & Behavioral API Change Analysis
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Backend & NLP Status Badge */}
        <div
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs border ${
            healthStatus?.status === 'healthy'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
          }`}
          title={healthStatus ? `Model: ${healthStatus?.embedding_model?.backend}` : 'Connecting...'}
        >
          {healthStatus?.status === 'healthy' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] font-medium hidden sm:inline">Model Ready (MiniLM-L6-v2)</span>
              <span className="font-mono text-[11px] font-medium sm:hidden">Ready</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="font-mono text-[11px]">Connecting...</span>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>
    </header>
  );
};
