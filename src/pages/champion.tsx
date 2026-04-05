import { useEffect, useState, useMemo } from 'react';
import { Search, Swords, Star, Award, Trophy } from 'lucide-react';
import { getChampionMasteries, getChampionIconUrl, getChallenges, getEternals } from '@/lib/lcu-api';

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

// Eternal/Statstone definitions from Community Dragon
interface EternalDef {
  name: string;
  milestones: number[]; // thresholds for each milestone level
  series: string;
  isRetired: boolean;
}
let championEternals: Record<number, EternalDef[]> = {};
async function loadEternalDefinitions(): Promise<void> {
  if (Object.keys(championEternals).length > 0) return;
  try {
    const res = await fetch('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/statstones.json');
    const data = await res.json();

    // Structure: { statstoneData: [ { name: "Series 1", statstones: [...] }, ... ] }
    const statstoneData = data?.statstoneData ?? [];

    statstoneData.forEach((seriesData: any) => {
      const seriesName = seriesData.name ?? 'Unknown';
      const statstones = seriesData.statstones ?? [];

      statstones.forEach((stone: any) => {
        const champId = stone.boundChampion?.itemId;
        if (!champId || champId === -1) return;

        if (!championEternals[champId]) {
          championEternals[champId] = [];
        }

        // Normalize series name
        let series = 'Starter Series';
        if (seriesName.includes('1')) series = 'Series 1';
        else if (seriesName.includes('2')) series = 'Series 2';

        championEternals[champId].push({
          name: stone.name ?? 'Unknown',
          milestones: stone.milestones ?? [],
          series,
          isRetired: stone.isRetired ?? false,
        });
      });
    });

    console.log('[Eternals] Loaded definitions for', Object.keys(championEternals).length, 'champions');
  } catch (e) {
    console.error('Failed to load eternal definitions:', e);
  }
}

function getChampionName(championId: number): string {
  return championNames[championId] ?? `Champion #${championId}`;
}

const M_COLOR: Record<number, string> = {
  1: '#5B5A56', 2: '#5B5A56', 3: '#5B5A56', 4: '#5B5A56',
  5: '#E84057', 6: '#9D48E0', 7: '#C89B3C', 8: '#C89B3C',
  9: '#C89B3C', 10: '#F4C874',
};

// Challenge names mapping
const CHALLENGE_NAMES = {
  ARAM_S_GRADE: 'All Random All Champions',
  COOP_WIN: 'Protean Override',
  WIN_NO_DEATH: 'Invincible',
  S_PLUS_GRADE: 'Perfectionist',
  PENTAKILL: 'Same Penta, Different Champ',
  WIN_GAME: 'Jack of All Champs',
  OBTAIN_CHAMPION: 'Spice of Life',
  ARENA_FIRST: 'Adapt to All Situations',
  ARENA_PLAY: 'Arena Champion Ocean',
};

interface ChampionChallenges {
  aramSGrade: boolean;
  coopWin: boolean;
  winNoDeath: boolean;
  sPlusGrade: boolean;
  pentakill: boolean;
  winGame: boolean;
  obtained: boolean;
  arenaFirst: boolean;
  arenaPlay: boolean;
}

interface EternalSet {
  name: string;
  milestonesPassed: number;
  stonesOwned: number;
}

interface EternalData {
  sets: EternalSet[];
}

export default function ChampionBreakdown() {
  const [masteries, setMasteries] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [championChallenges, setChampionChallenges] = useState<Record<number, ChampionChallenges>>({});
  const [eternalsData, setEternalsData] = useState<Record<number, EternalData>>({});

  useEffect(() => {
    loadChampionNames();
    loadEternalDefinitions();

    Promise.all([
      getChampionMasteries(),
      getChallenges(),
      getEternals(),
    ]).then(([m, challenges, eternals]) => {
      if (Array.isArray(m) && m.length > 0) {
        const sorted = m.sort((a: any, b: any) => (b.championPoints ?? 0) - (a.championPoints ?? 0));
        setMasteries(sorted);
        setSelected(sorted[0]);
      }

      // Process challenges
      const challengeMap: Record<number, ChampionChallenges> = {};
      const challengesByName: Record<string, any> = {};

      if (Array.isArray(challenges)) {
        challenges.forEach((c: any) => {
          const name = c.name ?? c.localizedName ?? '';
          if (name) challengesByName[name] = c;
        });
      }

      Object.entries(CHALLENGE_NAMES).forEach(([key, name]) => {
        const challenge = challengesByName[name];
        if (!challenge) return;

        const completedChampionIds = challenge.completedIds ?? [];
        if (!Array.isArray(completedChampionIds)) return;

        completedChampionIds.forEach((championId: number) => {
          if (!challengeMap[championId]) {
            challengeMap[championId] = {
              aramSGrade: false, coopWin: false, winNoDeath: false,
              sPlusGrade: false, pentakill: false, winGame: false,
              obtained: true, arenaFirst: false, arenaPlay: false,
            };
          }

          switch (key) {
            case 'ARAM_S_GRADE': challengeMap[championId].aramSGrade = true; break;
            case 'COOP_WIN': challengeMap[championId].coopWin = true; break;
            case 'WIN_NO_DEATH': challengeMap[championId].winNoDeath = true; break;
            case 'S_PLUS_GRADE': challengeMap[championId].sPlusGrade = true; break;
            case 'PENTAKILL': challengeMap[championId].pentakill = true; break;
            case 'WIN_GAME': challengeMap[championId].winGame = true; break;
            case 'OBTAIN_CHAMPION': challengeMap[championId].obtained = true; break;
            case 'ARENA_FIRST': challengeMap[championId].arenaFirst = true; break;
            case 'ARENA_PLAY': challengeMap[championId].arenaPlay = true; break;
          }
        });
      });

      // All champions with mastery are obtained
      if (Array.isArray(m)) {
        m.forEach((mastery: any) => {
          const championId = mastery.championId;
          if (!challengeMap[championId]) {
            challengeMap[championId] = {
              aramSGrade: false, coopWin: false, winNoDeath: false,
              sPlusGrade: false, pentakill: false, winGame: false,
              obtained: true, arenaFirst: false, arenaPlay: false,
            };
          } else {
            challengeMap[championId].obtained = true;
          }
        });
      }

      setChampionChallenges(challengeMap);

      // Process eternals (summary data)
      const eternalsMap: Record<number, EternalData> = {};
      if (Array.isArray(eternals)) {
        eternals.forEach((eternal: any) => {
          const championId = eternal.championId;
          if (!championId || championId === -1) return;

          const sets: EternalSet[] = (eternal.sets ?? []).map((set: any) => ({
            name: set.name ?? 'Unknown',
            milestonesPassed: set.milestonesPassed ?? 0,
            stonesOwned: set.stonesOwned ?? 0,
          }));

          if (sets.length > 0) {
            eternalsMap[championId] = { sets };
          }
        });
      }

      setEternalsData(eternalsMap);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search) return masteries;
    const q = search.toLowerCase();
    return masteries.filter(m => {
      const name = getChampionName(m.championId).toLowerCase();
      const id = String(m.championId);
      return name.includes(q) || id.includes(q);
    });
  }, [masteries, search]);

  const isChampionMaxed = (championId: number): boolean => {
    const challenges = championChallenges[championId];
    const mastery = masteries.find(m => m.championId === championId);
    const masteryLevel = mastery?.championLevel ?? 0;

    if (!challenges || masteryLevel < 10) return false;

    return challenges.aramSGrade && challenges.coopWin && challenges.winNoDeath &&
           challenges.sPlusGrade && challenges.pentakill && challenges.winGame &&
           challenges.obtained && challenges.arenaFirst && challenges.arenaPlay;
  };

  const areEternalsComplete = (championId: number): boolean => {
    const eternals = eternalsData[championId];
    if (!eternals || eternals.sets.length === 0) return false;
    
    // Check if all eternals have max milestones
    return eternals.sets.every(set => {
      const maxMilestones = set.stonesOwned * 5;
      return maxMilestones > 0 && set.milestonesPassed >= maxMilestones;
    });
  };

  const areChallengesComplete = (championId: number): boolean => {
    const challenges = championChallenges[championId];
    if (!challenges) return false;
    
    return challenges.aramSGrade && challenges.coopWin && challenges.winNoDeath &&
           challenges.sPlusGrade && challenges.pentakill && challenges.winGame &&
           challenges.obtained && challenges.arenaFirst && challenges.arenaPlay;
  };

  const hasMastery10Plus = (championId: number): boolean => {
    const mastery = masteries.find(m => m.championId === championId);
    return (mastery?.championLevel ?? 0) >= 10;
  };

  const shouldShowBorder = (section: 'eternals' | 'challenges' | 'mastery' | 'stats', championId: number): boolean => {
    if (!championId) return false;
    
    const eternalsComplete = areEternalsComplete(championId);
    const challengesComplete = areChallengesComplete(championId);
    const mastery10 = hasMastery10Plus(championId);
    const allComplete = eternalsComplete && challengesComplete && mastery10;
    
    switch (section) {
      case 'eternals':
        return eternalsComplete || allComplete;
      case 'challenges':
        return challengesComplete || allComplete;
      case 'mastery':
        return mastery10 || allComplete;
      case 'stats':
        return allComplete;
      default:
        return false;
    }
  };

  const detail = selected;
  const lvl = detail?.championLevel ?? 0;
  const color = M_COLOR[Math.min(lvl, 10)] ?? '#5B5A56';
  const pts = detail?.championPoints ?? 0;
  const ptsNext = detail?.championPointsUntilNextLevel ?? 0;
  const ptsSince = detail?.championPointsSinceLastLevel ?? 0;
  const pct = ptsNext > 0 ? Math.round((ptsSince / (ptsSince + ptsNext)) * 100) : 100;
  const selectedChallenges = detail ? championChallenges[detail.championId] : null;
  const selectedEternals = detail ? eternalsData[detail.championId] : null;
  const isMaxed = detail ? isChampionMaxed(detail.championId) : false;

  const SERIES_COLORS: Record<string, string> = {
    'Starter Series': '#9D48E0',
    'Series 1': '#576BCE',
    'Series 2': '#10D48A',
  };

  return (
    <div className="p-6 animate-slide-up flex gap-5 h-[calc(100vh-80px)]">
      {/* Left: champion list */}
      <div className="w-52 flex flex-col gap-2.5 flex-shrink-0">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-ghost" />
          <input type="text" placeholder="Search…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="input-search text-[10px] py-1.5" />
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5">
          {loading
            ? Array(12).fill(0).map((_, i) => <div key={i} className="skeleton h-9 rounded" />)
            : filtered.length === 0
              ? <p className="text-center py-6 text-[10px] text-ink-ghost">No champions found</p>
              : filtered.map(m => {
                  const l = m.championLevel ?? 0;
                  const c = M_COLOR[Math.min(l, 10)] ?? '#5B5A56';
                  const maxed = isChampionMaxed(m.championId);
                  return (
                    <button key={m.championId} onClick={() => setSelected(m)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors relative ${
                        selected?.championId === m.championId
                          ? 'bg-gold/10 border border-gold/20'
                          : 'hover:bg-white/[0.04] border border-transparent'
                      } ${maxed ? 'ring-2 ring-gold/50' : ''}`}>
                      <img src={getChampionIconUrl(m.championId)} alt=""
                        className="w-6 h-6 rounded object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-ink-bright truncate">{getChampionName(m.championId)}</p>
                      </div>
                      {maxed && (
                        <span className="absolute top-0 right-0 text-[6px] font-black px-1 rounded-bl bg-red-600 text-white">
                          MAX
                        </span>
                      )}
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0"
                        style={{ background: `${c}15`, color: c }}>M{l}</span>
                    </button>
                  );
                })
          }
        </div>
      </div>

      {/* Right: detail panel */}
      <div className="flex-1 min-w-0 overflow-y-auto no-scrollbar p-1">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-ink-ghost">
            <Swords size={36} className="mb-3 opacity-20" />
            <p className="text-sm text-ink-dim">Select a champion</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Champion header */}
            <div className={`card p-5 flex items-center gap-4 relative ${isMaxed ? 'ring-2 ring-gold shadow-[0_0_20px_rgba(244,200,116,0.3)]' : ''}`}>
              {isMaxed && (
                <div className="absolute top-2 right-2 text-[10px] font-black px-2 py-1 rounded bg-red-600 text-white flex items-center gap-1">
                  <Trophy size={12} />
                  MAX
                </div>
              )}
              <img src={getChampionIconUrl(selected.championId)} alt=""
                className="w-16 h-16 rounded-xl border-2 object-cover"
                style={{ borderColor: `${color}50` }} />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-ink-bright">{getChampionName(selected.championId)}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${color}15`, color }}>
                    Mastery {lvl}
                  </span>
                  <span className="text-sm text-gold tabular-nums font-semibold">{pts.toLocaleString()} pts</span>
                </div>
              </div>
            </div>

            {/* Progress to next level */}
            <div className={`card p-4 ${shouldShowBorder('mastery', selected.championId) ? 'ring-2 ring-gold/80 border-gold/40' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-ink-muted">Progress to Mastery {lvl + 1}</span>
                <span className="text-xs text-ink-ghost tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-ink-ghost tabular-nums">
                <span>{ptsSince.toLocaleString()} earned</span>
                <span>{ptsNext.toLocaleString()} remaining</span>
              </div>
            </div>

            {/* Eternals */}
            {selectedEternals && selectedEternals.sets.length > 0 && (
              <div className={`card p-4 ${shouldShowBorder('eternals', selected.championId) ? 'ring-2 ring-gold/80 border-gold/40' : ''}`}>
                <h3 className="text-sm font-bold text-ink-bright mb-3 flex items-center gap-2">
                  <Star size={14} className="text-purple-400" />
                  Eternals
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {selectedEternals.sets.map((set) => {
                    const seriesColor = SERIES_COLORS[set.name] ?? '#9D48E0';
                    const maxMilestones = set.stonesOwned * 5;
                    const seriesMaxed = set.milestonesPassed >= maxMilestones && maxMilestones > 0;
                    const seriesPercent = maxMilestones > 0 ? ((set.milestonesPassed / maxMilestones) * 100).toFixed(1) : '0.0';

                    // Get eternal definitions for this champion and series
                    const champEternals = championEternals[selected.championId] ?? [];
                    const seriesEternals = champEternals.filter(e => e.series === set.name);

                    // Calculate individual stone milestones
                    const stones = Array.from({ length: set.stonesOwned }).map((_, i) => {
                      const stoneStart = i * 5;
                      const milestone = Math.min(Math.max(set.milestonesPassed - stoneStart, 0), 5);
                      const eternalDef = seriesEternals[i];
                      const milestone5Threshold = eternalDef?.milestones?.[4] ?? 0;
                      return { milestone, eternalDef, milestone5Threshold };
                    });

                    return (
                      <div key={set.name}>
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-[10px] font-semibold" style={{ color: seriesColor }}>
                            {set.name}
                          </p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            seriesMaxed ? 'bg-gold text-void font-bold' : 'bg-white/[0.06] text-ink-ghost'
                          }`}>
                            {seriesPercent}%
                          </span>
                        </div>
                        <div className="space-y-3">
                          {stones.map((stone, idx) => {
                            const stoneMaxed = stone.milestone >= 5;
                            const progress = (stone.milestone / 5) * 100;
                            const name = stone.eternalDef?.name ?? `Eternal ${idx + 1}`;
                            const threshold = stone.milestone5Threshold;
                            const isRetired = stone.eternalDef?.isRetired ?? false;

                            return (
                              <div key={idx} className={isRetired ? 'opacity-50' : ''}>
                                <div className="flex items-center gap-1 mb-1">
                                  <p className={`text-[9px] ${stoneMaxed ? 'text-gold font-medium' : 'text-ink-muted'}`}>
                                    {name}
                                  </p>
                                  {isRetired && (
                                    <span className="text-[6px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">
                                      Retired
                                    </span>
                                  )}
                                </div>
                                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-1">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${progress}%`,
                                      background: stoneMaxed ? '#F4C874' : isRetired ? '#666' : seriesColor,
                                    }}
                                  />
                                </div>
                                <p className="text-[8px] text-ink-ghost tabular-nums">
                                  {stoneMaxed ? (
                                    <span className="text-gold">{threshold > 0 ? threshold.toLocaleString() : 'MAX'}</span>
                                  ) : (
                                    <span>{stone.milestone}/5</span>
                                  )}
                                  {threshold > 0 && <span> / {threshold.toLocaleString()}</span>}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Challenge Contributions */}
            {selectedChallenges && (
              <div className={`card p-4 ${shouldShowBorder('challenges', selected.championId) ? 'ring-2 ring-gold/80 border-gold/40' : ''}`}>
                <h3 className="text-sm font-bold text-ink-bright mb-3 flex items-center gap-2">
                  <Award size={14} className="text-gold" />
                  Challenge Contributions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: 'ARAM S- or higher', checked: selectedChallenges.aramSGrade },
                    { label: 'Co-Op vs AI Win', checked: selectedChallenges.coopWin },
                    { label: 'Win without dying', checked: selectedChallenges.winNoDeath },
                    { label: 'S+ Grade earned', checked: selectedChallenges.sPlusGrade },
                    { label: 'Pentakill achieved', checked: selectedChallenges.pentakill },
                    { label: 'Game won', checked: selectedChallenges.winGame },
                    { label: 'Champion obtained', checked: selectedChallenges.obtained },
                    { label: 'Arena 1st place', checked: selectedChallenges.arenaFirst },
                    { label: 'Arena played', checked: selectedChallenges.arenaPlay },
                  ] as const).map(({ label, checked }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-colors ${
                        checked ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/[0.02] text-ink-ghost border border-white/[0.04]'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-sm flex items-center justify-center ${checked ? 'bg-green-500' : 'bg-white/[0.06]'}`}>
                        {checked && <span className="text-[8px] text-white">✓</span>}
                      </div>
                      <span className="flex-1">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Points', value: pts.toLocaleString(), color: '#C89B3C' },
                { label: 'Tokens', value: String(detail?.tokensEarned ?? 0), color: '#10D48A' },
                { label: 'Last Played', value: detail?.lastPlayTime
                  ? new Date(detail.lastPlayTime).toLocaleDateString()
                  : '—', color: '#576BCE' },
              ].map(({ label, value, color: c }) => (
                <div key={label} className={`card-inset text-center py-3 ${shouldShowBorder('stats', selected.championId) ? 'ring-2 ring-gold/80 border-gold/40' : ''}`}>
                  <p className="text-base font-bold tabular-nums" style={{ color: c }}>{value}</p>
                  <p className="text-[10px] text-ink-ghost mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
