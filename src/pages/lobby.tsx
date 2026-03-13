import { useEffect, useState } from 'react';
import { Users, Search, Crown, Shield } from 'lucide-react';
import { getLobbyMembers, getChampionIconUrl, getProfileIconUrl } from '@/lib/lcu-api';
import type { LobbyMember } from '@/lib/types';

const MOCK: LobbyMember[] = [
  { summonerId: '1', summonerName: 'ArcaneWolf',   profileIconId: 29, summonerLevel: 142, isLeader: true,  challenges: { title: 'Void Walker', tier: 'GOLD', totalPoints: 14_500, rankPoints: 3_200, pointsToNextRank: 800 } },
  { summonerId: '2', summonerName: 'NightOwl',     profileIconId: 29, summonerLevel: 87,  isLeader: false, challenges: { title: 'Rift Herald', tier: 'SILVER', totalPoints: 7_800, rankPoints: 1_900, pointsToNextRank: 2_100 } },
  { summonerId: '3', summonerName: 'DragonLancer', profileIconId: 29, summonerLevel: 210, isLeader: false, challenges: { title: 'Challenger', tier: 'PLATINUM', totalPoints: 28_000, rankPoints: 5_600, pointsToNextRank: 400 } },
  { summonerId: '4', summonerName: 'IronGuard',    profileIconId: 29, summonerLevel: 55,  isLeader: false, challenges: { title: 'Beginner', tier: 'IRON', totalPoints: 2_100, rankPoints: 400, pointsToNextRank: 600 } },
];

const TIER_COLOR: Record<string, string> = {
  IRON: '#9AA4AF', BRONZE: '#CD7F32', SILVER: '#C0C8D4', GOLD: '#C89B3C',
  PLATINUM: '#4E9996', DIAMOND: '#576BCE', MASTER: '#9D48E0', CHALLENGER: '#F0B232',
};

function MemberCard({ member, isYou }: { member: LobbyMember; isYou?: boolean }) {
  const tierColor = TIER_COLOR[member.challenges?.tier ?? 'IRON'] ?? '#9AA4AF';
  const pts = member.challenges;

  return (
    <div className={`card p-4 flex items-start gap-4 ${isYou ? 'card-gold' : ''}`}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={getProfileIconUrl(member.profileIconId)}
          alt={member.summonerName}
          className="w-12 h-12 rounded-lg object-cover border border-white/[0.08]"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.4'; }}
        />
        {member.isLeader && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
            <Crown size={10} className="text-void" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-ink-bright truncate">{member.summonerName}</p>
          {isYou && <span className="badge-gold text-[9px]">You</span>}
          {member.isLeader && <span className="badge-muted text-[9px]">Leader</span>}
        </div>

        <p className="text-xs text-ink-muted mt-0.5">Level {member.summonerLevel}</p>

        {pts && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium" style={{ color: tierColor }}>{pts.tier}</span>
              <span className="text-ink-ghost tabular-nums">
                {pts.rankPoints.toLocaleString()} / {(pts.rankPoints + pts.pointsToNextRank).toLocaleString()}
              </span>
            </div>
            <div className="progress-track h-1">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(pts.rankPoints / (pts.rankPoints + pts.pointsToNextRank)) * 100}%`,
                  background: `linear-gradient(90deg, ${tierColor}55, ${tierColor})`,
                }}
              />
            </div>
            <p className="text-[10px] text-ink-ghost">
              {pts.title} · {pts.totalPoints.toLocaleString()} total pts
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Lobby() {
  const [members, setMembers] = useState<LobbyMember[]>(MOCK);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLobbyMembers().then((data) => {
      if (Array.isArray(data) && data.length > 0) setMembers(data);
      setLoading(false);
    });
  }, []);

  const filtered = members.filter((m) =>
    m.summonerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {!loading && members.length > 0 ? (
              <span className="status-dot online" />
            ) : (
              <span className="status-dot offline" />
            )}
            <span className="text-sm text-ink-dim">
              {members.length} player{members.length !== 1 ? 's' : ''} in lobby
            </span>
          </div>
        </div>

        <div className="relative w-56">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost" />
          <input
            type="text"
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-search text-sm"
          />
        </div>
      </div>

      {/* Empty state */}
      {!loading && members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-ink-ghost">
          <Users size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium text-ink-dim">No lobby detected</p>
          <p className="text-xs mt-1">Join or create a lobby in the League client</p>
        </div>
      )}

      {/* Members grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading
          ? Array(4).fill(null).map((_, i) => (
              <div key={i} className="card p-4 flex gap-4">
                <div className="skeleton w-12 h-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                  <div className="skeleton h-1.5 w-full rounded-full mt-3" />
                </div>
              </div>
            ))
          : filtered.map((m, i) => (
              <MemberCard key={m.summonerId} member={m} isYou={i === 0} />
            ))
        }
      </div>
    </div>
  );
}
