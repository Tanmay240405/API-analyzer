import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GitCompare, History, Award, AlertCircle } from 'lucide-react';
import { checkHealth } from '../services/api';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    checkHealth()
      .then((data) => setHealthStatus(data))
      .catch(() => setHealthStatus({ status: 'error' }));
  }, []);

  const navLinks = [
    { to: '/', label: 'Compare Specs', icon: GitCompare },
    { to: '/history', label: 'Analysis History', icon: History },
    { to: '/benchmark', label: 'Academic Benchmark', icon: Award },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">API Semantic Diff</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  NLP-Enhanced
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Behavioral & Semantic Impact Analysis</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* System Health Pill */}
          <div className="flex items-center space-x-3">
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs border ${
                healthStatus?.status === 'healthy'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
              }`}
              title={healthStatus ? `Model: ${healthStatus?.embedding_model?.backend}` : 'Checking backend...'}
            >
              {healthStatus?.status === 'healthy' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[11px] hidden lg:inline">all-MiniLM-L6-v2 Ready</span>
                  <span className="lg:hidden">Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-mono text-[11px]">Connecting...</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
