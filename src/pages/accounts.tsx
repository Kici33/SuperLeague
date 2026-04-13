import { useEffect, useState } from 'react';
import { UserCircle, Crown, Plus, ChevronRight, Star } from 'lucide-react';
import { getRankedStats, getProfileIconUrl, getChampionMasteries, getChampionIconUrl } from '@/lib/lcu-api';
import { useLcu } from '@/hooks/useLcu';

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

const M_COLOR: Record<number, string> = {
  1: '#5B5A56', 2: '#5B5A56', 3: '#5B5A56', 4: '#5B5A56',
  5: '#E84057', 6: '#9D48E0', 7: '#C89B3C', 8: '#C89B3C',
  9: '#C89B3C', 10: '#F4C874',
};

const TIER_ICON: Record<string, { bg: string; border: string; text: string }> = {
  IRON:        { bg: '#6B6B6B15', border: '#6B6B6B40', text: '#9AA4AF' },
  BRONZE:      { bg: '#8C5A3C15', border: '#8C5A3C40', text: '#CD7F32' },
  SILVER:      { bg: '#9AA4AF10', border: '#9AA4AF30', text: '#C0C8D4' },
  GOLD:        { bg: '#C89B3C12', border: '#C89B3C30', text: '#C89B3C' },
  PLATINUM:    { bg: '#4E999612', border: '#4E999630', text: '#4E9996' },
  EMERALD:     { bg: '#10D48A12', border: '#10D48A30', text: '#10D48A' },
  DIAMOND:     { bg: '#576BCE12', border: '#576BCE30', text: '#576BCE' },
  MASTER:      { bg: '#9D48E012', border: '#9D48E030', text: '#9D48E0' },
  GRANDMASTER: { bg: '#E8405712', border: '#E8405730', text: '#E84057' },
  CHALLENGER:  { bg: '#F4C87412', border: '#F4C87430', text: '#F4C874' },
};

const TIER_ALIASES: Record<string, keyof typeof TIER_ICON> = {
  I: 'IRON',
  B: 'BRONZE',
  S: 'SILVER',
  G: 'GOLD',
  P: 'PLATINUM',
  E: 'EMERALD',
  D: 'DIAMOND',
  M: 'MASTER',
  GM: 'GRANDMASTER',
  C: 'CHALLENGER',
};

function normalizeTier(tier: unknown): keyof typeof TIER_ICON {
  const raw = String(tier ?? 'IRON').trim().toUpperCase();
  return TIER_ALIASES[raw] ?? (raw as keyof typeof TIER_ICON);
}

function RankedEmblem({ tier }: { tier: string }) {
  const normalized = normalizeTier(tier);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span>{normalized.charAt(0)}</span>;
  }

  return (
    <img
      src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/${normalized.toLowerCase()}.png`}
      alt={normalized}
      className="w-12 h-12 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

function RankBadge({ tier, division, lp, wins, losses, queue }: {
  tier: string; division: string; lp: number; wins: number; losses: number; queue: string;
}) {
  const normalizedTier = normalizeTier(tier);
  const style = TIER_ICON[normalizedTier] ?? { bg: '#5B5A5615', border: '#5B5A5640', text: '#5B5A56' };
  const total = wins + losses;
  const wr = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      <div className="w-16 h-16 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: `${style.text}20`, color: style.text }}>
        <RankedEmblem tier={normalizedTier} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-ink-ghost uppercase tracking-wider">{queue}</p>
        <p className="text-sm font-semibold" style={{ color: style.text }}>
          {normalizedTier.charAt(0) + normalizedTier.slice(1).toLowerCase()} {division}
        </p>
        <p className="text-xs text-ink-dim tabular-nums">{lp} LP · {wins}W {losses}L · {wr}% WR</p>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { summoner: currentSummoner } = useLcu();
  const [ranked, setRanked] = useState<any>(null);
  const [masteries, setMasteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChampionNames();
    Promise.all([
      getRankedStats(),
      getChampionMasteries(),
    ]).then(([r, m]) => {
      if (r && typeof r === 'object') setRanked(r);
      if (Array.isArray(m) && m.length > 0) {
        setMasteries(m.sort((a: any, b: any) => (b.championPoints ?? 0) - (a.championPoints ?? 0)));
      }
      setLoading(false);
    });
  }, []);

  const queues = ranked?.queues ?? [];
  const soloQ = Array.isArray(queues) ? queues.find((q: any) => q.queueType === 'RANKED_SOLO_5x5') : null;
  const flexQ = Array.isArray(queues) ? queues.find((q: any) => q.queueType === 'RANKED_FLEX_SR') : null;

  const totalMastery = masteries.reduce((sum, m) => sum + (m.championPoints ?? 0), 0);
  const top3 = masteries.slice(0, 3);

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Current Account Card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-bright flex items-center gap-2">
            <Crown size={14} className="text-gold" /> Active Account
          </h2>
        </div>

        {/* Profile Header */}
        <div className="flex items-start gap-4 mb-4">
          <img
            src={getProfileIconUrl(currentSummoner?.profileIconId ?? 29)}
            alt=""
            className="w-16 h-16 rounded-xl border-2 border-gold/30 object-cover flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-ink-bright">
              {(currentSummoner as any)?.gameName ?? currentSummoner?.displayName ?? 'Unknown'}
            </p>
            <p className="text-xs text-ink-muted">
              {(currentSummoner as any)?.tagLine ? `#${(currentSummoner as any).tagLine}` : ''}
              {currentSummoner?.summonerLevel ? ` · Level ${currentSummoner.summonerLevel}` : ''}
            </p>
            
            {/* Total Mastery */}
            <div className="flex items-center gap-2 mt-2">
              <div className="px-2 py-1 rounded bg-gold/10 border border-gold/20">
                <div className="flex items-center gap-1.5">
                  <Star size={10} className="text-gold" />
                  <span className="text-xs font-semibold text-gold tabular-nums">
                    {fmtNum(totalMastery)} pts
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-ink-ghost">Total Mastery</span>
            </div>
          </div>
        </div>

        {/* Top 3 Champions */}
        {!loading && top3.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-2">Top Champions</h3>
            <div className="flex gap-2">
              {top3.map((m, idx) => {
                const lvl = m.championLevel ?? 0;
                const color = M_COLOR[Math.min(lvl, 10)] ?? '#5B5A56';
                return (
                  <div key={m.championId} className="flex-1 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={getChampionIconUrl(m.championId)}
                        alt=""
                        className="w-8 h-8 rounded object-cover border border-white/[0.08]"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-ink-bright truncate">
                          {getChampionName(m.championId)}
                        </p>
                        <p className="text-[9px] text-ink-ghost">
                          {fmtNum(m.championPoints ?? 0)} pts
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" 
                        style={{ background: `${color}15`, color }}>
                        M{lvl}
                      </span>
                      <span className="text-[8px] text-ink-ghost">#{idx + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ranks */}
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-16 rounded-lg" />
            <div className="skeleton h-16 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-2">
            {soloQ && soloQ.tier && soloQ.tier !== 'NONE' && (
              <RankBadge queue="Solo/Duo" tier={soloQ.tier} division={soloQ.division ?? ''}
                lp={soloQ.leaguePoints ?? 0} wins={soloQ.wins ?? 0} losses={soloQ.losses ?? 0} />
            )}
            {flexQ && flexQ.tier && flexQ.tier !== 'NONE' && (
              <RankBadge queue="Flex" tier={flexQ.tier} division={flexQ.division ?? ''}
                lp={flexQ.leaguePoints ?? 0} wins={flexQ.wins ?? 0} losses={flexQ.losses ?? 0} />
            )}
            {!soloQ?.tier && !flexQ?.tier && (
              <p className="text-xs text-ink-ghost text-center py-4">No ranked data available</p>
            )}
          </div>
        )}
      </div>

      {/* Other Accounts (scrollable row) */}
      <div>
        <h2 className="text-sm font-semibold text-ink-bright mb-3">Other Accounts</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {/* Placeholder for future saved accounts */}
          <div className="card p-4 min-w-[240px] flex-shrink-0 flex items-center gap-3 opacity-50">
            <div className="w-10 h-10 rounded-lg bg-raised border border-white/[0.06] flex items-center justify-center flex-shrink-0">
              <Plus size={16} className="text-ink-ghost" />
            </div>
            <div>
              <p className="text-sm text-ink-dim">Add Account</p>
              <p className="text-[10px] text-ink-ghost">Save another account here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
