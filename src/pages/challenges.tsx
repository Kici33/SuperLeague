import { useEffect, useState } from 'react';
import { Trophy, Search, Filter } from 'lucide-react';
import { getChallenges } from '@/lib/lcu-api';
import type { Challenge } from '@/lib/types';

const TIERS = ['ALL', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER'] as const;

const TIER_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  IRON:     { bg: 'rgba(91,90,86,0.12)',    text: '#9AA4AF', border: 'rgba(91,90,86,0.3)' },
  BRONZE:   { bg: 'rgba(140,87,58,0.12)',   text: '#CD7F32', border: 'rgba(140,87,58,0.3)' },
  SILVER:   { bg: 'rgba(162,169,183,0.10)', text: '#C0C8D4', border: 'rgba(162,169,183,0.2)' },
  GOLD:     { bg: 'rgba(200,155,60,0.12)',  text: '#C89B3C', border: 'rgba(200,155,60,0.25)' },
  PLATINUM: { bg: 'rgba(78,153,150,0.12)',  text: '#4E9996', border: 'rgba(78,153,150,0.25)' },
  DIAMOND:  { bg: 'rgba(87,107,206,0.12)',  text: '#576BCE', border: 'rgba(87,107,206,0.25)' },
  MASTER:   { bg: 'rgba(157,72,224,0.12)',  text: '#9D48E0', border: 'rgba(157,72,224,0.3)' },
  CHALLENGER:{ bg: 'rgba(240,178,50,0.12)', text: '#F0B232', border: 'rgba(240,178,50,0.3)' },
};

const MOCK: Challenge[] = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  name: ['Perfect Timing','Iron Will','Poro King','Rift Herald','Baron Slayer','Dragon Master','Void Walker','Hextech Mind','Gold Standard','Silver Tongue','Precision Strike','League Legend','Rift Warden','Challenge Seeker','Tower Diver','Kill Collector','Minion Maestro','Objective Master','Team Player','Solo Carry','Ward Master','Vision King','Dive Bomber','Ace!'][i % 24],
  description: 'Complete this challenge to prove your mastery on the Rift.',
  currentTier: TIERS[Math.floor(Math.random() * 7) + 1] as string,
  nextTier: TIERS[Math.min(Math.floor(Math.random() * 7) + 2, 7)] as string,
  currentValue: Math.floor(Math.random() * 80) + 10,
  nextThreshold: 100,
  percentCompleted: Math.floor(Math.random() * 90) + 5,
  category: ['TEAMWORK','EXPERTISE','VETERANCY'][i % 3],
  isToken: i % 5 === 0,
}));

function TierBadge({ tier }: { tier: string }) {
  const s = TIER_STYLE[tier] ?? TIER_STYLE['GOLD'];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {tier}
    </span>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const tierStyle = TIER_STYLE[challenge.currentTier] ?? TIER_STYLE['GOLD'];
  return (
    <div className="card p-4 flex flex-col gap-3 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-bright truncate">{challenge.name}</p>
          <p className="text-xs text-ink-muted mt-0.5 truncate-2">{challenge.description}</p>
        </div>
        <TierBadge tier={challenge.currentTier} />
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-[10px] text-ink-ghost mb-1.5">
          <span>{challenge.currentValue} / {challenge.nextThreshold}</span>
          <span className="font-medium" style={{ color: tierStyle.text }}>
            {challenge.percentCompleted}%
          </span>
        </div>
        <div className="progress-track">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${challenge.percentCompleted}%`,
              background: `linear-gradient(90deg, ${tierStyle.text}66, ${tierStyle.text})`,
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-ink-ghost">{challenge.category}</span>
        {challenge.isToken && (
          <span className="badge-gold text-[9px]">⬡ Token</span>
        )}
      </div>
    </div>
  );
}

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>(MOCK);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getChallenges().then((data) => {
      if (Array.isArray(data) && data.length > 0) setChallenges(data);
      setLoading(false);
    });
  }, []);

  const filtered = challenges.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchTier = tier === 'ALL' || c.currentTier === tier;
    return matchSearch && matchTier;
  });

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost" />
          <input
            type="text"
            placeholder="Search challenges…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-search"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 ${
                tier === t
                  ? 'bg-gold text-void'
                  : 'bg-raised text-ink-muted border border-white/[0.06] hover:text-ink'
              }`}
            >
              {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-ink-ghost">
        Showing <span className="text-ink font-medium">{filtered.length}</span> challenges
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(loading ? Array(12).fill(null) : filtered).map((c, i) =>
          c ? (
            <ChallengeCard key={c.id} challenge={c} />
          ) : (
            <div key={i} className="card p-4 space-y-3">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-1.5 w-full rounded-full" />
            </div>
          )
        )}
      </div>
    </div>
  );
}
