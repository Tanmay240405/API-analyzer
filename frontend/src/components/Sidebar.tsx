import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Layers,
  Sparkles,
  ShieldAlert,
  History,
  Award,
  BookOpen,
  GitCompare,
  X,
  Terminal
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const isCliPage = location.pathname === '/chatbot-cli' || location.pathname === '/chatbot-1';
  const [terminalSidebarMode, setTerminalSidebarMode] = useState<boolean>(true);

  // If on the CLI page and terminal mode is enabled, render the authentic hacker terminal sidebar!
  const isTerminalStyle = isCliPage && terminalSidebarMode;

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, cliCmd: 'cd /overview' },
    { to: '/new-analysis', label: 'New Analysis', icon: PlusCircle, cliCmd: 'run /analysis' },
    { to: '/structural-diff', label: 'Structural Diff', icon: Layers, cliCmd: 'cat /structural' },
    { to: '/semantic-analysis', label: 'Semantic Analysis', icon: Sparkles, cliCmd: 'grep /semantic' },
    { to: '/behavioral-impact', label: 'Behavioral Impact', icon: ShieldAlert, cliCmd: 'exec /behavioral' },
    { to: '/history', label: 'Analysis History', icon: History, cliCmd: 'tail /history' },
    { to: '/evaluation', label: 'Evaluation', icon: Award, cliCmd: 'bench /eval' },
    { to: '/documentation', label: 'Documentation', icon: BookOpen, cliCmd: 'man /docs' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col transition-all duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isTerminalStyle
            ? 'bg-[#05080c] border-r border-[#00ff9d]/30 text-[#00ff9d] font-mono shadow-2xl'
            : 'bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 px-5 border-b flex items-center justify-between ${
            isTerminalStyle ? 'border-[#00ff9d]/20 bg-[#030608]' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          {isTerminalStyle ? (
            <NavLink to="/chatbot-cli" className="flex items-center space-x-2.5" onClick={onClose}>
              <div className="w-8 h-8 rounded bg-[#00ff9d]/20 border border-[#00ff9d]/60 flex items-center justify-center text-[#00ff9d] shadow-sm shadow-[#00ff9d]/40">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-[#00ff9d] tracking-wider block">
                  TTY1://API_SHELL
                </span>
                <span className="text-[10px] text-[#00f0ff] font-semibold">
                  NLP Cognitive Console
                </span>
              </div>
            </NavLink>
          ) : (
            <NavLink to="/" className="flex items-center space-x-3 group" onClick={onClose}>
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30 group-hover:bg-blue-700 transition-colors">
                <GitCompare className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight block">
                  API Impact Analyzer
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  NLP & Behavioral Engine
                </span>
              </div>
            </NavLink>
          )}

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg lg:hidden ${
              isTerminalStyle ? 'text-[#00ff9d] hover:bg-[#00ff9d]/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {/* SPECIAL SECTION: AI CHATBOT LABS (3 CONCEPTS) */}
          <div>
            <div
              className={`px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-between ${
                isTerminalStyle ? 'text-[#00f0ff]' : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              <span>{isTerminalStyle ? '// AI_CHATBOT_LABS' : 'AI Chatbot Labs (3 Concepts)'}</span>
              <span className="text-[9px] px-1 rounded bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 font-mono">
                NEW
              </span>
            </div>

            <div className="space-y-1">
              {/* CONCEPT 1: CYBER-CLI BUTTON */}
              <NavLink
                to="/chatbot-cli"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    isTerminalStyle
                      ? isActive
                        ? 'bg-[#00ff9d]/20 text-[#00ff9d] border-l-4 border-[#00ff9d] shadow-sm shadow-[#00ff9d]/20'
                        : 'text-slate-300 hover:bg-[#00ff9d]/10 hover:text-[#00ff9d]'
                      : isActive
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30'
                      : 'bg-gradient-to-r from-blue-500/10 to-emerald-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 border border-blue-500/30'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Terminal className={`w-4 h-4 ${isTerminalStyle ? 'text-[#00ff9d]' : 'text-blue-600 dark:text-blue-400'}`} />
                  <div>
                    <span className="block leading-tight">Chatbot 1: Cyber-CLI</span>
                    <span className={`text-[10px] block ${isTerminalStyle ? 'text-[#00f0ff]' : 'text-slate-500 dark:text-slate-400 font-normal'}`}>
                      CLI Terminal Theme
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  isTerminalStyle ? 'bg-[#00ff9d] text-black' : 'bg-emerald-600 text-white'
                }`}>
                  READY
                </span>
              </NavLink>

              {/* CONCEPT 2: RIMMA BENTO MINIMALIST */}
              <NavLink
                to="/chatbot-2"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-black border-[#d5f338] text-[#d5f338] shadow-md'
                      : 'bg-[#181818]/60 border-zinc-800 text-zinc-300 hover:bg-[#181818] hover:text-[#d5f338]'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#d5f338] animate-pulse" />
                  <div>
                    <span className="block leading-tight">Chatbot 2: Rimma Bento</span>
                    <span className="text-[10px] block text-zinc-400 font-normal">
                      Minimalist Bento UI
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#d5f338] text-black shadow-sm">
                  READY
                </span>
              </NavLink>

              {/* CONCEPT 3: ATELIER FOLIO GAZETTE */}
              <NavLink
                to="/chatbot-3"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-[#b8431e] border-[#b8431e] text-white shadow-md'
                      : 'bg-[#fbf9f4]/80 dark:bg-stone-900/60 border-[#ded6c9] dark:border-stone-800 text-[#5c564e] dark:text-stone-300 hover:bg-[#f4efe5] dark:hover:bg-stone-800 hover:text-[#b8431e]'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#b8431e]" />
                  <div>
                    <span className="block leading-tight">Chatbot 3: Folio Gazette</span>
                    <span className="text-[10px] block opacity-80 font-normal">
                      Editorial Literary UI
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#b8431e] text-white shadow-xs">
                  READY
                </span>
              </NavLink>
            </div>
          </div>

          {/* VFS MOUNT STATUS SECTION (In Terminal Mode) */}
          {isTerminalStyle && (
            <div className="border border-[#00ff9d]/20 rounded bg-[#030608] p-2.5 space-y-2 text-[10px]">
              <div className="text-[#00f0ff] font-bold uppercase tracking-wider flex items-center justify-between">
                <span>// VFS_MOUNTS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-ping" />
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="flex items-center justify-between">
                  <span>/mnt/v1 (baseline)</span>
                  <span className="text-[#00ff9d] font-bold">[RO]</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>/mnt/v2 (candidate)</span>
                  <span className="text-red-400 font-bold">[MUTATED]</span>
                </div>
              </div>
            </div>
          )}

          {/* STANDARD NAVIGATION ITEMS */}
          <div>
            <div
              className={`px-3 pb-2 text-[10px] font-bold uppercase tracking-wider ${
                isTerminalStyle ? 'text-slate-500' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {isTerminalStyle ? '// SYSTEM_NAV_CLUSTER' : 'Navigation'}
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isTerminalStyle
                          ? isActive
                            ? 'bg-[#00ff9d]/20 text-[#00ff9d] font-bold border-l-2 border-[#00ff9d]'
                            : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                          : isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-bold border-l-4 border-blue-600'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{isTerminalStyle ? item.cliCmd : item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Sidebar Footer Info */}
        <div
          className={`p-3.5 border-t text-[11px] space-y-1.5 ${
            isTerminalStyle
              ? 'border-[#00ff9d]/20 bg-[#020508] text-slate-400 font-mono'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
          }`}
        >
          {isTerminalStyle ? (
            <>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">AST_ENGINE:</span>
                <span className="text-[#00ff9d] font-bold">ONLINE</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">NLP_EMBEDDINGS:</span>
                <span className="text-[#00f0ff]">MiniLM-L6-v2</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">DEONTIC_SPACY:</span>
                <span className="text-amber-400">ACTIVE</span>
              </div>
              {isCliPage && (
                <button
                  onClick={() => setTerminalSidebarMode(!terminalSidebarMode)}
                  className="w-full mt-2 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition-colors text-center border border-slate-700"
                >
                  Switch to Standard GUI Sidebar
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between font-mono">
                <span>Model:</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[120px]" title="all-MiniLM-L6-v2">
                  all-MiniLM-L6-v2
                </span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>Parser:</span>
                <span>OpenAPI 3.x / 2.0</span>
              </div>
              {isCliPage && (
                <button
                  onClick={() => setTerminalSidebarMode(true)}
                  className="w-full mt-2 py-1 px-2 rounded bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 text-[#00ff9d] text-[10px] font-mono transition-colors text-center border border-[#00ff9d]/40 font-bold"
                >
                  &gt;_ Enable Terminal Sidebar Mode
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
};
