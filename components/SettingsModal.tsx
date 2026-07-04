'use client';

import { useState } from 'react';
import type { ApplicantInfo, DiscordConfig } from '@/lib/types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  discordConfig: DiscordConfig;
  applicant: ApplicantInfo;
  onSave: (discordConfig: DiscordConfig, applicant: ApplicantInfo) => void;
}

export default function SettingsModal({
  open,
  onClose,
  discordConfig,
  applicant,
  onSave,
}: SettingsModalProps) {
  const [botToken, setBotToken] = useState(discordConfig.botToken);
  const [channelId, setChannelId] = useState(discordConfig.channelId);
  const [name, setName] = useState(applicant.name);
  const [email, setEmail] = useState(applicant.email);
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  function handleSave() {
    onSave({ botToken, channelId }, { name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-surface-700 bg-surface-900 p-5 shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-100">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-wider text-gray-500">
              Applicant Details
            </p>
            <div className="space-y-2">
              <Input label="Name" value={name} onChange={setName} placeholder="Jane Doe" />
              <Input
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="jane@example.com"
                type="email"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-wider text-gray-500">
              Discord Integration
            </p>
            <p className="mb-2 text-[12px] text-gray-500">
              After generating a report, send it — with your applicant details and the company's
              info — to a Discord channel. Stored only in your browser, never on our servers.
            </p>
            <div className="space-y-2">
              <Input
                label="Discord Bot Token"
                value={botToken}
                onChange={setBotToken}
                placeholder="Bot token from the Discord Developer Portal"
                type="password"
              />
              <Input
                label="Discord Channel ID"
                value={channelId}
                onChange={setChannelId}
                placeholder="e.g. 1234567890123456789"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full rounded-md bg-accent-500 py-2 text-[13.5px] font-semibold text-surface-950 transition hover:bg-accent-400"
          >
            {saved ? 'Saved ✓' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-gray-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-surface-600 bg-surface-850 px-3 py-2 text-[13px] text-gray-100 placeholder:text-gray-600 focus:border-accent-500 focus:outline-none"
      />
    </label>
  );
}
