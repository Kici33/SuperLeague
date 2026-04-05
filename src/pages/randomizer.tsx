import { useState, useEffect } from 'react';
import { Shuffle, Swords, Flame, Zap, Package } from 'lucide-react';
import { getChampionMasteries, getChampionIconUrl } from '@/lib/lcu-api';

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

const SUMMONER_SPELLS = [
  { id: 1, name: 'Cleanse', icon: 'SummonerBoost' },
  { id: 3, name: 'Exhaust', icon: 'SummonerExhaust' },
  { id: 4, name: 'Flash', icon: 'SummonerFlash' },
  { id: 6, name: 'Ghost', icon: 'SummonerHaste' },
  { id: 7, name: 'Heal', icon: 'SummonerHeal' },
  { id: 11, name: 'Smite', icon: 'SummonerSmite' },
  { id: 12, name: 'Teleport', icon: 'SummonerTeleport' },
  { id: 13, name: 'Clarity', icon: 'SummonerMana' },
  { id: 14, name: 'Ignite', icon: 'SummonerDot' },
  { id: 21, name: 'Barrier', icon: 'SummonerBarrier' },
];

const RUNE_TREES = [
  { id: 8000, name: 'Precision', icon: '⚔️' },
  { id: 8100, name: 'Domination', icon: '🩸' },
  { id: 8200, name: 'Sorcery', icon: '✨' },
  { id: 8300, name: 'Resolve', icon: '🛡️' },
  { id: 8400, name: 'Inspiration', icon: '💡' },
];

const BUILD_TYPES = [
  'AD Carry',
  'AP Carry',
  'Tank',
  'Bruiser',
  'Assassin',
  'Support',
  'On-Hit',
  'Lethality',
  'Full Crit',
  'Hybrid',
];

export default function Randomizer() {
  const [masteries, setMasteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Randomizer options
  const [randomizeChampion, setRandomizeChampion] = useState(true);
  const [randomizeRunes, setRandomizeRunes] = useState(false);
  const [randomizeSpells, setRandomizeSpells] = useState(false);
  const [randomizeBuild, setRandomizeBuild] = useState(false);
  const [flashPosition, setFlashPosition] = useState<'D' | 'F'>('D');
  
  // Results
  const [randomChampion, setRandomChampion] = useState<any>(null);
  const [randomRunes, setRandomRunes] = useState<{ primary: any; secondary: any } | null>(null);
  const [randomSpells, setRandomSpells] = useState<{ spell1: any; spell2: any } | null>(null);
  const [randomBuild, setRandomBuild] = useState<string | null>(null);

  useEffect(() => {
    loadChampionNames();
    getChampionMasteries().then((m) => {
      if (Array.isArray(m) && m.length > 0) {
        setMasteries(m);
      }
      setLoading(false);
    });
  }, []);

  const handleRandomize = () => {
    // Randomize champion
    if (randomizeChampion && masteries.length > 0) {
      const randomIndex = Math.floor(Math.random() * masteries.length);
      setRandomChampion(masteries[randomIndex]);
    }

    // Randomize runes
    if (randomizeRunes) {
      const primary = RUNE_TREES[Math.floor(Math.random() * RUNE_TREES.length)];
      let secondary = RUNE_TREES[Math.floor(Math.random() * RUNE_TREES.length)];
      while (secondary.id === primary.id) {
        secondary = RUNE_TREES[Math.floor(Math.random() * RUNE_TREES.length)];
      }
      setRandomRunes({ primary, secondary });
    }

    // Randomize spells
    if (randomizeSpells) {
      const flash = SUMMONER_SPELLS.find(s => s.name === 'Flash');
      const otherSpells = SUMMONER_SPELLS.filter(s => s.name !== 'Flash');
      const otherSpell = otherSpells[Math.floor(Math.random() * otherSpells.length)];
      
      if (flashPosition === 'D') {
        setRandomSpells({ spell1: flash!, spell2: otherSpell });
      } else {
        setRandomSpells({ spell1: otherSpell, spell2: flash! });
      }
    }

    // Randomize build
    if (randomizeBuild) {
      const build = BUILD_TYPES[Math.floor(Math.random() * BUILD_TYPES.length)];
      setRandomBuild(build);
    }
  };

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
          <Shuffle size={20} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-ink-bright">Randomizer</h2>
          <p className="text-xs text-ink-muted">Spice up your games with random selections</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Left: Options */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-ink-bright mb-3">Randomization Options</h3>

          {/* Champion */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={randomizeChampion}
              onChange={(e) => setRandomizeChampion(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-purple-500 checked:border-purple-500 cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-1">
              <Swords size={14} className="text-purple-400" />
              <span className="text-sm text-ink group-hover:text-ink-bright transition-colors">Champion</span>
            </div>
          </label>

          {/* Runes */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={randomizeRunes}
              onChange={(e) => setRandomizeRunes(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-purple-500 checked:border-purple-500 cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-1">
              <Flame size={14} className="text-orange-400" />
              <span className="text-sm text-ink group-hover:text-ink-bright transition-colors">Runes</span>
            </div>
          </label>

          {/* Spells */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={randomizeSpells}
              onChange={(e) => setRandomizeSpells(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-purple-500 checked:border-purple-500 cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-1">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-sm text-ink group-hover:text-ink-bright transition-colors">Summoner Spells</span>
            </div>
          </label>

          {randomizeSpells && (
            <div className="ml-7 pl-4 border-l-2 border-white/[0.08] space-y-2">
              <p className="text-xs text-ink-muted mb-2">Flash Position</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFlashPosition('D')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    flashPosition === 'D'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-white/[0.03] text-ink-ghost border border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  D Key
                </button>
                <button
                  onClick={() => setFlashPosition('F')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    flashPosition === 'F'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-white/[0.03] text-ink-ghost border border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  F Key
                </button>
              </div>
            </div>
          )}

          {/* Build Path */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={randomizeBuild}
              onChange={(e) => setRandomizeBuild(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-purple-500 checked:border-purple-500 cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-1">
              <Package size={14} className="text-blue-400" />
              <span className="text-sm text-ink group-hover:text-ink-bright transition-colors">Build Path</span>
            </div>
          </label>

          {/* Randomize Button */}
          <button
            onClick={handleRandomize}
            disabled={loading || (!randomizeChampion && !randomizeRunes && !randomizeSpells && !randomizeBuild)}
            className="w-full mt-6 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Shuffle size={16} />
            Randomize!
          </button>
        </div>

        {/* Right: Results */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-ink-bright mb-4">Results</h3>
          
          <div className="space-y-4">
            {/* Champion Result */}
            {randomizeChampion && randomChampion && (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Swords size={12} className="text-purple-400" />
                  <span className="text-xs font-semibold text-ink-dim uppercase tracking-wider">Champion</span>
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src={getChampionIconUrl(randomChampion.championId)}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover border border-white/[0.1]"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                  />
                  <div>
                    <p className="text-sm font-bold text-ink-bright">{getChampionName(randomChampion.championId)}</p>
                    <p className="text-xs text-ink-ghost">Mastery {randomChampion.championLevel ?? 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Runes Result */}
            {randomizeRunes && randomRunes && (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Flame size={12} className="text-orange-400" />
                  <span className="text-xs font-semibold text-ink-dim uppercase tracking-wider">Runes</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 p-2 rounded bg-white/[0.04] border border-white/[0.08]">
                    <p className="text-[10px] text-ink-ghost mb-1">Primary</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{randomRunes.primary.icon}</span>
                      <span className="text-xs font-medium text-ink-bright">{randomRunes.primary.name}</span>
                    </div>
                  </div>
                  <div className="flex-1 p-2 rounded bg-white/[0.04] border border-white/[0.08]">
                    <p className="text-[10px] text-ink-ghost mb-1">Secondary</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{randomRunes.secondary.icon}</span>
                      <span className="text-xs font-medium text-ink-bright">{randomRunes.secondary.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Spells Result */}
            {randomizeSpells && randomSpells && (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={12} className="text-yellow-400" />
                  <span className="text-xs font-semibold text-ink-dim uppercase tracking-wider">Summoner Spells</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 p-2 rounded bg-white/[0.04] border border-white/[0.08]">
                    <p className="text-[10px] text-ink-ghost mb-1">{flashPosition === 'D' ? 'D Key' : 'F Key'}</p>
                    <p className="text-xs font-medium text-ink-bright">{randomSpells.spell1.name}</p>
                  </div>
                  <div className="flex-1 p-2 rounded bg-white/[0.04] border border-white/[0.08]">
                    <p className="text-[10px] text-ink-ghost mb-1">{flashPosition === 'D' ? 'F Key' : 'D Key'}</p>
                    <p className="text-xs font-medium text-ink-bright">{randomSpells.spell2.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Build Result */}
            {randomizeBuild && randomBuild && (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Package size={12} className="text-blue-400" />
                  <span className="text-xs font-semibold text-ink-dim uppercase tracking-wider">Build Path</span>
                </div>
                <p className="text-sm font-bold text-ink-bright">{randomBuild}</p>
              </div>
            )}

            {/* Empty state */}
            {!randomChampion && !randomRunes && !randomSpells && !randomBuild && (
              <div className="flex flex-col items-center justify-center py-12 text-ink-ghost">
                <Shuffle size={32} className="mb-3 opacity-20" />
                <p className="text-sm text-ink-dim">Select options and click Randomize</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
