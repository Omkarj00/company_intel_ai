'use client';

interface HeaderProps {
  onOpenSettings: () => void;
  serperOk: boolean | null;
  openrouterOk: boolean | null;
}

export default function Header({ onOpenSettings, serperOk, openrouterOk }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-surface-700 bg-surface-950/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-accent-500/40 bg-accent-500/10 font-mono text-[13px] font-bold text-accent-400">
          CR
        </div>
        <div className="leading-tight">
          <h1 className="text-[15px] font-semibold tracking-tight text-gray-100">
            Company Research Assistant
          </h1>
          <p className="hidden font-mono text-[10.5px] uppercase tracking-wider text-gray-500 sm:block">
            crawl · search · analyze · report
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 sm:flex">
          <StatusPill label="Serper" ok={serperOk} />
          <StatusPill label="OpenRouter" ok={openrouterOk} />
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 rounded-md border border-surface-600 bg-surface-850 px-3 py-1.5 text-[13px] font-medium text-gray-300 transition hover:border-accent-500/50 hover:text-accent-400"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>
    </header>
  );
}

function StatusPill({ label, ok }: { label: string; ok: boolean | null }) {
  const color = ok === null ? 'bg-gray-500' : ok ? 'bg-accent-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-gray-500">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}
