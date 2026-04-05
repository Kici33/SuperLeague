import { useEffect, useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { getChampionMasteries, getChampionIconUrl, getChallenges } from '@/lib/lcu-api';

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

const M_COLOR: Record<number, string> = {
  1: '#5B5A56', 2: '#5B5A56', 3: '#5B5A56', 4: '#5B5A56',
  5: '#E84057', 6: '#9D48E0', 7: '#C89B3C', 8: '#C89B3C',
  9: '#C89B3C', 10: '#F4C874',
};

/* Globetrotter regions */
const GLOBETROTTER_REGIONS = [
  'Bandle City','Bilgewater','Demacia','Freljord','Ionia','Ixtal',
  'Noxus','Piltover','Shadow Isles','Shurima','Targon','Void','Zaun',
];

/* Harmony challenge names */
const HARMONY_CHALLENGES = [
  'Nowhere to Hide','It Has "Ultimate" In the Name!','We Protec',
  "They Just... Don't... DIE!","Where'd They Go?","We're Good Over Here",
  'Summoners on the Rift',"Variety's Overrated",'Get Over Here',
  "It's a Trap!",'I\'m Helping','Hold That Pose',
];

const TIER_C: Record<string, string> = {
  IRON: '#6B6B6B', BRONZE: '#CD7F32', SILVER: '#C0C8D4', GOLD: '#C89B3C',
  PLATINUM: '#4E9996', EMERALD: '#10D48A', DIAMOND: '#576BCE', MASTER: '#9D48E0',
  GRANDMASTER: '#E84057', CHALLENGER: '#F4C874',
};

interface ChallengeToken {
  id: number;
  name: string;
  currentLevel: string;
}

export default function Teams() {
  const [masteries, setMasteries] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedHarmony, setSelectedHarmony] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadChampionNames();
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

  // Build challenge to champion map
  const challengeToChampions = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    
    for (const challenge of challenges) {
      const name = challenge.name ?? challenge.description ?? '';
      const completedIds = challenge.completedIds ?? [];
      if (Array.isArray(completedIds) && completedIds.length > 0) {
        map[name] = new Set(completedIds);
      }
    }
    
    return map;
  }, [challenges]);

  // Find challenge tokens
  const challengeTokens = useMemo(() => {
    const tokens: Record<string, ChallengeToken> = {};
    
    for (const challenge of challenges) {
      const name = challenge.name ?? challenge.description ?? '';
      if (HARMONY_CHALLENGES.includes(name) || GLOBETROTTER_REGIONS.includes(name)) {
        tokens[name] = {
          id: challenge.id ?? 0,
          name,
          currentLevel: challenge.currentLevel ?? challenge.level ?? 'NONE',
        };
      }
    }
    
    return tokens;
  }, [challenges]);

  // Filter champions based on selected filters
  const filteredChampions = useMemo(() => {
    if (!selectedRegion && selectedHarmony.size === 0) {
      // No filters = all champions lit
      return new Set(masteries.map(m => m.championId));
    }

    let result: Set<number> | null = null;

    // If region selected, start with that
    if (selectedRegion) {
      const regionChamps = challengeToChampions[selectedRegion];
      if (regionChamps) {
        result = new Set(regionChamps);
      } else {
        result = new Set();
      }
    }

    // Intersect with harmony challenges
    if (selectedHarmony.size > 0) {
      for (const harmonyName of selectedHarmony) {
        const harmonyChamps = challengeToChampions[harmonyName];
        if (harmonyChamps) {
          if (result === null) {
            result = new Set(harmonyChamps);
          } else {
            // Intersection
            result = new Set([...result].filter(id => harmonyChamps.has(id)));
          }
        }
      }
    }

    return result ?? new Set();
  }, [selectedRegion, selectedHarmony, challengeToChampions, masteries]);

  const toggleHarmony = (name: string) => {
    const next = new Set(selectedHarmony);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedHarmony(next);
  };

  const selectRegion = (name: string) => {
    if (selectedRegion === name) {
      setSelectedRegion(null); // Deselect if clicking same region
    } else {
      setSelectedRegion(name); // Switch to new region
    }
  };

  const handleCopy = () => {
    const names = masteries
      .filter(m => filteredChampions.has(m.championId))
      .map(m => getChampionName(m.championId))
      .join(', ');
    
    navigator.clipboard.writeText(names);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 animate-slide-up flex gap-5 h-[calc(100vh-80px)]">
      {/* Left: Champion grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <h2 className="text-sm font-semibold text-ink-bright mb-3">
          Region Team Builder ({filteredChampions.size} champions)
        </h2>

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
              {masteries.map((m: any) => {
                const lvl = m.championLevel ?? 0;
                const isLit = filteredChampions.has(m.championId);
                const color = M_COLOR[Math.min(lvl, 10)] ?? '#5B5A56';
                
                return (
                  <div key={m.championId} className="relative group">
                    <img
                      src={getChampionIconUrl(m.championId)}
                      alt=""
                      className={`w-10 h-10 rounded object-cover border transition-all ${
                        isLit 
                          ? 'border-gold/40 brightness-100' 
                          : 'border-white/[0.06] brightness-[0.3] grayscale'
                      }`}
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                    {lvl > 0 && (
                      <span 
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded text-[7px] font-bold flex items-center justify-center"
                        style={{
                          background: isLit ? color : '#1C2438',
                          color: isLit ? (lvl >= 5 ? '#0D1221' : '#fff') : '#5B5A56',
                          border: `1px solid ${isLit ? color : '#2A3548'}40`
                        }}
                      >
                        {lvl}
                      </span>
                    )}
                    {/* Tooltip */}
                    <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 px-2 py-1 rounded bg-raised border border-white/[0.1] shadow-xl whitespace-nowrap pointer-events-none">
                      <span className="text-[10px] text-ink-bright">{getChampionName(m.championId)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Copy button */}
        <div className="mt-3">
          <button onClick={handleCopy} className="btn-ghost w-full text-sm justify-center">
            {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Champion Names'}
          </button>
        </div>
      </div>

      {/* Right: Filters */}
      <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto no-scrollbar">
        {/* Globetrotter (single selection) */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-ink-bright mb-3">Globetrotter (Region)</h3>
          <p className="text-[10px] text-ink-ghost mb-3">Select one region</p>
          <div className="grid grid-cols-2 gap-1.5">
            {GLOBETROTTER_REGIONS.map((name) => {
              const token = challengeTokens[name];
              const tier = token?.currentLevel ?? 'NONE';
              const color = TIER_C[tier] ?? '#5B5A56';
              const isSelected = selectedRegion === name;
              
              return (
                <button
                  key={name}
                  onClick={() => selectRegion(name)}
                  className={`px-2 py-1.5 rounded text-[10px] font-medium border transition-all ${
                    isSelected 
                      ? 'bg-gold/10 border-gold/30 text-gold' 
                      : 'bg-white/[0.02] border-white/[0.06] text-ink-muted hover:bg-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: isSelected ? color : '#5B5A56' }}
                    />
                    <span className="truncate">{name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Harmony (multiple selection) */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-ink-bright mb-3">Harmony Challenges</h3>
          <p className="text-[10px] text-ink-ghost mb-3">Select multiple challenges</p>
          <div className="space-y-1.5">
            {HARMONY_CHALLENGES.map((name) => {
              const token = challengeTokens[name];
              const tier = token?.currentLevel ?? 'NONE';
              const color = TIER_C[tier] ?? '#5B5A56';
              const isSelected = selectedHarmony.has(name);
              
              return (
                <button
                  key={name}
                  onClick={() => toggleHarmony(name)}
                  className={`w-full px-2 py-1.5 rounded text-[10px] font-medium border transition-all text-left ${
                    isSelected 
                      ? 'bg-gold/10 border-gold/30 text-gold' 
                      : 'bg-white/[0.02] border-white/[0.06] text-ink-muted hover:bg-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: isSelected ? color : '#5B5A56' }}
                    />
                    <span className="truncate flex-1">{name}</span>
                    {isSelected && <Check size={10} className="flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
