import React, { useState, useEffect } from 'react';
import {
  Upload,
  Sparkles,
  Play,
} from 'lucide-react';
import { getSamples, compareSpecifications } from '../services/api';
import type { ComparisonResponse, SamplePair } from '../types/api';
import { ComparisonResults } from './ComparisonResults';
import toast from 'react-hot-toast';

export const CompareView: React.FC = () => {
  const [samples, setSamples] = useState<SamplePair[]>([]);
  const [v1Content, setV1Content] = useState('');
  const [v2Content, setV2Content] = useState('');
  const [v1Filename, setV1Filename] = useState('api_v1.yaml');
  const [v2Filename, setV2Filename] = useState('api_v2.yaml');
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResponse | null>(null);

  useEffect(() => {
    getSamples()
      .then((data) => {
        setSamples(data);
        if (data.length > 0 && !v1Content && !v2Content) {
          // Pre-populate with first sample for immediate discovery
          setV1Content(data[0].v1_content);
          setV2Content(data[0].v2_content);
          setV1Filename(data[0].v1_filename);
          setV2Filename(data[0].v2_filename);
        }
      })
      .catch((err) => console.error('Failed to fetch samples:', err));
  }, []);

  const handleLoadSample = (sample: SamplePair) => {
    setV1Content(sample.v1_content);
    setV2Content(sample.v2_content);
    setV1Filename(sample.v1_filename);
    setV2Filename(sample.v2_filename);
    setComparisonResult(null);
    toast.success(`Loaded "${sample.title}" sample!`);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'v1' | 'v2'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (target === 'v1') {
        setV1Content(text);
        setV1Filename(file.name);
      } else {
        setV2Content(text);
        setV2Filename(file.name);
      }
      toast.success(`Uploaded ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleCompare = async () => {
    if (!v1Content.trim() || !v2Content.trim()) {
      toast.error('Please provide both API specifications (v1 and v2) to compare.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await compareSpecifications(v1Content, v2Content, v1Filename, v2Filename);
      setComparisonResult(result);
      toast.success(`Analysis complete! Identified ${result.breaking_count} breaking changes.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Comparison analysis failed. Please verify YAML/JSON formatting.');
    } finally {
      setIsLoading(false);
    }
  };

  if (comparisonResult) {
    return <ComparisonResults data={comparisonResult} onReset={() => setComparisonResult(null)} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 border border-slate-800 p-8 sm:p-12 text-center shadow-2xl">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Academic-Grade NLP Comparison Engine</span>
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Semantic & Behavioral Impact Analysis of <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">API Changes</span>
        </h1>
        
        <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Deeply compare two OpenAPI/Swagger versions using <span className="text-indigo-300 font-semibold">Sentence Transformers</span> and <span className="text-purple-300 font-semibold">spaCy</span>. Detect subtle semantic drift, contract shifts, deontic tightening, and generate developer migration guides.
        </p>

        {/* Quick Benchmark Sample Loader */}
        {samples.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Quick Academic Samples:</span>
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => handleLoadSample(s)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 hover:border-indigo-500/50 shadow-sm transition-all"
              >
                {s.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dual Specification Editors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* V1 Editor */}
        <div className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="font-semibold text-sm text-slate-200">Specification 1 (Legacy / v1)</span>
              <span className="text-xs text-slate-500 font-mono">({v1Filename})</span>
            </div>

            <label className="cursor-pointer flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload YAML/JSON</span>
              <input
                type="file"
                accept=".yaml,.yml,.json"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'v1')}
              />
            </label>
          </div>

          <div className="relative flex-grow min-h-[360px]">
            <textarea
              value={v1Content}
              onChange={(e) => setV1Content(e.target.value)}
              placeholder="Paste OpenAPI 3.0 / 3.1 or Swagger 2.0 YAML or JSON content here..."
              className="w-full h-full min-h-[360px] bg-slate-950 p-4 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-y leading-relaxed"
            />
          </div>

          <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Lines: {v1Content.split('\n').length}</span>
            <span>Chars: {v1Content.length}</span>
          </div>
        </div>

        {/* V2 Editor */}
        <div className="flex flex-col rounded-2xl bg-slate-900 border border-indigo-900/30 shadow-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-950/80 border-b border-indigo-950/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <span className="font-semibold text-sm text-indigo-300">Specification 2 (Updated / v2)</span>
              <span className="text-xs text-slate-500 font-mono">({v2Filename})</span>
            </div>

            <label className="cursor-pointer flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 text-xs font-medium border border-indigo-800/40 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload YAML/JSON</span>
              <input
                type="file"
                accept=".yaml,.yml,.json"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'v2')}
              />
            </label>
          </div>

          <div className="relative flex-grow min-h-[360px]">
            <textarea
              value={v2Content}
              onChange={(e) => setV2Content(e.target.value)}
              placeholder="Paste updated OpenAPI 3.0 / 3.1 or Swagger 2.0 YAML or JSON content here..."
              className="w-full h-full min-h-[360px] bg-slate-950 p-4 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-y leading-relaxed"
            />
          </div>

          <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Lines: {v2Content.split('\n').length}</span>
            <span>Chars: {v2Content.length}</span>
          </div>
        </div>
      </div>

      {/* Comparison Action Trigger Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <button
          onClick={handleCompare}
          disabled={isLoading || !v1Content.trim() || !v2Content.trim()}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-base shadow-xl shadow-indigo-600/25 flex items-center justify-center space-x-3 transition-all hover:scale-105"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running NLP Embedding & Semantic Diff...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Run Semantic & Behavioral Impact Analysis</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
