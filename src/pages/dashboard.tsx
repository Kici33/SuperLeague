import { useEffect, useState } from 'react';
import { Flame, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getChampionMasteries, getChallenges, getChampionIconUrl, getRankedStats } from '@/lib/lcu-api';

/* ── Vertical Mastery Bar ── */
function MasteryBar({ label, m7, m10, max7, max10, color }: {
  label: string; m7: number; m10: number; max7: number; max10: number; color: string;
}) {
  const h7 = max7 > 0 ? Math.round((m7 / max7) * 100) : 0;
  const h10 = max10 > 0 ? Math.round((m10 / max10) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-14 h-40 bg-dark rounded border border-white/[0.06] flex items-end overflow-hidden">
        {/* M10 bar (back) */}
        <div
          className="absolute bottom-0 left-1 right-1 rounded-t transition-all duration-700 opacity-40"
          style={{ height: `${h10}%`, background: color }}
        />
        {/* M7 bar (front, hextech blue) */}
        <div
          className="absolute bottom-0 left-2 right-2 rounded-t transition-all duration-700"
          style={{ height: `${h7}%`, background: '#0BC4E3' }}
        />
        {/* Labels on bar */}
        <div className="absolute top-1 left-0 right-0 text-center">
          <span className="text-[10px] font-bold text-ink-ghost tabular-nums">{m10}</span>
        </div>
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-[10px] font-bold text-hextech tabular-nums">{m7}</span>
        </div>
      </div>
      <span className="text-[10px] text-ink-muted font-medium">{label}</span>
    </div>
  );
}

/* ── Rank Badge ── */
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
    <div className="card p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>
        {tier.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-muted">{queue}</p>
        <p className="text-sm font-semibold text-ink-bright">
          {tier.charAt(0) + tier.slice(1).toLowerCase()} {division} · <span className="tabular-nums">{lp} LP</span>
        </p>
        <div className="flex items-center gap-2 mt-1 text-[10px]">
          <span className="text-emerald">{wins}W</span>
          <span className="text-ruby">{losses}L</span>
          <span className="text-ink-ghost">{wr}% WR</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        {wr >= 50 ? <TrendingUp size={14} className="text-emerald" /> : wr > 0 ? <TrendingDown size={14} className="text-ruby" /> : <Minus size={14} className="text-ink-ghost" />}
        <span className={`text-[10px] font-semibold tabular-nums ${wr >= 50 ? 'text-emerald' : 'text-ruby'}`}>
          {wr >= 50 ? '+' : ''}{wr - 50}%
        </span>
      </div>
    </div>
  );
}

/* ── Champion Row ── */
function ChampionRow({ data, rank }: { data: any; rank: number }) {
  const pts = data.championPoints ?? 0;
  const lvl = data.championLevel ?? 0;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-5 text-xs text-ink-ghost text-right tabular-nums">{rank}</span>
      <div className="relative flex-shrink-0">
        <img src={getChampionIconUrl(data.championId)} alt="" className="w-9 h-9 rounded-lg object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
        {lvl >= 7 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold text-void rounded-full text-[8px] font-bold flex items-center justify-center">{lvl}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-bright truncate">Champion #{data.championId}</p>
        <div className="progress-track mt-1" style={{ height: '2px' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min((pts / 200_000) * 100, 100)}%`, background: lvl >= 7 ? 'linear-gradient(90deg, #785A28, #C89B3C)' : 'rgba(200,155,60,0.4)' }} />
        </div>
      </div>
      <span className="text-xs text-ink-dim tabular-nums flex-shrink-0">{pts.toLocaleString()}</span>
      <span className={`text-[10px] font-bold w-6 text-center flex-shrink-0 ${lvl >= 7 ? 'text-gold' : 'text-ink-ghost'}`}>M{lvl}</span>
    </div>
  );
}

/* ── Champion class mapping (simplified) ── */
const CLASSES = [
  { name: 'Assassin',  color: '#C89B3C' },
  { name: 'Fighter',   color: '#FF8C42' },
  { name: 'Mage',      color: '#7B5CFA' },
  { name: 'Marksman',  color: '#FA5C5C' },
  { name: 'Support',   color: '#10D48A' },
  { name: 'Tank',      color: '#4A9EFF' },
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
    const lvl = c.currentLevel ?? c.currentTier ?? 'NONE';
    return lvl && lvl !== 'NONE';
  }).length;

  // Extract ranked queues
  const queues = ranked?.queues ?? [];
  const soloQ = queues.find?.((q: any) => q.queueType === 'RANKED_SOLO_5x5');
  const flexQ = queues.find?.((q: any) => q.queueType === 'RANKED_FLEX_SR');

  // Compute mastery class bars: count M7+ and M10+ per class
  // Since we don't have champion→class mapping from LCU, we distribute top champions evenly
  // In production, you'd map championId→class using game data
  const classData = CLASSES.map((cls, i) => {
    // Take every 6th champion starting at index i
    const champs = masteries.filter((_, j) => j % CLASSES.length === i);
    const m7 = champs.filter(c => (c.championLevel ?? 0) >= 7).length;
    const m10 = champs.filter(c => (c.championLevel ?? 0) >= 10).length;
    const target = Math.max(5, champs.length);
    return { ...cls, m7, m10, max7: target, max10: target };
  });

  const stats = [
    { label: 'Total Mastery', value: totalMastery > 1_000_000 ? `${(totalMastery / 1_000_000).toFixed(1)}M` : totalMastery > 1000 ? `${Math.round(totalMastery / 1000)}K` : String(totalMastery), icon: Flame, color: '#C89B3C' },
    { label: 'Challenges', value: String(challengesDone), icon: Trophy, color: '#10D48A' },
  ];

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Stats + Rank row */}
      <div className="flex gap-3 items-stretch flex-wrap">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-start gap-3 min-w-[160px]">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-ink-bright tabular-nums leading-none">{loading ? '…' : value}</p>
              <p className="text-xs text-ink-muted mt-0.5">{label}</p>
            </div>
          </div>
        ))}
        {soloQ && soloQ.tier && soloQ.tier !== 'NONE' && (
          <RankCard queue="Solo/Duo" tier={soloQ.tier} division={soloQ.division ?? ''} lp={soloQ.leaguePoints ?? 0} wins={soloQ.wins ?? 0} losses={soloQ.losses ?? 0} />
        )}
        {flexQ && flexQ.tier && flexQ.tier !== 'NONE' && (
          <RankCard queue="Flex" tier={flexQ.tier} division={flexQ.division ?? ''} lp={flexQ.leaguePoints ?? 0} wins={flexQ.wins ?? 0} losses={flexQ.losses ?? 0} />
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_auto] gap-5">
        {/* Left: Top Champions */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink-bright mb-1">Top Champions</h2>
          <p className="text-xs text-ink-muted mb-4">by mastery points</p>
          {loading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="skeleton w-4 h-4 rounded" />
                  <div className="skeleton w-9 h-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-28 rounded" /><div className="skeleton h-1.5 w-full rounded-full" /></div>
                </div>
              ))}
            </div>
          ) : masteries.length === 0 ? (
            <div className="py-12 text-center text-ink-ghost">
              <Flame size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm text-ink-dim">No mastery data yet</p>
              <p className="text-xs mt-1">Play some games to see your top champions</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {masteries.slice(0, 10).map((m, i) => (
                <ChampionRow key={m.championId ?? i} data={m} rank={i + 1} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Mastery Class Challenges (vertical bars) */}
        <div className="card p-5 w-[340px]">
          <h2 className="text-sm font-semibold text-ink-bright mb-1">Mastery Class Challenges</h2>
          <p className="text-xs text-ink-muted mb-4">M7 / M10 per class</p>
          <div className="flex items-end justify-between gap-2">
            {classData.map((cls) => (
              <MasteryBar
                key={cls.name}
                label={cls.name}
                m7={cls.m7}
                m10={cls.m10}
                max7={cls.max7}
                max10={cls.max10}
                color={cls.color}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-[10px] text-ink-ghost">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-hextech" />
              <span>Mastery 7</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm opacity-40" style={{ background: '#C89B3C' }} />
              <span>Mastery 10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
