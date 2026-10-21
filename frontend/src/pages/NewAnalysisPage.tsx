import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Play,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  X
} from 'lucide-react';
import { getSamples, validateSpecification, compareSpecifications } from '../services/api';
import type { SamplePair, ValidationResponse } from '../types/api';
import toast from 'react-hot-toast';

export const NewAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<SamplePair[]>([]);
  const [apiName, setApiName] = useState('');
  const [analysisDesc, setAnalysisDesc] = useState('');

  // Files state
  const [v1Content, setV1Content] = useState('');
  const [v2Content, setV2Content] = useState('');
  const [v1Filename, setV1Filename] = useState('');
  const [v2Filename, setV2Filename] = useState('');
  const [v1Size, setV1Size] = useState<number>(0);
  const [v2Size, setV2Size] = useState<number>(0);

  // Validation state
  const [v1Validation, setV1Validation] = useState<ValidationResponse | null>(null);
  const [v2Validation, setV2Validation] = useState<ValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Execution state & progress stages
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStage, setActiveStage] = useState<string>('');

  useEffect(() => {
    getSamples()
      .then((data) => setSamples(data))
      .catch((err) => console.error(err));
  }, []);

  const handleLoadSample = (sample: SamplePair) => {
    setV1Content(sample.v1_content);
    setV2Content(sample.v2_content);
    setV1Filename(sample.v1_filename);
    setV2Filename(sample.v2_filename);
    setV1Size(new Blob([sample.v1_content]).size);
    setV2Size(new Blob([sample.v2_content]).size);
    setApiName(sample.title);
    setAnalysisDesc(sample.description);
    setV1Validation(null);
    setV2Validation(null);
    toast.success(`Loaded "${sample.title}" sample!`);
  };

  const handleFileDrop = (
    e: React.DragEvent<HTMLDivElement>,
    target: 'v1' | 'v2'
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file, target);
  };

  const handleFileInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'v1' | 'v2'
  ) => {
    const file = e.target.files?.[0];
    if (file) readFile(file, target);
  };

  const readFile = (file: File, target: 'v1' | 'v2') => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (target === 'v1') {
        setV1Content(text);
        setV1Filename(file.name);
        setV1Size(file.size);
        setV1Validation(null);
      } else {
        setV2Content(text);
        setV2Filename(file.name);
        setV2Size(file.size);
        setV2Validation(null);
      }
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
  };

  const clearFile = (target: 'v1' | 'v2') => {
    if (target === 'v1') {
      setV1Content('');
      setV1Filename('');
      setV1Size(0);
      setV1Validation(null);
    } else {
      setV2Content('');
      setV2Filename('');
      setV2Size(0);
      setV2Validation(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleValidate = async () => {
    if (!v1Content.trim() && !v2Content.trim()) {
      toast.error('Upload or paste at least one specification to validate.');
      return;
    }

    setIsValidating(true);
    try {
      if (v1Content.trim()) {
        const res1 = await validateSpecification(v1Content, v1Filename || 'v1.yaml');
        setV1Validation(res1);
      }
      if (v2Content.trim()) {
        const res2 = await validateSpecification(v2Content, v2Filename || 'v2.yaml');
        setV2Validation(res2);
      }
      toast.success('Validation completed.');
    } catch (err: any) {
      toast.error('Specification validation encountered an error.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!v1Content.trim() || !v2Content.trim()) {
      toast.error('Please provide both old and new API specifications.');
      return;
    }

    setIsAnalyzing(true);
    setActiveStage('Parsing API Specifications & Resolving Schemas');

    try {
      // Real API execution
      const result = await compareSpecifications(
        v1Content,
        v2Content,
        v1Filename || 'api_v1.yaml',
        v2Filename || 'api_v2.yaml',
        apiName || undefined,
        analysisDesc || undefined
      );

      setActiveStage('Report Generated Successfully');
      toast.success('Analysis completed successfully!');
      navigate(`/analysis/${result.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Analysis failed. Please check specification formatting.');
      setActiveStage('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          New API Version Comparison
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload or paste two OpenAPI / Swagger specifications to trigger automated structural diffing, sentence embedding semantic drift, and behavioral contract classification.
        </p>
      </div>

      {/* Sample Specification Loaders */}
      {samples.length > 0 && (
        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                Sample Benchmark Projects
              </span>
              <p className="text-xs text-blue-700/80 dark:text-blue-400/80">
                Load verified OpenAPI test cases with documented behavioral and structural shifts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {samples.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleLoadSample(s)}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-xs"
                >
                  Load {s.title.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Optional Metadata Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Analysis Name (Optional)
          </label>
          <input
            type="text"
            value={apiName}
            onChange={(e) => setApiName(e.target.value)}
            placeholder="e.g. Payment Gateway Migration v1.4 -> v2.0"
            className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description or Release Notes (Optional)
          </label>
          <input
            type="text"
            value={analysisDesc}
            onChange={(e) => setAnalysisDesc(e.target.value)}
            placeholder="e.g. Minor version release introducing async settlement"
            className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Side-by-Side File Upload & Paste Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* V1 Specification Upload */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          {/* Box Header */}
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                1. Old Specification (Base / v1)
              </span>
            </div>

            {v1Filename && (
              <button
                onClick={() => clearFile('v1')}
                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Drag & Drop Target / Text Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleFileDrop(e, 'v1')}
            className="p-4 flex-grow flex flex-col space-y-3"
          >
            <div className="flex items-center justify-between">
              <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload or Replace File</span>
                <input
                  type="file"
                  accept=".yaml,.yml,.json"
                  className="hidden"
                  onChange={(e) => handleFileInput(e, 'v1')}
                />
              </label>

              {v1Filename && (
                <span className="text-[11px] font-mono text-slate-500">
                  {v1Filename} ({formatFileSize(v1Size)})
                </span>
              )}
            </div>

            <textarea
              value={v1Content}
              onChange={(e) => {
                setV1Content(e.target.value);
                setV1Size(new Blob([e.target.value]).size);
                if (!v1Filename) setV1Filename('specification_v1.yaml');
                setV1Validation(null);
              }}
              placeholder="Paste OpenAPI 3.x / Swagger 2.0 (YAML or JSON) or drag-and-drop file here..."
              className="flex-grow w-full min-h-[300px] rounded-lg bg-slate-50/50 dark:bg-slate-950 p-3 font-mono text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
            />

            {/* Validation Pill */}
            {v1Validation && (
              <div
                className={`p-3 rounded-lg text-xs font-mono border ${
                  v1Validation.is_valid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
                }`}
              >
                {v1Validation.is_valid ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Valid {v1Validation.spec_type}: "{v1Validation.title}" (v{v1Validation.version}) &bull; {v1Validation.endpoints_count} operations
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{v1Validation.errors[0] || 'Invalid specification structure.'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* V2 Specification Upload */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          {/* Box Header */}
          <div className="px-5 py-3.5 bg-blue-50/50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                2. New Specification (Target / v2)
              </span>
            </div>

            {v2Filename && (
              <button
                onClick={() => clearFile('v2')}
                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Drag & Drop Target / Text Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleFileDrop(e, 'v2')}
            className="p-4 flex-grow flex flex-col space-y-3"
          >
            <div className="flex items-center justify-between">
              <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload or Replace File</span>
                <input
                  type="file"
                  accept=".yaml,.yml,.json"
                  className="hidden"
                  onChange={(e) => handleFileInput(e, 'v2')}
                />
              </label>

              {v2Filename && (
                <span className="text-[11px] font-mono text-slate-500">
                  {v2Filename} ({formatFileSize(v2Size)})
                </span>
              )}
            </div>

            <textarea
              value={v2Content}
              onChange={(e) => {
                setV2Content(e.target.value);
                setV2Size(new Blob([e.target.value]).size);
                if (!v2Filename) setV2Filename('specification_v2.yaml');
                setV2Validation(null);
              }}
              placeholder="Paste updated OpenAPI 3.x / Swagger 2.0 (YAML or JSON) or drag-and-drop file here..."
              className="flex-grow w-full min-h-[300px] rounded-lg bg-slate-50/50 dark:bg-slate-950 p-3 font-mono text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
            />

            {/* Validation Pill */}
            {v2Validation && (
              <div
                className={`p-3 rounded-lg text-xs font-mono border ${
                  v2Validation.is_valid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
                }`}
              >
                {v2Validation.is_valid ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Valid {v2Validation.spec_type}: "{v2Validation.title}" (v{v2Validation.version}) &bull; {v2Validation.endpoints_count} operations
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{v2Validation.errors[0] || 'Invalid specification structure.'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Indicator Card */}
      {isAnalyzing && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 shadow-md animate-pulse">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {activeStage || 'Processing Specifications...'}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full w-2/3 transition-all duration-500" />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Computing sentence embeddings via all-MiniLM-L6-v2 and parsing deontic modal contracts...
          </p>
        </div>
      )}

      {/* Action Buttons Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleValidate}
          disabled={isValidating || (!v1Content.trim() && !v2Content.trim())}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <FileCheck2 className="w-4 h-4 text-blue-600" />
          <span>{isValidating ? 'Validating...' : 'Validate Specifications'}</span>
        </button>

        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing || !v1Content.trim() || !v2Content.trim()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isAnalyzing ? 'Running Full Analysis...' : 'Run Full Analysis'}</span>
        </button>
      </div>
    </div>
  );
};
