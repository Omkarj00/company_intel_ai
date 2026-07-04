'use client';

import { useState } from 'react';
import type { ResearchResult } from '@/lib/types';

interface ResultCardProps {
  result: ResearchResult;
  onSendDiscord: (result: ResearchResult) => Promise<void>;
  discordReady: boolean;
}

export default function ResultCard({ result, onSendDiscord, discordReady }: ResultCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendState, setSendState] = useState<'idle' | 'sent' | 'error'>('idle');
  const { company, competitors, pagesCrawled, model } = result;

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${company.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_research_report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSendDiscord() {
    setSending(true);
    setSendState('idle');
    try {
      await onSendDiscord(result);
      setSendState('sent');
    } catch {
      setSendState('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-surface-700 bg-surface-900 animate-slideUp">
      {/* dossier header */}
      <div className="relative border-b border-surface-700 bg-gradient-to-br from-surface-850 to-surface-900 px-5 py-4">
        <span className="absolute right-4 top-4 rounded border border-accent-500/40 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent-400">
          Verified
        </span>
        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
          Company Dossier
        </p>
        <h2 className="mt-1 text-xl font-bold text-gray-50">{company.name}</h2>
        <a
          href={company.website}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[12.5px] text-accent-400 hover:underline"
        >
          {company.website}
        </a>
        {company.industry && (
          <span className="ml-3 inline-block rounded-full bg-surface-800 px-2 py-0.5 font-mono text-[10px] text-gray-400">
            {company.industry}
          </span>
        )}
      </div>

      <div className="space-y-5 px-5 py-4">
        {/* contact grid */}
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <Field label="Phone" value={company.phone ?? 'Not publicly available'} />
          <Field label="Address" value={company.address ?? 'Not publicly available'} />
        </div>

        <Section title="Summary">
          <p className="text-[13.5px] leading-relaxed text-gray-300">{company.summary}</p>
        </Section>

        <Section title="Products / Services">
          <BulletList items={company.productsServices} empty="None identified" />
        </Section>

        <Section title="AI-Generated Pain Points">
          <BulletList items={company.painPoints} empty="None identified" />
        </Section>

        <Section title={`Competitors (${competitors.length})`}>
          {competitors.length === 0 ? (
            <p className="text-[13px] text-gray-500">No competitors identified.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {competitors.map((c, i) => (
                <div
                  key={i}
                  className="rounded-md border border-surface-700 bg-surface-850 px-3 py-2"
                >
                  <p className="text-[13px] font-medium text-gray-200">{c.name}</p>
                  {c.website ? (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-accent-400 hover:underline"
                    >
                      {c.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="font-mono text-[11px] text-gray-600">website not found</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <details className="group">
          <summary className="cursor-pointer select-none font-mono text-[10.5px] uppercase tracking-wider text-gray-500 hover:text-gray-400">
            Sources · {pagesCrawled.length} page(s) crawled · model: {model}
          </summary>
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-gray-500">
            {pagesCrawled.map((url, i) => (
              <li key={i} className="truncate">
                {url}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {/* actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-surface-700 bg-surface-850/50 px-5 py-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 rounded-md bg-accent-500 px-3.5 py-2 text-[13px] font-semibold text-surface-950 transition hover:bg-accent-400 disabled:opacity-60"
        >
          {downloading ? 'Generating PDF...' : 'Download PDF Report'}
        </button>

        <button
          onClick={handleSendDiscord}
          disabled={sending || !discordReady}
          title={!discordReady ? 'Configure Discord in Settings first' : undefined}
          className="flex items-center gap-2 rounded-md border border-surface-600 px-3.5 py-2 text-[13px] font-medium text-gray-300 transition hover:border-accent-500/50 hover:text-accent-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? 'Sending...' : 'Send to Discord'}
        </button>

        {sendState === 'sent' && (
          <span className="font-mono text-[11.5px] text-accent-400">✓ sent to channel</span>
        )}
        {sendState === 'error' && (
          <span className="font-mono text-[11.5px] text-red-400">✕ failed to send</span>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-gray-300">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">{title}</p>
      {children}
    </div>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-[13px] text-gray-500">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-gray-300">
          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
          {item}
        </li>
      ))}
    </ul>
  );
}
