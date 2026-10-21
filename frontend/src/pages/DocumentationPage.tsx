import React from 'react';
import { Layers, Sparkles, ShieldAlert, FileCode, CheckCircle2, AlertTriangle } from 'lucide-react';

export const DocumentationPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          System Architecture & Technical Documentation
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete engineering reference detailing the NLP pipeline, linguistic contract extraction grammar, breaking change formal taxonomy, and parser capabilities.
        </p>
      </div>

      {/* Section 1: System Architecture */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          1. System Architecture & Processing Pipeline
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The system processes API versions through a multi-stage pipeline combining structural AST diffing with deep natural language inference:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">Stage 1: Parser & Resolver</span>
            <p className="text-slate-500">
              Parses YAML or JSON OpenAPI 3.x or Swagger 2.0. Resolves local <code>$ref</code> schema pointers recursively.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">Stage 2: NLP & Deontic Extraction</span>
            <p className="text-slate-500">
              Applies spaCy tokenization to extract deontic modalities (must/shall/may) and calculates 384-dim dense embeddings.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">Stage 3: Impact Classification</span>
            <p className="text-slate-500">
              Synthesizes structural schema diffs with behavioral drift to classify breaking changes and generate code migrations.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: NLP Semantic Drift Methodology */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          2. NLP Semantic Drift & Embedding Model
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The semantic engine utilizes <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">sentence-transformers/all-MiniLM-L6-v2</span> to map natural language operation summaries and documentation into a dense vector space:
        </p>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-300 space-y-2 border border-slate-200 dark:border-slate-800">
          <div>Cosine Similarity: <code>S_C(v_1, v_2) = (v_1 &bull; v_2) / (||v_1|| ||v_2||)</code></div>
          <div>Semantic Drift Score: <code>Drift = 1 - S_C(v_1, v_2)</code></div>
          <div className="text-[11px] text-slate-500">
            When <code>Drift &gt; 0.25</code>, meaning has shifted significantly. When <code>Drift &gt; 0.40</code> and contract tightening occurs, a critical behavioral break is flagged.
          </div>
        </div>
      </div>

      {/* Section 3: Deontic Logic Grammar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          3. Deontic Modality Grammar & Behavioral Contracts
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The system extracts modal expressions using linguistic rules and dependency trees:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
            <span className="font-bold text-rose-700 dark:text-rose-400 uppercase text-[10px] block mb-1">
              Obligation (Strict)
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              Keywords: <em>must, shall, is required to, mandatory, prerequisite</em>. Newly added obligations break backward compatibility.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40">
            <span className="font-bold text-orange-700 dark:text-orange-400 uppercase text-[10px] block mb-1">
              Prohibition (Negative)
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              Keywords: <em>must not, shall not, cannot, forbidden, disallowed</em>. Prohibitions invalidate previously permitted caller behavior.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
            <span className="font-bold text-blue-700 dark:text-blue-400 uppercase text-[10px] block mb-1">
              Permission (Optional)
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              Keywords: <em>may, can, optional, optionally, permitted</em>. Shifting from permission to obligation is a critical breaking change.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Supported Formats & Limitations */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <FileCode className="w-5 h-5 text-emerald-600" />
          4. Supported Specification Formats & Limitations
        </h3>
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span><strong>OpenAPI 3.0.x and 3.1.x</strong> (YAML and JSON formats supported).</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span><strong>Swagger 2.0</strong> (with automatic normalization of body parameters to requestBody schemas).</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span><strong>Limitation</strong>: External remote URL <code>$ref</code> pointers must be bundled or pre-resolved locally.</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span><strong>Limitation</strong>: Non-standard custom vendor extensions (<code>x-*</code>) without documentation strings are not evaluated by the NLP engine.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
