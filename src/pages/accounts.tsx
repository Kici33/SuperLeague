import { useEffect, useState } from 'react';
import { UserCircle, Crown, Plus, ChevronRight } from 'lucide-react';
import { getRankedStats, getProfileIconUrl } from '@/lib/lcu-api';
import { useLcu } from '@/hooks/useLcu';

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

function RankBadge({ tier, division, lp, wins, losses, queue }: {
  tier: string; division: string; lp: number; wins: number; losses: number; queue: string;
}) {
  const style = TIER_ICON[tier] ?? { bg: '#5B5A5615', border: '#5B5A5640', text: '#5B5A56' };
  const total = wins + losses;
  const wr = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: `${style.text}20`, color: style.text }}>
        {tier.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-ink-ghost uppercase tracking-wider">{queue}</p>
        <p className="text-sm font-semibold" style={{ color: style.text }}>
          {tier.charAt(0) + tier.slice(1).toLowerCase()} {division}
        </p>
        <p className="text-xs text-ink-dim tabular-nums">{lp} LP · {wins}W {losses}L · {wr}% WR</p>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { summoner: currentSummoner } = useLcu();
  const [ranked, setRanked] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRankedStats().then((r) => {
      if (r && typeof r === 'object') setRanked(r);
      setLoading(false);
    });
  }, []);

  const queues = ranked?.queues ?? [];
  const soloQ = Array.isArray(queues) ? queues.find((q: any) => q.queueType === 'RANKED_SOLO_5x5') : null;
  const flexQ = Array.isArray(queues) ? queues.find((q: any) => q.queueType === 'RANKED_FLEX_SR') : null;

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Current Account Card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-bright flex items-center gap-2">
            <Crown size={14} className="text-gold" /> Active Account
          </h2>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <img
            src={getProfileIconUrl(currentSummoner?.profileIconId ?? 29)}
            alt=""
            className="w-14 h-14 rounded-lg border-2 border-gold/30 object-cover flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
          />
          <div className="min-w-0">
            <p className="text-base font-bold text-ink-bright">
              {(currentSummoner as any)?.gameName ?? currentSummoner?.displayName ?? 'Unknown'}
            </p>
            <p className="text-xs text-ink-muted">
              {(currentSummoner as any)?.tagLine ? `#${(currentSummoner as any).tagLine}` : ''}
              {currentSummoner?.summonerLevel ? ` · Level ${currentSummoner.summonerLevel}` : ''}
            </p>
          </div>
        </div>

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

      {/* Saved Accounts (scrollable row) */}
      <div>
        <h2 className="text-sm font-semibold text-ink-bright mb-3">Saved Accounts</h2>
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
