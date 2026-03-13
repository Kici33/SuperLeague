import { useEffect, useState, useMemo } from 'react';
import { Trophy, Filter, ArrowUp } from 'lucide-react';
import { getChallenges } from '@/lib/lcu-api';

const TIER_C: Record<string, string> = {
  NONE: '#5B5A56', IRON: '#6B6B6B', BRONZE: '#CD7F32', SILVER: '#C0C8D4',
  GOLD: '#C89B3C', PLATINUM: '#4E9996', DIAMOND: '#576BCE', MASTER: '#9D48E0',
  GRANDMASTER: '#E84057', CHALLENGER: '#F4C874',
};

const TIER_ORDER: Record<string, number> = {
  NONE: 0, IRON: 1, BRONZE: 2, SILVER: 3, GOLD: 4, PLATINUM: 5,
  DIAMOND: 6, MASTER: 7, GRANDMASTER: 8, CHALLENGER: 9,
};

type SortMode = 'closest' | 'name' | 'tier';

export default function Challenges() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideMaster, setHideMaster] = useState(false);
  const [sort, setSort] = useState<SortMode>('closest');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getChallenges().then((data) => {
      if (Array.isArray(data) && data.length > 0) setChallenges(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let list = [...challenges];

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const name = (c.name ?? c.description ?? '').toLowerCase();
        return name.includes(q);
      });
    }

    // Hide Master+
    if (hideMaster) {
      list = list.filter(c => {
        const tier = c.currentLevel ?? c.level ?? 'NONE';
        return (TIER_ORDER[tier] ?? 0) < 7; // below MASTER
      });
    }

    // Sort
    if (sort === 'closest') {
      list = list
        .filter(c => {
          const next = c.nextLevelValue ?? c.nextThreshold ?? 0;
          const current = c.currentValue ?? 0;
          return next > 0 && current < next;
        })
        .map(c => ({
          ...c,
          _remaining: (c.nextLevelValue ?? c.nextThreshold ?? 0) - (c.currentValue ?? 0),
          _pct: (() => {
            const cur = c.currentValue ?? 0;
            const nxt = c.nextLevelValue ?? c.nextThreshold ?? 1;
            const prev = c.previousLevelValue ?? 0;
            return nxt > prev ? ((cur - prev) / (nxt - prev)) * 100 : 100;
          })(),
        }))
        .sort((a, b) => b._pct - a._pct); // Sort by closest % to completion
    } else if (sort === 'tier') {
      list.sort((a, b) => (TIER_ORDER[b.currentLevel ?? 'NONE'] ?? 0) - (TIER_ORDER[a.currentLevel ?? 'NONE'] ?? 0));
    } else {
      list.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    }

    return list;
  }, [challenges, hideMaster, sort, search]);

  const stats = useMemo(() => {
    const total = challenges.length;
    const byTier: Record<string, number> = {};
    challenges.forEach(c => {
      const t = c.currentLevel ?? c.level ?? 'NONE';
      byTier[t] = (byTier[t] ?? 0) + 1;
    });
    return { total, byTier };
  }, [challenges]);

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Stats overview */}
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(TIER_C).map(([tier, color]) => {
          const count = stats.byTier[tier] ?? 0;
          if (count === 0 && tier === 'NONE') return null;
          return (
            <div key={tier} className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px]"
              style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span style={{ color }}>{tier.charAt(0) + tier.slice(1).toLowerCase()}</span>
              <span className="text-ink-ghost">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text" placeholder="Search challenges…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-search text-xs flex-1 max-w-xs"
        />
        <button
          onClick={() => setHideMaster(!hideMaster)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            hideMaster ? 'bg-gold text-void' : 'bg-raised text-ink-muted border border-white/[0.06] hover:text-ink'
          }`}
        >
          <Filter size={11} /> Hide Master+
        </button>
        <div className="flex gap-1 ml-auto">
          {([['closest', 'Closest'], ['tier', 'By Tier'], ['name', 'A-Z']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSort(id as SortMode)}
              className={`px-2.5 py-1.5 rounded text-[10px] font-medium transition-all ${
                sort === id ? 'bg-gold/15 text-gold' : 'text-ink-ghost hover:text-ink'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Challenge list */}
      {loading ? (
        <div className="space-y-2">{Array(10).fill(0).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-ink-ghost">
          <Trophy size={40} className="mb-3 opacity-20" />
          <p className="text-sm text-ink-dim">
            {challenges.length === 0 ? 'No challenge data available' : 'No challenges match filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.slice(0, 50).map((c, i) => {
            const tier = c.currentLevel ?? c.level ?? 'NONE';
            const color = TIER_C[tier] ?? TIER_C.NONE;
            const current = c.currentValue ?? 0;
            const next = c.nextLevelValue ?? c.nextThreshold ?? 0;
            const prev = c.previousLevelValue ?? 0;
            const isMasterPlus = (TIER_ORDER[tier] ?? 0) >= 7;
            const pct = next > prev ? Math.min(Math.round(((current - prev) / (next - prev)) * 100), 100) : 100;

            return (
              <div key={c.id ?? i}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                {/* Tier icon */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Trophy size={13} style={{ color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-ink-bright truncate">
                      {c.name ?? c.description ?? `Challenge #${c.id}`}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: `${color}15`, color }}>
                      {tier.charAt(0) + tier.slice(1).toLowerCase()}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[10px] text-ink-ghost tabular-nums flex-shrink-0 w-24 text-right">
                      {isMasterPlus && next === 0
                        ? `${current.toLocaleString()} (Max)`
                        : `${current.toLocaleString()} / ${next.toLocaleString()}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
