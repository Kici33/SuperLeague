import { useState } from 'react';
import { Camera, Edit3, Save, Trophy } from 'lucide-react';
import { setStatus, setProfileIcon, setRankedDisplay, getProfileIconUrl } from '@/lib/lcu-api';

const QUEUES = ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'];
const QUEUE_LABELS: Record<string, string> = {
  RANKED_SOLO_5x5: 'Solo/Duo Queue',
  RANKED_FLEX_SR: 'Flex Queue',
};

const STATUS_PRESETS = [
  '🎮 Grinding ranked',
  '🏆 Chasing Challenger',
  '🔥 On a hot streak',
  '🛡️ Tanking for the team',
  '🌙 Late night sessions',
];

export default function Profile() {
  const [status, setStatusText] = useState('');
  const [iconId, setIconId] = useState('1');
  const [displayedQueue, setDisplayedQueue] = useState(QUEUES[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editIcon, setEditIcon] = useState(false);

  const handleSave = async () => {
    const trimmedStatus = status.trim();
    const numericIconId = parseInt(iconId.trim(), 10);
    if (isNaN(numericIconId) || numericIconId < 1) return;

    setSaving(true);
    await Promise.all([
      setStatus(trimmedStatus),
      setProfileIcon(numericIconId),
      setRankedDisplay(displayedQueue.trim()),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const parsedIconId = parseInt(iconId.trim(), 10) || 1;

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-gold text-sm">
          <Save size={14} />
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile Icon */}
        <div className="card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-ink-bright flex items-center gap-2">
            <Camera size={14} className="text-gold" /> Profile Icon
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <img
                src={getProfileIconUrl(parsedIconId)}
                alt="Profile Icon"
                className="w-12 h-12 rounded-lg border border-gold/30 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getProfileIconUrl(29);
                }}
              />
              <button
                onClick={() => setEditIcon(!editIcon)}
                className="absolute -bottom-1 -right-1 bg-gold text-void w-5 h-5 rounded-full flex items-center justify-center"
              >
                <Edit3 size={10} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink-muted mb-1.5">Icon ID</p>
              <input
                type="text"
                value={iconId}
                onChange={(e) => setIconId(e.target.value.replace(/\s/g, ''))}
                className="input w-24 text-sm"
                placeholder="1"
              />
            </div>
          </div>

          {editIcon && (
            <div className="grid grid-cols-8 gap-1.5 max-h-36 overflow-y-auto pt-3 border-t border-white/[0.05] animate-fade-in">
              {Array.from({ length: 32 }, (_, i) => i + 1).map((id) => (
                <button
                  key={id}
                  onClick={() => { setIconId(String(id)); setEditIcon(false); }}
                  className={`rounded-lg border-2 transition-colors overflow-hidden ${
                    parsedIconId === id ? 'border-gold' : 'border-white/[0.06] hover:border-gold/40'
                  }`}
                >
                  <img
                    src={getProfileIconUrl(id)}
                    alt={`Icon ${id}`}
                    className="w-8 h-8 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-ink-bright flex items-center gap-2">
            <Edit3 size={14} className="text-gold" /> Custom Status
          </h2>
          <textarea
            value={status}
            onChange={(e) => setStatusText(e.target.value)}
            placeholder="Set a custom status message…"
            className="textarea text-sm"
            rows={3}
            maxLength={200}
          />
          <p className="text-[10px] text-ink-ghost text-right tabular-nums">{status.trim().length}/200</p>
          <div className="space-y-1.5">
            <p className="text-[10px] text-ink-ghost">Quick presets:</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setStatusText(preset)}
                  className="text-[11px] px-2 py-1 rounded bg-raised border border-white/[0.06] text-ink-dim hover:border-gold/30 hover:text-ink transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Displayed Rank */}
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-ink-bright flex items-center gap-2">
            <Trophy size={14} className="text-gold" /> Displayed Rank
          </h2>
          <p className="text-xs text-ink-ghost">Choose which ranked queue to display</p>
          <div className="space-y-2">
            {QUEUES.map((queue) => (
              <label key={queue} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  displayedQueue === queue ? 'border-gold bg-gold' : 'border-muted group-hover:border-gold/40'
                }`}>
                  {displayedQueue === queue && <div className="w-2 h-2 rounded-full bg-void" />}
                </div>
                <input type="radio" value={queue} checked={displayedQueue === queue}
                  onChange={() => setDisplayedQueue(queue)} className="sr-only" />
                <span className="text-sm text-ink">{QUEUE_LABELS[queue]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
