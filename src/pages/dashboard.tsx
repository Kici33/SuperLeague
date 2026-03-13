import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Trophy, List, ChevronDown } from 'lucide-react';
import { getChampionMasteries, getChallenges, getChampionIconUrl } from '@/lib/lcu-api';

type Tab = 'mastery-gain' | 'challenges' | 'champions';

/* ── Tier styles ── */
const TIER_ORDER = ['NONE','IRON','BRONZE','SILVER','GOLD','PLATINUM','DIAMOND','MASTER','GRANDMASTER','CHALLENGER'];
const TIER_C: Record<string, string> = {
  NONE: '#5B5A56', IRON: '#6B6B6B', BRONZE: '#CD7F32', SILVER: '#C0C8D4',
  GOLD: '#C89B3C', PLATINUM: '#4E9996', DIAMOND: '#576BCE', MASTER: '#9D48E0',
  GRANDMASTER: '#E84057', CHALLENGER: '#F4C874',
};

/* ── Mastery Class bar with tier targets ── */
const CLASSES = [
  { name: 'Assassin', color: '#C89B3C' },
  { name: 'Fighter',  color: '#FF8C42' },
  { name: 'Mage',     color: '#7B5CFA' },
  { name: 'Marksman', color: '#FA5C5C' },
  { name: 'Support',  color: '#10D48A' },
  { name: 'Tank',     color: '#4A9EFF' },
];

// Tier targets for mastery class challenges (these are the thresholds)
const M_TIERS = [
  { tier: 'Iron',     m7: 1,  m10: 0 },
  { tier: 'Bronze',   m7: 5,  m10: 0 },
  { tier: 'Silver',   m7: 12, m10: 0 },
  { tier: 'Gold',     m7: 18, m10: 3 },
  { tier: 'Platinum', m7: 25, m10: 5 },
  { tier: 'Diamond',  m7: 30, m10: 10 },
  { tier: 'Master',   m7: 45, m10: 15 },
  { tier: 'GM',       m7: 50, m10: 20 },
  { tier: 'Chall',    m7: 65, m10: 30 },
];

function MasteryClassBar({ label, m7, m10, color }: { label: string; m7: number; m10: number; color: string }) {
  const maxScale = 70; // max target
  const h7 = Math.min(Math.round((m7 / maxScale) * 100), 100);
  const h10 = Math.min(Math.round((m10 / maxScale) * 100), 100);
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div className="text-center mb-0.5">
        <span className="text-[10px] font-semibold text-hextech tabular-nums">{m7}</span>
        <span className="text-[8px] text-ink-ghost mx-0.5">/</span>
        <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{m10}</span>
      </div>
      <div className="relative w-full h-36 bg-dark rounded border border-white/[0.06] overflow-hidden">
        {/* Tier target lines */}
        {M_TIERS.filter((_, i) => i % 2 === 0).map(t => (
          <div key={t.tier} className="absolute left-0 right-0 border-t border-dashed border-white/[0.06]"
            style={{ bottom: `${(t.m7 / maxScale) * 100}%` }}>
            <span className="absolute -top-2.5 -left-0.5 text-[7px] text-ink-ghost">{t.m7}</span>
          </div>
        ))}
        <div className="absolute bottom-0 inset-x-0.5 rounded-t transition-all duration-700 opacity-30"
          style={{ height: `${h10}%`, background: color }} />
        <div className="absolute bottom-0 inset-x-1.5 rounded-t transition-all duration-700"
          style={{ height: `${h7}%`, background: '#0BC4E3' }} />
      </div>
      <span className="text-[9px] text-ink-muted font-medium truncate w-full text-center">{label}</span>
    </div>
  );
}

/* ── Challenge Card (Crystal-style) ── */
function ChallengeCard({ c }: { c: any }) {
  const tier = c.currentLevel ?? c.level ?? 'NONE';
  const current = c.currentValue ?? 0;
  const next = c.nextLevelValue ?? c.nextThreshold ?? 1;
  const prev = c.previousLevelValue ?? 0;
  const pct = next > prev ? Math.min(Math.round(((current - prev) / (next - prev)) * 100), 100) : 100;
  const color = TIER_C[tier] ?? TIER_C.NONE;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
        <Trophy size={13} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-ink-bright truncate">{c.name ?? c.description ?? `#${c.id}`}</span>
          <span className="text-[10px] text-ink-ghost tabular-nums flex-shrink-0 ml-2">
            {current.toLocaleString()} / {next.toLocaleString()}
          </span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('challenges');
  const [masteries, setMasteries] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getChampionMasteries(), getChallenges()]).then(([m, c]) => {
      if (Array.isArray(m)) setMasteries(m.sort((a: any, b: any) => (b.championPoints ?? 0) - (a.championPoints ?? 0)));
      if (Array.isArray(c)) setChallenges(c);
      setLoading(false);
    });
  }, []);

  // Mastery class data
  const classData = CLASSES.map((cls, i) => {
    const champs = masteries.filter((_, j) => j % CLASSES.length === i);
    return {
      ...cls,
      m7: champs.filter(c => (c.championLevel ?? 0) >= 7).length,
      m10: champs.filter(c => (c.championLevel ?? 0) >= 10).length,
    };
  });

  // Crystal-style mastery challenges
  const masteryChallenges = useMemo(() => {
    const keywords = ['catch', 'master yourself', 'wise master', 'one-trick', 'master the enemy', 'jack of all'];
    return challenges.filter(c => {
      const name = (c.name ?? c.description ?? '').toLowerCase();
      return keywords.some(k => name.includes(k));
    }).slice(0, 6);
  }, [challenges]);

  // Closest to level up
  const closestChallenge = useMemo(() => {
    const inProgress = challenges
      .filter(c => {
        const tier = c.currentLevel ?? c.level ?? 'NONE';
        const next = c.nextLevelValue ?? c.nextThreshold ?? 0;
        const current = c.currentValue ?? 0;
        return tier !== 'NONE' && next > 0 && current < next;
      })
      .map(c => ({
        ...c,
        remaining: (c.nextLevelValue ?? c.nextThreshold ?? 0) - (c.currentValue ?? 0),
      }))
      .sort((a, b) => a.remaining - b.remaining);
    return inProgress[0] ?? null;
  }, [challenges]);

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Mastery Class Challenges (always visible at top) */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink-bright">Mastery Class Challenges</h2>
          <div className="flex items-center gap-4 text-[9px] text-ink-ghost">
            <div className="flex items-center gap-1"><div className="w-2.5 h-1.5 rounded-sm bg-hextech" /> M7</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-1.5 rounded-sm bg-gold/40" /> M10</div>
          </div>
        </div>
        <div className="flex gap-2">
          {classData.map(cls => (
            <MasteryClassBar key={cls.name} label={cls.name} m7={cls.m7} m10={cls.m10} color={cls.color} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button onClick={() => setTab('mastery-gain')} className={`tab flex items-center gap-1.5 ${tab === 'mastery-gain' ? 'active' : ''}`}>
          <TrendingUp size={12} /> Mastery Gain
        </button>
        <button onClick={() => setTab('challenges')} className={`tab flex items-center gap-1.5 ${tab === 'challenges' ? 'active' : ''}`}>
          <Trophy size={12} /> Challenges
        </button>
        <button onClick={() => setTab('champions')} className={`tab flex items-center gap-1.5 ${tab === 'champions' ? 'active' : ''}`}>
          <List size={12} /> Champions
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'mastery-gain' && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-ink-bright">Total Mastery Over Time</h3>
          <p className="text-xs text-ink-muted">Mastery gain graph will be populated as you play games. Data points represent individual games with champion and mastery earned.</p>
          <div className="h-48 rounded-lg bg-dark border border-white/[0.05] flex items-center justify-center">
            <div className="text-center text-ink-ghost">
              <TrendingUp size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs text-ink-dim">Mastery gain tracking</p>
              <p className="text-[10px] mt-0.5">Play games to see your progress over time</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'challenges' && (
        <div className="space-y-4">
          {/* Crystal-style challenge cards */}
          <div className="grid grid-cols-2 gap-2">
            {loading ? Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)
              : masteryChallenges.length > 0
                ? masteryChallenges.map((c, i) => <ChallengeCard key={c.id ?? i} c={c} />)
                : challenges.slice(0, 6).map((c, i) => <ChallengeCard key={c.id ?? i} c={c} />)
            }
          </div>

          {/* Closest to level up */}
          {closestChallenge && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-medium text-ink-bright">
                    Closest: {closestChallenge.name ?? closestChallenge.description} ({closestChallenge.currentLevel ?? 'NONE'})
                  </p>
                  <p className="text-[10px] text-ink-ghost">
                    {closestChallenge.remaining?.toLocaleString()} points needed
                  </p>
                </div>
                <span className="text-xs tabular-nums text-ink-dim">
                  {(closestChallenge.currentValue ?? 0).toLocaleString()} / {(closestChallenge.nextLevelValue ?? closestChallenge.nextThreshold ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'champions' && (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[40px_1fr_80px_80px_100px] px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.02] text-[10px] text-ink-ghost uppercase tracking-wider font-semibold">
            <span></span>
            <span>Champion</span>
            <span className="text-center">Mastery</span>
            <span className="text-right">Points</span>
            <span className="text-right">Region</span>
          </div>
          {/* Rows */}
          {loading ? (
            <div className="p-4 space-y-2">{Array(10).fill(0).map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>
          ) : masteries.length === 0 ? (
            <div className="py-12 text-center text-ink-ghost">
              <p className="text-sm text-ink-dim">No mastery data</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {masteries.slice(0, 50).map(m => {
                const lvl = m.championLevel ?? 0;
                const pts = m.championPoints ?? 0;
                return (
                  <div key={m.championId} className="grid grid-cols-[40px_1fr_80px_80px_100px] px-4 py-2 items-center hover:bg-white/[0.02] transition-colors">
                    <img src={getChampionIconUrl(m.championId)} alt="" className="w-7 h-7 rounded object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                    <span className="text-sm text-ink-bright font-medium truncate">#{m.championId}</span>
                    <div className="flex items-center justify-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        lvl >= 7 ? 'bg-gold/15 text-gold' : 'bg-white/[0.05] text-ink-ghost'
                      }`}>M{lvl}</span>
                    </div>
                    <span className="text-xs text-ink-dim tabular-nums text-right">{pts.toLocaleString()}</span>
                    <span className="text-[10px] text-ink-ghost text-right">—</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
