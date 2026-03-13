import { useEffect, useState } from 'react';
import { Users, Crown, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { getLobbyMembers, getProfileIconUrl, getRankedStats, lcuRequest } from '@/lib/lcu-api';

const TIER_C: Record<string, string> = {
  IRON: '#6B6B6B', BRONZE: '#CD7F32', SILVER: '#C0C8D4', GOLD: '#C89B3C',
  PLATINUM: '#4E9996', EMERALD: '#10D48A', DIAMOND: '#576BCE', MASTER: '#9D48E0',
  GRANDMASTER: '#E84057', CHALLENGER: '#F4C874',
};

const TIER_ORDER: Record<string, number> = {
  IRON: 1, BRONZE: 2, SILVER: 3, GOLD: 4, PLATINUM: 5, EMERALD: 6,
  DIAMOND: 7, MASTER: 8, GRANDMASTER: 9, CHALLENGER: 10,
};

function tierLabel(tier: string, div: string, lp: number) {
  const t = tier.charAt(0) + tier.slice(1).toLowerCase();
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) return `${t} ${lp} LP`;
  return `${t} ${div}`;
}

function RankPill({ tier, div, lp, queue }: { tier: string; div: string; lp: number; queue: string }) {
  const c = TIER_C[tier] ?? '#5B5A56';
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium"
      style={{ background: `${c}12`, border: `1px solid ${c}25`, color: c }}>
      <span className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-bold"
        style={{ background: `${c}30` }}>{tier.charAt(0)}</span>
      <span>{tierLabel(tier, div, lp)}</span>
      <span className="text-ink-ghost">({queue})</span>
    </div>
  );
}

interface LobbyPlayer {
  summonerId?: number;
  summonerName?: string;
  profileIconId?: number;
  isLeader?: boolean;
  summonerLevel?: number;
  // Extended data (fetched separately)
  soloRank?: { tier: string; division: string; lp: number; wins: number; losses: number };
  flexRank?: { tier: string; division: string; lp: number; wins: number; losses: number };
}

export default function Lobby() {
  const [members, setMembers] = useState<LobbyPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getLobbyMembers().then(async (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        setLoading(false);
        return;
      }

      // Enrich members with ranked data
      const enriched: LobbyPlayer[] = [];
      for (const m of data) {
        const player: LobbyPlayer = {
          summonerId: m.summonerId,
          summonerName: m.summonerName,
          profileIconId: m.profileIconId,
          isLeader: m.isLeader,
          summonerLevel: m.summonerLevel,
        };

        // Try to fetch ranked for each member
        try {
          const res = await lcuRequest({
            method: 'GET',
            endpoint: `/lol-ranked/v1/ranked-stats/${m.puuid ?? ''}`,
          });
          if (res.status === 200 && res.body) {
            const ranked = JSON.parse(res.body);
            const queues = ranked?.queues ?? [];
            if (Array.isArray(queues)) {
              const sq = queues.find((q: any) => q.queueType === 'RANKED_SOLO_5x5');
              const fq = queues.find((q: any) => q.queueType === 'RANKED_FLEX_SR');
              if (sq?.tier && sq.tier !== 'NONE') {
                player.soloRank = { tier: sq.tier, division: sq.division ?? '', lp: sq.leaguePoints ?? 0, wins: sq.wins ?? 0, losses: sq.losses ?? 0 };
              }
              if (fq?.tier && fq.tier !== 'NONE') {
                player.flexRank = { tier: fq.tier, division: fq.division ?? '', lp: fq.leaguePoints ?? 0, wins: fq.wins ?? 0, losses: fq.losses ?? 0 };
              }
            }
          }
        } catch { /* ignore */ }

        enriched.push(player);
      }

      setMembers(enriched);
      setLoading(false);
    });
  }, []);

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 1500);
  };

  // Average solo tier
  const avgTier = (() => {
    const tiers = members
      .filter(m => m.soloRank)
      .map(m => TIER_ORDER[m.soloRank!.tier] ?? 0);
    if (tiers.length === 0) return null;
    const avg = Math.round(tiers.reduce((a, b) => a + b, 0) / tiers.length);
    const tierName = Object.entries(TIER_ORDER).find(([_, v]) => v === avg)?.[0] ?? 'UNRANKED';
    return tierName;
  })();

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Header with avg tier */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`status-dot ${members.length > 0 ? 'online' : 'offline'}`} />
          <span className="text-sm text-ink-dim">
            {loading ? 'Loading…' : `${members.length} player${members.length !== 1 ? 's' : ''} in lobby`}
          </span>
        </div>
        {avgTier && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
            style={{ background: `${TIER_C[avgTier] ?? '#5B5A56'}12`, border: `1px solid ${TIER_C[avgTier] ?? '#5B5A56'}25` }}>
            <span className="text-ink-ghost">Avg:</span>
            <span className="font-semibold" style={{ color: TIER_C[avgTier] }}>
              {avgTier.charAt(0) + avgTier.slice(1).toLowerCase()}
            </span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!loading && members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-ink-ghost">
          <Users size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium text-ink-dim">No lobby detected</p>
          <p className="text-xs mt-1">Join or create a lobby in the League client</p>
        </div>
      )}

      {/* Vertical player list (5 max width) */}
      <div className="space-y-2 max-w-2xl">
        {loading
          ? Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)
          : members.map((m, i) => {
              const tierColor = TIER_C[m.soloRank?.tier ?? ''] ?? '#5B5A56';
              const isExpanded = expanded === i;

              return (
                <div key={m.summonerId ?? i} className="card overflow-hidden"
                  style={{ borderColor: `${tierColor}30` }}>
                  {/* Main row */}
                  <div className="flex items-center gap-3 p-3.5" style={{ borderLeft: `3px solid ${tierColor}` }}>
                    {/* Icon */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={getProfileIconUrl(m.profileIconId ?? 29)}
                        alt="" className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                      />
                      {m.isLeader && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold rounded-full flex items-center justify-center">
                          <Crown size={8} className="text-void" />
                        </div>
                      )}
                    </div>

                    {/* Name + Level */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate" style={{ color: tierColor }}>
                          {m.summonerName ?? 'Unknown'}
                        </span>
                        <button onClick={() => copyName(m.summonerName ?? '')}
                          className="text-ink-ghost hover:text-gold transition-colors flex-shrink-0">
                          {copiedName === m.summonerName ? <Check size={10} className="text-emerald" /> : <Copy size={10} />}
                        </button>
                        {m.isLeader && <span className="text-[9px] text-gold bg-gold/10 px-1 py-0.5 rounded">Leader</span>}
                      </div>
                      <p className="text-[10px] text-ink-ghost">Level {m.summonerLevel ?? '?'}</p>
                    </div>

                    {/* Ranks */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {m.soloRank && <RankPill tier={m.soloRank.tier} div={m.soloRank.division} lp={m.soloRank.lp} queue="SQ" />}
                      {m.flexRank && <RankPill tier={m.flexRank.tier} div={m.flexRank.division} lp={m.flexRank.lp} queue="FQ" />}
                      {!m.soloRank && !m.flexRank && <span className="text-[10px] text-ink-ghost">Unranked</span>}
                    </div>

                    {/* Expand toggle */}
                    <button onClick={() => setExpanded(isExpanded ? null : i)}
                      className="text-ink-ghost hover:text-ink transition-colors flex-shrink-0">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Expanded: challenge progress */}
                  {isExpanded && (
                    <div className="px-4 py-3 border-t border-white/[0.04] bg-white/[0.01] animate-fade-in">
                      <p className="text-[10px] text-ink-ghost uppercase tracking-wider font-semibold mb-2">Challenge Progress</p>
                      <p className="text-xs text-ink-dim">Globetrotter & Harmony challenge data available when viewing a player's profile.</p>
                    </div>
                  )}
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
