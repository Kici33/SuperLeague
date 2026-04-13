import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Trophy, Swords, Flame, Star,
  Palette, Wrench, Globe, UserPen, Bug, Settings, UserCircle,
  RefreshCw, WifiOff, Copy, Check, Shuffle,
} from 'lucide-react';
import { useLcu } from './hooks/useLcu';
import { pages } from './pages_config';
import { getRankedStats } from './lib/lcu-api';

type PageKey = keyof typeof pages;

const NAV_ITEMS: { key: PageKey; icon: React.ElementType; label: string; group: string }[] = [
  { key: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',   group: 'Overview' },
  { key: 'lobby',      icon: Users,           label: 'Lobby',        group: 'Overview' },
  { key: 'challenges', icon: Trophy,           label: 'Challenges',   group: 'Progress' },
  { key: 'mastery',    icon: Flame,            label: 'Mastery',      group: 'Progress' },
  { key: 'champion',   icon: Swords,           label: 'Champion',     group: 'Progress' },
  { key: 'eternals',   icon: Star,             label: 'Eternals',     group: 'Progress' },
  { key: 'randomizer', icon: Shuffle,          label: 'Randomizer',   group: 'Fun Tools' },
  { key: 'teams',      icon: Globe,            label: 'Regions',      group: 'Community' },
  { key: 'profile',    icon: UserPen,          label: 'Profile',      group: 'Community' },
  { key: 'accounts',   icon: UserCircle,       label: 'Accounts',     group: 'Community' },
  { key: 'debug',      icon: Bug,              label: 'Debug',        group: 'Tools' },
  { key: 'settings',   icon: Settings,         label: 'Settings',     group: 'Tools' },
];

const GROUPS = ['Overview', 'Progress', 'Community', 'Fun Tools', 'Tools'];

const TIER_C: Record<string, string> = {
  IRON: '#6B6B6B', BRONZE: '#CD7F32', SILVER: '#C0C8D4', GOLD: '#C89B3C',
  PLATINUM: '#4E9996', EMERALD: '#10D48A', DIAMOND: '#576BCE', MASTER: '#9D48E0',
  GRANDMASTER: '#E84057', CHALLENGER: '#F4C874',
};

const TIER_ALIASES: Record<string, keyof typeof TIER_C> = {
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

function normalizeTier(tier: unknown): keyof typeof TIER_C {
  const raw = String(tier ?? 'IRON').trim().toUpperCase();
  return TIER_ALIASES[raw] ?? (raw as keyof typeof TIER_C);
}

function RankCrest({ tier }: { tier: string }) {
  const normalized = normalizeTier(tier);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="text-[10px] font-bold">{normalized.charAt(0)}</span>;
  }

  return (
    <img
      src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/${normalized.toLowerCase()}.png`}
      alt={normalized}
      className="w-7 h-7 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

function tierLabel(tier: string, div: string, lp: number) {
  const t = tier.charAt(0) + tier.slice(1).toLowerCase();
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) return `${t} ${lp} LP`;
  return `${t} ${div}`;
}

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const { connected, summoner, loading, refresh } = useLcu();
  const [copied, setCopied] = useState(false);
  const [soloRank, setSoloRank] = useState<any>(null);
  const [flexRank, setFlexRank] = useState<any>(null);

  // Fetch ranked for sidebar
  useEffect(() => {
    if (!connected) return;
    getRankedStats().then((r) => {
      const queues = r?.queues ?? [];
      if (Array.isArray(queues)) {
        const sq = queues.find((q: any) => q.queueType === 'RANKED_SOLO_5x5');
        const fq = queues.find((q: any) => q.queueType === 'RANKED_FLEX_SR');
        if (sq?.tier && sq.tier !== 'NONE') setSoloRank(sq);
        else setSoloRank(null);
        if (fq?.tier && fq.tier !== 'NONE') setFlexRank(fq);
        else setFlexRank(null);
      }
    });
  }, [connected]);

  const handleCopyName = () => {
    if (!summoner?.displayName) return;
    const text = summoner.gameName
      ? `${summoner.gameName}#${summoner.tagLine ?? ''}`
      : summoner.displayName;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const ActivePage = pages[activePage]?.component;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-abyss">
      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col h-full border-r border-white/[0.05] bg-dark/60">
        {/* Logo */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-void font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #C89B3C, #E8C96A)' }}>SL</div>
            <div>
              <p className="text-sm font-bold text-ink-bright leading-tight">SuperLeague</p>
              <p className="text-[10px] text-ink-ghost leading-tight">Companion</p>
            </div>
          </div>
        </div>

        <div className="divider mx-4" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-2 py-3 space-y-5">
          {GROUPS.map((group) => {
            const items = NAV_ITEMS.filter(i => i.group === group);
            return (
              <div key={group}>
                <p className="section-heading px-3 mb-1.5">{group}</p>
                <div className="space-y-0.5">
                  {items.map(({ key, icon: Icon, label }) => (
                    <button key={key} onClick={() => setActivePage(key)}
                      className={`nav-link w-full text-left ${activePage === key ? 'active' : ''}`}>
                      <Icon size={15} className="flex-shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── Bottom: Connection + Summoner ── */}
        <div className="divider mx-4" />
        <div className="p-3 space-y-2">
          {/* Connection status */}
          <div className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${connected ? 'bg-emerald/8' : 'bg-white/[0.03]'}`}>
            <div className="flex items-center gap-2">
              <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
              <span className={`text-[10px] font-medium ${connected ? 'text-emerald' : 'text-ink-ghost'}`}>
                {loading ? 'Connecting…' : connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button onClick={refresh} className="text-ink-ghost hover:text-ink transition-colors" title="Refresh">
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Summoner card: icon + name#tag inline + level + rank */}
          {connected && summoner && (
            <div className="rounded-lg bg-white/[0.03] p-2.5 group cursor-pointer" onClick={handleCopyName}>
              <div className="flex items-center gap-2.5">
                <img
                  src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${summoner.profileIconId ?? 29}.jpg`}
                  alt="" className="w-9 h-9 rounded-full object-cover border border-gold/20 flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                />
                <div className="flex-1 min-w-0">
                  {/* Name#Tag inline */}
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs font-semibold text-ink-bright truncate">
                      {summoner.gameName ?? summoner.displayName}
                    </span>
                    {summoner.tagLine && (
                      <span className="text-[10px] text-ink-ghost">#{summoner.tagLine}</span>
                    )}
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {copied ? <Check size={10} className="text-emerald" /> : <Copy size={10} className="text-ink-ghost" />}
                    </span>
                  </div>
                  {/* Level */}
                  <p className="text-[10px] text-ink-ghost">Level {summoner.summonerLevel}</p>
                </div>
              </div>
              {/* Rank badges */}
              {(soloRank || flexRank) && (
                <div className="space-y-1.5 mt-2">
                  {soloRank && (() => {
                    const tier = normalizeTier(soloRank.tier);
                    const total = (soloRank.wins ?? 0) + (soloRank.losses ?? 0);
                    const wr = total > 0 ? Math.round(((soloRank.wins ?? 0) / total) * 100) : 0;
                    return (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded"
                        style={{ background: `${TIER_C[tier] ?? '#5B5A56'}10`, border: `1px solid ${TIER_C[tier] ?? '#5B5A56'}25` }}>
                        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: `${TIER_C[tier]}25`, color: TIER_C[tier] }}>
                          <RankCrest tier={tier} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-wider text-ink-ghost">Solo/Duo</p>
                          <p className="text-[10px] font-medium truncate" style={{ color: TIER_C[tier] }}>
                            {tierLabel(tier, soloRank.division ?? '', soloRank.leaguePoints ?? 0)} · {wr}% WR
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {flexRank && (() => {
                    const tier = normalizeTier(flexRank.tier);
                    const total = (flexRank.wins ?? 0) + (flexRank.losses ?? 0);
                    const wr = total > 0 ? Math.round(((flexRank.wins ?? 0) / total) * 100) : 0;
                    return (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded"
                        style={{ background: `${TIER_C[tier] ?? '#5B5A56'}10`, border: `1px solid ${TIER_C[tier] ?? '#5B5A56'}25` }}>
                        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: `${TIER_C[tier]}25`, color: TIER_C[tier] }}>
                          <RankCrest tier={tier} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-wider text-ink-ghost">Flex</p>
                          <p className="text-[10px] font-medium truncate" style={{ color: TIER_C[tier] }}>
                            {tierLabel(tier, flexRank.division ?? '', flexRank.leaguePoints ?? 0)} · {wr}% WR
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.05] bg-dark/40 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-ink-bright">{pages[activePage]?.title}</h1>
            <p className="text-xs text-ink-muted">{pages[activePage]?.description}</p>
          </div>
          {!connected && !loading && (
            <div className="flex items-center gap-2 text-xs text-ruby bg-ruby/10 border border-ruby/20 px-3 py-1.5 rounded-lg">
              <WifiOff size={12} /> League client not detected
            </div>
          )}
        </header>
        <div className="flex-1 overflow-hidden">
          <div key={activePage} className="h-full overflow-y-auto animate-fade-in">
            {ActivePage ? <ActivePage /> : <div className="p-6 text-ink-ghost">Page not found</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
