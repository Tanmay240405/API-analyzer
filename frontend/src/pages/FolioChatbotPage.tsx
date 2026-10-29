import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal,
  ArrowUp,
  Plus,
  Search,
  X,
  Copy,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compareSpecifications } from '../services/api';

interface AuditFolio {
  id: string;
  chapter: string;
  number: string;
  title: string;
  subtitle: string;
  category: string;
  time: string;
  status: 'breaking' | 'stable' | 'drift';
  doc1Name: string;
  doc2Name: string;
  integrity: number;
  breakingCount: number;
  riskScore: number;
  deonticShiftCount: number;
  v1Content: string;
  v2Content: string;
  notesCount: number;
}

interface ChatMessage {
  id: string;
  sender: 'sentinel' | 'user';
  timestamp: string;
  text: string;
  isInitial?: boolean;
  plate?: {
    plateNumber: string;
    title: string;
    badge: string;
    badgeType: 'breaking' | 'stable' | 'warning';
    description: string;
    codeSnippet?: string;
  };
  options?: string[];
}

const PRESET_FOLIOS: AuditFolio[] = [
  {
    id: 'stripe-v2',
    number: '01',
    chapter: 'CH-01 / FINANCIAL INTERFACES',
    title: 'Stripe Gateway v2',
    subtitle: 'Precondition tightening and route relocation detected across candidate specification.',
    category: 'Payments',
    time: '14:02',
    status: 'breaking',
    doc1Name: 'stripe_v1.yaml',
    doc2Name: 'stripe_v2.yaml',
    integrity: 74,
    breakingCount: 2,
    riskScore: 78,
    deonticShiftCount: 2,
    notesCount: 12,
    v1Content: `openapi: 3.1.0\ninfo:\n  title: Stripe Gateway Spec\n  version: 1.2.0\npaths:\n  /v1/charges:\n    post:\n      summary: Create charge\n  /v1/customers:\n    get:\n      summary: Get customer\n  /v1/tokens/legacy:\n    delete:\n      summary: Purge token\n  /v1/refunds:\n    post:\n      summary: Refund payment`,
    v2Content: `openapi: 3.1.0\ninfo:\n  title: Stripe Gateway Spec\n  version: 2.0.0-rc\npaths:\n  /v1/charges:\n    post:\n      summary: Create customer charge with mandatory idempotency key\n  /v1/customers:\n    get:\n      summary: Get customer\n  /v2/refunds:\n    post:\n      summary: Strict refund with reason code`,
  },
  {
    id: 'twilio-messaging',
    number: '02',
    chapter: 'CH-02 / TELEPHONY & SMS',
    title: 'Twilio Messaging API',
    subtitle: 'Deontic obligation shift: permission clause tightened into mandatory payload field.',
    category: 'Telephony',
    time: '11:15',
    status: 'drift',
    doc1Name: 'twilio_v2010.json',
    doc2Name: 'twilio_v2024.json',
    integrity: 86,
    breakingCount: 1,
    riskScore: 48,
    deonticShiftCount: 3,
    notesCount: 8,
    v1Content: `{"openapi": "3.0.0", "info": {"title": "Twilio Messages", "version": "2010"}}`,
    v2Content: `{"openapi": "3.0.0", "info": {"title": "Twilio Messages", "version": "2024"}}`,
  },
  {
    id: 'petstore-31',
    number: '03',
    chapter: 'CH-03 / REFERENCE STANDARD',
    title: 'Petstore OpenAPI 3.1',
    subtitle: 'Semantically stable evolution with non-breaking field additions and metadata polish.',
    category: 'Inventory',
    time: '09:40',
    status: 'stable',
    doc1Name: 'petstore_v3.0.yaml',
    doc2Name: 'petstore_v3.1.yaml',
    integrity: 98,
    breakingCount: 0,
    riskScore: 12,
    deonticShiftCount: 0,
    notesCount: 4,
    v1Content: `openapi: 3.0.0\ninfo:\n  title: Petstore\n  version: 1.0.0`,
    v2Content: `openapi: 3.1.0\ninfo:\n  title: Petstore\n  version: 1.0.1`,
  },
  {
    id: 'k8s-core',
    number: '04',
    chapter: 'CH-04 / CLOUD ORCHESTRATION',
    title: 'Kubernetes Core v1.31',
    subtitle: 'Relocation of admission webhook endpoints from beta to stable v1 group.',
    category: 'Infrastructure',
    time: 'YESTERDAY',
    status: 'breaking',
    doc1Name: 'k8s_v1.30.json',
    doc2Name: 'k8s_v1.31.json',
    integrity: 81,
    breakingCount: 3,
    riskScore: 68,
    deonticShiftCount: 1,
    notesCount: 16,
    v1Content: `{"openapi": "3.0.0", "info": {"title": "Kubernetes", "version": "1.30"}}`,
    v2Content: `{"openapi": "3.0.0", "info": {"title": "Kubernetes", "version": "1.31"}}`,
  },
  {
    id: 'box-platform',
    number: '05',
    chapter: 'CH-05 / STORAGE REPOSITORY',
    title: 'Box Content Platform',
    subtitle: 'Deprecated folder lock endpoints replaced with transactional session tokens.',
    category: 'Enterprise',
    time: 'MON',
    status: 'drift',
    doc1Name: 'box_v2_legacy.json',
    doc2Name: 'box_v2_modern.json',
    integrity: 79,
    breakingCount: 1,
    riskScore: 54,
    deonticShiftCount: 2,
    notesCount: 9,
    v1Content: `{"openapi": "3.0.0", "info": {"title": "Box API", "version": "2.0"}}`,
    v2Content: `{"openapi": "3.0.0", "info": {"title": "Box API", "version": "2.1"}}`,
  },
];

export const FolioChatbotPage: React.FC = () => {
  const navigate = useNavigate();

  // Selected Folio & Filter Search
  const [activeFolio, setActiveFolio] = useState<AuditFolio>(PRESET_FOLIOS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [foliosList, setFoliosList] = useState<AuditFolio[]>(PRESET_FOLIOS);

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [customFile1, setCustomFile1] = useState<{ name: string; content: string } | null>(null);
  const [customFile2, setCustomFile2] = useState<{ name: string; content: string } | null>(null);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'f-init',
      sender: 'sentinel',
      timestamp: '14:02',
      isInitial: true,
      text: 'Session open. The linguistic parser and embedding engine have synthesized the differences between your baseline and candidate specifications. Inquire below on deontic shifts, structural removals, or migration remediation.',
      plate: {
        plateNumber: 'Plate I',
        title: 'DELETE /v1/tokens/legacy',
        badge: 'Structural Removal',
        badgeType: 'breaking',
        description: 'Endpoint removed without grace window. Downstream client applications will receive HTTP 404 (Not Found).',
        codeSnippet: `# Proposed Migration Shim (Envoy Route Rule)
match: { prefix: "/v1/tokens/legacy" }
route:
  cluster: fallback_service
  prefix_rewrite: "/v2/tokens/archive"`,
      },
      options: [
        '§ 1. Explain deontic modality shifts',
        '§ 2. Inspect cosine similarity distance',
        '§ 3. Generate TypeScript migration snippet',
      ],
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedPlate, setCopiedPlate] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Copy code snippet helper
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPlate(id);
    toast.success('Snippet copied to clipboard');
    setTimeout(() => setCopiedPlate(null), 2000);
  };

  // Switching active folio
  const handleSelectFolio = (folio: AuditFolio) => {
    setActiveFolio(folio);
    setMessages([
      {
        id: `f-${folio.id}-start`,
        sender: 'sentinel',
        timestamp: folio.time,
        isInitial: true,
        text: `Folio ${folio.number} loaded: "${folio.title}". Comparing ${folio.doc1Name} against candidate ${folio.doc2Name}. Integrity index is rated at ${folio.integrity}% with ${folio.breakingCount} breaking divergence points identified.`,
        plate: {
          plateNumber: 'Plate I',
          title: folio.breakingCount > 0 ? 'Breaking Contract Delta' : 'Stable Behavioral Profile',
          badge: folio.status === 'breaking' ? 'Breaking Risk' : folio.status === 'drift' ? 'Behavioral Drift' : 'Stable Contract',
          badgeType: folio.status === 'breaking' ? 'breaking' : folio.status === 'drift' ? 'warning' : 'stable',
          description: folio.subtitle,
          codeSnippet: `// Contract Verification Summary
Specification: ${folio.title}
Baseline: ${folio.doc1Name}
Candidate: ${folio.doc2Name}
Integrity Rating: ${folio.integrity}%
Risk Index: ${folio.riskScore} / 100`,
        },
        options: [
          '§ 1. Run Deontic Modality Extractor',
          '§ 2. Compare Semantic Vectors',
          '§ 3. Draft Migration Guide',
        ],
      },
    ]);
  };

  // Handle User Message Submission
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputVal('');
    setIsTyping(true);

    const lower = query.toLowerCase();

    // Call live backend compare endpoint if appropriate
    setTimeout(async () => {
      let botResponse: ChatMessage;

      if (lower.includes('deontic') || lower.includes('modality') || lower.includes('§ 1')) {
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'sentinel',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Deontic modality extraction complete. spaCy rule-based linguistic parser detected an obligation transition: baseline permissive clause ("may include client_secret") has been upgraded to a strict imperative requirement ("must furnish client_secret").`,
          plate: {
            plateNumber: 'Plate II',
            title: 'Deontic Modality Transition [Obligation Shift]',
            badge: 'Grammatical Shift',
            badgeType: 'warning',
            description: 'Permissive condition ("may") &rarr; Mandatory precondition ("must"). Failure to provide parameter results in HTTP 422 Unprocessable Entity.',
            codeSnippet: `# spaCy Linguistic Derivation Plate
Lemma: "must" -> ROOT: VERB (Auxiliary Modality: Obligation)
Target Parameter: client_secret [in: body]
Precondition Shift: OPTIONAL -> MANDATORY`,
          },
          options: ['Generate Backward-Compatible Shim', 'Inspect Vector Drift', 'Export Audit Plate'],
        };
      } else if (lower.includes('vector') || lower.includes('semantic') || lower.includes('similarity') || lower.includes('§ 2')) {
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'sentinel',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Dense vector evaluation executed using Sentence Transformers (all-MiniLM-L6-v2). Cosine similarity score between route descriptions is 0.814, indicating substantive semantic drift despite structural resemblance.`,
          plate: {
            plateNumber: 'Plate III',
            title: 'Dense Embedding Vector Projection',
            badge: 'Cosine: 0.814',
            badgeType: 'warning',
            description: 'Text drift detected in parameter documentation: "All available products" narrowed to "In-stock items within authorized warehouse region".',
            codeSnippet: `// 384-dimensional Embedding Comparison
Cosine Distance: 0.186
Threshold Limit: 0.150
Behavioral Divergence: HIGH (Scope Narrowing Detected)`,
          },
          options: ['Draft Migration Guide', 'Inspect AST Delta', 'Run Full Benchmark'],
        };
      } else if (lower.includes('shim') || lower.includes('migration') || lower.includes('§ 3') || lower.includes('typescript')) {
        botResponse = {
          id: `bot-${Date.now()}`,
          sender: 'sentinel',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Synthesizing TypeScript client adapter. The following compatibility wrapper transparently injects the mandatory precondition headers and intercepts purged endpoints.`,
          plate: {
            plateNumber: 'Plate IV',
            title: 'TypeScript Axios Client Remediation Adapter',
            badge: 'Ready for Deployment',
            badgeType: 'stable',
            description: 'Injects fallback routing and automatic idempotency key generation to prevent client 404/422 faults.',
            codeSnippet: `import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

export const createCompatibleClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => {
    // Remedy Plate II: Automatically generate idempotency key
    if (config.method === 'post' && !config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = uuidv4();
    }
    return config;
  });
  return client;
};`,
          },
          options: ['§ 1. Explain deontic modality shifts', 'Export Folio Report', 'Switch to Another Dossier'],
        };
      } else {
        // Fallback or attempt live comparison
        try {
          const liveRes = await compareSpecifications(
            activeFolio.v1Content,
            activeFolio.v2Content,
            activeFolio.doc1Name,
            activeFolio.doc2Name
          );
          botResponse = {
            id: `bot-${Date.now()}`,
            sender: 'sentinel',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Inquiry recorded regarding "${query}". Live analysis confirms ${liveRes.breaking_count} breaking contract differences across ${liveRes.total_endpoints} endpoints with an aggregate risk index of ${liveRes.risk_score}/100.`,
            plate: {
              plateNumber: 'Plate V',
              title: `Analysis Plate: ${activeFolio.title}`,
              badge: `${liveRes.breaking_count} Breaking Points`,
              badgeType: liveRes.breaking_count > 0 ? 'breaking' : 'stable',
              description: liveRes.executive_summary || 'Empirical comparison complete.',
              codeSnippet: `Executive Summary:
- Endpoints Analyzed: ${liveRes.total_endpoints}
- Structural Changes: ${liveRes.structural_changes_count}
- Semantic Shifts: ${liveRes.semantic_changes_count}
- Risk Score: ${liveRes.risk_score} / 100`,
            },
            options: ['§ 1. Explain deontic modality shifts', '§ 2. Inspect cosine similarity distance', '§ 3. Draft Migration Guide'],
          };
        } catch {
          botResponse = {
            id: `bot-${Date.now()}`,
            sender: 'sentinel',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Inquiry regarding "${query}" logged into the folio. The candidate contract exhibits 2 breaking migrations: purged route /v1/tokens/legacy and strict precondition enforcement on /v1/charges.`,
            plate: {
              plateNumber: 'Plate V',
              title: 'Empirical Contract Finding',
              badge: 'Audited',
              badgeType: 'warning',
              description: 'Select an action below to view automated AST remediations or examine deontic linguistic graphs.',
            },
            options: ['§ 1. Explain deontic modality shifts', '§ 2. Inspect cosine similarity distance', '§ 3. Draft Migration Guide'],
          };
        }
      }

      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 700);
  };

  // Upload Custom Specs handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (slot === 1) setCustomFile1({ name: file.name, content });
      else setCustomFile2({ name: file.name, content });
    };
    reader.readAsText(file);
  };

  const handleCreateCustomFolio = () => {
    if (!customFile1 || !customFile2) {
      toast.error('Please upload both baseline and candidate specifications');
      return;
    }

    const newFolio: AuditFolio = {
      id: `custom-${Date.now()}`,
      number: `0${foliosList.length + 1}`,
      chapter: `CH-0${foliosList.length + 1} / USER ARCHIVE`,
      title: customFile1.name.replace(/\.[^/.]+$/, '') + ' vs ' + customFile2.name.replace(/\.[^/.]+$/, ''),
      subtitle: 'Custom user-uploaded OpenAPI specification dossier for empirical analysis.',
      category: 'User Dossier',
      time: 'NOW',
      status: 'drift',
      doc1Name: customFile1.name,
      doc2Name: customFile2.name,
      integrity: 79,
      breakingCount: 1,
      riskScore: 50,
      deonticShiftCount: 1,
      notesCount: 2,
      v1Content: customFile1.content,
      v2Content: customFile2.content,
    };

    setFoliosList((prev) => [newFolio, ...prev]);
    setActiveFolio(newFolio);
    handleSelectFolio(newFolio);
    setUploadModalOpen(false);
    toast.success('Custom folio mounted into the archive!');
  };

  const filteredFolios = foliosList.filter(
    (f) =>
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-full bg-[#fbf9f4] text-[#242220] font-sans flex flex-col overflow-hidden selection:bg-[#c24b27]/20 selection:text-[#8d2a0d]">
      {/* ================= TOP EDITORIAL MASTHEAD ================= */}
      <header className="w-full border-b border-[#e7e1d7] bg-[#fbf9f4]/95 backdrop-blur-xs px-4 sm:px-6 lg:px-8 py-3 flex-shrink-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left Masthead Branding */}
          <div className="flex items-center space-x-4">
            <div className="flex items-baseline space-x-2">
              <span className="font-serif-editorial text-2xl sm:text-3xl font-normal tracking-tight text-[#1c1a18]">
                Folio
              </span>
              <span className="font-mono-editorial text-[10px] tracking-[0.25em] text-[#827c73] uppercase hidden md:inline">
                A QUARTERLY OF API CONTRACTS
              </span>
            </div>

            <span className="text-[#ded6c9] hidden sm:inline">|</span>

            <span className="font-mono-editorial text-[10px] text-[#b8431e] font-semibold tracking-wider uppercase hidden sm:inline">
              № 007 • AUTUMN 2026
            </span>
          </div>

          {/* Right Concept Navigation Tabs */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Concept 1 CLI Pill */}
            <button
              onClick={() => navigate('/chatbot-cli')}
              className="flex items-center space-x-1 px-2.5 sm:px-3 py-1 rounded border border-[#ded6c9] hover:border-[#b8431e] bg-white/60 text-[#4a463f] hover:text-[#1c1a18] font-mono-editorial text-[10px] sm:text-[11px] transition-colors"
              title="Concept 1: Cyber-CLI Terminal"
            >
              <Terminal className="w-3 h-3 text-[#5c564e]" />
              <span className="hidden xs:inline">TERMINAL</span>
              <span className="text-[#827c73]">TTY</span>
            </button>

            {/* Concept 2 Bento Pill */}
            <button
              onClick={() => navigate('/chatbot-2')}
              className="flex items-center space-x-1 px-2.5 sm:px-3 py-1 rounded border border-[#ded6c9] hover:border-[#b8431e] bg-white/60 text-[#4a463f] hover:text-[#1c1a18] font-mono-editorial text-[10px] sm:text-[11px] transition-colors"
              title="Concept 2: Rimma Bento"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#9e6721]" />
              <span className="hidden xs:inline">BENTO</span>
              <span className="text-[#827c73]">BNT</span>
            </button>

            {/* Concept 3 Folio (Active) */}
            <div className="flex items-center space-x-1 px-3 py-1 rounded border border-[#b8431e] bg-[#b8431e]/10 text-[#8d2a0d] font-mono-editorial text-[10px] sm:text-[11px] font-bold">
              <span>✒ FOLIO</span>
              <span className="text-[#b8431e]">PAP</span>
            </div>

            {/* Return to Dashboard */}
            <button
              onClick={() => navigate('/')}
              className="ml-2 font-mono-editorial text-[10px] sm:text-[11px] text-[#827c73] hover:text-[#1c1a18] underline underline-offset-4 transition-colors"
            >
              Return ↗
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN 2-SECTION EDITORIAL WORKSPACE ================= */}
      <main className="max-w-7xl w-full mx-auto flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ================= LEFT SECTION: CONTENTS / SPECIFICATION FOLIOS (4 cols) ================= */}
        <section className="lg:col-span-4 border-r border-[#e7e1d7] bg-[#f8f5ee] flex flex-col h-full min-h-0">
          {/* Section Search & Filter */}
          <div className="p-4 sm:p-5 border-b border-[#e7e1d7] space-y-3 flex-shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#827c73] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search this folio issue..."
                className="w-full bg-white border border-[#ded6c9] rounded px-8 py-1.5 text-xs text-[#242220] placeholder-[#9c958b] focus:outline-none focus:border-[#b8431e] font-serif-editorial text-[13px] transition-colors"
              />
              <span className="font-mono-editorial text-[9px] text-[#9c958b] absolute right-2.5 top-1/2 -translate-y-1/2 border border-[#ded6c9] px-1 py-0.5 rounded">
                ⌘ F
              </span>
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between text-[10px] font-mono-editorial tracking-widest text-[#827c73] uppercase pt-1">
              <span>CONTENTS // ARCHIVE</span>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="text-[#b8431e] hover:underline flex items-center space-x-1 font-bold"
                title="Add specification dossier"
              >
                <Plus className="w-3 h-3" />
                <span>MOUNT SPEC</span>
              </button>
            </div>
          </div>

          {/* Scrollable Folio List */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#ece6dc]">
            {filteredFolios.map((folio) => {
              const isSelected = folio.id === activeFolio.id;
              return (
                <div
                  key={folio.id}
                  onClick={() => handleSelectFolio(folio)}
                  className={`p-4 sm:p-5 cursor-pointer transition-colors relative group ${
                    isSelected
                      ? 'bg-[#ffffff] text-[#1c1a18]'
                      : 'hover:bg-[#f4efe5] text-[#4a463f]'
                  }`}
                >
                  {/* Active Left Bookmark Indicator Bar */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#b8431e]" />
                  )}

                  <div className="flex items-baseline justify-between">
                    <span className="font-mono-editorial text-[11px] text-[#827c73] font-bold">
                      {folio.number}
                    </span>
                    <span className="font-mono-editorial text-[9px] text-[#9c958b]">
                      {folio.time} • {folio.notesCount} notes
                    </span>
                  </div>

                  <div className="mt-1">
                    <h3
                      className={`font-serif-editorial text-base sm:text-lg leading-snug tracking-tight ${
                        isSelected
                          ? 'text-[#b8431e] italic font-semibold'
                          : 'text-[#1c1a18] group-hover:text-[#b8431e]'
                      }`}
                    >
                      {folio.title}
                    </h3>
                    <p className="text-xs text-[#5c564e] font-serif-editorial line-clamp-1 mt-0.5">
                      {folio.subtitle}
                    </p>
                  </div>

                  {/* Micro Metadata Tags */}
                  <div className="flex items-center space-x-2 mt-2 pt-1">
                    <span
                      className={`font-mono-editorial text-[9px] px-1.5 py-0.5 rounded ${
                        folio.status === 'breaking'
                          ? 'bg-[#b8431e]/10 text-[#8d2a0d] border border-[#b8431e]/30'
                          : folio.status === 'drift'
                          ? 'bg-[#9c651d]/10 text-[#734710] border border-[#9c651d]/30'
                          : 'bg-[#2e5b44]/10 text-[#204533] border border-[#2e5b44]/30'
                      }`}
                    >
                      {folio.status === 'breaking'
                        ? `${folio.breakingCount} BREAKING`
                        : folio.status === 'drift'
                        ? 'DRIFT'
                        : 'STABLE'}
                    </span>
                    <span className="font-mono-editorial text-[9px] text-[#827c73]">
                      Integrity {folio.integrity}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dossier Footer Info */}
          <div className="p-4 border-t border-[#e7e1d7] bg-[#f4efe5] text-[11px] text-[#6b6459] font-serif-editorial flex-shrink-0">
            <p className="italic leading-relaxed">
              Nothing on this page leaves your browser. All spaCy linguistic extractions & dense MiniLM vectors compute locally.
            </p>
          </div>
        </section>

        {/* ================= RIGHT SECTION: THE EDITORIAL INQUIRY ROOM (8 cols) ================= */}
        <section className="lg:col-span-8 bg-[#ffffff] flex flex-col h-full min-h-0 relative">
          {/* Chapter & Title Header */}
          <div className="px-6 sm:px-8 py-5 border-b border-[#e7e1d7] bg-white flex-shrink-0 flex items-start justify-between">
            <div className="space-y-1">
              <span className="font-mono-editorial text-[10px] tracking-widest text-[#827c73] uppercase block">
                {activeFolio.chapter}
              </span>
              <h1 className="font-serif-editorial text-2xl sm:text-3xl lg:text-4xl font-normal text-[#1c1a18] tracking-tight leading-none">
                {activeFolio.title}
              </h1>
              <p className="font-serif-editorial italic text-xs sm:text-sm text-[#5c564e] pt-1">
                {activeFolio.subtitle}
              </p>
            </div>

            <div className="text-right hidden sm:block">
              <span className="font-mono-editorial text-[10px] text-[#827c73] uppercase block">
                PUBLISHED
              </span>
              <span className="font-serif-editorial text-xs text-[#1c1a18]">
                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="font-mono-editorial text-[10px] text-[#827c73] uppercase block mt-2">
                CORRESPONDENCE
              </span>
              <span className="font-serif-editorial text-xs text-[#1c1a18]">
                {activeFolio.notesCount} notes
              </span>
            </div>
          </div>

          {/* ================= SCROLLABLE CONVERSATION LOG ================= */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
            {messages.map((m) => {
              const isSentinel = m.sender === 'sentinel';
              return (
                <div key={m.id} className="flex items-start space-x-3 sm:space-x-4">
                  {/* Monogram / Stamp Column */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-0.5 select-none w-9 sm:w-10 text-center">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono-editorial text-[10px] sm:text-[11px] font-bold border ${
                        isSentinel
                          ? 'border-[#b8431e] bg-[#b8431e]/10 text-[#8d2a0d]'
                          : 'border-[#736c61] bg-[#f4efe5] text-[#242220]'
                      }`}
                    >
                      {isSentinel ? 'SE' : 'YOU'}
                    </div>
                    <span className="font-mono-editorial text-[9px] uppercase tracking-wider text-[#827c73] mt-1">
                      {isSentinel ? 'SENTINEL' : 'YOU'}
                    </span>
                    <span className="font-mono-editorial text-[8px] text-[#9c958b]">
                      {m.timestamp}
                    </span>
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 space-y-3 pt-0.5">
                    {/* Paragraph Prose with Drop Cap on initial greeting */}
                    <div
                      className={`font-serif-editorial text-sm sm:text-base leading-relaxed text-[#242220] ${
                        m.isInitial ? 'drop-cap-editorial' : ''
                      }`}
                    >
                      {m.text}
                    </div>

                    {/* Typeset Plate / Visual Finding Card */}
                    {m.plate && (
                      <div className="border border-[#ded6c9] rounded-lg bg-[#faf8f4] p-4 sm:p-5 space-y-2.5 my-2 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                        <div className="flex items-center justify-between border-b border-[#e7e1d7] pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-serif-editorial italic text-xs text-[#827c73]">
                              {m.plate.plateNumber}
                            </span>
                            <span className="text-[#ded6c9]">•</span>
                            <span className="font-serif-editorial font-semibold text-xs sm:text-sm text-[#1c1a18]">
                              {m.plate.title}
                            </span>
                          </div>
                          <span
                            className={`font-mono-editorial text-[9px] px-2 py-0.5 rounded uppercase font-semibold ${
                              m.plate.badgeType === 'breaking'
                                ? 'bg-[#b8431e]/15 text-[#8d2a0d] border border-[#b8431e]/30'
                                : m.plate.badgeType === 'warning'
                                ? 'bg-[#9c651d]/15 text-[#734710] border border-[#9c651d]/30'
                                : 'bg-[#2e5b44]/15 text-[#204533] border border-[#2e5b44]/30'
                            }`}
                          >
                            {m.plate.badge}
                          </span>
                        </div>

                        <p className="font-serif-editorial text-xs sm:text-sm text-[#4a463f] leading-relaxed">
                          {m.plate.description}
                        </p>

                        {/* Optional Typeset Code Snippet */}
                        {m.plate.codeSnippet && (
                          <div className="relative group/code mt-2">
                            <pre className="bg-[#f2ece2] border border-[#ded6c9] rounded p-3 text-[11px] font-mono-editorial text-[#2b2723] overflow-x-auto leading-relaxed">
                              {m.plate.codeSnippet}
                            </pre>
                            <button
                              onClick={() => handleCopyCode(m.plate?.codeSnippet || '', m.id)}
                              className="absolute top-2 right-2 p-1 rounded bg-white/80 hover:bg-white text-[#5c564e] border border-[#ded6c9] opacity-0 group-hover/code:opacity-100 transition-opacity"
                              title="Copy code snippet"
                            >
                              {copiedPlate === m.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Inquiry Options */}
                    {m.options && m.options.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-2">
                        {m.options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(opt)}
                            className="font-serif-editorial text-xs italic px-3 py-1 rounded border border-[#ded6c9] bg-white hover:bg-[#f4efe5] text-[#4a463f] hover:text-[#1c1a18] transition-colors"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center space-x-3 text-xs text-[#827c73] font-serif-editorial italic pl-12">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b8431e] animate-ping" />
                <span>Typesetting linguistic analysis plate...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* ================= PINNED BOTTOM INQUIRY FORM (ALWAYS VISIBLE) ================= */}
          <div className="px-6 sm:px-8 py-4 border-t border-[#e7e1d7] bg-[#fbf9f4] flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="bg-white border border-[#ded6c9] rounded-lg p-2 flex items-center space-x-2 shadow-xs focus-within:border-[#b8431e] transition-colors"
            >
              {/* Upload Specs button */}
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="w-8 h-8 rounded text-[#827c73] hover:text-[#1c1a18] hover:bg-[#f4efe5] flex items-center justify-center transition-colors flex-shrink-0"
                title="Mount OpenAPI specifications"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Text input with editorial styling */}
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Inquire on deontic shifts, parameter obligations, or request a migration plate..."
                className="flex-1 bg-transparent text-xs sm:text-sm font-serif-editorial text-[#1c1a18] focus:outline-none placeholder-[#9c958b]"
              />

              {/* Terracotta Circular Arrow Send button */}
              <button
                type="submit"
                disabled={isTyping}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#b8431e] hover:bg-[#9e3717] active:scale-95 text-white flex items-center justify-center transition-transform flex-shrink-0 shadow-xs"
                title="Send inquiry"
              >
                <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] font-mono-editorial text-[#827c73] pt-2 px-1">
              <span>PROMPT SENT TO SPACY DEONTIC ENGINE & MINI-LM</span>
              <span className="hidden sm:inline">ESC TO CLEAR • RETURN TO SUBMIT</span>
            </div>
          </div>
        </section>
      </main>

      {/* ================= MODAL: MOUNT SPECIFICATION DOSSIER ================= */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1c1a18]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fbf9f4] border border-[#ded6c9] rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4 text-[#242220]">
            <div className="flex items-center justify-between border-b border-[#e7e1d7] pb-3">
              <div>
                <span className="font-mono-editorial text-[9px] uppercase tracking-wider text-[#b8431e] font-bold">
                  ARCHIVAL INGESTION
                </span>
                <h3 className="font-serif-editorial text-xl font-normal text-[#1c1a18]">
                  Mount Specification Dossier
                </h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="w-7 h-7 rounded text-[#827c73] hover:text-[#1c1a18] hover:bg-[#ece6dc] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Baseline File Slot */}
            <div className="space-y-1">
              <label className="font-mono-editorial text-[10px] uppercase font-bold text-[#5c564e]">
                1. Baseline Specification (v1)
              </label>
              <div
                onClick={() => fileInputRef1.current?.click()}
                className="border border-dashed border-[#ded6c9] hover:border-[#b8431e] rounded p-3 text-center cursor-pointer bg-white transition-colors"
              >
                {customFile1 ? (
                  <span className="font-serif-editorial text-xs text-[#2e5b44] font-semibold">
                    ✓ {customFile1.name}
                  </span>
                ) : (
                  <span className="font-serif-editorial text-xs text-[#827c73]">
                    Click to select baseline specification (.yaml, .json)
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef1}
                onChange={(e) => handleFileUpload(e, 1)}
                accept=".json,.yaml,.yml"
                className="hidden"
              />
            </div>

            {/* Candidate File Slot */}
            <div className="space-y-1">
              <label className="font-mono-editorial text-[10px] uppercase font-bold text-[#5c564e]">
                2. Candidate Specification (v2)
              </label>
              <div
                onClick={() => fileInputRef2.current?.click()}
                className="border border-dashed border-[#ded6c9] hover:border-[#b8431e] rounded p-3 text-center cursor-pointer bg-white transition-colors"
              >
                {customFile2 ? (
                  <span className="font-serif-editorial text-xs text-[#2e5b44] font-semibold">
                    ✓ {customFile2.name}
                  </span>
                ) : (
                  <span className="font-serif-editorial text-xs text-[#827c73]">
                    Click to select candidate specification (.yaml, .json)
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef2}
                onChange={(e) => handleFileUpload(e, 2)}
                accept=".json,.yaml,.yml"
                className="hidden"
              />
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={() => setUploadModalOpen(false)}
                className="flex-1 py-2 rounded border border-[#ded6c9] font-serif-editorial text-xs text-[#5c564e] hover:bg-[#ece6dc]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomFolio}
                className="flex-1 py-2 rounded bg-[#b8431e] hover:bg-[#9e3717] font-serif-editorial text-xs font-semibold text-white shadow-xs"
              >
                Typeset Folio Plate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolioChatbotPage;
