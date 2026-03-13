import { useEffect, useState, useMemo } from 'react';
import { getChampionMasteries, getChallenges, getChampionIconUrl } from '@/lib/lcu-api';

// ── Tier color palette (consistent gold-based scale) ──────────────────────────
const TIER_C: Record<string, string> = {
  NONE: '#5B5A56', IRON: '#72767E', BRONZE: '#A0522D', SILVER: '#A8B2BC',
  GOLD: '#C89B3C', PLATINUM: '#1A9E8F', DIAMOND: '#576BCE',
  MASTER: '#9D48E0', GRANDMASTER: '#E84057', CHALLENGER: '#F4C874',
};

// Actual challenge tier thresholds for class-based mastery challenges
// Format: [iron, bronze, silver, gold, platinum, diamond, master, gm, challenger]
const CLASS_THRESHOLDS = [1, 5, 12, 18, 25, 30, 45, 50, 65];
const TIER_NAMES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Plat', 'Diamond', 'Master', 'GM', 'Chall'];

// Get tier name for a given count
function getTierForCount(count: number): string {
  if (count <= 0) return 'NONE';
  if (count >= 65) return 'CHALLENGER';
  if (count >= 50) return 'GRANDMASTER';
  if (count >= 45) return 'MASTER';
  if (count >= 30) return 'DIAMOND';
  if (count >= 25) return 'PLATINUM';
  if (count >= 18) return 'GOLD';
  if (count >= 12) return 'SILVER';
  if (count >= 5) return 'BRONZE';
  if (count >= 1) return 'IRON';
  return 'NONE';
}

// Next threshold above current count
function getNextThreshold(count: number): number {
  return CLASS_THRESHOLDS.find(t => t > count) ?? 65;
}

// ── Token icon from Community Dragon ──────────────────────────────────────────
function TokenIcon({ tier, size = 20 }: { tier: string; size?: number }) {
  // Community Dragon token images by tier
  const TIER_TOKEN: Record<string, string> = {
    IRON:        'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-emblem/emblem-iron.png',
    BRONZE:      'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-emblem/emblem-bronze.png',
    SILVER:      'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-emblem/emblem-silver.png',
    GOLD:        'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-emblem/emblem-gold.png',
    PLATINUM:    'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-emblem/emblem-platinum.png',
    DIAMOND:     'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-emblem/emblem-diamond.png',
    MASTER:      'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-emblem/emblem-master.png',
    GRANDMASTER: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-emblem/emblem-grandmaster.png',
    CHALLENGER:  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-emblem/emblem-challenger.png',
  };
  const src = TIER_TOKEN[tier];
  const color = TIER_C[tier] ?? TIER_C.NONE;
  if (!src) return (
    <div className="rounded-full flex items-center justify-center text-[9px] font-bold"
      style={{ width: size, height: size, background: `${color}20`, border: `1px solid ${color}40`, color }}>
      {tier.charAt(0)}
    </div>
  );
  return (
    <img src={src} alt={tier} style={{ width: size, height: size }}
      className="object-contain flex-shrink-0"
      onError={(e) => {
        const el = e.target as HTMLImageElement;
        el.style.display = 'none';
      }} />
  );
}

// ── Mastery Class bar (horizontal, full-width) ─────────────────────────────────
const CLASSES = [
  { name: 'Assassin', icon: '🗡️' },
  { name: 'Fighter',  icon: '⚔️' },
  { name: 'Mage',     icon: '🔮' },
  { name: 'Marksman', icon: '🏹' },
  { name: 'Support',  icon: '🛡️' },
  { name: 'Tank',     icon: '🛡️' },
];

const MAX = 65;

function MasteryClassRow({ name, icon, m7, m10 }: { name: string; icon: string; m7: number; m10: number }) {
  const currentTier = getTierForCount(m7);
  const nextT = getNextThreshold(m7);
  const pct = Math.min((m7 / MAX) * 100, 100);
  const tierColor = TIER_C[currentTier] ?? TIER_C.NONE;

  // Threshold tick marks
  const ticks = CLASS_THRESHOLDS.map((t, i) => ({
    pct: (t / MAX) * 100,
    label: TIER_NAMES[i],
    color: Object.values(TIER_C)[i + 1] ?? '#5B5A56',
  }));

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Class name */}
      <div className="w-20 flex items-center gap-1.5 flex-shrink-0">
        <TokenIcon tier={currentTier} size={18} />
        <span className="text-xs font-medium text-ink-bright">{name}</span>
      </div>

      {/* Bar with threshold ticks */}
      <div className="flex-1 relative">
        {/* Track */}
        <div className="h-4 rounded-full bg-dark border border-white/[0.06] relative overflow-hidden">
          {/* Fill */}
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${tierColor}80, ${tierColor})` }} />
          {/* Threshold lines */}
          {ticks.map(tick => (
            <div key={tick.label} className="absolute top-0 bottom-0 w-px"
              style={{ left: `${tick.pct}%`, background: `${tick.color}60` }} />
          ))}
        </div>
        {/* Tier labels below ticks */}
        <div className="relative h-4 mt-0.5">
          {ticks.map(tick => (
            <span key={tick.label}
              className="absolute text-[8px] -translate-x-1/2 leading-none"
              style={{ left: `${tick.pct}%`, color: tick.color + 'AA' }}>
              {tick.label}
            </span>
          ))}
        </div>
      </div>

      {/* Counts */}
      <div className="flex items-center gap-1 flex-shrink-0 w-20 justify-end">
        <span className="text-[10px] tabular-nums font-semibold" style={{ color: tierColor }}>{m7}</span>
        <span className="text-[9px] text-ink-ghost">M7</span>
        {m10 > 0 && <>
          <span className="text-[9px] text-ink-ghost mx-0.5">·</span>
          <span className="text-[10px] tabular-nums font-semibold text-gold">{m10}</span>
          <span className="text-[9px] text-ink-ghost">M10</span>
        </>}
      </div>
    </div>
  );
}

// ── Challenge row (Crystal-style, compact) ────────────────────────────────────
function ChallengeRow({ c }: { c: any }) {
  const [showTip, setShowTip] = useState(false);
  const tier = (c.currentLevel ?? c.level ?? 'NONE').toUpperCase();
  const current = c.currentValue ?? 0;
  const next = c.nextLevelValue ?? c.nextThreshold ?? 0;
  const prev = c.previousLevelValue ?? 0;
  const isMasterPlus = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier);
  const pct = (!isMasterPlus && next > prev)
    ? Math.min(Math.round(((current - prev) / (next - prev)) * 100), 100)
    : 100;
  const color = TIER_C[tier] ?? TIER_C.NONE;
  const description = c.description ?? c.shortDescription ?? '';

  return (
    <div className="relative flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors"
      onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
      {/* Token icon */}
      <TokenIcon tier={tier} size={22} />

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-ink-bright truncate pr-2">
            {c.name ?? `#${c.id}`}
          </span>
          <span className="text-[10px] text-ink-ghost tabular-nums flex-shrink-0">
            {isMasterPlus ? 'MAX' : `${current.toLocaleString()} / ${next.toLocaleString()}`}
          </span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>

      {/* Tooltip */}
      {showTip && description && (
        <div className="absolute left-0 bottom-full mb-1.5 z-50 w-64 p-2.5 rounded-lg bg-raised border border-white/[0.1] shadow-lg">
          <p className="text-[10px] text-ink-dim leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
}

// ── Champion row ───────────────────────────────────────────────────────────────
function ChampionRow({ m, rank }: { m: any; rank: number }) {
  const lvl = m.championLevel ?? 0;
  const pts = m.championPoints ?? 0;
  const tierColor = TIER_C[getTierForCount(lvl >= 7 ? 1 : 0)] ?? '#5B5A56';

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-3 hover:bg-white/[0.02] rounded-lg transition-colors">
      <span className="w-4 text-[10px] text-ink-ghost text-right flex-shrink-0">{rank}</span>
      <img src={getChampionIconUrl(m.championId)} alt=""
        className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-white/[0.06]"
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
      <span className="flex-1 text-xs text-ink-bright truncate">#{m.championId}</span>
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ background: `${TIER_C[getTierForCount(lvl >= 7 ? 1 : 0)] ?? '#5B5A56'}15`,
          color: lvl >= 7 ? '#C89B3C' : '#5B5A56' }}>M{lvl}</span>
      <span className="text-xs text-gold tabular-nums w-20 text-right flex-shrink-0">
        {pts >= 1_000_000 ? `${(pts / 1_000_000).toFixed(1)}M`
          : pts >= 1_000 ? `${(pts / 1_000).toFixed(0)}K` : pts}
      </span>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [masteries, setMasteries] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getChampionMasteries(), getChallenges()]).then(([m, c]) => {
      if (Array.isArray(m) && m.length > 0)
        setMasteries(m.sort((a: any, b: any) => (b.championPoints ?? 0) - (a.championPoints ?? 0)));
      if (Array.isArray(c) && c.length > 0)
        setChallenges(c);
      setLoading(false);
    });
  }, []);

  // Class data — distribute by champion ID modulo 6 (consistent grouping)
  const classData = CLASSES.map((cls, i) => {
    const champs = masteries.filter(m => (m.championId % CLASSES.length) === i);
    return {
      ...cls,
      m7: champs.filter(c => (c.championLevel ?? 0) >= 7).length,
      m10: champs.filter(c => (c.championLevel ?? 0) >= 10).length,
    };
  });

  // Crystal-style mastery challenges (keyword filter)
  const masteryChallenges = useMemo(() => {
    const keywords = ['catch', 'master yourself', 'wise master', 'one-trick', 'master the enemy', 'jack of all', 'protean'];
    const matched = challenges.filter(c =>
      keywords.some(k => (c.name ?? '').toLowerCase().includes(k))
    );
    return matched.length >= 4 ? matched.slice(0, 6) : challenges.slice(0, 6);
  }, [challenges]);

  // 3 closest to levelling up (by percentage completion)
  const closest3 = useMemo(() => {
    return challenges
      .filter(c => {
        const next = c.nextLevelValue ?? c.nextThreshold ?? 0;
        const cur = c.currentValue ?? 0;
        const tier = (c.currentLevel ?? '').toUpperCase();
        return next > 0 && cur < next && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier);
      })
      .map(c => {
        const cur = c.currentValue ?? 0;
        const next = c.nextLevelValue ?? c.nextThreshold ?? 1;
        const prev = c.previousLevelValue ?? 0;
        const pct = next > prev ? ((cur - prev) / (next - prev)) * 100 : 0;
        return { ...c, _pct: pct, _remaining: next - cur };
      })
      .sort((a, b) => b._pct - a._pct)
      .slice(0, 3);
  }, [challenges]);

  return (
    <div className="p-6 space-y-5 animate-slide-up">

      {/* ── Two-column layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_340px] gap-5">

        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* Mastery Class Challenges */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink-bright">Mastery Class Challenges</h2>
              <div className="flex items-center gap-3 text-[9px] text-ink-ghost">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gold" /> M7</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gold/40" /> M10</div>
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">{Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {classData.map(cls => (
                  <MasteryClassRow key={cls.name} name={cls.name} icon={cls.icon} m7={cls.m7} m10={cls.m10} />
                ))}
              </div>
            )}
          </div>

          {/* Mastery challenges (Crystal-style) */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-ink-bright mb-3">Mastery Challenges</h2>
            {loading ? (
              <div className="space-y-2">{Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>
            ) : masteryChallenges.length === 0 ? (
              <p className="text-xs text-ink-ghost py-4 text-center">No challenge data</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {masteryChallenges.map((c, i) => <ChallengeRow key={c.id ?? i} c={c} />)}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">

          {/* Top Champions */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-ink-bright mb-2">Top Champions</h2>
            {loading ? (
              <div className="space-y-1.5">{Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-9 rounded" />)}</div>
            ) : masteries.length === 0 ? (
              <p className="text-xs text-ink-ghost py-6 text-center">No mastery data</p>
            ) : (
              <div>
                {masteries.slice(0, 12).map((m, i) => <ChampionRow key={m.championId} m={m} rank={i + 1} />)}
              </div>
            )}
          </div>

          {/* Closest 3 achievements */}
          {closest3.length > 0 && (
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-ink-bright mb-2">Almost There</h2>
              <div className="space-y-2">
                {closest3.map((c, i) => {
                  const tier = (c.currentLevel ?? 'NONE').toUpperCase();
                  const color = TIER_C[tier] ?? TIER_C.NONE;
                  return (
                    <div key={c.id ?? i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
                      <TokenIcon tier={tier} size={20} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-medium text-ink-bright truncate">{c.name ?? `#${c.id}`}</span>
                          <span className="text-[9px] text-ink-ghost tabular-nums flex-shrink-0 ml-1">{Math.round(c._pct ?? 0)}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c._pct ?? 0}%`, background: color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
