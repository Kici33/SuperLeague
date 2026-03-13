import { useState } from 'react';
import {
  LayoutDashboard, Users, Trophy, Swords, Flame, Star,
  Palette, Wrench, Globe, UserPen, Bug, Settings, UserCircle,
  RefreshCw, WifiOff, Copy, Check,
} from 'lucide-react';
import { useLcu } from './hooks/useLcu';
import { pages } from './pages_config';

type PageKey = keyof typeof pages;

const NAV_ITEMS: { key: PageKey; icon: React.ElementType; label: string; group: string }[] = [
  { key: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',   group: 'Overview' },
  { key: 'lobby',      icon: Users,           label: 'Lobby',        group: 'Overview' },
  { key: 'challenges', icon: Trophy,           label: 'Challenges',   group: 'Progress' },
  { key: 'mastery',    icon: Flame,            label: 'Mastery',      group: 'Progress' },
  { key: 'champion',   icon: Swords,           label: 'Champion',     group: 'Progress' },
  { key: 'eternals',   icon: Star,             label: 'Eternals',     group: 'Progress' },
  { key: 'skins',      icon: Palette,          label: 'Skins',        group: 'Collection' },
  { key: 'builds',     icon: Wrench,           label: 'Builds',       group: 'Collection' },
  { key: 'teams',      icon: Globe,            label: 'Teams',        group: 'Social' },
  { key: 'profile',    icon: UserPen,          label: 'Profile',      group: 'Social' },
  { key: 'accounts',   icon: UserCircle,       label: 'Accounts',     group: 'Social' },
  { key: 'debug',      icon: Bug,              label: 'Debug',        group: 'Tools' },
  { key: 'settings',   icon: Settings,         label: 'Settings',     group: 'Tools' },
];

const GROUPS = ['Overview', 'Progress', 'Collection', 'Social', 'Tools'];

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const { connected, summoner, loading, refresh } = useLcu();
  const [copied, setCopied] = useState(false);

  const ActivePage = pages[activePage]?.component;

  const handleCopyName = () => {
    if (!summoner?.displayName) return;
    const text = summoner.gameName
      ? `${summoner.gameName}#${summoner.tagLine ?? ''}`
      : summoner.displayName;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-abyss">
      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col h-full border-r border-white/[0.05] bg-dark/60">

        {/* Logo */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-void font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #C89B3C, #E8C96A)' }}
            >
              SL
            </div>
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
                    <button
                      key={key}
                      onClick={() => setActivePage(key)}
                      className={`nav-link w-full text-left ${activePage === key ? 'active' : ''}`}
                    >
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
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${connected ? 'bg-emerald/8' : 'bg-white/[0.03]'}`}>
            <div className="flex items-center gap-2">
              <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
              <span className={`text-xs font-medium ${connected ? 'text-emerald' : 'text-ink-ghost'}`}>
                {loading ? 'Connecting…' : connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button onClick={refresh} className="text-ink-ghost hover:text-ink transition-colors" title="Refresh">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Summoner card with icon + name + copy */}
          {connected && summoner && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/[0.03] group">
              <img
                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${summoner.profileIconId ?? 29}.jpg`}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-gold/20 flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink-bright truncate">
                  {summoner.gameName ?? summoner.displayName}
                </p>
                <p className="text-[10px] text-ink-ghost truncate">
                  {summoner.tagLine ? `#${summoner.tagLine}` : `Lvl ${summoner.summonerLevel}`}
                </p>
              </div>
              <button
                onClick={handleCopyName}
                className="text-ink-ghost hover:text-gold transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                title="Copy name"
              >
                {copied ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.05] bg-dark/40 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-ink-bright">{pages[activePage]?.title}</h1>
            <p className="text-xs text-ink-muted">{pages[activePage]?.description}</p>
          </div>
          {!connected && !loading && (
            <div className="flex items-center gap-2 text-xs text-ruby bg-ruby/10 border border-ruby/20 px-3 py-1.5 rounded-lg">
              <WifiOff size={12} />
              League client not detected
            </div>
          )}
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          <div key={activePage} className="h-full overflow-y-auto animate-fade-in">
            {ActivePage ? <ActivePage /> : <div className="p-6 text-ink-ghost">Page not found</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
