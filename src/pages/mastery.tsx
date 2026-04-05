import { useEffect, useState, useMemo } from 'react';
import { Star, Target, TrendingUp, Search } from 'lucide-react';
import { getChampionMasteries, getChampionIconUrl, getChallenges } from '@/lib/lcu-api';

// Champion name lookup from Community Dragon
let championNames: Record<number, string> = {};
async function loadChampionNames(): Promise<Record<number, string>> {
  if (Object.keys(championNames).length > 0) return championNames;
  try {
    const res = await fetch('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json');
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach((c: any) => {
        if (c.id && c.id !== -1) championNames[c.id] = c.name ?? c.alias ?? `#${c.id}`;
      });
    }
  } catch (e) {
    console.error('Failed to load champion names:', e);
  }
  return championNames;
}

function getChampionName(championId: number): string {
  return championNames[championId] ?? `Champion #${championId}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const MASTERY_COLOR: Record<number, string> = {
  1: '#5B5A56', 2: '#5B5A56', 3: '#5B5A56', 4: '#5B5A56',
  5: '#E84057', 6: '#9D48E0', 7: '#C89B3C', 8: '#C89B3C',
  9: '#C89B3C', 10: '#F4C874',
};

type TabId = 'overview' | 'champions';

export default function Mastery() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [masteries, setMasteries] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadChampionNames();
    Promise.all([getChampionMasteries(), getChallenges()]).then(([m, c]) => {
      if (Array.isArray(m) && m.length > 0) {
        setMasteries(m.sort((a: any, b: any) => (b.championPoints ?? 0) - (a.championPoints ?? 0)));
      }
      if (Array.isArray(c)) setChallenges(c);
      setLoading(false);
    });
  }, []);

  const totalPoints = masteries.reduce((s, m) => s + (m.championPoints ?? 0), 0);
  const m7Plus = masteries.filter(m => (m.championLevel ?? 0) >= 7).length;
  const m10Plus = masteries.filter(m => (m.championLevel ?? 0) >= 10).length;

  // Mastery-related challenges
  const masteryChallenges = useMemo(() => {
    const keywords = ['catch', 'master yourself', 'wise master', 'one-trick', 'master the enemy', 'jack of all', 'protean'];
    return challenges.filter(c => {
      const name = (c.name ?? c.description ?? '').toLowerCase();
      return keywords.some(k => name.includes(k));
    });
  }, [challenges]);

  const filteredMasteries = useMemo(() => {
    let list = activeTab === 'overview' ? masteries.slice(0, 15) : masteries;
    if (search && activeTab === 'champions') {
      const q = search.toLowerCase();
      list = list.filter(m => {
        const name = getChampionName(m.championId).toLowerCase();
        const id = String(m.championId);
        return name.includes(q) || id.includes(q);
      });
    }
    return list;
  }, [masteries, activeTab, search]);

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Total Points', value: fmtNum(totalPoints), color: '#C89B3C', icon: Star },
          { label: 'Mastery 7+', value: String(m7Plus), color: '#C89B3C', icon: Target },
          { label: 'Mastery 10+', value: String(m10Plus), color: '#F4C874', icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card p-3.5 flex items-center gap-3 flex-1 min-w-[140px]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-none" style={{ color }}>{loading ? '…' : value}</p>
              <p className="text-[10px] text-ink-muted mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mastery challenges (Crystal-style) */}
      {masteryChallenges.length > 0 && activeTab === 'overview' && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3">Mastery Challenges</h3>
          <div className="grid grid-cols-2 gap-2">
            {masteryChallenges.slice(0, 6).map((c, i) => {
              const current = c.currentValue ?? 0;
              const next = c.nextLevelValue ?? c.nextThreshold ?? 1;
              const prev = c.previousLevelValue ?? 0;
              const pct = next > prev ? Math.min(Math.round(((current - prev) / (next - prev)) * 100), 100) : 100;
              const tier = c.currentLevel ?? c.level ?? 'NONE';
              const tierColors: Record<string, string> = {
                NONE: '#5B5A56', IRON: '#6B6B6B', BRONZE: '#CD7F32', SILVER: '#C0C8D4',
                GOLD: '#C89B3C', PLATINUM: '#4E9996', DIAMOND: '#576BCE', MASTER: '#9D48E0',
                GRANDMASTER: '#E84057', CHALLENGER: '#F4C874',
              };
              const color = tierColors[tier] ?? '#5B5A56';
              return (
                <div key={c.id ?? i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                    <Star size={11} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-medium text-ink-bright truncate">{c.name ?? `#${c.id}`}</span>
                      <span className="text-[9px] text-ink-ghost tabular-nums ml-1 flex-shrink-0">
                        {current.toLocaleString()} / {next.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <div className="tab-bar flex-1">
          <button onClick={() => setActiveTab('overview')} className={`tab ${activeTab === 'overview' ? 'active' : ''}`}>
            Top 15
          </button>
          <button onClick={() => setActiveTab('champions')} className={`tab ${activeTab === 'champions' ? 'active' : ''}`}>
            All Champions
          </button>
        </div>
        {activeTab === 'champions' && (
          <div className="relative w-40">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-ghost" />
            <input type="text" placeholder="Filter…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="input-search text-[10px] py-1.5" />
          </div>
        )}
      </div>

      {/* Champion list */}
      {loading ? (
        <div className="space-y-1">{Array(10).fill(0).map((_, i) => <div key={i} className="skeleton h-11 rounded-lg" />)}</div>
      ) : filteredMasteries.length === 0 ? (
        <div className="card p-12 text-center text-ink-ghost">
          <Star size={28} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm text-ink-dim">No mastery data</p>
          <p className="text-xs mt-1">Play games to see mastery data here</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {filteredMasteries.map((m, rank) => {
            const lvl = m.championLevel ?? 0;
            const color = MASTERY_COLOR[Math.min(lvl, 10)] ?? '#5B5A56';
            const pct = (m.championPointsUntilNextLevel ?? 0) > 0
              ? Math.round(((m.championPointsSinceLastLevel ?? 0) / ((m.championPointsSinceLastLevel ?? 0) + (m.championPointsUntilNextLevel ?? 1))) * 100)
              : 100;
            return (
              <div key={m.championId} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                <span className="w-5 text-[10px] text-ink-ghost text-right tabular-nums">{rank + 1}</span>
                <img src={getChampionIconUrl(m.championId)} alt="" className="w-8 h-8 rounded-lg border border-white/[0.06] object-cover flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-ink-bright font-medium">{getChampionName(m.championId)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>M{lvl}</span>
                      <span className="text-xs text-gold tabular-nums">{fmtNum(m.championPoints ?? 0)}</span>
                    </div>
                  </div>
                  <div className="progress-track">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
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
