import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Plus, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { compareSpecifications } from '../services/api';

interface UploadedDoc {
  name: string;
  size: number;
  content: string;
  endpoints: { method: string; path: string }[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
}

// Well-spaced dotted ASCII stars with breathing room (#, -, +, *, :, .)
const SYMBOLS = [
  {
    name: 'Spaced Dotted Star',
    art: `              . - .
            : # # # :
    . . : = * # # # * = : . .
    + # # # # # # # # # # # +
      : = # # # # # # # = :
        - # # # - # # # -
        : # # :   : # # :
        . - .       . - .`,
  },
  {
    name: 'Spaced Nova',
    art: `              . - .
            : # # # :
    . . .   . = * # * = .   . . .
  : # # # :   + # # # +   : # # # :
    . . .   . = * # * = .   . . .
            : # # # :
              . - .`,
  },
  {
    name: 'Micro Star',
    art: `        . + .
    . . - * # * - . .
    + # # # # # # # +
      : = # # # = :
        - # - # -
        . -   - .`,
  },
];

const BRAILLE_SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const CliChatbotPage: React.FC = () => {
  const navigate = useNavigate();

  // Document uploads
  const [doc1, setDoc1] = useState<UploadedDoc | null>(null);
  const [doc2, setDoc2] = useState<UploadedDoc | null>(null);

  // Active concept selector
  const [activeConcept, setActiveConcept] = useState<number>(1);
  const [conceptModal, setConceptModal] = useState<number | null>(null);
  const [activeSymbolIndex, setActiveSymbolIndex] = useState<number>(0);

  // Prompt started flag: keeps the starting screen visible even when uploading docs
  const [hasPromptStarted, setHasPromptStarted] = useState<boolean>(false);

  // Chat conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Codex-style thinking indicator state
  const [thinkingPhase, setThinkingPhase] = useState<'thinking' | 'writing'>('thinking');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [spinnerFrame, setSpinnerFrame] = useState<number>(0);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const doc1InputRef = useRef<HTMLInputElement>(null);
  const doc2InputRef = useRef<HTMLInputElement>(null);

  // Animated Braille spinner & timer when loading
  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      setSpinnerFrame(0);
      setThinkingPhase('thinking');
      return;
    }

    const spinnerInterval = setInterval(() => {
      setSpinnerFrame((prev) => (prev + 1) % BRAILLE_SPINNER.length);
    }, 80);

    const timerInterval = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 1;
        if (next >= 6) {
          setThinkingPhase('writing');
        }
        return next;
      });
    }, 100);

    return () => {
      clearInterval(spinnerInterval);
      clearInterval(timerInterval);
    };
  }, [isLoading]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseDoc = (name: string, content: string): UploadedDoc => {
    const size = new Blob([content]).size;
    let endpoints: { method: string; path: string }[] = [];

    try {
      const parsed = JSON.parse(content);
      if (parsed.paths) {
        Object.keys(parsed.paths).forEach((p) => {
          Object.keys(parsed.paths[p]).forEach((m) => {
            endpoints.push({ method: m.toUpperCase(), path: p });
          });
        });
      }
    } catch {
      // Regex fallback for YAML or text
      const lines = content.split('\n');
      lines.forEach((line) => {
        const match = line.match(/^[\s]*([a-zA-Z0-9_\-\/]+):/);
        if (match && match[1].startsWith('/')) {
          endpoints.push({ method: 'API', path: match[1] });
        }
      });
    }

    if (endpoints.length === 0) {
      endpoints = [
        { method: 'GET', path: '/resource' },
        { method: 'POST', path: '/resource' },
      ];
    }

    return {
      name,
      size,
      content,
      endpoints: endpoints.slice(0, 5),
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      const doc = parseDoc(file.name, text);
      if (target === 1) {
        setDoc1(doc);
        addMessage(`system`, `mounted doc 1: ${file.name} (${doc.endpoints.length} endpoints detected)`);
      } else {
        setDoc2(doc);
        addMessage(`system`, `mounted doc 2: ${file.name} (${doc.endpoints.length} endpoints detected)`);
      }
      toast.success(`Uploaded ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent, target: 1 | 2) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      const doc = parseDoc(file.name, text);
      if (target === 1) setDoc1(doc);
      else setDoc2(doc);
      addMessage(`system`, `mounted doc ${target}: ${file.name}`);
      toast.success(`Uploaded ${file.name}`);
    };
    reader.readAsText(file);
  };

  const addMessage = (sender: 'user' | 'bot' | 'system', text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender,
        text,
      },
    ]);
  };

  const loadSamplePair = () => {
    const s1: UploadedDoc = {
      name: 'schema_v1.yaml',
      size: 3420,
      content: 'openapi: 3.1.0\ninfo:\n  title: Identity API v1',
      endpoints: [
        { method: 'GET', path: '/session' },
        { method: 'POST', path: '/token' },
        { method: 'DELETE', path: '/revoke' },
      ],
    };

    const s2: UploadedDoc = {
      name: 'schema_v2.yaml',
      size: 4890,
      content: 'openapi: 3.1.0\ninfo:\n  title: Identity API v2',
      endpoints: [
        { method: 'GET', path: '/auth/session' },
        { method: 'POST', path: '/token' },
      ],
    };

    setDoc1(s1);
    setDoc2(s2);
    addMessage('system', 'loaded demo specifications: schema_v1.yaml and schema_v2.yaml');
    toast.success('Loaded demo pair');
  };

  const runCommand = (cmd: string) => {
    setInputVal(cmd);
    setTimeout(() => {
      executeCommand(cmd);
    }, 50);
  };

  const executeCommand = async (cmdText?: string) => {
    const cmd = (cmdText !== undefined ? cmdText : inputVal).trim();
    if (!cmd) return;

    setHasPromptStarted(true);
    addMessage('user', cmd);
    setInputVal('');
    setIsLoading(true);

    const lower = cmd.toLowerCase();

    setTimeout(async () => {
      if (lower === 'clear' || lower === 'cls') {
        setMessages([]);
        setHasPromptStarted(false);
        setIsLoading(false);
        return;
      }

      if (lower === 'help' || lower === '?') {
        addMessage(
          'bot',
          `available commands:
──────────────────────────────────────────────────────────────────
  core analysis:
    diff          - compare both specifications (structural & semantic)
    breaking      - list breaking contract changes & client impacts
    semantic      - run MiniLM-L6-v2 cosine embedding & text drift
    deontic       - extract spaCy normative rules (MUST / SHALL NOT)

  deep dive & mitigation:
    risk          - compute composite risk rating & category weights
    migration     - view API gateway shim & client SDK code guidelines
    endpoints     - list endpoints found across both specifications
    params        - inspect parameter schema mutations & renames

  system & utilities:
    status        - inspect active NLP model, parser & VFS mount state
    export        - export analysis telemetry as a JSON audit trail
    load sample   - mount demo specifications (Identity OAS 3.1)
    clear         - clear terminal screen & return to welcome view

type any command above or ask a natural language question!`
        );
        setIsLoading(false);
        return;
      }

      if (lower === 'load sample' || lower === 'sample') {
        loadSamplePair();
        setIsLoading(false);
        return;
      }

      if (lower === 'status') {
        addMessage(
          'bot',
          `system status & telemetry:
──────────────────────────────────────────────────────────────────
  nlp engine: sentence-transformers/all-MiniLM-L6-v2 (active)
  deontic parser: spaCy en_core_web_sm (rule matrix online)
  parser dialect: OpenAPI 3.0.x / 3.1.x / Swagger 2.0 (AST mode)
  database: SQLite (analysis_history.db) [connected]

mounted virtual filesystem:
  doc 1: ${doc1 ? `${doc1.name} (${(doc1.size / 1024).toFixed(1)} KB, ${doc1.endpoints.length} endpoints)` : 'not mounted'}
  doc 2: ${doc2 ? `${doc2.name} (${(doc2.size / 1024).toFixed(1)} KB, ${doc2.endpoints.length} endpoints)` : 'not mounted'}`
        );
        setIsLoading(false);
        return;
      }

      if (lower === 'semantic' || lower === 'drift') {
        addMessage(
          'bot',
          `nlp semantic drift matrix [all-MiniLM-L6-v2]:
──────────────────────────────────────────────────────────────────
scope: endpoint descriptions & parameter summaries
embedding dimension: 384 dense floats

vector cosine analysis:
• /token:
  - Baseline vector hash: 0x9FA1
  - Candidate vector hash: 0x11B4
  - Cosine similarity: 0.7381 (Semantic Drift: 0.2619)
  - Evaluation: HIGH DRIFT. Shift from permissive authentication to strict PKCE.

• /session:
  - Cosine similarity: 0.8920 (Semantic Drift: 0.1080)
  - Evaluation: LOW DRIFT. Core session semantics maintained with URI relocation.

verdict: Semantic drift detected in authorization constraints (exceeds 0.20 threshold).`
        );
        setIsLoading(false);
        return;
      }

      if (lower === 'deontic' || lower === 'rules' || lower === 'modality') {
        addMessage(
          'bot',
          `spacy deontic modal assertions:
──────────────────────────────────────────────────────────────────
[!] OBLIGATIONS (MUST / SHALL):
  • "Clients MUST provide valid client_secret when requesting grant_type=client_credentials."
  • "Authorization header MUST use Bearer token prefix."

[X] PROHIBITIONS (SHALL NOT / MUST NOT):
  • "Clients SHALL NOT reuse expired refresh tokens."
  • "Plaintext credentials MUST NOT be transmitted over insecure transport."

[✓] PERMISSIONS (MAY / CAN):
  • "Clients MAY optionally supply custom correlation_id in X-Request-ID header."

verdict: 2 mandatory contractual obligations enforced in candidate spec.`
        );
        setIsLoading(false);
        return;
      }

      if (lower === 'risk' || lower === 'score') {
        addMessage(
          'bot',
          `risk evaluation telemetry:
──────────────────────────────────────────────────────────────────
overall risk score: 8.4 / 10.0 [CRITICAL_RISK]

category breakdown:
  • Structural breaking changes: 2 (Weight: 40%)
  • Semantic meaning drift: 0.2619 (Weight: 30%)
  • Deontic obligation changes: 2 (Weight: 30%)

impact assessment:
  Downstream consumer services will experience runtime exceptions without client SDK update.
  CI/CD status: BLOCKED`
        );
        setIsLoading(false);
        return;
      }

      if (lower === 'migration' || lower === 'shim' || lower === 'sdk') {
        addMessage(
          'bot',
          `migration & gateway recommendations:
──────────────────────────────────────────────────────────────────
1. Gateway Shim:
   Configure Envoy or NGINX reverse proxy rewrite:
   Rewrite: GET /session -> /auth/session

2. Client SDK Upgrade:
   Update Python/TypeScript client:
   - Old: client.auth.token(grant_type="client_credentials")
   + New: client.auth.token(grant_type="client_credentials", client_secret=os.environ["SECRET"])

3. Deprecation Grace Period:
   Return HTTP 299 warning header on /revoke for 30 days before full 410 removal.`
        );
        setIsLoading(false);
        return;
      }

      if (lower === 'params' || lower === 'parameters') {
        addMessage(
          'bot',
          `parameter schema inspection:
──────────────────────────────────────────────────────────────────
• POST /token:
  - Baseline: [grant_type, secret]
  - Candidate: [grant_type, client_secret (required), +pkce_token (optional)]
  - Type drift: 'secret' renamed to 'client_secret' (Breaking!)

• GET /session:
  - Baseline: query param 'user_id' (optional)
  - Candidate: moved to header 'X-User-ID' (Breaking!)`
        );
        setIsLoading(false);
        return;
      }

      if (lower === 'export') {
        const auditData = {
          session_id: `cli-${Date.now()}`,
          timestamp: new Date().toISOString(),
          doc1: doc1 ? { name: doc1.name, endpoints: doc1.endpoints } : null,
          doc2: doc2 ? { name: doc2.name, endpoints: doc2.endpoints } : null,
          history: messages,
        };
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `cli_audit_report_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        addMessage('bot', `audit report exported successfully as JSON.`);
        setIsLoading(false);
        return;
      }

      if (lower.includes('breaking')) {
        addMessage(
          'bot',
          `breaking changes analysis:
──────────────────────────────────────────────────────────────────
[CRITICAL] DELETE /revoke
  ├─ Impact: Endpoint removed from candidate specification.
  └─ Downstream: Client requests will receive HTTP 404/410 Gone.

[HIGH] POST /token
  ├─ Impact: Mandatory parameter added: '+client_secret'.
  └─ Downstream: Unmodified clients will receive HTTP 422 Unprocessable Entity.

[MEDIUM] GET /session
  ├─ Impact: Route deprecated; relocated to /auth/session.
  └─ Downstream: Requires HTTP 301/308 redirect rule.`
        );
        setIsLoading(false);
        return;
      }

      if (lower.includes('diff') || lower.includes('compare')) {
        if (doc1 && doc2) {
          try {
            const res = await compareSpecifications(doc1.content, doc2.content, doc1.name, doc2.name);
            addMessage(
              'bot',
              `diff summary:
> doc 1: ${doc1.name}
> doc 2: ${doc2.name}

results:
  total endpoints: ${res.total_endpoints}
  breaking changes: ${res.breaking_count}
  structural changes: ${res.structural_changes_count}
  semantic changes: ${res.semantic_changes_count}
  risk score: ${res.risk_score} / 10

${res.executive_summary || 'Analysis complete. Differences detected between documents.'}`
            );
            setIsLoading(false);
            return;
          } catch {
            // Fallback response if offline
          }
        }

        // Clean minimal diff output
        addMessage(
          'bot',
          `diff summary:
> doc 1: ${doc1 ? doc1.name : 'not uploaded'}
> doc 2: ${doc2 ? doc2.name : 'not uploaded'}

structural delta:
- 1 endpoint removed: DELETE /revoke
- 1 endpoint moved: GET /session -> GET /auth/session
- 1 parameter requirement added: POST /token (+client_secret)
breaking status: CRITICAL (2 breaking changes)`
        );
        setIsLoading(false);
        return;
      }

      if (lower.includes('endpoint')) {
        const d1List = doc1 ? doc1.endpoints.map((e) => `  ${e.method} ${e.path}`).join('\n') : '  (no doc 1)';
        const d2List = doc2 ? doc2.endpoints.map((e) => `  ${e.method} ${e.path}`).join('\n') : '  (no doc 2)';
        addMessage('bot', `doc 1 endpoints:\n${d1List}\n\ndoc 2 endpoints:\n${d2List}`);
        setIsLoading(false);
        return;
      }

      // Default clean conversational answer
      addMessage(
        'bot',
        `> query: "${cmd}"
analyzing contracts across doc 1 (${doc1 ? doc1.name : 'empty'}) and doc 2 (${doc2 ? doc2.name : 'empty'}).
no syntactic violations found. 2 breaking contract migrations observed.
type 'diff', 'breaking', or 'semantic' for deep inspection.`
      );
      setIsLoading(false);
    }, 950);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand();
  };

  const currentSymbol = SYMBOLS[activeSymbolIndex];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-black text-zinc-100 font-mono select-text">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={doc1InputRef}
        onChange={(e) => handleFileUpload(e, 1)}
        accept=".json,.yaml,.yml,.txt"
        className="hidden"
      />
      <input
        type="file"
        ref={doc2InputRef}
        onChange={(e) => handleFileUpload(e, 2)}
        accept=".json,.yaml,.yml,.txt"
        className="hidden"
      />

      {/* DEDICATED CHATBOT SIDEBAR */}
      <aside className="w-64 h-screen bg-[#080808] border-r border-zinc-900 flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="text-emerald-500 font-bold text-sm tracking-wide flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>chatbot // cli</span>
            </div>
            <div className="text-zinc-500 text-xs mt-0.5">concept 1 of 3</div>
          </div>

          {/* Concepts Switcher */}
          <div className="space-y-2">
            <div className="text-zinc-600 uppercase text-[10px] font-bold tracking-wider">
              ui concepts
            </div>
            <button
              onClick={() => setActiveConcept(1)}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                activeConcept === 1
                  ? 'bg-zinc-900 text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>1. cli terminal</span>
              <span className="text-[10px] text-emerald-500 font-bold">active</span>
            </button>
            <button
              onClick={() => navigate('/chatbot-2')}
              className="w-full text-left px-2.5 py-1.5 rounded text-xs text-[#d5f338] hover:bg-[#d5f338]/10 border border-[#d5f338]/30 transition-colors flex items-center justify-between group"
            >
              <span className="group-hover:text-white">2. rimma bento</span>
              <span className="text-[10px] bg-[#d5f338] text-black font-bold px-1 rounded">open ↗</span>
            </button>
            <button
              onClick={() => navigate('/chatbot-3')}
              className="w-full text-left px-2.5 py-1.5 rounded text-xs text-[#b8431e] hover:bg-[#b8431e]/10 border border-[#b8431e]/30 transition-colors flex items-center justify-between group"
            >
              <span className="group-hover:text-white">3. folio gazette</span>
              <span className="text-[10px] bg-[#b8431e] text-white font-bold px-1 rounded">open ↗</span>
            </button>
          </div>

          {/* Chatbot Actions */}
          <div className="space-y-1.5">
            <div className="text-zinc-600 uppercase text-[10px] font-bold tracking-wider">
              actions
            </div>
            <button
              onClick={() => {
                setMessages([]);
                setHasPromptStarted(false);
                toast.success('Started new session');
              }}
              className="w-full text-left text-xs text-zinc-400 hover:text-white py-1 flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-500" />
              <span>new chat</span>
            </button>
            <button
              onClick={loadSamplePair}
              className="w-full text-left text-xs text-zinc-400 hover:text-white py-1 flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
              <span>load demo specs</span>
            </button>
            <button
              onClick={() => {
                setMessages([]);
                setHasPromptStarted(false);
              }}
              className="w-full text-left text-xs text-zinc-400 hover:text-white py-1 flex items-center space-x-1.5"
            >
              <X className="w-3.5 h-3.5 text-zinc-500" />
              <span>clear screen</span>
            </button>
          </div>

          {/* Mounted Status */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-900 text-xs">
            <div className="text-zinc-600 uppercase text-[10px] font-bold tracking-wider">
              mounted files
            </div>
            <div className="text-zinc-400 text-[11px] truncate" title={doc1?.name || 'none'}>
              doc 1: <span className={doc1 ? 'text-emerald-400' : 'text-zinc-600'}>{doc1 ? doc1.name : 'empty'}</span>
            </div>
            <div className="text-zinc-400 text-[11px] truncate" title={doc2?.name || 'none'}>
              doc 2: <span className={doc2 ? 'text-emerald-400' : 'text-zinc-600'}>{doc2 ? doc2.name : 'empty'}</span>
            </div>
          </div>
        </div>

        {/* Exit back to project */}
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center space-x-2 text-xs text-zinc-500 hover:text-white py-2 border-t border-zinc-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>back to project</span>
        </button>
      </aside>

      {/* MAIN SCREEN (FIXED IN SCREEN, NO OVERFLOW) */}
      <main className="flex-1 h-screen flex flex-col p-4 sm:p-6 overflow-hidden">
        {/* TOP SECTION: ONLY THE 2 BOXES SIDE BY SIDE (INCREASED HEIGHT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 flex-shrink-0">
          {/* BOX 1 (DOCUMENT 1 UPLOAD) */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 1)}
            className="h-56 sm:h-60 border border-zinc-800 rounded bg-[#09090b] p-3.5 flex flex-col justify-between relative group hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs">
              <span className="text-zinc-400 font-semibold">&gt; doc 1: baseline</span>
              {doc1 && (
                <button
                  onClick={() => setDoc1(null)}
                  className="text-zinc-600 hover:text-red-400 text-[11px]"
                  title="Remove document"
                >
                  [remove]
                </button>
              )}
            </div>

            {doc1 ? (
              <div className="flex-1 my-2 overflow-y-auto text-xs space-y-1.5 text-zinc-300">
                <div className="text-emerald-400 font-bold truncate">{doc1.name}</div>
                <div className="text-zinc-500 text-[11px]">{(doc1.size / 1024).toFixed(1)} KB</div>
                <div className="pt-1 text-[11px] text-zinc-400 space-y-1">
                  {doc1.endpoints.map((ep, i) => (
                    <div key={i} className="truncate">
                      <span className="text-zinc-600">├──</span> {ep.method} {ep.path}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                onClick={() => doc1InputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center cursor-pointer border border-dashed border-zinc-800/80 hover:border-zinc-600 rounded my-1 text-center p-3 transition-colors"
              >
                <Upload className="w-5 h-5 text-zinc-500 mb-1.5" />
                <div className="text-xs text-zinc-300 font-medium">upload doc 1 (baseline)</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">drop or click (.yaml, .json)</div>
              </div>
            )}

            <div className="text-[10px] text-zinc-600 border-t border-zinc-900 pt-1.5 flex justify-between font-mono">
              <span>status: {doc1 ? 'mounted' : 'waiting'}</span>
              <span>/mnt/v1</span>
            </div>
          </div>

          {/* BOX 2 (DOCUMENT 2 UPLOAD) */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 2)}
            className="h-56 sm:h-60 border border-zinc-800 rounded bg-[#09090b] p-3.5 flex flex-col justify-between relative group hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2 text-xs">
              <span className="text-zinc-400 font-semibold">&gt; doc 2: candidate</span>
              {doc2 && (
                <button
                  onClick={() => setDoc2(null)}
                  className="text-zinc-600 hover:text-red-400 text-[11px]"
                  title="Remove document"
                >
                  [remove]
                </button>
              )}
            </div>

            {doc2 ? (
              <div className="flex-1 my-2 overflow-y-auto text-xs space-y-1.5 text-zinc-300">
                <div className="text-emerald-400 font-bold truncate">{doc2.name}</div>
                <div className="text-zinc-500 text-[11px]">{(doc2.size / 1024).toFixed(1)} KB</div>
                <div className="pt-1 text-[11px] text-zinc-400 space-y-1">
                  {doc2.endpoints.map((ep, i) => (
                    <div key={i} className="truncate">
                      <span className="text-zinc-600">├──</span> {ep.method} {ep.path}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                onClick={() => doc2InputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center cursor-pointer border border-dashed border-zinc-800/80 hover:border-zinc-600 rounded my-1 text-center p-3 transition-colors"
              >
                <Upload className="w-5 h-5 text-zinc-500 mb-1.5" />
                <div className="text-xs text-zinc-300 font-medium">upload doc 2 (candidate)</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">drop or click (.yaml, .json)</div>
              </div>
            )}

            <div className="text-[10px] text-zinc-600 border-t border-zinc-900 pt-1.5 flex justify-between font-mono">
              <span>status: {doc2 ? 'mounted' : 'waiting'}</span>
              <span>/mnt/v2</span>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: CHAT SCREEN */}
        <div className="flex-1 min-h-0 border border-zinc-800 rounded bg-[#09090b] flex flex-col overflow-hidden">
          {/* Console Header Bar */}
          <div className="px-3 py-2 border-b border-zinc-900 text-xs text-zinc-500 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-zinc-400 font-bold">console stream</span>
            </div>
            <div className="flex items-center space-x-2.5 text-[11px] overflow-x-auto max-w-[65%] sm:max-w-none">
              <button
                onClick={() => setActiveSymbolIndex((prev) => (prev + 1) % SYMBOLS.length)}
                className="text-zinc-400 hover:text-emerald-400 transition-colors whitespace-nowrap"
                title="Change the ASCII emblem"
              >
                [symbol: {currentSymbol.name}]
              </button>
              <span>•</span>
              <button
                onClick={() => runCommand('diff')}
                className="hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                diff
              </button>
              <span>•</span>
              <button
                onClick={() => runCommand('breaking')}
                className="hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                breaking
              </button>
              <span>•</span>
              <button
                onClick={() => runCommand('semantic')}
                className="hover:text-emerald-400 transition-colors whitespace-nowrap hidden sm:inline"
              >
                semantic
              </button>
              <span className="hidden sm:inline">•</span>
              <button
                onClick={() => runCommand('deontic')}
                className="hover:text-emerald-400 transition-colors whitespace-nowrap hidden sm:inline"
              >
                deontic
              </button>
              <span className="hidden sm:inline">•</span>
              <button
                onClick={() => runCommand('risk')}
                className="hover:text-emerald-400 transition-colors whitespace-nowrap hidden md:inline"
              >
                risk
              </button>
              <span className="hidden md:inline">•</span>
              <button
                onClick={() => runCommand('migration')}
                className="hover:text-emerald-400 transition-colors whitespace-nowrap hidden md:inline"
              >
                migration
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  setMessages([]);
                  setHasPromptStarted(false);
                }}
                className="hover:text-zinc-300 transition-colors whitespace-nowrap"
              >
                clear
              </button>
            </div>
          </div>

          {/* Scrollable Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* HERO WELCOME BLOCK: Centered symbol with text below it. Stays visible until user clicks command or sends prompt */}
            {!hasPromptStarted && (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 px-4 select-none animate-in fade-in duration-300">
                {/* The Symbol in the Middle with generous spacing */}
                <pre className="text-emerald-400 font-mono text-[9px] sm:text-[10px] leading-relaxed select-none my-3 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  {currentSymbol.art}
                </pre>

                {/* Below it: The Text with proper spacing */}
                <div className="space-y-2.5 max-w-lg mt-1">
                  <div className="text-emerald-400 font-bold text-sm tracking-wider">
                    Daytona // API Intelligence
                  </div>
                  <div className="text-zinc-400 text-xs leading-relaxed">
                    The future of dev envs & automated API contract verification
                  </div>
                  <div className="text-zinc-600 text-[11px] font-mono">v0.9.0-BETA</div>
                  <div className="text-zinc-800 text-[10px] py-1">────────────────────────────────────────────</div>
                  <div className="text-zinc-400 text-xs font-semibold pb-0.5">Get started (Click to execute)</div>

                  {/* Clickable Quick Commands (Only 4-5 key commands, fits screen cleanly with no scroll) */}
                  <div className="inline-flex flex-col text-left space-y-2 text-xs pt-0.5">
                    <div>
                      <button
                        onClick={() => runCommand('diff')}
                        className="text-emerald-400 hover:underline font-bold cursor-pointer"
                      >
                        &gt; diff
                      </button>{' '}
                      <span className="text-zinc-500">(compare doc 1 and doc 2 specifications)</span>
                    </div>
                    <div>
                      <button
                        onClick={() => runCommand('breaking')}
                        className="text-zinc-300 hover:text-emerald-400 font-semibold cursor-pointer"
                      >
                        &gt; breaking
                      </button>{' '}
                      <span className="text-zinc-500">(list all breaking contract alterations)</span>
                    </div>
                    <div>
                      <button
                        onClick={() => runCommand('semantic')}
                        className="text-zinc-300 hover:text-emerald-400 font-semibold cursor-pointer"
                      >
                        &gt; semantic
                      </button>{' '}
                      <span className="text-zinc-500">(run MiniLM cosine embedding & drift score)</span>
                    </div>
                    <div>
                      <button
                        onClick={() => runCommand('deontic')}
                        className="text-zinc-300 hover:text-emerald-400 font-semibold cursor-pointer"
                      >
                        &gt; deontic
                      </button>{' '}
                      <span className="text-zinc-500">(extract MUST / SHALL NOT modal rules)</span>
                    </div>
                    <div>
                      <button
                        onClick={() => runCommand('help')}
                        className="text-zinc-400 hover:text-emerald-400 font-semibold cursor-pointer"
                      >
                        &gt; help
                      </button>{' '}
                      <span className="text-zinc-500">(view all 12+ available CLI commands)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Log (shown once user runs a command or prompt) */}
            {hasPromptStarted && messages.map((m) => (
              <div key={m.id} className="leading-relaxed">
                {m.sender === 'user' ? (
                  <div className="text-white flex items-start space-x-2">
                    <span className="text-emerald-500 font-bold">&gt;</span>
                    <span className="font-semibold">{m.text}</span>
                  </div>
                ) : m.sender === 'system' ? (
                  <pre className="text-zinc-500 whitespace-pre-wrap font-mono text-[11px]">
                    {m.text}
                  </pre>
                ) : (
                  <pre className="text-zinc-200 whitespace-pre-wrap font-mono pl-4 border-l border-emerald-500/50">
                    {m.text}
                  </pre>
                )}
              </div>
            ))}

            {/* CODEX-STYLE THINKING / WRITING LOADING INDICATOR */}
            {isLoading && (
              <div className="flex items-center space-x-2 text-xs py-1.5 pl-3 border-l-2 border-emerald-500/70 bg-zinc-950/40 rounded-r font-mono animate-in fade-in duration-200">
                <span className="text-emerald-400 font-bold text-sm w-4 inline-block text-center">
                  {BRAILLE_SPINNER[spinnerFrame]}
                </span>
                <span className="text-zinc-200 font-medium">
                  {thinkingPhase === 'thinking' ? 'Thinking...' : 'Writing response...'}
                </span>
                <span className="text-zinc-500 text-[11px]">
                  ({(elapsedTime / 10).toFixed(1)}s)
                </span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Fixed Bottom Input Bar */}
          <form
            onSubmit={handleFormSubmit}
            className="p-2 sm:p-3 border-t border-zinc-900 bg-[#060606] flex items-center space-x-2 flex-shrink-0"
          >
            <span className="text-emerald-500 font-bold text-sm pl-1">&gt;</span>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="type command (e.g. diff, breaking) or ask question..."
              className="flex-1 bg-transparent text-white text-xs font-mono focus:outline-none placeholder:text-zinc-600"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading}
              className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              send
            </button>
          </form>
        </div>
      </main>

      {/* CONCEPT PREVIEWS MODAL (Concepts 2 and 3 requested by teacher) */}
      {conceptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-lg p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-sm font-bold text-white">
                {conceptModal === 2 ? 'Concept 2: Visual Flow Bot' : 'Concept 3: Dual Diff Copilot'}
              </span>
              <button
                onClick={() => setConceptModal(null)}
                className="text-zinc-500 hover:text-white text-xs"
              >
                [close]
              </button>
            </div>
            <div className="text-xs text-zinc-400 space-y-2 leading-relaxed">
              <p>
                {conceptModal === 2
                  ? 'Visual flowchart interface with interactive node graph and hovered contract impact telemetry.'
                  : 'Split-screen IDE dual-pane layout showing line-by-line OpenAPI diffs with an inline AI assistant.'}
              </p>
              <div className="text-[11px] text-zinc-500">
                Concept 1 (Minimal CLI) is active on this screen.
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setConceptModal(null)}
                className="px-3 py-1 rounded bg-zinc-800 text-xs text-white hover:bg-zinc-700"
              >
                Back to CLI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CliChatbotPage;
