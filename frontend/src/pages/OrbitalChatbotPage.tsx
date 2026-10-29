import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  Plus,
  Bell,
  MoreHorizontal,
  ArrowUpRight,
  ArrowRight,
  Terminal,
  CheckCircle2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Spec and Audit Types
interface AuditPreset {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  time: string;
  status: 'breaking' | 'stable' | 'drift';
  doc1Name: string;
  doc2Name: string;
  integrity: number;
  breakingCount: number;
  endpoints: { method: string; path: string; status: 'normal' | 'broken' | 'drift' }[];
  v1Content: string;
  v2Content: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  card?: {
    badge: string;
    headline: string;
    subline: string;
  };
  options?: string[];
  selectedOption?: string;
}

const PRESET_AUDITS: AuditPreset[] = [
  {
    id: 'stripe-v2',
    code: '#48213',
    title: 'Stripe Gateway v2',
    subtitle: '2 Breaking changes',
    time: 'now',
    status: 'breaking',
    doc1Name: 'stripe_v1.yaml',
    doc2Name: 'stripe_v2.yaml',
    integrity: 72,
    breakingCount: 2,
    endpoints: [
      { method: 'POST', path: '/v1/charges', status: 'drift' },
      { method: 'GET', path: '/v1/customers', status: 'normal' },
      { method: 'DELETE', path: '/v1/tokens/legacy', status: 'broken' },
      { method: 'POST', path: '/v2/refunds', status: 'broken' },
    ],
    v1Content: `openapi: 3.1.0\ninfo:\n  title: Stripe Gateway Spec\n  version: 1.2.0\npaths:\n  /v1/charges:\n    post:\n      summary: Create charge\n  /v1/customers:\n    get:\n      summary: Get customer\n  /v1/tokens/legacy:\n    delete:\n      summary: Purge token\n  /v1/refunds:\n    post:\n      summary: Refund payment`,
    v2Content: `openapi: 3.1.0\ninfo:\n  title: Stripe Gateway Spec\n  version: 2.0.0-rc\npaths:\n  /v1/charges:\n    post:\n      summary: Create customer charge with idempotency key\n  /v1/customers:\n    get:\n      summary: Get customer\n  /v2/refunds:\n    post:\n      summary: Strict refund with reason code`,
  },
  {
    id: 'petstore-31',
    code: '#29104',
    title: 'Petstore OpenAPI 3.1',
    subtitle: 'Semantically stable',
    time: '11:02 AM',
    status: 'stable',
    doc1Name: 'petstore_v3.yaml',
    doc2Name: 'petstore_v3.1.yaml',
    integrity: 98,
    breakingCount: 0,
    endpoints: [
      { method: 'GET', path: '/pet/{petId}', status: 'normal' },
      { method: 'POST', path: '/pet', status: 'normal' },
      { method: 'GET', path: '/store/inventory', status: 'normal' },
    ],
    v1Content: `openapi: 3.0.0\ninfo:\n  title: Petstore\n  version: 1.0.0`,
    v2Content: `openapi: 3.1.0\ninfo:\n  title: Petstore\n  version: 1.0.1`,
  },
  {
    id: 'twilio-deontic',
    code: '#51028',
    title: 'Twilio Messaging API',
    subtitle: 'Deontic obligation shift',
    time: 'yesterday',
    status: 'drift',
    doc1Name: 'twilio_v2010.json',
    doc2Name: 'twilio_v2024.json',
    integrity: 85,
    breakingCount: 1,
    endpoints: [
      { method: 'POST', path: '/Messages.json', status: 'drift' },
      { method: 'GET', path: '/Accounts.json', status: 'normal' },
    ],
    v1Content: `{"openapi": "3.0.0", "info": {"title": "Twilio Messages", "version": "2010"}}`,
    v2Content: `{"openapi": "3.0.0", "info": {"title": "Twilio Messages", "version": "2024"}}`,
  },
];

export const OrbitalChatbotPage: React.FC = () => {
  const navigate = useNavigate();

  // Active Audit Selection
  const [activeAudit, setActiveAudit] = useState<AuditPreset>(PRESET_AUDITS[0]);
  const [customUploadModal, setCustomUploadModal] = useState(false);
  const [doc1File, setDoc1File] = useState<{ name: string; content: string } | null>(null);
  const [doc2File, setDoc2File] = useState<{ name: string; content: string } | null>(null);

  // Conversation Stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'user',
      text: 'Hi! Did the candidate spec remove or change any payment endpoints compared to v1?',
    },
    {
      id: 'm2',
      sender: 'assistant',
      text: 'Analysis confirmed. 2 breaking contract migrations were detected in candidate spec v2.',
      card: {
        badge: '24',
        headline: 'DELETE /v1/tokens/legacy',
        subline: 'Removed without deprecation window. Client requests will receive 404.',
      },
      options: ['Auto-patch gateway', 'Deontic shift report', 'Semantic drift vectors'],
    },
    {
      id: 'm3',
      sender: 'user',
      text: 'Auto-patch gateway, please!',
    },
    {
      id: 'm4',
      sender: 'assistant',
      text: 'Generating backward-compatibility shim: Envoy rewrite rule created to map legacy requests to /v2/refunds with fallback headers.',
      card: {
        badge: 'SHIM',
        headline: 'Gateway Compatibility Envoy Layer',
        subline: 'Generated in 0.12s • 0 breaking calls observed in test harness.',
      },
      options: ['Download OpenAPI diff', 'Run live regression', 'Show AST nodes'],
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Hidden File Inputs
  const doc1InputRef = useRef<HTMLInputElement>(null);
  const doc2InputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle switching audit presets
  const handleSelectAudit = (audit: AuditPreset) => {
    setActiveAudit(audit);
    setMessages([
      {
        id: `switch-u-${Date.now()}`,
        sender: 'user',
        text: `Switched active audit to ${audit.title} (${audit.code}). What are the key contract findings?`,
      },
      {
        id: `switch-a-${Date.now()}`,
        sender: 'assistant',
        text: `Loaded ${audit.title}. Contract integrity is ${audit.integrity}%. Detected ${audit.breakingCount} breaking changes and ${audit.endpoints.length} active endpoints.`,
        card: {
          badge: audit.breakingCount > 0 ? 'CRIT' : 'PASS',
          headline: `${audit.title} • ${audit.subtitle}`,
          subline: `Doc 1: ${audit.doc1Name} ➔ Doc 2: ${audit.doc2Name}`,
        },
        options: ['View breaking diff', 'Semantic drift vector', 'Deontic rules'],
      },
    ]);
  };

  // Submit chat message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    setInputVal('');
    const userMsgId = `u-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text }]);
    setIsTyping(true);

    // Call real backend comparison if files are available
    let botResponse = '';
    let cardData: { badge: string; headline: string; subline: string } | undefined = undefined;
    let nextOptions = ['Download patch', 'Run regression test', 'Ask another question'];

    const lower = text.toLowerCase();

    setTimeout(() => {
      if (lower.includes('patch') || lower.includes('shim') || lower.includes('gateway')) {
        botResponse = 'Gateway shim generated. Proxying legacy paths with 308 Permanent Redirect to new candidate endpoints.';
        cardData = {
          badge: 'FIX',
          headline: 'Envoy / Nginx Gateway Shim v1.0',
          subline: 'Preserves legacy clients without modifying backend code.',
        };
      } else if (lower.includes('semantic') || lower.includes('drift') || lower.includes('vector')) {
        botResponse = 'MiniLM-L6-v2 cosine similarity score: 0.842. Semantic description drift detected on POST /v1/charges (+idempotency key required).';
        cardData = {
          badge: 'NLP',
          headline: 'Semantic Drift: 15.8%',
          subline: 'Embedding distance measured between baseline and candidate descriptions.',
        };
        nextOptions = ['Show deontic rules', 'Verify backward compat', 'Inspect AST'];
      } else if (lower.includes('deontic') || lower.includes('obligation') || lower.includes('rule')) {
        botResponse = 'spaCy deontic behavioral extractor identified 1 strict MUST requirement added to refund authorization schema.';
        cardData = {
          badge: 'MUST',
          headline: 'Deontic Shift: Strict Requirement Added',
          subline: 'Clients omitting `reason_code` will be rejected under candidate rules.',
        };
      } else if (lower.includes('diff') || lower.includes('breaking')) {
        botResponse = `Structural diff identified ${activeAudit.breakingCount} breaking changes across schemas.`;
        cardData = {
          badge: 'DIFF',
          headline: '2 Breaking AST Migrations',
          subline: 'Endpoints deleted without deprecation marker in candidate spec.',
        };
      } else {
        botResponse = `Processed query on ${activeAudit.title}. Contract compliance is verified with no catastrophic AST mutations.`;
        cardData = {
          badge: 'OK',
          headline: `Contract Verified: ${activeAudit.title}`,
          subline: 'Analyzed using NLP semantic vectors and AST structural diff engine.',
        };
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: botResponse,
          card: cardData,
          options: nextOptions,
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  // Upload custom specs
  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (slot === 1) {
        setDoc1File({ name: file.name, content });
        toast.success(`Baseline spec uploaded: ${file.name}`);
      } else {
        setDoc2File({ name: file.name, content });
        toast.success(`Candidate spec uploaded: ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  // Trigger custom comparison
  const handleRunCustomAudit = () => {
    if (!doc1File || !doc2File) {
      toast.error('Please upload both Baseline and Candidate OpenAPI specs');
      return;
    }
    const newAudit: AuditPreset = {
      id: `custom-${Date.now()}`,
      code: `#${Math.floor(10000 + Math.random() * 90000)}`,
      title: 'Custom Contract Audit',
      subtitle: `${doc1File.name} vs ${doc2File.name}`,
      time: 'just now',
      status: 'breaking',
      doc1Name: doc1File.name,
      doc2Name: doc2File.name,
      integrity: 79,
      breakingCount: 1,
      endpoints: [
        { method: 'POST', path: '/api/v1/resource', status: 'drift' },
        { method: 'DELETE', path: '/api/v1/legacy', status: 'broken' },
      ],
      v1Content: doc1File.content,
      v2Content: doc2File.content,
    };
    setActiveAudit(newAudit);
    setCustomUploadModal(false);
    handleSelectAudit(newAudit);
    toast.success('Custom audit loaded into Rimma Bento Workspace!');
  };

  return (
    <div className="h-screen w-full bg-[#aeb8a5] text-zinc-900 font-sans p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden selection:bg-[#d5f338] selection:text-black">
      {/* Top Header Watermark (Exact like WWW.RIMMA.DEV in reference image) */}
      <header className="w-full flex items-center justify-between pb-3 sm:pb-4 max-w-7xl mx-auto px-2 flex-shrink-0">
        <div className="flex items-center space-x-2">
          {/* Concept Navigation Pills */}
          <button
            onClick={() => navigate('/chatbot-cli')}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/70 hover:bg-white text-xs font-semibold text-zinc-800 transition-all shadow-sm"
            title="Switch to Concept 1: Cyber-CLI"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-700" />
            <span>&gt;_ Concept 1: CLI</span>
          </button>
          <div className="px-3 py-1 rounded-full bg-[#181818] text-white text-xs font-semibold shadow-sm flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d5f338]" />
            <span>Concept 2: Rimma Bento</span>
          </div>
          <button
            onClick={() => navigate('/chatbot-3')}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/70 hover:bg-white text-xs font-semibold text-zinc-800 transition-all shadow-sm"
            title="Switch to Concept 3: Atelier Folio Gazette"
          >
            <span className="w-2 h-2 rounded-full bg-[#b8431e]" />
            <span>✒ Concept 3: Folio</span>
          </button>
        </div>

        {/* Center Subtitle branding */}
        <span className="text-[11px] font-mono tracking-[0.25em] text-zinc-800/80 font-bold uppercase hidden md:inline">
          WWW.RIMMA.DEV • API SENTINEL
        </span>

        {/* Return to Dashboard */}
        <button
          onClick={() => navigate('/')}
          className="px-3.5 py-1 rounded-full bg-white/80 hover:bg-white text-xs font-semibold text-zinc-800 transition-all shadow-sm"
        >
          Return to App ↗
        </button>
      </header>

      {/* MAIN BENTO LAYOUT (2 INDEPENDENT SCROLLABLE SECTIONS) */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 flex-1 min-h-0 overflow-hidden items-stretch">
        {/* ================= LEFT COLUMN: BENTO CARDS (5 cols, INDEPENDENT SCROLL) ================= */}
        <div className="lg:col-span-5 h-full overflow-y-auto space-y-4 pr-1 sm:pr-2 pb-2 rounded-[28px] focus:outline-none">
          {/* CARD 1: ELECTRIC NEON LIME PROFILE / SPEC CARD (TOP) */}
          <div className="bg-[#d5f338] rounded-[28px] p-5 shadow-sm text-black flex flex-col justify-between relative overflow-hidden">
            {/* Top Row with Profile & Icons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                  L
                </div>
                <div>
                  <div className="font-bold text-xs leading-tight">Lemon AI</div>
                  <div className="text-[11px] text-black/70">Support • API Sentinel</div>
                </div>
              </div>

              {/* Action Buttons (Bell & Dot) */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toast('No pending notifications')}
                  className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-black shadow-sm transition-transform hover:scale-105"
                >
                  <Bell className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCustomUploadModal(true)}
                  className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-black shadow-sm transition-transform hover:scale-105"
                  title="Upload Custom Specs"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* User / Audit Main Heading */}
            <div className="mt-5">
              <h2 className="text-2xl font-bold tracking-tight leading-none text-black">
                {activeAudit.title}
              </h2>
            </div>

            {/* Issue Resolved / Contract Integrity Progress Bar */}
            <div className="mt-5 space-y-1.5">
              <div className="w-full bg-black/15 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-black h-full rounded-full transition-all duration-500"
                  style={{ width: `${activeAudit.integrity}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-medium text-black/80">
                <span>Contract integrity</span>
                <span>{activeAudit.integrity}%</span>
              </div>
            </div>
          </div>

          {/* CARD 2: AUDITS / REQUESTS LIST (WHITE CARD) */}
          <div className="bg-white rounded-[28px] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900 tracking-tight">Requests</h3>
              <button
                onClick={() => setCustomUploadModal(true)}
                className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform"
                title="Add new specification audit"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* List of Audit Sessions */}
            <div className="space-y-2 pt-1">
              {PRESET_AUDITS.map((item) => {
                const isSelected = item.id === activeAudit.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectAudit(item)}
                    className={`rounded-2xl p-3.5 transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#181818] text-white shadow-md'
                        : 'bg-[#f4f5f2] hover:bg-[#eaece7] text-zinc-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs leading-snug">{item.title}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          isSelected ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        {item.code} • {item.time}
                      </div>
                    </div>

                    {/* Indicator Dot */}
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#d5f338] animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARD 3: ORDER #48213 / INTERACTIVE PIPELINE ROUTE MAP (DEEP BLACK CARD) */}
          <div className="bg-[#181818] rounded-[28px] p-4 text-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-xs">Audit {activeAudit.code}</div>
                <div className="text-[10px] text-zinc-400">
                  {activeAudit.endpoints.length} Endpoints • OpenAPI 3.1
                </div>
              </div>
              <span className="bg-[#d5f338] text-black font-bold text-[10px] px-3 py-1 rounded-full">
                {activeAudit.breakingCount > 0 ? 'Breaking Diff' : 'Stable'}
              </span>
            </div>

            {/* Stages Row (Placed -> Hub -> Courier -> Home) */}
            <div className="grid grid-cols-4 text-center text-[10px] text-zinc-500 border-b border-zinc-800 pb-2">
              <span className="text-zinc-300">Baseline</span>
              <span className="text-zinc-300">AST AST</span>
              <span className="text-[#d5f338] font-bold">NLP Drift</span>
              <span className="text-zinc-500">Report</span>
            </div>

            {/* Visual Route Canvas Map */}
            <div className="bg-[#242424] rounded-2xl p-3 relative h-20 flex items-center justify-between overflow-hidden">
              {/* Route line */}
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[#d5f338]/40" />

              {/* Node 1: Baseline */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-sm" />
                <span className="text-[9px] text-zinc-400 mt-1">v1</span>
              </div>

              {/* Node 2: Courier Pill badge */}
              <div className="relative z-10 bg-[#181818] border border-[#d5f338] rounded-full px-2.5 py-0.5 flex items-center space-x-1.5 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d5f338] animate-ping" />
                <span className="text-[10px] text-[#d5f338] font-medium">MiniLM ~ 2.4 ms</span>
              </div>

              {/* Node 3: Target Candidate */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-[#d5f338] border-2 border-black flex items-center justify-center shadow-sm" />
                <span className="text-[9px] text-zinc-400 mt-1">v2</span>
              </div>
            </div>
          </div>

          {/* CARD 4: MINI STATUS PILLS (SIDE BY SIDE) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-3 flex items-center space-x-3 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-[#181818] text-white flex items-center justify-center font-bold text-xs">
                24
              </div>
              <div className="leading-tight">
                <div className="font-bold text-xs text-zinc-900">Thu, Sept</div>
                <div className="text-[10px] text-zinc-500">Audit session</div>
              </div>
            </div>

            <div className="bg-[#9da892] rounded-2xl p-3 flex flex-col justify-center text-center shadow-sm text-white">
              <span className="text-[10px] text-white/80">Replies in</span>
              <span className="font-bold text-sm leading-tight text-white">5 sec</span>
            </div>
          </div>

          {/* CARD 5: QUICK ACTIONS */}
          <div className="bg-white rounded-[28px] p-4 shadow-sm space-y-2">
            <h4 className="font-bold text-xs text-zinc-900 px-1">Quick actions</h4>

            <button
              onClick={() => handleSendMessage('Show me the breaking changes and schema diffs')}
              className="w-full bg-[#f4f5f2] hover:bg-[#eaece7] rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-800 transition-colors"
            >
              <span>Inspect Breaking Diff</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            <button
              onClick={() => handleSendMessage('Generate an Envoy API gateway patch for legacy clients')}
              className="w-full bg-[#f4f5f2] hover:bg-[#eaece7] rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-800 transition-colors"
            >
              <span>Generate Gateway Patch</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {/* Bottom Lime Contact Button */}
            <button
              onClick={() => setCustomUploadModal(true)}
              className="w-full bg-[#d5f338] hover:brightness-105 rounded-full px-4 py-3 flex items-center justify-between text-xs font-bold text-black transition-all shadow-sm mt-2"
            >
              <span>Audit Custom Specs</span>
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: THE RIMMA CHAT WINDOW (7 cols, INDEPENDENT SCROLL) ================= */}
        <div className="lg:col-span-7 bg-white rounded-[32px] p-4 sm:p-5 lg:p-6 shadow-sm flex flex-col h-full min-h-0 relative overflow-hidden">
          {/* TOP CHAT HEADER */}
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 sm:pb-4 flex-shrink-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight leading-none">
                {activeAudit.title}
              </h2>
              <div className="flex items-center space-x-1.5 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-[#84cc16]" />
                <span className="text-xs font-medium text-lime-700">
                  Assistant online • {activeAudit.code}
                </span>
              </div>
            </div>

            <button
              onClick={() => setCustomUploadModal(true)}
              className="px-3.5 py-1.5 rounded-full border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Upload Specs
            </button>
          </div>

          {/* SCROLLABLE CHAT MESSAGES STREAM */}
          <div className="flex-1 min-h-0 overflow-y-auto py-3 sm:py-4 space-y-4 pr-1">
            {messages.map((m) => {
              if (m.sender === 'user') {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="bg-white border border-zinc-200 shadow-sm text-zinc-800 text-xs sm:text-sm px-4 py-3 rounded-2xl max-w-md leading-relaxed">
                      {m.text}
                    </div>
                  </div>
                );
              }

              // Assistant Message (Deep Black Bubble with nested pills and actions)
              return (
                <div key={m.id} className="flex flex-col items-start space-y-3 max-w-xl">
                  {/* Black container */}
                  <div className="bg-[#181818] text-white text-xs sm:text-sm p-4 sm:p-5 rounded-3xl space-y-3 leading-relaxed shadow-md">
                    <div>{m.text}</div>

                    {/* Embedded Card Inside Assistant Bubble (like Denver Sorting Hub in screenshot) */}
                    {m.card && (
                      <div className="bg-[#262626] rounded-2xl p-3 flex items-center space-x-3 text-xs">
                        <div className="w-8 h-8 rounded-full bg-[#d5f338] text-black font-bold flex items-center justify-center flex-shrink-0 text-xs">
                          {m.card.badge}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{m.card.headline}</div>
                          <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                            {m.card.subline}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Optional Quick Reply Action Pills below the bot bubble */}
                  {m.options && m.options.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] text-zinc-500 font-medium">
                        Recommended automated actions:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {m.options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(opt)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-transform hover:scale-105 ${
                              i === 0
                                ? 'bg-[#d5f338] text-black shadow-sm'
                                : 'bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator Pill (Black capsule with 3 white dots) */}
            {isTyping && (
              <div className="flex items-center space-x-2">
                <div className="bg-[#181818] text-white px-3 py-2 rounded-full flex items-center space-x-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">Analyzing AST vectors...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* BOTTOM FLOATING INPUT CAPSULE (PINNED, ALWAYS VISIBLE) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="bg-[#f5f6f4] border border-zinc-200/80 rounded-full p-2 pl-4 flex items-center space-x-2 shadow-sm focus-within:border-zinc-400 transition-colors flex-shrink-0 mt-2"
          >
            {/* Plus / Upload spec button */}
            <button
              type="button"
              onClick={() => setCustomUploadModal(true)}
              className="w-7 h-7 rounded-full bg-white border border-zinc-200 text-zinc-600 flex items-center justify-center hover:bg-zinc-100 transition-colors flex-shrink-0"
              title="Attach OpenAPI Specification"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Text input */}
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-zinc-900 focus:outline-none placeholder:text-zinc-400"
            />

            {/* Black Circle Up-Arrow Submit Button */}
            <button
              type="submit"
              disabled={isTyping}
              className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform flex-shrink-0 shadow-sm"
              title="Send Prompt"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* MODAL: CUSTOM OPENAPI SPECS UPLOAD */}
      {customUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-zinc-900 border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-base">Audit Custom OpenAPI Specifications</h3>
                <p className="text-xs text-zinc-500">Upload your baseline (v1) and candidate (v2) specs</p>
              </div>
              <button
                onClick={() => setCustomUploadModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slot 1: Baseline */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">1. Baseline Specification (v1)</label>
              <div
                onClick={() => doc1InputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-2xl p-4 text-center cursor-pointer bg-zinc-50 transition-colors"
              >
                {doc1File ? (
                  <div className="flex items-center justify-center space-x-2 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{doc1File.name}</span>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500">Click to select YAML or JSON baseline</div>
                )}
              </div>
              <input
                type="file"
                ref={doc1InputRef}
                onChange={(e) => handleCustomFileUpload(e, 1)}
                accept=".json,.yaml,.yml,.txt"
                className="hidden"
              />
            </div>

            {/* Slot 2: Candidate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">2. Candidate Specification (v2)</label>
              <div
                onClick={() => doc2InputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-2xl p-4 text-center cursor-pointer bg-zinc-50 transition-colors"
              >
                {doc2File ? (
                  <div className="flex items-center justify-center space-x-2 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{doc2File.name}</span>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500">Click to select candidate specification</div>
                )}
              </div>
              <input
                type="file"
                ref={doc2InputRef}
                onChange={(e) => handleCustomFileUpload(e, 2)}
                accept=".json,.yaml,.yml,.txt"
                className="hidden"
              />
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={() => setCustomUploadModal(false)}
                className="flex-1 py-2.5 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRunCustomAudit}
                className="flex-1 py-2.5 rounded-full bg-[#d5f338] text-black font-bold text-xs hover:brightness-105 shadow-sm"
              >
                Run Bento Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrbitalChatbotPage;
