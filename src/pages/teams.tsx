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

/* Region filters (source of truth provided by user) */
const REGION_CHAMPION_NAMES: Record<string, string[]> = {
  'Bandle City': ['Fizz', 'Gnar', 'Heimerdinger', 'Kled', 'Corki', 'Lulu', 'Poppy', 'Rumble', 'Teemo', 'Tristana', 'Veigar', 'Vex', 'Yuumi', 'Ziggs'],
  Bilgewater: ['Fizz', 'Gangplank', 'Graves', 'Illaoi', 'Miss Fortune', 'Nautilus', 'Pyke', 'Tahm Kench', 'Twisted Fate'],
  Noxus: ['Cassiopeia', 'Darius', 'Draven', 'Kled', 'LeBlanc', 'Katarina', 'Riven', 'Sion', 'Swain', 'Talon', 'Vladimir'],
  Ionia: ['Ahri', 'Akali', 'Irelia', 'Jhin', 'Karma', 'Kennen', 'Lee Sin', 'Lillia', 'Master Yi', 'Sett', 'Shen', 'Syndra', 'Varus', 'Wukong', 'Xayah', 'Yasuo', 'Yone', 'Zed'],
  Piltover: ['Caitlyn', 'Corki', 'Ezreal', 'Heimerdinger', 'Jayce', 'Orianna', 'Seraphine', 'Vi'],
  Zaun: ['Blitzcrank', 'Dr. Mundo', 'Ekko', 'Jinx', 'Singed', 'Twitch', 'Urgot', 'Viktor', 'Warwick', 'Zac', 'Zeri'],
  'Shadow Isles': ['Elise', 'Evelynn', 'Fiddlesticks', 'Hecarim', 'Kalista', 'Karthus', 'Maokai', 'Senna', 'Thresh', 'Viego', 'Yorick'],
  Shurima: ['Akshan', 'Amumu', 'Azir', 'Nasus', 'Rammus', 'Renekton', 'Sivir', 'Taliyah', 'Xerath'],
  Freljord: ['Anivia', 'Ashe', 'Braum', 'Lissandra', 'Olaf', 'Ornn', 'Sejuani', 'Trundle', 'Tryndamere', 'Udyr', 'Volibear'],
  Targon: ['Aphelios', 'Aurelion Sol', 'Diana', 'Leona', 'Pantheon', 'Soraka', 'Taric', 'Zoe'],
};

const GLOBETROTTER_REGIONS = Object.keys(REGION_CHAMPION_NAMES);

function normalizeChampionName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeChallengeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/* Harmony filters (source of truth provided by user) */
const HARMONY_CHAMPION_NAMES: Record<string, string[]> = {
  'Nowhere to Hide': ['Akshan', 'Ashe', 'Aurelion Sol', 'Bard', 'Briar', 'Caitlyn', 'Draven', 'Ezreal', 'Galio', 'Gangplank', 'Jhin', 'Jinx', "Kai'Sa", 'Karthus', 'Kled', 'Lillia', 'Lux', 'Maokai', 'Mel', 'Nocturne', 'Pantheon', 'Ryze', 'Senna', 'Shen', 'Sion', 'Smolder', 'Soraka', 'Swain', 'Taliyah', 'Twisted Fate', 'Vex', 'Xerath', 'Yunara', 'Ziggs'],
  'It Has Ultimate In The Name': ['Amumu', 'Anivia', 'Annie', 'Aurelion Sol', 'Aurora', 'Azir', 'Bard', "Bel'Veth", 'Blitzcrank', 'Braum', 'Briar', 'Cassiopeia', 'Corki', 'Diana', 'Draven', 'Ekko', 'Evelynn', 'Ezreal', 'Fiddlesticks', 'Fizz', 'Galio', 'Gangplank', 'Gnar', 'Gragas', 'Graves', 'Hecarim', 'Heimerdinger', 'Hwei', 'Illaoi', 'Janna', 'Jarvan IV', 'Jinx', 'Karthus', 'Katarina', 'Kayle', 'Kennen', 'Leona', 'Lissandra', 'Lux', 'Malphite', 'Maokai', 'Mel', 'Milio', 'Miss Fortune', 'Morgana', 'Nami', 'Neeko', 'Nilah', 'Nunu & Willump', 'Orianna', 'Ornn', 'Pantheon', 'Qiyana', 'Rakan', 'Rammus', 'Rell', 'Renata Glasc', 'Riven', 'Rumble', 'Samira', 'Sejuani', 'Senna', 'Seraphine', 'Sett', 'Skarner', 'Smolder', 'Sona', 'Swain', 'Talon', 'Twitch', "Vel'Koz", 'Viktor', 'Vladimir', 'Volibear', 'Xayah', 'Xin Zhao', 'Yone', 'Yuumi', 'Zac', 'Zeri', 'Ziggs', 'Zyra'],
  'We Protec': ['Alistar', 'Annie', 'Bard', 'Briar', 'Fiora', 'Galio', 'Hwei', 'Ivern', 'Janna', "K'Sante", 'Karma', 'Kayle', 'Kindred', 'Lee Sin', 'Lulu', 'Lux', 'Milio', 'Morgana', 'Naafiri', 'Nami', 'Nidalee', 'Nilah', 'Orianna', 'Rakan', 'Renata Glasc', 'Senna', 'Seraphine', 'Shen', 'Skarner', 'Sona', 'Soraka', 'Tahm Kench', 'Taric', 'Thresh', 'Yuumi', 'Zilean'],
  "They Just... Don't... DIE!": ['Akshan', 'Alistar', 'Anivia', 'Bard', "Bel'Veth", 'Braum', 'Ekko', 'Elise', 'Evelynn', 'Fiora', 'Fizz', 'Gwen', 'Jax', "K'Sante", 'Kalista', 'Karthus', 'Kayle', 'Kayn', 'Kindred', 'Kled', "Kog'Maw", 'Lissandra', 'Malzahar', 'Maokai', 'Master Yi', 'Mel', 'Olaf', 'Pantheon', 'Renata Glasc', 'Sion', 'Tahm Kench', 'Taric', 'Tryndamere', 'Vladimir', 'Xin Zhao', 'Yuumi', 'Zac', 'Zed', 'Zilean'],
  "Where'd They Go?": ['Akali', 'Akshan', 'Evelynn', "Kai'Sa", "Kha'Zix", 'LeBlanc', 'Neeko', 'Nocturne', 'Pyke', 'Qiyana', 'Rengar', 'Senna', 'Shaco', 'Talon', 'Teemo', 'Twitch', 'Vayne', 'Viego', 'Wukong'],
  "We're Good Over Here": ['Akshan', 'Ashe', 'Aurora', 'Azir', 'Caitlyn', "Cho'Gath", 'Corki', 'Dr. Mundo', 'Ezreal', 'Gangplank', 'Hwei', 'Jayce', 'Jhin', 'Jinx', "Kai'Sa", 'Karma', 'Kled', "Kog'Maw", 'Lux', 'Maokai', 'Mel', 'Milio', 'Nidalee', 'Pantheon', 'Senna', 'Seraphine', 'Shyvana', 'Sivir', 'Smolder', 'Taliyah', 'Twisted Fate', 'Varus', "Vel'Koz", 'Vex', 'Viktor', 'Xayah', 'Xerath', 'Yuumi', 'Zeri', 'Ziggs', 'Zoe'],
  'Summoners on the Rift': ['Annie', 'Azir', "Bel'Veth", 'Elise', 'Fiddlesticks', 'Heimerdinger', 'Illaoi', 'Ivern', 'Kalista', 'Kindred', 'Lissandra', 'Malzahar', 'Maokai', 'Naafiri', 'Neeko', 'Orianna', 'Shaco', 'Yorick', 'Yunara', 'Zed', 'Zyra'],
  'Get Over Here': ['Alistar', 'Azir', 'Blitzcrank', 'Darius', 'Gnar', 'Gragas', 'Hecarim', 'Janna', 'Jayce', "K'Sante", 'Kled', 'Lee Sin', 'Maokai', 'Mordekaiser', 'Nautilus', 'Nilah', 'Orianna', 'Poppy', 'Pyke', 'Rell', 'Sett', 'Singed', 'Skarner', 'Swain', 'Tahm Kench', 'Taliyah', 'Thresh', 'Tristana', 'Urgot', 'Vayne', 'Xin Zhao', 'Yone', 'Zac', 'Ziggs'],
  "It's a Trap!": ['Caitlyn', 'Gangplank', 'Jhin', 'Jinx', 'Maokai', 'Nidalee', 'Shaco', 'Ziggs', 'Zyra'],
  "I'm Helping": ['Anivia', 'Aurora', 'Azir', 'Irelia', 'Ivern', 'Jarvan IV', 'Ornn', 'Taliyah', 'Trundle', 'Veigar', 'Yorick'],
  'Hold That Pose': ['Aatrox', 'Alistar', 'Amumu', 'Anivia', 'Bard', 'Blitzcrank', 'Braum', 'Briar', 'Camille', 'Galio', 'Gnar', 'Gragas', 'Hecarim', 'Ivern', 'Janna', 'Jarvan IV', "K'Sante", 'Kled', 'LeBlanc', 'Leona', 'Lissandra', 'Lulu', 'Maokai', 'Morgana', 'Nami', 'Nautilus', 'Neeko', 'Nunu & Willump', 'Ornn', 'Poppy', 'Pyke', 'Qiyana', 'Rakan', 'Rammus', 'Rell', 'Renata Glasc', 'Riven', 'Sejuani', 'Seraphine', 'Sett', 'Shaco', 'Singed', 'Sion', 'Skarner', 'Tahm Kench', 'Thresh', 'Urgot', 'Vi', 'Warwick', 'Xin Zhao', 'Yasuo', 'Yone', 'Zac', 'Zyra'],
  "Variety's Overrated Assassin": ['Ahri', 'Akali', 'Akshan', 'Ambessa', 'Aurora', 'Briar', 'Camille', 'Diana', 'Ekko', 'Elise', 'Evelynn', 'Fiora', 'Fizz', 'Irelia', 'Kassadin', 'Katarina', 'Kayn', "Kha'Zix", 'LeBlanc', 'Lee Sin', 'Lucian', 'Master Yi', 'Naafiri', 'Nidalee', 'Nilah', 'Nocturne', 'Pantheon', 'Pyke', 'Qiyana', 'Quinn', 'Rengar', 'Riven', 'Samira', 'Shaco', 'Sylas', 'Talon', 'Tristana', 'Tryndamere', 'Twitch', 'Vayne', 'Vi', 'Viego', 'Yasuo', 'Yone', 'Zaahen', 'Zed'],
  "Variety's Overrated Fighter": ['Aatrox', 'Ambessa', "Bel'Veth", 'Briar', 'Camille', 'Darius', 'Diana', 'Dr. Mundo', 'Fiora', 'Fizz', 'Gangplank', 'Garen', 'Gnar', 'Gragas', 'Gwen', 'Hecarim', 'Illaoi', 'Irelia', 'Jarvan IV', 'Jax', 'Jayce', 'Kayn', 'Kled', "K'Sante", 'Lee Sin', 'Lillia', 'Master Yi', 'Mordekaiser', 'Naafiri', 'Nasus', 'Nilah', 'Nocturne', 'Olaf', 'Pantheon', 'Poppy', "Rek'Sai", 'Renekton', 'Rengar', 'Riven', 'Rumble', 'Sett', 'Shyvana', 'Sion', 'Skarner', 'Trundle', 'Tryndamere', 'Udyr', 'Urgot', 'Vi', 'Viego', 'Vladimir', 'Volibear', 'Warwick', 'Wukong', 'Xin Zhao', 'Yasuo', 'Yone', 'Yorick', 'Zaahen', 'Zac'],
  "Variety's Overrated Mage": ['Ahri', 'Anivia', 'Annie', 'Aurelion Sol', 'Aurora', 'Azir', 'Bard', 'Brand', 'Cassiopeia', "Cho'Gath", 'Corki', 'Ekko', 'Elise', 'Evelynn', 'Ezreal', 'Fiddlesticks', 'Galio', 'Gragas', 'Heimerdinger', 'Hwei', 'Ivern', 'Janna', 'Jhin', "Kai'Sa", 'Karma', 'Karthus', 'Kassadin', 'Katarina', 'Kayle', 'Kennen', "Kog'Maw", 'LeBlanc', 'Lillia', 'Lissandra', 'Lulu', 'Lux', 'Malphite', 'Malzahar', 'Mel', 'Milio', 'Miss Fortune', 'Mordekaiser', 'Morgana', 'Nami', 'Neeko', 'Nidalee', 'Nunu & Willump', 'Orianna', 'Renata Glasc', 'Rumble', 'Ryze', 'Seraphine', 'Shyvana', 'Singed', 'Smolder', 'Sona', 'Soraka', 'Swain', 'Sylas', 'Syndra', 'Taliyah', 'Teemo', 'Twisted Fate', 'Varus', 'Veigar', "Vel'Koz", 'Vex', 'Viktor', 'Vladimir', 'Xerath', 'Yuumi', 'Ziggs', 'Zilean', 'Zoe', 'Zyra'],
  "Variety's Overrated Marksman": ['Akshan', 'Aphelios', 'Ashe', 'Azir', 'Caitlyn', 'Corki', 'Draven', 'Ezreal', 'Graves', 'Jayce', 'Jhin', 'Jinx', "Kai'Sa", 'Kalista', 'Kayle', 'Kindred', "Kog'Maw", 'Lucian', 'Miss Fortune', 'Quinn', 'Samira', 'Senna', 'Sivir', 'Smolder', 'Teemo', 'Tristana', 'Twisted Fate', 'Twitch', 'Varus', 'Vayne', 'Xayah', 'Yunara', 'Zeri'],
  "Variety's Overrated Support": ['Alistar', 'Amumu', 'Annie', 'Ashe', 'Bard', 'Blitzcrank', 'Brand', 'Braum', 'Fiddlesticks', 'Heimerdinger', 'Hwei', 'Ivern', 'Janna', 'Karma', 'Leona', 'Lulu', 'Lux', 'Maokai', 'Mel', 'Milio', 'Morgana', 'Nami', 'Nautilus', 'Neeko', 'Orianna', 'Pyke', 'Rakan', 'Rell', 'Renata Glasc', 'Senna', 'Seraphine', 'Sona', 'Soraka', 'Swain', 'Tahm Kench', 'Taliyah', 'Taric', 'Thresh', "Vel'Koz", 'Xerath', 'Yuumi', 'Zilean', 'Zyra'],
  "Variety's Overrated Tank": ['Alistar', 'Amumu', 'Blitzcrank', 'Braum', "Cho'Gath", 'Darius', 'Dr. Mundo', 'Galio', 'Garen', 'Gnar', 'Hecarim', 'Illaoi', 'Jarvan IV', "K'Sante", 'Leona', 'Malphite', 'Maokai', 'Nasus', 'Nautilus', 'Nunu & Willump', 'Olaf', 'Ornn', 'Poppy', 'Rammus', "Rek'Sai", 'Rell', 'Renekton', 'Sejuani', 'Sett', 'Shen', 'Singed', 'Sion', 'Skarner', 'Tahm Kench', 'Taric', 'Thresh', 'Trundle', 'Udyr', 'Urgot', 'Volibear', 'Warwick', 'Wukong', 'Xin Zhao', 'Yorick', 'Zac'],
};

const HARMONY_CHALLENGES = Object.keys(HARMONY_CHAMPION_NAMES);

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
    Promise.all([
      loadChampionNames(),
      getChampionMasteries(),
      getChallenges(),
    ]).then(([, m, c]) => {
      if (Array.isArray(m)) {
        setMasteries(m.sort((a: any, b: any) => (b.championPoints ?? 0) - (a.championPoints ?? 0)));
      }
      if (Array.isArray(c)) setChallenges(c);
      setLoading(false);
    });
  }, []);

  const regionToChampionIds = useMemo(() => {
    const byNormName = new Map<string, number>();
    for (const m of masteries) {
      const name = getChampionName(m.championId);
      if (name && !name.startsWith('#') && !name.startsWith('Champion #')) {
        byNormName.set(normalizeChampionName(name), m.championId);
      }
    }

    const map: Record<string, Set<number>> = {};
    for (const [region, names] of Object.entries(REGION_CHAMPION_NAMES)) {
      map[region] = new Set(
        names
          .map((name) => byNormName.get(normalizeChampionName(name)))
          .filter((id): id is number => typeof id === 'number')
      );
    }

    return map;
  }, [masteries]);

  const harmonyToChampionIds = useMemo(() => {
    const byNormName = new Map<string, number>();
    for (const m of masteries) {
      const name = getChampionName(m.championId);
      if (name && !name.startsWith('#') && !name.startsWith('Champion #')) {
        byNormName.set(normalizeChampionName(name), m.championId);
      }
    }

    const map: Record<string, Set<number>> = {};
    for (const [challengeName, names] of Object.entries(HARMONY_CHAMPION_NAMES)) {
      map[challengeName] = new Set(
        names
          .map((name) => byNormName.get(normalizeChampionName(name)))
          .filter((id): id is number => typeof id === 'number')
      );
    }

    return map;
  }, [masteries]);

  // Find challenge tokens
  const challengeTokens = useMemo(() => {
    const tokens: Record<string, ChallengeToken> = {};
    
    for (const challenge of challenges) {
      const name = challenge.name ?? challenge.description ?? '';
      if (HARMONY_CHALLENGES.some(h => normalizeChallengeName(h) === normalizeChallengeName(name)) || GLOBETROTTER_REGIONS.includes(name)) {
        tokens[normalizeChallengeName(name)] = {
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
      const regionChamps = regionToChampionIds[selectedRegion];
      if (regionChamps) {
        result = new Set(regionChamps);
      } else {
        result = new Set();
      }
    }

    // Intersect with harmony challenges
    if (selectedHarmony.size > 0) {
      for (const harmonyName of selectedHarmony) {
        const harmonyChamps = harmonyToChampionIds[harmonyName];
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
  }, [selectedRegion, selectedHarmony, masteries, regionToChampionIds, harmonyToChampionIds]);

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

  const displayedMasteries = useMemo(() => {
    // Keep original mastery order, but surface filtered picks first for faster scanning.
    if (!selectedRegion && selectedHarmony.size === 0) return masteries;
    return [...masteries].sort((a, b) => {
      const aLit = filteredChampions.has(a.championId) ? 1 : 0;
      const bLit = filteredChampions.has(b.championId) ? 1 : 0;
      return bLit - aLit;
    });
  }, [masteries, filteredChampions, selectedRegion, selectedHarmony]);

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
              {displayedMasteries.map((m: any) => {
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
              const token = challengeTokens[normalizeChallengeName(name)];
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
