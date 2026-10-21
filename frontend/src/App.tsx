import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { OverviewPage } from './pages/OverviewPage';
import { NewAnalysisPage } from './pages/NewAnalysisPage';
import { AnalysisDetailPage } from './pages/AnalysisDetailPage';
import { StructuralDiffPage } from './pages/StructuralDiffPage';
import { SemanticAnalysisPage } from './pages/SemanticAnalysisPage';
import { BehavioralImpactPage } from './pages/BehavioralImpactPage';
import { HistoryView } from './components/HistoryView';
import { BenchmarkView } from './components/BenchmarkView';
import { DocumentationPage } from './pages/DocumentationPage';
import { Sparkles, Terminal, Layers, ShieldCheck } from 'lucide-react';

export const AppContent: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: '!bg-white dark:!bg-slate-900 !text-slate-900 dark:!text-slate-100 !border !border-slate-200 dark:!border-slate-800 !shadow-lg !rounded-xl !text-xs !font-medium',
        }}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <TopNav onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/new-analysis" element={<NewAnalysisPage />} />
            <Route path="/analysis/:id" element={<AnalysisDetailPage />} />
            <Route path="/structural-diff" element={<StructuralDiffPage />} />
            <Route path="/semantic-analysis" element={<SemanticAnalysisPage />} />
            <Route path="/behavioral-impact" element={<BehavioralImpactPage />} />
            <Route path="/history" element={<HistoryView />} />
            <Route path="/evaluation" element={<BenchmarkView />} />
            <Route path="/documentation" element={<DocumentationPage />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                NLP-Based API Semantic & Behavioral Impact Analysis
              </span>
              <span>•</span>
              <span className="text-[11px]">Academic Project & Developer Platform</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>MiniLM-L6-v2 Embeddings</span>
              </span>
              <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <Layers className="w-3.5 h-3.5" />
                <span>spaCy Deontic Engine</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SQLite Persistence</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Terminal className="w-3.5 h-3.5" />
                <span>FastAPI v0.115+</span>
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
};

export default App;
