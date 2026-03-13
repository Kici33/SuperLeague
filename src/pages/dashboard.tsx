import { useEffect, useState } from 'react';
import { Flame, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getChampionMasteries, getChallenges, getChampionIconUrl, getRankedStats } from '@/lib/lcu-api';

/* ── Vertical Mastery Bar ── */
function MasteryBar({ label, m7, m10, maxVal, color }: {
  label: string; m7: number; m10: number; maxVal: number; color: string;
}) {
  const h7 = maxVal > 0 ? Math.min(Math.round((m7 / maxVal) * 100), 100) : 0;
  const h10 = maxVal > 0 ? Math.min(Math.round((m10 / maxVal) * 100), 100) : 0;
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      {/* Numbers */}
      <div className="flex items-center gap-1.5 text-[10px] tabular-nums">
        <span style={{ color }}>{m10}</span>
        <span className="text-hextech">{m7}</span>
      </div>
      {/* Bar */}
      <div className="relative w-full h-32 bg-dark rounded border border-white/[0.06] flex items-end overflow-hidden">
        <div className="absolute bottom-0 inset-x-1 rounded-t transition-all duration-700 opacity-40"
          style={{ height: `${h10}%`, background: color }} />
        <div className="absolute bottom-0 inset-x-2 rounded-t transition-all duration-700"
          style={{ height: `${h7}%`, background: '#0BC4E3' }} />
      </div>
      {/* Label */}
      <span className="text-[10px] text-ink-muted font-medium truncate w-full text-center">{label}</span>
    </div>
  );
}

/* ── Rank card ── */
const TIER_COLORS: Record<string, string> = {
  IRON: '#6B6B6B', BRONZE: '#8C5A3C', SILVER: '#9AA4AF', GOLD: '#C89B3C',
  PLATINUM: '#4E9996', EMERALD: '#10D48A', DIAMOND: '#576BCE', MASTER: '#9D48E0',
  GRANDMASTER: '#E84057', CHALLENGER: '#F4C874',
};

function RankCard({ queue, tier, division, lp, wins, losses }: {
  queue: string; tier: string; division: string; lp: number; wins: number; losses: number;
}) {
  const color = TIER_COLORS[tier] ?? '#5B5A56';
  const total = wins + losses;
  const wr = total > 0 ? Math.round((wins / total) * 100) : 0;
  return (
    <div className="card p-4 flex items-center gap-4 flex-1 min-w-[200px]">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>
        {tier.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-ink-muted">{queue}</p>
        <p className="text-sm font-semibold text-ink-bright">
          {tier.charAt(0) + tier.slice(1).toLowerCase()} {division}
        </p>
        <p className="text-xs text-ink-dim tabular-nums">{lp} LP · {wins}W {losses}L · {wr}%</p>
      </div>
    </div>
  );
}

/* ── Champion Row ── */
function ChampionRow({ data, rank }: { data: any; rank: number }) {
  const pts = data.championPoints ?? 0;
  const lvl = data.championLevel ?? 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-5 text-xs text-ink-ghost text-right tabular-nums">{rank}</span>
      <img src={getChampionIconUrl(data.championId)} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-bright truncate">Champion #{data.championId}</p>
      </div>
      <span className="text-xs text-ink-dim tabular-nums flex-shrink-0">{pts.toLocaleString()}</span>
      <span className={`text-[10px] font-bold w-6 text-center ${lvl >= 7 ? 'text-gold' : 'text-ink-ghost'}`}>M{lvl}</span>
    </div>
  );
}

/* ── Classes ── */
const CLASSES = [
  { name: 'Assassin', color: '#C89B3C' },
  { name: 'Fighter',  color: '#FF8C42' },
  { name: 'Mage',     color: '#7B5CFA' },
  { name: 'Marksman', color: '#FA5C5C' },
  { name: 'Support',  color: '#10D48A' },
  { name: 'Tank',     color: '#4A9EFF' },
];

export default function Dashboard() {
  const [masteries, setMasteries] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [ranked, setRanked] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getChampionMasteries(),
      getChallenges(),
      getRankedStats(),
    ]).then(([m, c, r]) => {
      if (Array.isArray(m)) setMasteries(m);
      if (Array.isArray(c)) setChallenges(c);
      if (r && typeof r === 'object') setRanked(r);
      setLoading(false);
    });
  }, []);

  const totalMastery = masteries.reduce((s, m) => s + (m.championPoints ?? 0), 0);
  const challengesDone = challenges.filter((c: any) => {
    const lvl = c.currentLevel ?? c.level ?? '';
    return lvl && lvl !== 'NONE' && lvl !== '';
  }).length;

  const queues = ranked?.queues ?? [];
  const soloQ = Array.isArray(queues) ? queues.find((q: any) => q.queueType === 'RANKED_SOLO_5x5') : null;
  const flexQ = Array.isArray(queues) ? queues.find((q: any) => q.queueType === 'RANKED_FLEX_SR') : null;

  const classData = CLASSES.map((cls, i) => {
    const champs = masteries.filter((_, j) => j % CLASSES.length === i);
    const m7 = champs.filter(c => (c.championLevel ?? 0) >= 7).length;
    const m10 = champs.filter(c => (c.championLevel ?? 0) >= 10).length;
    return { ...cls, m7, m10, maxVal: Math.max(5, champs.length) };
  });

  const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        <div className="card p-4 flex items-center gap-3 min-w-[160px]">
          <Flame size={20} className="text-gold flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-ink-bright tabular-nums leading-none">{loading ? '…' : fmtNum(totalMastery)}</p>
            <p className="text-xs text-ink-muted mt-0.5">Total Mastery</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 min-w-[140px]">
          <Trophy size={20} className="text-emerald flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-ink-bright tabular-nums leading-none">{loading ? '…' : challengesDone}</p>
            <p className="text-xs text-ink-muted mt-0.5">Challenges</p>
          </div>
        </div>
        {soloQ && soloQ.tier && soloQ.tier !== 'NONE' && (
          <RankCard queue="Solo/Duo" tier={soloQ.tier} division={soloQ.division ?? ''} lp={soloQ.leaguePoints ?? 0} wins={soloQ.wins ?? 0} losses={soloQ.losses ?? 0} />
        )}
        {flexQ && flexQ.tier && flexQ.tier !== 'NONE' && (
          <RankCard queue="Flex" tier={flexQ.tier} division={flexQ.division ?? ''} lp={flexQ.leaguePoints ?? 0} wins={flexQ.wins ?? 0} losses={flexQ.losses ?? 0} />
        )}
      </div>

      {/* Main grid: Top Champions + Mastery Bars side by side */}
      <div className="grid grid-cols-[1fr_380px] gap-5">
        {/* Top Champions */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink-bright mb-3">Top Champions</h2>
          {loading ? (
            <div className="space-y-2">{Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>
          ) : masteries.length === 0 ? (
            <div className="py-12 text-center text-ink-ghost">
              <Flame size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm text-ink-dim">No mastery data</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {masteries.slice(0, 10).map((m, i) => <ChampionRow key={m.championId ?? i} data={m} rank={i + 1} />)}
            </div>
          )}
        </div>

        {/* Mastery Class Challenges — wider panel */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink-bright mb-1">Mastery Class Challenges</h2>
          <div className="flex items-center gap-4 mb-4 text-[10px] text-ink-ghost">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-hextech" /> Mastery 7
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-gold/40" /> Mastery 10
            </div>
          </div>
          <div className="flex gap-3">
            {classData.map((cls) => (
              <MasteryBar key={cls.name} label={cls.name} m7={cls.m7} m10={cls.m10} maxVal={cls.maxVal} color={cls.color} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
