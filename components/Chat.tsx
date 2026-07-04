'use client';

import { useEffect, useRef, useState } from 'react';
import Header from './Header';
import ProgressTracker from './ProgressTracker';
import ResultCard from './ResultCard';
import SettingsModal from './SettingsModal';
import { AVAILABLE_MODELS } from '@/lib/openrouter';
import type { ApplicantInfo, DiscordConfig, ProgressEvent, ResearchResult } from '@/lib/types';

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant-progress'; events: ProgressEvent[]; percent: number; done: boolean; error?: string }
  | { id: string; role: 'assistant-result'; result: ResearchResult }
  | { id: string; role: 'assistant-error'; text: string };

const STORAGE_KEY = 'company-research-assistant:config';

function loadStoredConfig(): { discord: DiscordConfig; applicant: ApplicantInfo; model: string } {
  if (typeof window === 'undefined') {
    return { discord: { botToken: '', channelId: '' }, applicant: { name: '', email: '' }, model: AVAILABLE_MODELS[0].id };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('empty');
    const parsed = JSON.parse(raw);
    return {
      discord: parsed.discord ?? { botToken: '', channelId: '' },
      applicant: parsed.applicant ?? { name: '', email: '' },
      model: parsed.model ?? AVAILABLE_MODELS[0].id,
    };
  } catch {
    return { discord: { botToken: '', channelId: '' }, applicant: { name: '', email: '' }, model: AVAILABLE_MODELS[0].id };
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [model, setModel] = useState(AVAILABLE_MODELS[0].id);
  const [discordConfig, setDiscordConfig] = useState<DiscordConfig>({ botToken: '', channelId: '' });
  const [applicant, setApplicant] = useState<ApplicantInfo>({ name: '', email: '' });
  const [health, setHealth] = useState<{ serperOk: boolean | null; openrouterOk: boolean | null }>({
    serperOk: null,
    openrouterOk: null,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = loadStoredConfig();
    setDiscordConfig(stored.discord);
    setApplicant(stored.applicant);
    setModel(stored.model);

    fetch('/api/health')
      .then((r) => r.json())
      .then((data) =>
        setHealth({ serperOk: Boolean(data.serperConfigured), openrouterOk: Boolean(data.openrouterConfigured) })
      )
      .catch(() => setHealth({ serperOk: false, openrouterOk: false }));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function persist(discord: DiscordConfig, applicantInfo: ApplicantInfo, selectedModel: string) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ discord, applicant: applicantInfo, model: selectedModel })
    );
  }

  function handleSaveSettings(discord: DiscordConfig, applicantInfo: ApplicantInfo) {
    setDiscordConfig(discord);
    setApplicant(applicantInfo);
    persist(discord, applicantInfo, model);
    setSettingsOpen(false);
  }

  function handleModelChange(newModel: string) {
    setModel(newModel);
    persist(discordConfig, applicant, newModel);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy) return;

    const userMsgId = crypto.randomUUID();
    const progressMsgId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', text: trimmed },
      { id: progressMsgId, role: 'assistant-progress', events: [], percent: 0, done: false },
    ]);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed, model }),
      });

      if (!res.body) throw new Error('No response stream received.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event: ProgressEvent = JSON.parse(line);
          applyEvent(progressMsgId, event);
        }
      }
      if (buffer.trim()) {
        const event: ProgressEvent = JSON.parse(buffer);
        applyEvent(progressMsgId, event);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setMessages((prev) =>
        prev.map((m) => (m.id === progressMsgId ? { id: progressMsgId, role: 'assistant-error', text: message } : m))
      );
    } finally {
      setBusy(false);
    }
  }

  function applyEvent(progressMsgId: string, event: ProgressEvent) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== progressMsgId) return m;
        if (m.role !== 'assistant-progress') return m;

        if (event.type === 'result' && event.data) {
          return { id: progressMsgId, role: 'assistant-result', result: event.data };
        }
        if (event.type === 'error') {
          return { id: progressMsgId, role: 'assistant-error', text: event.message };
        }
        return {
          ...m,
          events: [...m.events, event],
          percent: event.percent ?? m.percent,
        };
      })
    );
  }

  async function handleSendDiscord(result: ResearchResult) {
    const res = await fetch('/api/discord/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, discordConfig, applicant }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? 'Failed to send to Discord.');
    }
  }

  const discordReady = Boolean(discordConfig.botToken && discordConfig.channelId);

  return (
    <div className="flex h-screen flex-col bg-surface-950">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        serperOk={health.serperOk}
        openrouterOk={health.openrouterOk}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.length === 0 && <EmptyState onExample={(v) => setInput(v)} />}

          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              {m.role === 'user' && (
                <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-accent-500 px-3.5 py-2 text-[13.5px] font-medium text-surface-950">
                  {m.text}
                </div>
              )}
              {m.role === 'assistant-progress' && (
                <ProgressTracker events={m.events} percent={m.percent} done={m.done} />
              )}
              {m.role === 'assistant-result' && (
                <ResultCard result={m.result} onSendDiscord={handleSendDiscord} discordReady={discordReady} />
              )}
              {m.role === 'assistant-error' && (
                <div className="max-w-[85%] rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">
                  ✕ {m.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-surface-700 bg-surface-950 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="font-mono text-[10.5px] uppercase tracking-wider text-gray-500">Model</label>
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="rounded-md border border-surface-600 bg-surface-850 px-2 py-1 font-mono text-[11.5px] text-gray-300 focus:border-accent-500 focus:outline-none"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter a company name or website URL (e.g. Stripe, https://tesla.com)"
              disabled={busy}
              className="flex-1 rounded-lg border border-surface-600 bg-surface-850 px-4 py-2.5 text-[14px] text-gray-100 placeholder:text-gray-600 focus:border-accent-500 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-accent-500 px-4 py-2.5 text-[13.5px] font-semibold text-surface-950 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Researching...' : 'Research'}
            </button>
          </div>
        </div>
      </form>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        discordConfig={discordConfig}
        applicant={applicant}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

function EmptyState({ onExample }: { onExample: (v: string) => void }) {
  const examples = ['Stripe', 'Tesla', 'https://www.notion.so'];
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent-500/30 bg-accent-500/10 font-mono text-lg font-bold text-accent-400">
        CR
      </div>
      <div>
        <h2 className="text-[17px] font-semibold text-gray-200">Research any company in seconds</h2>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-gray-500">
          Give me a company name or website URL. I'll crawl their site, search the web, and build
          a full dossier with competitors — downloadable as a PDF.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => onExample(ex)}
            className="rounded-full border border-surface-600 bg-surface-850 px-3 py-1.5 font-mono text-[12px] text-gray-400 transition hover:border-accent-500/50 hover:text-accent-400"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
