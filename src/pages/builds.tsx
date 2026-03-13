import { useEffect, useState, useMemo } from 'react';
import { Search, ChevronDown, Wrench, Zap, Shield } from 'lucide-react';
import { getAllChampions, getChampionBuilds, getChampionIconUrl, getItemIconUrl } from '@/lib/lcu-api';

const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;
const BUILD_TABS = ['Items', 'Runes', 'Abilities'] as const;
type BuildTab = typeof BUILD_TABS[number];

export default function Builds() {
  const [allChamps, setAllChamps] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedChamp, setSelectedChamp] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('MID');
  const [buildTab, setBuildTab] = useState<BuildTab>('Items');
  const [buildData, setBuildData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Fetch champion list
  useEffect(() => {
    getAllChampions().then((data) => {
      let list: any[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === 'object') {
        list = Object.values(data);
      }
      // Sort and set
      list = list
        .filter((c: any) => c && (c.name || c.alias || c.id))
        .sort((a: any, b: any) => (a.name ?? a.alias ?? '').localeCompare(b.name ?? b.alias ?? ''));
      setAllChamps(list);
    });
  }, []);

  // Fetch builds when champion changes
  useEffect(() => {
    if (!selectedChamp) return;
    setLoading(true);
    setBuildData(null);
    getChampionBuilds(selectedChamp.id).then((data) => {
      setBuildData(data);
      setLoading(false);
    });
  }, [selectedChamp]);

  const filteredChamps = useMemo(() => {
    if (!search) return allChamps.slice(0, 60);
    return allChamps.filter((c: any) => {
      const name = (c.name ?? c.alias ?? '').toLowerCase();
      return name.includes(search.toLowerCase());
    }).slice(0, 60);
  }, [allChamps, search]);

  // Extract items from build data
  const items = useMemo(() => {
    if (!buildData) return { starting: [], core: [], situational: [] };
    const builds = Array.isArray(buildData) ? buildData : (typeof buildData === 'object' ? Object.values(buildData) : []) as any[];
    if (builds.length === 0) return { starting: [], core: [], situational: [] };

    const roleBuild = builds.find((b: any) =>
      (b.title ?? '').toLowerCase().includes(selectedRole.toLowerCase())
    ) ?? builds[0];

    if (!roleBuild?.blocks) return { starting: [], core: [], situational: [] };
    const blocks = roleBuild.blocks as any[];
    return {
      starting: blocks[0]?.items?.map((i: any) => i.id ?? i.itemId) ?? [],
      core: blocks[1]?.items?.map((i: any) => i.id ?? i.itemId) ?? [],
      situational: blocks.slice(2).flatMap((b: any) => b.items?.map((i: any) => i.id ?? i.itemId) ?? []),
    };
  }, [buildData, selectedRole]);

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Champion selector + Role tabs */}
      <div className="flex gap-3 items-center flex-wrap">
        {/* Champion picker */}
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="btn-surface flex items-center gap-2 text-sm min-w-44"
          >
            {selectedChamp ? (
              <>
                <img src={getChampionIconUrl(selectedChamp.id)} alt="" className="w-5 h-5 rounded-full" />
                <span className="text-ink-bright">{selectedChamp.name ?? selectedChamp.alias}</span>
              </>
            ) : (
              <span className="text-ink-muted">Select Champion</span>
            )}
            <ChevronDown size={14} className="ml-auto text-ink-ghost" />
          </button>

          {showPicker && (
            <div className="absolute top-full mt-1 left-0 w-72 card p-3 z-50 animate-scale-in max-h-80 overflow-hidden flex flex-col">
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-ghost" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-search text-xs py-1.5"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-5 gap-1.5 overflow-y-auto max-h-56 no-scrollbar">
                {filteredChamps.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedChamp(c); setShowPicker(false); setSearch(''); }}
                    className="flex flex-col items-center gap-1 p-1.5 rounded hover:bg-white/[0.06] transition-colors"
                  >
                    <img
                      src={getChampionIconUrl(c.id)}
                      alt={c.name ?? c.alias}
                      className="w-9 h-9 rounded-lg border border-white/[0.06] object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                    <span className="text-[9px] text-ink-ghost truncate w-full text-center">{c.name ?? c.alias}</span>
                  </button>
                ))}
                {filteredChamps.length === 0 && (
                  <p className="col-span-5 text-center text-xs text-ink-ghost py-4">No champions found</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role tabs */}
        <div className="flex gap-1">
          {ROLES.map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-2 rounded text-xs font-medium transition-all duration-150 ${
                selectedRole === role
                  ? 'bg-gold text-void'
                  : 'bg-raised text-ink-muted border border-white/[0.06] hover:text-ink'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {allChamps.length > 0 && (
          <span className="text-xs text-ink-ghost ml-auto">{allChamps.length} champions</span>
        )}
      </div>

      {/* Empty state */}
      {!selectedChamp && (
        <div className="flex flex-col items-center justify-center py-24 text-ink-ghost">
          <Wrench size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium text-ink-dim">Select a champion</p>
          <p className="text-xs mt-1">Choose a champion to see recommended builds</p>
        </div>
      )}

      {/* Build content */}
      {selectedChamp && (
        <>
          {/* Champion header */}
          <div className="card p-4 flex items-center gap-4">
            <img
              src={getChampionIconUrl(selectedChamp.id)}
              alt={selectedChamp.name}
              className="w-12 h-12 rounded-lg border border-gold/30 object-cover"
            />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink-bright">{selectedChamp.name ?? selectedChamp.alias}</h2>
              <p className="text-xs text-ink-muted">{selectedRole} · Recommended Build</p>
            </div>
          </div>

          {/* Build tabs */}
          <div className="tab-bar">
            {BUILD_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setBuildTab(tab)}
                className={`tab flex items-center gap-1.5 ${buildTab === tab ? 'active' : ''}`}
              >
                {tab === 'Items' && <Wrench size={12} />}
                {tab === 'Runes' && <Shield size={12} />}
                {tab === 'Abilities' && <Zap size={12} />}
                {tab}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="card p-4 space-y-3">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="flex gap-2">
                    {Array(4).fill(0).map((_, j) => <div key={j} className="skeleton w-12 h-12 rounded" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {buildTab === 'Items' && (
                <div className="space-y-3">
                  {items.starting.length > 0 && (
                    <div className="card p-4">
                      <h3 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3">Starting Items</h3>
                      <div className="flex gap-2 flex-wrap">
                        {items.starting.map((id: number, i: number) => (
                          <div key={i} className="w-12 h-12 rounded border border-white/[0.08] bg-dark overflow-hidden">
                            <img src={getItemIconUrl(id)} alt="" className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {items.core.length > 0 && (
                    <div className="card p-4">
                      <h3 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3">Core Build</h3>
                      <div className="flex gap-2 flex-wrap">
                        {items.core.map((id: number, i: number) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-14 h-14 rounded-lg border-2 border-gold/20 bg-dark overflow-hidden">
                              <img src={getItemIconUrl(id)} alt="" className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                            <span className="text-[10px] text-ink-ghost">Slot {i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {items.situational.length > 0 && (
                    <div className="card p-4">
                      <h3 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3">Situational</h3>
                      <div className="flex flex-wrap gap-2">
                        {items.situational.map((id: number, i: number) => (
                          <div key={i} className="w-10 h-10 rounded border border-white/[0.06] bg-dark overflow-hidden">
                            <img src={getItemIconUrl(id)} alt="" className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {items.starting.length === 0 && items.core.length === 0 && (
                    <div className="card p-6 text-center text-ink-ghost">
                      <p className="text-sm text-ink-dim">No build data for this combination</p>
                      <p className="text-xs mt-1">Try a different role</p>
                    </div>
                  )}
                </div>
              )}

              {buildTab === 'Runes' && (
                <div className="card p-6 text-center text-ink-ghost">
                  <Shield size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-ink-dim">Rune data from LCU builds</p>
                  <p className="text-xs mt-1">Available when a champion has recommended rune pages</p>
                </div>
              )}

              {buildTab === 'Abilities' && (
                <div className="card p-6 text-center text-ink-ghost">
                  <Zap size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-ink-dim">Ability order data</p>
                  <p className="text-xs mt-1">Available when a champion has recommended ability order</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
