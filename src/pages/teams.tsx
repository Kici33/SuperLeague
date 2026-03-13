import { useEffect, useState, useMemo } from 'react';
import { Copy, Check, Filter } from 'lucide-react';
import { getChampionMasteries, getChampionIconUrl, getChallenges } from '@/lib/lcu-api';

/* 
  Crystal-style Team Builder:
  - Left: Grid of champion icons with mastery level badge
  - Right: Harmony + Globetrotter challenge filters (checkboxes with progress)  
  - Bottom: Selected champion names for copy
*/

/* Globetrotter regions */
const GLOBETROTTER_REGIONS = [
  'Bandle City','Bilgewater','Demacia','Freljord','Ionia','Ixtal',
  'Noxus','Piltover','Shadow Isles','Shurima','Targon','Void','Zaun',
];

/* Harmony challenge names (common ones) */
const HARMONY_CHALLENGES = [
  'Nowhere to Hide','It Has "Ultimate" In the Name!','We Protec',
  "They Just... Don't... DIE!","Where'd They Go?","We're Good Over Here",
  'Summoners on the Rift',"Variety's Overrated",'Get Over Here',
  "It's a Trap!",'I\'m Helping','Hold That Pose',
];

export default function Teams() {
  const [masteries, setMasteries] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'Mastery' | 'Level' | 'Name'>('Mastery');
  const [selectedHarmony, setSelectedHarmony] = useState<Set<string>>(new Set());
  const [selectedGlobetrotter, setSelectedGlobetrotter] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      getChampionMasteries(),
      getChallenges(),
    ]).then(([m, c]) => {
      if (Array.isArray(m)) {
        setMasteries(m.sort((a: any, b: any) => (b.championPoints ?? 0) - (a.championPoints ?? 0)));
      }
      if (Array.isArray(c)) setChallenges(c);
      setLoading(false);
    });
  }, []);

  // Build challenge progress map
  const challengeProgress = useMemo(() => {
    const map: Record<string, { current: number; max: number }> = {};
    for (const c of challenges) {
      const name = c.name ?? c.description ?? '';
      const current = c.currentValue ?? 0;
      const next = c.nextLevelValue ?? c.nextThreshold ?? 8;
      map[name] = { current, max: next };
    }
    return map;
  }, [challenges]);

  // Sort champions
  const sortedChamps = useMemo(() => {
    const copy = [...masteries];
    if (sortBy === 'Level') copy.sort((a, b) => (b.championLevel ?? 0) - (a.championLevel ?? 0));
    if (sortBy === 'Mastery') copy.sort((a, b) => (b.championPoints ?? 0) - (a.championPoints ?? 0));
    return copy;
  }, [masteries, sortBy]);

  // Get selected champion names
  const selectedNames = useMemo(() => {
    return sortedChamps
      .filter(_ => true) // In production, filter by selected challenges/regions
      .map(m => m.championName ?? `#${m.championId}`)
      .slice(0, 50); // Show first 50
  }, [sortedChamps]);

  const toggleSet = (set: Set<string>, item: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item); else next.add(item);
    setter(next);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedNames.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 animate-slide-up flex gap-5 h-[calc(100vh-80px)]">
      {/* Left: Champion grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink-bright">Team Builder</h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="select text-xs w-28"
          >
            <option value="Mastery">Mastery</option>
            <option value="Level">Level</option>
            <option value="Name">Name</option>
          </select>
        </div>

        {/* Champion icon grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="grid grid-cols-10 gap-1.5">
              {Array(40).fill(0).map((_, i) => (
                <div key={i} className="skeleton w-10 h-10 rounded" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-10 gap-1.5">
              {sortedChamps.map((m: any) => {
                const lvl = m.championLevel ?? 0;
                return (
                  <div key={m.championId} className="relative group">
                    <img
                      src={getChampionIconUrl(m.championId)}
                      alt=""
                      className={`w-10 h-10 rounded object-cover border transition-all ${lvl >= 7 ? 'border-gold/40 brightness-100' : 'border-white/[0.06] brightness-50'}`}
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                    {lvl > 0 && (
                      <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center ${
                        lvl >= 10 ? 'bg-gold text-void' : lvl >= 7 ? 'bg-gold/80 text-void' : 'bg-dark text-ink-ghost border border-white/[0.1]'
                      }`}>
                        {lvl}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected champions + Copy */}
        <div className="mt-3 space-y-2">
          <div className="card p-3 text-xs text-ink-dim max-h-20 overflow-y-auto no-scrollbar">
            {selectedNames.length > 0 ? selectedNames.join(', ') : 'No champions match filters'}
          </div>
          <button onClick={handleCopy} className="btn-ghost w-full text-sm justify-center">
            {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>

      {/* Right: Filters */}
      <div className="w-[320px] flex-shrink-0 card p-4 overflow-y-auto no-scrollbar">
        <h3 className="text-sm font-semibold text-ink-bright flex items-center gap-2 mb-4">
          <Filter size={13} /> Filters
        </h3>

        {/* Harmony */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-2">Harmony</h4>
          <div className="space-y-1.5">
            {HARMONY_CHALLENGES.map((name) => {
              const prog = challengeProgress[name];
              return (
                <label key={name} className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedHarmony.has(name) ? 'bg-gold border-gold' : 'border-white/[0.15] group-hover:border-gold/40'
                  }`}>
                    {selectedHarmony.has(name) && <Check size={8} className="text-void" />}
                  </div>
                  <input type="checkbox" className="sr-only"
                    checked={selectedHarmony.has(name)}
                    onChange={() => toggleSet(selectedHarmony, name, setSelectedHarmony)} />
                  <span className="text-xs text-ink-dim flex-1 truncate group-hover:text-ink transition-colors">{name}</span>
                  <span className="text-[10px] text-ink-ghost tabular-nums flex-shrink-0">
                    ({prog ? `${prog.current}/${prog.max}` : '—'})
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Globetrotter */}
        <div>
          <h4 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-2">Globetrotter</h4>
          <div className="space-y-1.5">
            {GLOBETROTTER_REGIONS.map((name) => {
              const prog = challengeProgress[name];
              return (
                <label key={name} className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedGlobetrotter.has(name) ? 'bg-gold border-gold' : 'border-white/[0.15] group-hover:border-gold/40'
                  }`}>
                    {selectedGlobetrotter.has(name) && <Check size={8} className="text-void" />}
                  </div>
                  <input type="checkbox" className="sr-only"
                    checked={selectedGlobetrotter.has(name)}
                    onChange={() => toggleSet(selectedGlobetrotter, name, setSelectedGlobetrotter)} />
                  <span className="text-xs text-ink-dim flex-1 truncate group-hover:text-ink transition-colors">{name}</span>
                  <span className="text-[10px] text-ink-ghost tabular-nums flex-shrink-0">
                    ({prog ? `${prog.current}/${prog.max}` : '—'})
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
