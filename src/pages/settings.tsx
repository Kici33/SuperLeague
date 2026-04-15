import { useState, useEffect } from 'react';
import { Webhook, Settings, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { testDiscordWebhook } from '@/lib/lcu-api';
import type { AppSettings } from '@/lib/types';

const DEFAULT_SETTINGS: AppSettings = {
  discordWebhookUrl: '',
  refreshInterval: 6,
  autoConnect: true,
  showNotifications: true,
  releaseChannel: 'stable',
  theme: 'dark',
  activeAccountId: null,
};

const SECTION_TABS = ['General', 'Discord'] as const;
type SectionTab = typeof SECTION_TABS[number];

/* ── Toggle switch ── */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
        on ? 'bg-gold' : 'bg-muted'
      }`}
    >
      <div
        className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? 'translate-x-[22px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionTab>('General');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('superleague_settings');
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('superleague_settings', JSON.stringify(settings));
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestWebhook = async () => {
    if (!settings.discordWebhookUrl) return;
    setWebhookStatus('testing');
    const ok = await testDiscordWebhook(settings.discordWebhookUrl);
    setWebhookStatus(ok ? 'success' : 'error');
    setTimeout(() => setWebhookStatus('idle'), 3000);
  };

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <button onClick={handleSave} disabled={saving} className="btn-gold text-sm">
          {saved ? <Check size={14} /> : <Settings size={14} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Section tabs */}
      <div className="tab-bar">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSection(tab)}
            className={`tab flex items-center gap-1.5 ${activeSection === tab ? 'active' : ''}`}
          >
            {tab === 'Discord' && <Webhook size={13} />}
            {tab === 'General' && <Settings size={13} />}
            {tab}
          </button>
        ))}
      </div>

      {/* ── General ── */}
      {activeSection === 'General' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <h3 className="text-sm font-semibold text-ink-bright">Connection</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-ink-bright">Auto-connect</p>
                  <p className="text-xs text-ink-ghost">Detect and connect when League launches</p>
                </div>
                <Toggle on={settings.autoConnect} onChange={() => setSettings({ ...settings, autoConnect: !settings.autoConnect })} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-ink-bright">Refresh interval</p>
                  <p className="text-xs text-ink-ghost">Polling frequency</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    value={settings.refreshInterval}
                    onChange={(e) => setSettings({ ...settings, refreshInterval: Number(e.target.value) })}
                    className="input w-16 text-sm text-center"
                    min={2} max={60}
                  />
                  <span className="text-xs text-ink-ghost">sec</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-4">
            <h3 className="text-sm font-semibold text-ink-bright">Notifications</h3>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-ink-bright">Desktop notifications</p>
                <p className="text-xs text-ink-ghost">Show system alerts for milestones</p>
              </div>
              <Toggle on={settings.showNotifications} onChange={() => setSettings({ ...settings, showNotifications: !settings.showNotifications })} />
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-ink-bright">Release Channel</h3>
            <p className="text-xs text-ink-ghost">
              Choose which updates to receive. Beta may include unfinished features.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, releaseChannel: 'stable' })}
                className={`btn-ghost text-sm ${settings.releaseChannel === 'stable' ? 'border-gold/40 text-gold bg-gold/10' : ''}`}
              >
                Stable
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, releaseChannel: 'beta' })}
                className={`btn-ghost text-sm ${settings.releaseChannel === 'beta' ? 'border-gold/40 text-gold bg-gold/10' : ''}`}
              >
                Beta
              </button>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-ink-bright">Data</h3>
            <div className="flex gap-2">
              <button className="btn-ghost text-sm">Export Data</button>
              <button className="btn-danger text-sm">Clear History</button>
            </div>
            <p className="text-xs text-ink-ghost">
              Data is stored locally in SQLite. Nothing is sent to external servers.
            </p>
          </div>
        </div>
      )}

      {/* ── Discord ── */}
      {activeSection === 'Discord' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-ink-bright flex items-center gap-2">
              <Webhook size={14} className="text-hextech" />
              Discord Webhook
            </h3>
            <p className="text-xs text-ink-muted">
              Post match results, mastery milestones, and challenge unlocks to a Discord channel.
            </p>
            <input
              type="url"
              value={settings.discordWebhookUrl}
              onChange={(e) => setSettings({ ...settings, discordWebhookUrl: e.target.value })}
              placeholder="https://discord.com/api/webhooks/…"
              className="input font-mono text-xs"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestWebhook}
                disabled={webhookStatus === 'testing' || !settings.discordWebhookUrl}
                className="btn-ghost flex items-center gap-2 text-sm"
              >
                {webhookStatus === 'testing' && <RefreshCw size={13} className="animate-spin" />}
                {webhookStatus === 'success' && <Check size={13} className="text-emerald" />}
                {webhookStatus === 'error' && <AlertTriangle size={13} className="text-ruby" />}
                {webhookStatus === 'idle' && <Webhook size={13} />}
                {webhookStatus === 'testing' ? 'Testing…' : webhookStatus === 'success' ? 'Success!' : webhookStatus === 'error' ? 'Failed' : 'Test Webhook'}
              </button>
              {webhookStatus === 'success' && <p className="text-xs text-emerald">Message sent!</p>}
              {webhookStatus === 'error' && <p className="text-xs text-ruby">Check your URL</p>}
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-ink-bright">What to Post</h3>
            <div className="space-y-2.5">
              {[
                'Match results (win/loss, KDA)',
                'Mastery level-up milestones',
                'Challenge completions',
                'New skin unlocks',
              ].map((label) => (
                <label key={label} className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-4 h-4 rounded bg-gold/20 border border-gold/40 flex items-center justify-center group-hover:border-gold/60 transition-colors">
                    <Check size={10} className="text-gold" />
                  </div>
                  <span className="text-sm text-ink-dim group-hover:text-ink transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
