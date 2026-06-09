import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import {
  streamChat,
  getStoredKey,
  storeKey,
  getStoredModel,
  storeModel,
  MODELS,
  DEFAULT_API_KEY,
  type Message,
} from './lib/api';
import Markdown from './components/Markdown';

interface ChatMessage extends Message {
  id: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ── Tiny SVG Icons ─────────────────────────────────────────────── */

const Icon = ({ d, cls }: { d: string; cls?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cls || 'w-5 h-5'}>
    <path d={d} />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
);
const PlusIcon = () => <Icon d="M12 5v14M5 12h14" />;
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CheckIcon = () => <Icon d="M20 6L9 17l-5-5" cls="w-4 h-4" />;
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const ChevronIcon = () => <Icon d="M6 9l6 6 6-6" cls="w-4 h-4" />;
const KeyIcon = () => <Icon d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" cls="w-4 h-4" />;

/* ── Copy Button ────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  return (
    <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-500 dark:text-zinc-400" title="Copy">
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

/* ── Thinking Dots ──────────────────────────────────────────────── */

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-2">
      <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0ms]" />
      <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:150ms]" />
      <div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

/* ── Settings Panel (slide-down) ────────────────────────────────── */

function SettingsPanel({
  open,
  onClose,
  apiKey,
  setApiKey,
}: {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (k: string) => void;
}) {
  const [key, setKey] = useState(apiKey);
  const [show, setShow] = useState(false);

  useEffect(() => { setKey(apiKey); }, [apiKey, open]);

  if (!open) return null;

  const save = () => { const k = key.trim(); storeKey(k); setApiKey(k); onClose(); };
  const reset = () => { storeKey(DEFAULT_API_KEY); setApiKey(DEFAULT_API_KEY); setKey(DEFAULT_API_KEY); };
  const isDefault = key.trim() === DEFAULT_API_KEY;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 px-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold flex items-center gap-2"><KeyIcon /> API Key</h2>
        <div className="space-y-2">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-3 py-2 pr-16 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-sky-500 font-medium">{show ? 'Hide' : 'Show'}</button>
          </div>
          {isDefault && <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ Using built-in key — ready to go</p>}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Optional: bring your own key from{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" className="underline text-sky-500">openrouter.ai/keys</a>
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={reset} className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">Reset to default</button>
          <button onClick={save} className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-500 transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

/* ── Model Selector Dropdown ────────────────────────────────────── */

function ModelSelector({ model, setModel }: { model: string; setModel: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = MODELS.find((m) => m.id === model) || MODELS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (id: string) => { setModel(id); storeModel(id); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-700/60 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
      >
        <span className="max-w-[120px] sm:max-w-none truncate">{selected.name}</span>
        <ChevronIcon />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-40 max-h-80 overflow-y-auto">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => pick(m.id)}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors text-sm ${m.id === model ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}
            >
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-zinc-400">{m.provider} · {m.ctx}</div>
              </div>
              {m.id === model && <div className="text-sky-500 text-xs font-bold">✓</div>}
            </button>
          ))}
          <div className="px-4 py-2 text-[10px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-700">
            All models are free via OpenRouter
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main App ───────────────────────────────────────────────────── */

export default function App() {
  const [apiKey, setApiKey] = useState(getStoredKey);
  const [model, setModel] = useState(getStoredModel);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-focus
  useEffect(() => { inputRef.current?.focus(); }, [isStreaming]);

  const handleSend = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    setError('');
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text };
    const assistantMsg: ChatMessage = { id: uid(), role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto';

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const history: Message[] = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
      const stream = streamChat(apiKey, history, model, controller.signal);
      for await (const chunk of stream) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: last.content + chunk };
          return updated;
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Something went wrong');
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && !last.content) return prev.slice(0, -1);
          return prev;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, apiKey, model, messages]);

  const handleStop = () => abortRef.current?.abort();

  const handleClear = () => { if (isStreaming) handleStop(); setMessages([]); setError(''); };

  const handleDelete = (id: string) => setMessages((prev) => prev.filter((m) => m.id !== id));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const selectedModelName = MODELS.find((m) => m.id === model)?.name || 'AI';

  return (
    <div className="h-dvh flex flex-col bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">

      {/* ── Header ──────────────────────────── */}
      <header className="flex-none flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md flex-none">
            AI
          </div>
          <ModelSelector model={model} setModel={setModel} />
        </div>
        <div className="flex items-center gap-0.5 flex-none">
          <button onClick={handleClear} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-zinc-500 dark:text-zinc-400" title="New chat">
            <PlusIcon />
          </button>
          <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-zinc-500 dark:text-zinc-400" title="API Key">
            <KeyIcon />
          </button>
        </div>
      </header>

      {/* ── Messages ────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-5">
              AI
            </div>
            <h2 className="text-xl font-bold mb-2">Lite AI</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-1">
              Free AI chat powered by open-source models via OpenRouter.
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm">
              Using <span className="font-medium text-zinc-600 dark:text-zinc-300">{selectedModelName}</span> — switch models from the header dropdown.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
              {[
                'Explain quantum computing simply',
                'Write a haiku about open source',
                'What are the best free AI APIs?',
                'Help me debug a JavaScript error',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-1">
            {messages.map((msg) => (
              <div key={msg.id} className="group">
                {msg.role === 'user' ? (
                  <div className="flex justify-end mb-4">
                    <div className="relative max-w-[85%] sm:max-w-[75%]">
                      <div className="bg-sky-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <div className="absolute -bottom-5 right-1 flex gap-0.5">
                        <CopyButton text={msg.content} />
                        {!isStreaming && (
                          <button onClick={() => handleDelete(msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-500 dark:text-zinc-400" title="Delete"><TrashIcon /></button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex mb-4">
                    <div className="relative max-w-[90%] sm:max-w-[85%]">
                      <div className="flex items-start gap-2.5">
                        <div className="flex-none w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold mt-0.5 shadow-sm">
                          AI
                        </div>
                        <div className="min-w-0 bg-white dark:bg-zinc-800 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed shadow-sm border border-zinc-100 dark:border-zinc-700/50">
                          {msg.content ? <Markdown content={msg.content} /> : isStreaming && <ThinkingDots />}
                        </div>
                      </div>
                      {msg.content && (
                        <div className="absolute -bottom-5 left-10 flex gap-0.5">
                          <CopyButton text={msg.content} />
                          {!isStreaming && (
                            <button onClick={() => handleDelete(msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-500 dark:text-zinc-400" title="Delete"><TrashIcon /></button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────── */}
      {error && (
        <div className="flex-none px-4 py-2">
          <div className="max-w-3xl mx-auto text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2 border border-red-200 dark:border-red-800/30">
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* ── Input ─────────────────────────────── */}
      <div className="flex-none border-t border-zinc-200 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md px-3 sm:px-4 py-3">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              rows={1}
              className="w-full resize-none rounded-xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-shadow"
              style={{ maxHeight: '200px' }}
            />
          </div>
          {isStreaming ? (
            <button type="button" onClick={handleStop} className="flex-none p-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm" title="Stop">
              <StopIcon />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="flex-none p-2.5 rounded-xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 transition-colors shadow-sm" title="Send">
              <SendIcon />
            </button>
          )}
        </form>
        <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500 mt-2">
          Free & open-source · Powered by OpenRouter · Responses may be inaccurate
        </p>
      </div>

      {/* ── Settings ─────────────────────────── */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} apiKey={apiKey} setApiKey={setApiKey} />
    </div>
  );
}
