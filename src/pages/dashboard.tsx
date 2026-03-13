import { useEffect, useState } from 'react';
import { Flame, Trophy, Star, Swords, TrendingUp, ArrowUpRight } from 'lucide-react';
import { getChampionMasteries, getChallengeSummary, getChampionIconUrl } from '@/lib/lcu-api';
import type { MasteryInfo } from '@/lib/types';

const MASTERY_CLASSES = [
  { name: 'Mage',      color: '#7B5CFA', icon: '✦' },
  { name: 'Tank',      color: '#4A9EFF', icon: '⬡' },
  { name: 'ADC',       color: '#FA5C5C', icon: '◎' },
  { name: 'Assassin',  color: '#C89B3C', icon: '◈' },
  { name: 'Support',   color: '#10D48A', icon: '❍' },
  { name: 'Fighter',   color: '#FF8C42', icon: '⬢' },
];

const MOCK_MASTERIES: MasteryInfo[] = [
  { championId: 1,  championName: 'Annie',       masteryLevel: 7, masteryPoints: 142_800, pointsToNextLevel: 0, tokensEarned: 2, isToken: true },
  { championId: 22, championName: 'Ashe',        masteryLevel: 7, masteryPoints: 98_400,  pointsToNextLevel: 0, tokensEarned: 1, isToken: true },
  { championId: 51, championName: 'Caitlyn',     masteryLevel: 6, masteryPoints: 74_200,  pointsToNextLevel: 25_800, tokensEarned: 0, isToken: false },
  { championId: 11, championName: 'Master Yi',   masteryLevel: 5, masteryPoints: 51_000,  pointsToNextLevel: 9_000,  tokensEarned: 0, isToken: false },
  { championId: 24, championName: 'Jax',         masteryLevel: 5, masteryPoints: 38_500,  pointsToNextLevel: 21_500, tokensEarned: 0, isToken: false },
];

const STAT_CARDS = [
  { label: 'Total Mastery', value: '1.2M', icon: Flame,   color: '#C89B3C', suffix: 'pts' },
  { label: 'Challenges',    value: '47',   icon: Trophy,   color: '#10D48A', suffix: 'done' },
  { label: 'Eternals',      value: '12',   icon: Star,     color: '#7B5CFA', suffix: 'sets' },
  { label: 'Champions',     value: '84',   icon: Swords,   color: '#0BC4E3', suffix: 'played' },
];

function MasteryBar({ name, color, icon, progress }: { name: string; color: string; icon: string; progress: number }) {
  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative w-10 flex-1 flex items-end rounded overflow-hidden bg-dark"
           style={{ minHeight: '100px', maxHeight: '160px' }}>
        {/* Fill */}
        <div
          className="w-full rounded transition-all duration-1000 ease-out"
          style={{
            height: `${progress}%`,
            background: `linear-gradient(180deg, ${color}88, ${color})`,
            boxShadow: `0 0 12px ${color}40`,
          }}
        />
        {/* Glow top */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: progress > 0 ? color : 'transparent', boxShadow: `0 0 6px 2px ${color}60` }}
        />
      </div>
      <span className="text-[10px] text-center text-ink-ghost leading-tight">{name}</span>
    </div>
  );
}

function ChampionRow({ mastery, rank }: { mastery: MasteryInfo; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5 group">
      {/* Rank */}
      <span className="w-5 text-xs text-ink-ghost text-right tabular-nums">{rank}</span>

      {/* Icon */}
      <div className="relative flex-shrink-0">
        <img
          src={getChampionIconUrl(mastery.championId)}
          alt={mastery.championName}
          className="w-9 h-9 rounded-lg object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.4'; }}
        />
        {mastery.masteryLevel >= 7 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold text-void rounded-full text-[8px] font-bold flex items-center justify-center">
            {mastery.masteryLevel}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-bright truncate">{mastery.championName}</p>
        <div className="progress-track mt-1" style={{ height: '2px' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min((mastery.masteryPoints / 200_000) * 100, 100)}%`,
              background: mastery.masteryLevel >= 7 ? 'linear-gradient(90deg, #785A28, #C89B3C)' : 'rgba(200,155,60,0.4)',
            }}
          />
        </div>
      </div>

      {/* Points */}
      <span className="text-xs text-ink-dim tabular-nums flex-shrink-0">
        {mastery.masteryPoints.toLocaleString()}
      </span>

      {/* Mastery badge */}
      <span className={`text-[10px] font-bold w-6 text-center flex-shrink-0 ${mastery.masteryLevel >= 7 ? 'text-gold' : 'text-ink-ghost'}`}>
        M{mastery.masteryLevel}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [masteries, setMasteries] = useState<MasteryInfo[]>(MOCK_MASTERIES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getChampionMasteries().then((data) => {
      if (Array.isArray(data) && data.length > 0) setMasteries(data.slice(0, 10));
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 space-y-5 animate-slide-up">

      {/* ── Stats row ── */}
      <div className="grid grid-cols-4 gap-3">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, suffix }) => (
          <div key={label} className="card p-4 flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}
            >
              <Icon size={17} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-ink-bright tabular-nums leading-none">{value}</p>
              <p className="text-xs text-ink-muted mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main 2-col grid ── */}
      <div className="grid grid-cols-[1fr_280px] gap-5">

        {/* Left: Mastery list */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-ink-bright">Top Champions</h2>
              <p className="text-xs text-ink-muted mt-0.5">by mastery points</p>
            </div>
            <button className="flex items-center gap-1 text-xs text-ink-ghost hover:text-gold transition-colors">
              View all <ArrowUpRight size={11} />
            </button>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {(loading ? Array(5).fill(null) : masteries).map((m, i) =>
              m ? (
                <ChampionRow key={m.championId} mastery={m} rank={i + 1} />
              ) : (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="skeleton w-4 h-4 rounded" />
                  <div className="skeleton w-9 h-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-28 rounded" />
                    <div className="skeleton h-1.5 w-full rounded-full" />
                  </div>
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
              )
            )}
          </div>
        </div>

        {/* Right: Mastery class bars + recent */}
        <div className="flex flex-col gap-4">
          {/* Class progress */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink-bright mb-1">Mastery Classes</h2>
            <p className="text-xs text-ink-muted mb-4">progress by role</p>
            <div className="flex items-end gap-2 h-40">
              {MASTERY_CLASSES.map((cls, i) => (
                <MasteryBar
                  key={cls.name}
                  {...cls}
                  progress={[88, 62, 74, 45, 91, 58][i]}
                />
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-ink-bright">Today</h2>
            <div className="space-y-2.5">
              {[
                { label: 'Mastery gained',   value: '+4,200',  color: '#C89B3C' },
                { label: 'Games played',      value: '7',       color: '#10D48A' },
                { label: 'Challenges done',   value: '3',       color: '#7B5CFA' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">{label}</span>
                  <span className="font-semibold tabular-nums" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="divider" />

            <div className="flex items-center gap-2 text-xs text-ink-ghost">
              <TrendingUp size={11} className="text-emerald" />
              <span>+12% from yesterday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
