'use client';

import type { ProgressEvent } from '@/lib/types';

const STEP_ORDER = ['start', 'identify', 'crawl', 'search', 'analyze', 'competitors', 'finalize'];
const STEP_LABELS: Record<string, string> = {
  start: 'INIT',
  identify: 'IDENTIFY',
  crawl: 'CRAWL',
  search: 'SEARCH',
  analyze: 'ANALYZE',
  competitors: 'COMPETITORS',
  finalize: 'FINALIZE',
};

interface ProgressTrackerProps {
  events: ProgressEvent[];
  percent: number;
  done: boolean;
  error?: string;
}

export default function ProgressTracker({ events, percent, done, error }: ProgressTrackerProps) {
  const currentStep = [...events].reverse().find((e) => e.step)?.step;
  const currentIndex = STEP_ORDER.indexOf(currentStep ?? 'start');

  return (
    <div className="w-full max-w-2xl rounded-lg border border-surface-700 bg-surface-900 p-4 animate-slideUp">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-gray-500">
          research log
        </span>
        <span className="font-mono text-[10.5px] text-accent-400">{Math.round(percent)}%</span>
      </div>

      {/* step rail */}
      <div className="mb-3 flex items-center gap-1">
        {STEP_ORDER.slice(1).map((step, i) => {
          const stepIdx = STEP_ORDER.indexOf(step);
          const active = stepIdx <= currentIndex;
          return (
            <div
              key={step}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                error
                  ? 'bg-red-500/40'
                  : active
                  ? 'bg-accent-500'
                  : 'bg-surface-700'
              }`}
            />
          );
        })}
      </div>

      {/* scrolling log */}
      <div className="max-h-40 space-y-1 overflow-y-auto font-mono text-[11.5px] leading-relaxed">
        {events.map((e, i) => (
          <div key={i} className="flex gap-2 text-gray-400">
            <span className="shrink-0 text-gray-600">
              [{String(Math.round(e.percent ?? 0)).padStart(3, ' ')}%]
            </span>
            {e.step && (
              <span className="shrink-0 text-accent-500/80">{STEP_LABELS[e.step] ?? e.step.toUpperCase()}</span>
            )}
            <span className="truncate text-gray-400">{e.message}</span>
          </div>
        ))}
        {!done && !error && (
          <div className="flex items-center gap-2 text-accent-400 animate-pulseSoft">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            working...
          </div>
        )}
        {error && <div className="text-red-400">✕ {error}</div>}
      </div>
    </div>
  );
}
