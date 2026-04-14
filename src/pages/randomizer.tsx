import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Package, Play, Shield, Shuffle, Swords, Flame, Lock } from 'lucide-react';
import { getChampionMasteries, getChampionIconUrl, getCurrentSummoner, getItemIconUrl, lcuRequest } from '@/lib/lcu-api';

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

  // Fallback to LCU static assets when external fetch is unavailable.
  if (Object.keys(championNames).length === 0) {
    try {
      const localRes = await lcuRequest({ method: 'GET', endpoint: '/lol-game-data/assets/v1/champion-summary.json' });
      if (localRes.status >= 200 && localRes.status < 300 && localRes.body) {
        const data = JSON.parse(localRes.body);
        if (Array.isArray(data)) {
          data.forEach((c: any) => {
            const id = Number(c?.id);
            if (Number.isFinite(id) && id > 0) {
              championNames[id] = c?.name ?? c?.alias ?? `#${id}`;
            }
          });
        }
      }
    } catch (e) {
      console.error('Failed to load champion names from LCU:', e);
    }
  }

  return championNames;
}

function getChampionName(championId: number): string {
  return championNames[championId] ?? `Champion #${championId}`;
}

async function getChampionNameResolved(championId: number): Promise<string> {
  if (championNames[championId]) return championNames[championId];
  await loadChampionNames();
  return championNames[championId] ?? `Champion #${championId}`;
}

const SUMMONER_SPELLS = [
  { id: 1, name: 'Cleanse' },
  { id: 3, name: 'Exhaust' },
  { id: 4, name: 'Flash' },
  { id: 6, name: 'Ghost' },
  { id: 7, name: 'Heal' },
  { id: 11, name: 'Smite' },
  { id: 12, name: 'Teleport' },
  { id: 14, name: 'Ignite' },
  { id: 21, name: 'Barrier' },
];

type RuneTree = {
  id: number;
  name: string;
};

const RUNE_TREES: RuneTree[] = [
  { id: 8000, name: 'Precision' },
  { id: 8100, name: 'Domination' },
  { id: 8200, name: 'Sorcery' },
  { id: 8300, name: 'Resolve' },
  { id: 8400, name: 'Inspiration' },
];

type RuneTemplate = {
  name: string;
  primaryStyleId: number;
  subStyleId: number;
  selectedPerkIds: number[];
  highlight: string;
};

type PerkStyle = {
  id: number;
  name: string;
  allowedSubStyles?: number[];
  slots?: Array<{
    type?: string;
    perks?: Array<number | { id: number; name?: string }>;
  }>;
};

const RUNE_TEMPLATES: RuneTemplate[] = [
  { name: 'Conqueror Frontline', primaryStyleId: 8000, subStyleId: 8300, selectedPerkIds: [8010, 9111, 9104, 8014, 8444, 8451, 5008, 5010, 5011], highlight: 'Sustain and all-in pressure' },
  { name: 'Dark Harvest Pick', primaryStyleId: 8100, subStyleId: 8200, selectedPerkIds: [8128, 8126, 8138, 8135, 8236, 8210, 5008, 5010, 5001], highlight: 'Burst, snowballing, and cleanup' },
  { name: 'Phase Rush Control', primaryStyleId: 8200, subStyleId: 8400, selectedPerkIds: [8230, 8226, 8210, 8237, 8304, 8347, 5008, 5010, 5013], highlight: 'Spacing and spell-driven fights' },
  { name: 'Grasp Bulwark', primaryStyleId: 8300, subStyleId: 8400, selectedPerkIds: [8437, 8446, 8473, 8451, 8304, 8345, 5005, 5001, 5011], highlight: 'Lane durability and teamfight stability' },
  { name: 'First Strike Tempo', primaryStyleId: 8400, subStyleId: 8200, selectedPerkIds: [8369, 8304, 8345, 8347, 8226, 8237, 5008, 5010, 5001], highlight: 'Gold generation and advantage windows' },
];

type BuildTemplate = {
  name: string;
  role: string;
  note: string;
  startingItems: number[];
  coreItems: number[];
  situationalItems: number[];
};

const BUILD_TEMPLATES: BuildTemplate[] = [
  { name: 'AD Carry', role: 'Marksman', note: 'Crit and attack speed', startingItems: [1055, 2003], coreItems: [3006, 3031, 6672, 3095], situationalItems: [3036, 3085, 3153, 3124] },
  { name: 'AP Carry', role: 'Mage', note: 'Burst and scaling damage', startingItems: [1056, 2003], coreItems: [3020, 6656, 3089, 4645], situationalItems: [3135, 3157, 3158, 3165] },
  { name: 'Tank', role: 'Tank', note: 'Front line and soak', startingItems: [1054, 2003], coreItems: [3068, 3009, 3075, 6664], situationalItems: [3065, 3110, 3193, 3742] },
  { name: 'Bruiser', role: 'Fighter', note: 'Sustained skirmish', startingItems: [1055, 2031], coreItems: [3078, 6630, 3053, 3044], situationalItems: [3748, 3074, 6333, 3071] },
  { name: 'Assassin', role: 'Assassin', note: 'Pick tools and lethality', startingItems: [1036, 3340], coreItems: [6692, 3142, 3071, 3814], situationalItems: [3158, 3147, 6693, 3147] },
  { name: 'Support', role: 'Support', note: 'Utility and team enablement', startingItems: [3850, 2003], coreItems: [6617, 6616, 3190, 2065], situationalItems: [3107, 3050, 4005, 6610] },
  { name: 'On-Hit', role: 'Marksman', note: 'Mixed damage and shred', startingItems: [1055, 2003], coreItems: [3153, 3124, 6672, 3085], situationalItems: [3036, 3031, 3115, 6671] },
  { name: 'Lethality', role: 'Assassin', note: 'Armor pen and burst', startingItems: [1036, 3340], coreItems: [6692, 3142, 3071, 3814], situationalItems: [3147, 3179, 3158, 6693] },
  { name: 'Full Crit', role: 'Marksman', note: 'High DPS crit spike', startingItems: [1055, 3340], coreItems: [6671, 3031, 3006, 6675], situationalItems: [3036, 3085, 3124, 3072] },
  { name: 'Hybrid', role: 'Mage', note: 'Flexible damage and utility', startingItems: [1056, 2003], coreItems: [3115, 3089, 3157, 3135], situationalItems: [4629, 4645, 6656, 3742] },
  { name: 'Poke Mage', role: 'Mage', note: 'Long range poke and haste', startingItems: [1056, 2003], coreItems: [6655, 3020, 4645, 4629], situationalItems: [3135, 3157, 3089, 3102] },
  { name: 'Drain Mage', role: 'Mage', note: 'Sustain and extended fights', startingItems: [1056, 2003], coreItems: [6653, 3157, 4637, 4645], situationalItems: [3135, 4628, 3020, 3165] },
  { name: 'Split Fighter', role: 'Fighter', note: 'Side lane pressure', startingItems: [1055, 2003], coreItems: [6632, 3071, 3047, 3053], situationalItems: [3074, 6333, 3748, 3053] },
  { name: 'Warden Tank', role: 'Tank', note: 'Peel and engage', startingItems: [1054, 2003], coreItems: [3111, 3068, 3193, 3109], situationalItems: [3075, 3065, 4401, 3009] },
  { name: 'Enchanter Utility', role: 'Support', note: 'Shields and haste utility', startingItems: [3850, 2003], coreItems: [6616, 6617, 3107, 3504], situationalItems: [4005, 3222, 2065, 3158] },
  { name: 'Engage Support', role: 'Support', note: 'Initiation and lockdown', startingItems: [3867, 2003], coreItems: [3190, 3117, 3109, 3050], situationalItems: [3107, 3009, 3110, 4401] },
  { name: 'Duelist Carry', role: 'Fighter', note: 'Skirmish and snowball', startingItems: [1055, 2003], coreItems: [6673, 3044, 3071, 3153], situationalItems: [3124, 3026, 3053, 3074] },
  { name: 'Ability Marksman', role: 'Marksman', note: 'Caster marksman setup', startingItems: [1055, 2003], coreItems: [3508, 3006, 6694, 6676], situationalItems: [3036, 3814, 3031, 3158] },
  { name: 'Frontline Bruiser', role: 'Fighter', note: 'Durable dive build', startingItems: [1054, 2003], coreItems: [3067, 3047, 3071, 3053], situationalItems: [3075, 3748, 6333, 4401] },
  { name: 'Anti-Heal Core', role: 'Marksman', note: 'Punish sustain-heavy teams', startingItems: [1055, 2003], coreItems: [6672, 3006, 3031, 3035], situationalItems: [3124, 3036, 3095, 3072] },
];

const BOOTS_POOL = [3006, 3020, 3047, 3111, 3009, 3117, 3158];

const LEGENDARY_POOLS = {
  AP: [3089, 3135, 3157, 3165, 4628, 4629, 4633, 4645, 6653, 6655, 6656],
  AD: [3031, 3036, 3072, 3085, 3094, 3124, 3153, 3508, 6672, 6675, 6676, 6694],
  TANK: [3065, 3068, 3075, 3083, 3109, 3110, 3143, 3193, 3742, 4401, 6662, 6664],
  ASSASSIN: [3142, 3147, 3179, 3814, 6692, 6693, 6695, 6676, 3071, 3033],
};

type ChaosArchetype = 'AP' | 'AD' | 'TANK' | 'ASSASSIN' | 'ANY';

type PlayerRole = 'ADC' | 'JUNGLE' | 'TOP' | 'MID' | 'SUPPORT' | 'UNKNOWN';

const CHAOS_STARTERS: Record<ChaosArchetype, number[]> = {
  AP: [1056, 2003],
  AD: [1055, 2003],
  TANK: [1054, 2003],
  ASSASSIN: [1036, 2003],
  ANY: [1055, 2003],
};

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickManyUnique(items: number[], count: number): number[] {
  const unique = Array.from(new Set(items));
  const shuffled = unique.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function mapPositionToRole(value: string | undefined): PlayerRole {
  const v = (value ?? '').toUpperCase();
  if (v.includes('JUNGLE')) return 'JUNGLE';
  if (v.includes('BOTTOM') || v.includes('BOT') || v.includes('ADC')) return 'ADC';
  if (v.includes('MIDDLE') || v.includes('MID')) return 'MID';
  if (v.includes('UTILITY') || v.includes('SUPPORT')) return 'SUPPORT';
  if (v.includes('TOP')) return 'TOP';
  return 'UNKNOWN';
}

function buildAdcLegendaryPath(): BuildTemplate {
  const boot = pickOne(BOOTS_POOL);
  const legendaryAdcPool = [
    ...LEGENDARY_POOLS.AD.filter((id) => !BOOTS_POOL.includes(id)),
    3031, 3036, 3072, 3085, 3094, 3124, 3153, 6671, 6672, 6673, 6675, 6676,
  ];
  const sixLegendaries = pickManyUnique(legendaryAdcPool, 6);

  return {
    name: 'ADC Mystery Path',
    role: 'Marksman',
    note: '1 boots + 6 legendary items',
    startingItems: [1055, 2003],
    coreItems: [boot, ...sixLegendaries],
    situationalItems: [],
  };
}

function randomizeSummonerSpells(role: PlayerRole) {
  const flash = SUMMONER_SPELLS.find((s) => s.id === 4) ?? SUMMONER_SPELLS[0];
  const smite = SUMMONER_SPELLS.find((s) => s.id === 11) ?? SUMMONER_SPELLS[0];

  if (role === 'JUNGLE') {
    // Jungle: always smite, randomize which key
    return Math.random() < 0.5
      ? { first: smite, second: flash }
      : { first: flash, second: smite };
  }

  const pool = SUMMONER_SPELLS.filter((s) => s.id !== 4 && s.id !== 11);
  const other = pickOne(pool);
  // Non-jungle: both spells randomized, all placements equally likely
  return Math.random() < 0.5
    ? { first: flash, second: other }
    : { first: other, second: flash };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function Randomizer() {
  const [masteries, setMasteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [excludeMastery10Plus, setExcludeMastery10Plus] = useState(false);
  const [randomizeChampion, setRandomizeChampion] = useState(true);
  const [randomizeRunes, setRandomizeRunes] = useState(true);
  const [randomizeSpells, setRandomizeSpells] = useState(true);
  const [randomizeBuild, setRandomizeBuild] = useState(true);
  const [includeChaosItems, setIncludeChaosItems] = useState(false);
  const [chaosArchetype, setChaosArchetype] = useState<ChaosArchetype>('ANY');
  const [detectedRole, setDetectedRole] = useState<PlayerRole>('UNKNOWN');
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [autoApplying, setAutoApplying] = useState(false);
  const [randomChampion, setRandomChampion] = useState<any | null>(null);
  const [randomRunePage, setRandomRunePage] = useState<RuneTemplate | null>(null);
  const [perkStyles, setPerkStyles] = useState<PerkStyle[]>([]);
  const [randomSpells, setRandomSpells] = useState<{ first: { id: number; name: string }; second: { id: number; name: string } } | null>(null);
  const [randomBuild, setRandomBuild] = useState<BuildTemplate | null>(null);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'idle' | 'success' | 'error' | 'loading'; text: string }>({ kind: 'idle', text: '' });
  const wasInChampSelectRef = useRef(false);
  const autoBanDoneRef = useRef(false);
  const autoPickDoneRef = useRef(false);
  const banPhaseDetectedRef = useRef(false);
  const lastBanAttemptRef = useRef(0);
  const lastBanActionIdRef = useRef<number | null>(null);
  const pendingAutoLoadoutRef = useRef<{
    champion: any | null;
    runePage: RuneTemplate | null;
    spells: { first: { id: number; name: string }; second: { id: number; name: string } } | null;
    build: BuildTemplate | null;
  } | null>(null);
  const [, setNamesLoadedTick] = useState(0);

  useEffect(() => {
    loadChampionNames().then(() => setNamesLoadedTick((v) => v + 1));
    getChampionMasteries().then((m) => {
      if (Array.isArray(m) && m.length > 0) setMasteries(m);
      setLoading(false);
    });

    lcuRequest({ method: 'GET', endpoint: '/lol-perks/v1/styles' }).then((res) => {
      if (res.status >= 200 && res.status < 300 && res.body) {
        const data = JSON.parse(res.body);
        if (Array.isArray(data)) setPerkStyles(data);
      }
    }).catch(() => undefined);
  }, []);

  const eligibleMasteries = useMemo(() => {
    const pool = excludeMastery10Plus
      ? masteries.filter(m => (m.championLevel ?? 0) < 10)
      : masteries;
    return pool.length > 0 ? pool : masteries;
  }, [masteries, excludeMastery10Plus]);

  const randomChampionCount = eligibleMasteries.length;

  const runeTreeById = useMemo(() => new Map(RUNE_TREES.map(t => [t.id, t.name])), []);

  const buildChaosTemplate = (archetype: ChaosArchetype): BuildTemplate => {
    const legendaryPool = archetype === 'ANY'
      ? [
          ...LEGENDARY_POOLS.AP,
          ...LEGENDARY_POOLS.AD,
          ...LEGENDARY_POOLS.TANK,
          ...LEGENDARY_POOLS.ASSASSIN,
        ]
      : LEGENDARY_POOLS[archetype];

    const boot = pickOne(BOOTS_POOL);
    const randomCore = pickManyUnique(legendaryPool, 3);
    const randomSituational = pickManyUnique(legendaryPool.filter((id) => !randomCore.includes(id)), 4);

    return {
      name: `${archetype} Chaos`,
      role: archetype === 'ANY' ? 'Wildcard' : archetype,
      note: 'Boots first, then random legendary items',
      startingItems: CHAOS_STARTERS[archetype],
      coreItems: [boot, ...randomCore],
      situationalItems: randomSituational,
    };
  };

  const detectRoleFromChampSelect = async (): Promise<PlayerRole> => {
    const candidates = ['/lol-champ-select/v1/session', '/lol-champ-select-legacy/v1/session'];
    for (const endpoint of candidates) {
      const res = await lcuRequest({ method: 'GET', endpoint });
      if (!(res.status >= 200 && res.status < 300 && res.body)) continue;
      const session = JSON.parse(res.body);
      const localCellId = session?.localPlayerCellId;
      const me = Array.isArray(session?.myTeam)
        ? session.myTeam.find((m: any) => m?.cellId === localCellId)
        : null;
      const role = mapPositionToRole(
        me?.assignedPosition
        ?? me?.position
        ?? me?.selectedPosition
        ?? me?.role
      );
      setDetectedRole(role);
      return role;
    }
    setDetectedRole('UNKNOWN');
    return 'UNKNOWN';
  };

  const buildRandomRuneTemplate = (): RuneTemplate => {
    if (!perkStyles.length) return pickOne(RUNE_TEMPLATES);

    const perkIdsFromSlot = (slot?: { perks?: Array<number | { id: number; name?: string }> }): number[] => {
      if (!slot?.perks || !Array.isArray(slot.perks)) return [];
      return slot.perks
        .map((perk) => (typeof perk === 'number' ? perk : perk?.id))
        .filter((id): id is number => typeof id === 'number');
    };

    for (let attempt = 0; attempt < 10; attempt++) {
      const primaryPool = perkStyles.filter((style) => {
        const regular = (style.slots ?? []).filter((slot) => slot.type !== 'kStatMod');
        const stat = (style.slots ?? []).filter((slot) => slot.type === 'kStatMod');
        return regular.length >= 4 && stat.length >= 3;
      });
      const primary = primaryPool.length > 0 ? pickOne(primaryPool) : pickOne(perkStyles);

      const secondaryPool = perkStyles.filter((style) => {
        if (style.id === primary.id) return false;
        if (Array.isArray(primary.allowedSubStyles) && primary.allowedSubStyles.length > 0) {
          return primary.allowedSubStyles.includes(style.id);
        }
        return true;
      });
      const secondaryCandidates = secondaryPool.length > 0 ? secondaryPool : perkStyles.filter((s) => s.id !== primary.id);
      const secondaryValid = secondaryCandidates.filter((style) => ((style.slots ?? []).filter((slot) => slot.type !== 'kStatMod').length >= 3));
      if (secondaryValid.length === 0) continue;
      const secondary = pickOne(secondaryValid);

      const primarySlots = primary.slots ?? [];
      const primaryRegularSlots = primarySlots.filter((slot) => slot.type !== 'kStatMod');
      const primaryStatSlots = primarySlots.filter((slot) => slot.type === 'kStatMod');
      if (primaryRegularSlots.length < 4 || primaryStatSlots.length < 3) continue;

      const kPool = perkIdsFromSlot(primaryRegularSlots[0]);
      const p1Pool = perkIdsFromSlot(primaryRegularSlots[1]);
      const p2Pool = perkIdsFromSlot(primaryRegularSlots[2]);
      const p3Pool = perkIdsFromSlot(primaryRegularSlots[3]);
      if (!kPool.length || !p1Pool.length || !p2Pool.length || !p3Pool.length) continue;

      const keystone = pickOne(kPool);
      const p1 = pickOne(p1Pool);
      const p2 = pickOne(p2Pool);
      const p3 = pickOne(p3Pool);

      const secondarySlots = (secondary.slots ?? []).filter((slot) => slot.type !== 'kStatMod').slice(1);
      const validSecondarySlots = secondarySlots.filter((slot) => perkIdsFromSlot(slot).length > 0);
      if (validSecondarySlots.length < 2) continue;
      const firstSecondarySlot = pickOne(validSecondarySlots);
      const secondSecondaryPool = validSecondarySlots.filter((s) => s !== firstSecondarySlot);
      if (secondSecondaryPool.length === 0) continue;
      const secondSecondarySlot = pickOne(secondSecondaryPool);
      const s1 = pickOne(perkIdsFromSlot(firstSecondarySlot));
      const s2 = pickOne(perkIdsFromSlot(secondSecondarySlot));

      const stat1Pool = perkIdsFromSlot(primaryStatSlots[0]);
      const stat2Pool = perkIdsFromSlot(primaryStatSlots[1]);
      const stat3Pool = perkIdsFromSlot(primaryStatSlots[2]);
      if (!stat1Pool.length || !stat2Pool.length || !stat3Pool.length) continue;
      const stat1 = pickOne(stat1Pool);
      const stat2 = pickOne(stat2Pool);
      const stat3 = pickOne(stat3Pool);

      const selectedPerkIds = [keystone, p1, p2, p3, s1, s2, stat1, stat2, stat3]
        .filter((id): id is number => typeof id === 'number');

      if (selectedPerkIds.length !== 9 || new Set(selectedPerkIds).size !== 9) continue;

      return {
        name: `${primary.name} / ${secondary.name}`,
        primaryStyleId: primary.id,
        subStyleId: secondary.id,
        selectedPerkIds,
        highlight: `${primary.name} core with ${secondary.name} secondary`,
      };
    }

    return pickOne(RUNE_TEMPLATES);
  };

  const rollLoadout = (roleOverride?: PlayerRole, options?: { commit?: boolean }) => {
    const role = roleOverride ?? detectedRole;
    const champion = randomizeChampion && eligibleMasteries.length > 0 ? pickOne(eligibleMasteries) : randomChampion;
    const runePage = randomizeRunes ? buildRandomRuneTemplate() : randomRunePage;
    const spells = randomizeSpells ? randomizeSummonerSpells(role) : randomSpells;

    let build = randomizeBuild ? pickOne(BUILD_TEMPLATES) : randomBuild;
    if (randomizeBuild && includeChaosItems) {
      build = buildChaosTemplate(chaosArchetype);
    }
    if (randomizeBuild && role === 'ADC') {
      build = buildAdcLegendaryPath();
    }

    if (options?.commit !== false) {
      setRandomChampion(champion ?? null);
      setRandomRunePage(runePage ?? null);
      setRandomSpells(spells ?? null);
      setRandomBuild(build ?? null);
      setFeedback({ kind: 'success', text: 'Randomized new loadout' });
    }

    return {
      champion: champion ?? null,
      runePage: runePage ?? null,
      spells: spells ?? null,
      build: build ?? null,
    };
  };

  const randomizeAll = async () => {
    const role = await detectRoleFromChampSelect();
    rollLoadout(role);
  };

  const attemptLcuCandidates = async (candidates: { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; endpoint: string; body?: any }[]) => {
    for (const candidate of candidates) {
      const response = await lcuRequest({
        method: candidate.method,
        endpoint: candidate.endpoint,
        body: candidate.body,
      });
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
    }
    return null;
  };

  const getChampSelectState = async () => {
    const candidates = ['/lol-champ-select/v1/session', '/lol-champ-select-legacy/v1/session'];
    for (const endpoint of candidates) {
      const res = await lcuRequest({ method: 'GET', endpoint });
      if (!(res.status >= 200 && res.status < 300 && res.body)) continue;
      const session = JSON.parse(res.body);
      const localCellId = session?.localPlayerCellId;
      const timerPhase = String(session?.timer?.phase ?? '');
      const isBanPickPhase = timerPhase === 'BAN_PICK';
      const actionRounds = Array.isArray(session?.actions) ? session.actions : [];
      const currentRound = actionRounds.find((round: any) => Array.isArray(round) && round.some((a: any) => a?.isInProgress === true));
      const currentActions = Array.isArray(currentRound) ? currentRound : [];
      const isOpenBan = (action: any) => action?.type === 'ban' && action?.completed !== true;
      const isOpenPick = (action: any) => action?.type === 'pick' && action?.completed !== true;

      const myBan = currentActions.find((action: any) => action?.actorCellId === localCellId && isOpenBan(action));
      const myPick = currentActions.find((action: any) => action?.actorCellId === localCellId && isOpenPick(action));

      // Ban turn: only proceed during BAN_PICK timer phase, with strict local in-progress action.
      const banActionInProgress = myBan && myBan?.completed !== true && myBan?.isInProgress === true;
      const otherBansInProgress = currentActions.some((a: any) => 
        a?.type === 'ban' && a?.completed !== true && a?.isInProgress === true && a?.actorCellId !== localCellId
      );
      const hasBanTurn = isBanPickPhase && banActionInProgress && !otherBansInProgress;

      // Pick turn: my action must be in progress AND no other uncompleted picks are in progress
      const pickActionInProgress = myPick && myPick?.completed !== true && myPick?.isInProgress === true;
      const otherPicksInProgress = currentActions.some((a: any) => 
        a?.type === 'pick' && a?.completed !== true && a?.isInProgress === true && a?.actorCellId !== localCellId
      );
      const hasPickTurn = pickActionInProgress && !otherPicksInProgress;

      return {
        endpoint,
        session,
        timerPhase,
        isBanPickPhase,
        banAction: myBan,
        pickAction: myPick,
        hasOpenBan: hasBanTurn,
        hasOpenPick: hasPickTurn,
      };
    }
    return null;
  };

  const exportRunes = async (runePage: RuneTemplate | null, champion: any | null) => {
    if (!runePage) return false;
    const currentPage = await lcuRequest({ method: 'GET', endpoint: '/lol-perks/v1/currentpage' });
    const currentPageData = currentPage.status === 200 && currentPage.body ? JSON.parse(currentPage.body) : {};
    const championName = champion ? getChampionName(champion.championId) : 'Random';
    const pagePayload = {
      name: `SuperLeague · ${championName} · ${runePage.name}`,
      primaryStyleId: runePage.primaryStyleId,
      subStyleId: runePage.subStyleId,
      selectedPerkIds: runePage.selectedPerkIds,
      current: true,
    };

    const updated = currentPageData?.id
      ? await attemptLcuCandidates([
          {
            method: 'PUT',
            endpoint: `/lol-perks/v1/pages/${currentPageData.id}`,
            body: { ...pagePayload, id: currentPageData.id },
          },
          { method: 'POST', endpoint: '/lol-perks/v1/pages', body: pagePayload },
        ])
      : await attemptLcuCandidates([
          { method: 'POST', endpoint: '/lol-perks/v1/pages', body: pagePayload },
        ]);

    if (!updated) return false;

    const verify = await lcuRequest({ method: 'GET', endpoint: '/lol-perks/v1/currentpage' });
    if (verify.status >= 200 && verify.status < 300 && verify.body) {
      const selected = JSON.parse(verify.body);
      const selectedIds = Array.isArray(selected?.selectedPerkIds)
        ? selected.selectedPerkIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
        : [];
      const expectedIds = runePage.selectedPerkIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      const selectedSet = new Set(selectedIds);
      const expectedSet = new Set(expectedIds);
      const samePerks = selectedSet.size === expectedSet.size
        && [...expectedSet].every((id) => selectedSet.has(id));
      if (!samePerks) return false;
    }

    return true;
  };

  const exportChampionToClient = async (
    champion: any | null,
    runePage: RuneTemplate | null,
    spells: { first: { id: number; name: string }; second: { id: number; name: string } } | null,
  ) => {
    if (!champion) return false;
    let sessionPath = '/lol-champ-select/v1/session';
    let mySelectionPath = '/lol-champ-select/v1/session/my-selection';
    let session = await lcuRequest({ method: 'GET', endpoint: sessionPath });
    if (!(session.status >= 200 && session.status < 300 && session.body)) {
      sessionPath = '/lol-champ-select-legacy/v1/session';
      mySelectionPath = '/lol-champ-select-legacy/v1/session/my-selection';
      session = await lcuRequest({ method: 'GET', endpoint: sessionPath });
    }
    if (!(session.status >= 200 && session.status < 300 && session.body)) return false;

    const data = JSON.parse(session.body);
    const actions = Array.isArray(data.actions) ? data.actions.flat() : [];
    const localCellId = data.localPlayerCellId;
    const myAction = actions.find((action: any) => action.actorCellId === localCellId && action.type === 'pick' && !action.completed)
      ?? actions.find((action: any) => !action.completed);

    const championId = champion.championId;
    const spell1Id = spells?.first?.id ?? 4;
    const spell2Id = spells?.second?.id ?? 14;

    const mySelection = await attemptLcuCandidates([
      {
        method: 'PATCH',
        endpoint: mySelectionPath,
        body: {
          championId,
          spell1Id,
          spell2Id,
          selectedPerkIds: runePage?.selectedPerkIds ?? [],
        },
      },
      {
        method: 'PUT',
        endpoint: mySelectionPath,
        body: {
          championId,
          spell1Id,
          spell2Id,
          selectedPerkIds: runePage?.selectedPerkIds ?? [],
        },
      },
    ]);

    const actionPatchPayload = (action: any) => ({
      ...action,
      championId,
      completed: true,
    });

    const hasActionId = (action: any) => action && action.id !== undefined && action.id !== null;

    let lockAction = hasActionId(myAction)
      ? await attemptLcuCandidates([
          {
            method: 'PATCH',
            endpoint: `${sessionPath}/actions/${myAction.id}`,
            body: actionPatchPayload(myAction),
          },
          {
            method: 'PATCH',
            endpoint: `${sessionPath}/actions/${myAction.id}`,
            body: { completed: true },
          },
          {
            method: 'PATCH',
            endpoint: `${sessionPath}/actions/${myAction.id}`,
            body: { championId, completed: true },
          },
          {
            method: 'POST',
            endpoint: `${sessionPath}/actions/${myAction.id}/complete`,
            body: {},
          },
        ])
      : null;

    // If it's not our action yet, keep polling briefly and lock as soon as the pick action opens.
    if (!lockAction) {
      for (let i = 0; i < 30; i++) {
        await delay(1000);
        const sessionPoll = await lcuRequest({ method: 'GET', endpoint: sessionPath });
        if (!(sessionPoll.status >= 200 && sessionPoll.status < 300 && sessionPoll.body)) continue;
        const polled = JSON.parse(sessionPoll.body);
        const polledActions = Array.isArray(polled.actions) ? polled.actions.flat() : [];
        const pickAction = polledActions.find((action: any) => action.actorCellId === polled.localPlayerCellId && action.type === 'pick' && !action.completed);
        if (!hasActionId(pickAction)) continue;

        lockAction = await attemptLcuCandidates([
          {
            method: 'PATCH',
            endpoint: `${sessionPath}/actions/${pickAction.id}`,
            body: actionPatchPayload(pickAction),
          },
          {
            method: 'PATCH',
            endpoint: `${sessionPath}/actions/${pickAction.id}`,
            body: { completed: true },
          },
          {
            method: 'PATCH',
            endpoint: `${sessionPath}/actions/${pickAction.id}`,
            body: { championId, completed: true },
          },
          {
            method: 'POST',
            endpoint: `${sessionPath}/actions/${pickAction.id}/complete`,
            body: {},
          },
        ]);

        if (lockAction) break;
      }
    }

    const lockRequired = hasActionId(myAction);
    return Boolean(mySelection) && (!lockRequired || Boolean(lockAction));
  };

  const exportBuildToClient = async (build: BuildTemplate | null, champion: any | null) => {
    if (!build) return false;
    const summoner = await getCurrentSummoner();
    const accountId = summoner?.accountId ?? summoner?.summonerId ?? 0;
    const buildSet = {
      accountId,
      itemSets: [{
        title: `SuperLeague · ${build.name}`,
        type: 'custom',
        map: 'SR',
        mode: 'CLASSIC',
        priority: 0,
        sortrank: 0,
        blocks: [
          { type: 'Starting', items: build.startingItems.map((id) => ({ id: String(id), count: 1 })) },
          { type: 'Core', items: build.coreItems.map((id) => ({ id: String(id), count: 1 })) },
          { type: 'Situational', items: build.situationalItems.map((id) => ({ id: String(id), count: 1 })) },
        ],
        associatedChampions: champion ? [champion.championId] : [],
        associatedMaps: [11],
      }],
    };

    const summonerId = summoner?.summonerId ?? null;
    const candidates = [
      ...(accountId ? [{ method: 'PUT' as const, endpoint: `/lol-item-sets/v1/item-sets/${accountId}/sets`, body: buildSet }] : []),
      ...(summonerId ? [{ method: 'PUT' as const, endpoint: `/lol-item-sets/v1/item-sets/${summonerId}/sets`, body: buildSet }] : []),
      { method: 'POST' as const, endpoint: '/lol-item-sets/v1/item-sets', body: buildSet },
      { method: 'PUT' as const, endpoint: '/lol-item-sets/v1/item-sets', body: buildSet },
    ];

    const applied = await attemptLcuCandidates(candidates);
    if (!applied) {
      await navigator.clipboard.writeText(JSON.stringify(buildSet, null, 2));
      return false;
    }

    return true;
  };

  const exportEverything = async (rolled?: {
    champion: any | null;
    runePage: RuneTemplate | null;
    spells: { first: { id: number; name: string }; second: { id: number; name: string } } | null;
    build: BuildTemplate | null;
  }) => {
    if (exporting) return;
    setExporting(true);
    setFeedback({ kind: 'loading', text: 'Exporting to client…' });

    try {
      const champion = rolled?.champion ?? randomChampion;
      const runePage = rolled?.runePage ?? randomRunePage;
      const spells = rolled?.spells ?? randomSpells;
      const build = rolled?.build ?? randomBuild;

      const phaseResponse = await lcuRequest({ method: 'GET', endpoint: '/lol-gameflow/v1/gameflow-phase' });
      const phase = phaseResponse.status === 200 && phaseResponse.body ? String(JSON.parse(phaseResponse.body)) : 'Unknown';

      const runeOk = await exportRunes(runePage, champion);
      const champOk = randomizeChampion ? await exportChampionToClient(champion, runePage, spells) : true;
      const buildOk = randomizeBuild ? await exportBuildToClient(build, champion) : true;

      setFeedback({
        kind: 'success',
        text: [
          runeOk ? 'runes applied' : 'runes failed',
          champOk ? 'champion applied' : `champion skipped (${phase})`,
          buildOk ? 'build exported' : 'build copied',
        ].join(' · '),
      });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', text: 'Export failed. Check the League client is open.' });
    } finally {
      setExporting(false);
    }
  };

  const autoApplyMysteryFlow = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const state = await getChampSelectState();
      if (!state) {
        setFeedback({ kind: 'error', text: 'Not in champ select' });
        return;
      }

      // Detect when timer confirms BAN_PICK has started.
      if (state.isBanPickPhase) {
        banPhaseDetectedRef.current = true;
      }

      if (!pendingAutoLoadoutRef.current) {
        const role = await detectRoleFromChampSelect();
        pendingAutoLoadoutRef.current = rollLoadout(role, { commit: false });
      }
      const pending = pendingAutoLoadoutRef.current;
      if (!pending) return;

      // Ban: only attempt if ban phase has been detected
      if (state.hasOpenBan && !autoBanDoneRef.current && banPhaseDetectedRef.current) {
        const currentBanActionId = state.banAction?.id;
        const isSameBanAction = currentBanActionId !== undefined && currentBanActionId === lastBanActionIdRef.current;
        const timeSinceLastAttempt = Date.now() - lastBanAttemptRef.current;
        
        if (!isSameBanAction || timeSinceLastAttempt > 3000) {
          lastBanAttemptRef.current = Date.now();
          lastBanActionIdRef.current = currentBanActionId ?? null;
          const banOk = await randomBanChampion({ internal: true, requireInProgress: true });
          if (banOk) {
            autoBanDoneRef.current = true;
            setFeedback({ kind: 'success', text: 'Auto ban completed' });
          }
        }
      }

      if (state.hasOpenPick && !autoPickDoneRef.current) {
        const champOk = randomizeChampion
          ? await exportChampionToClient(pending.champion, pending.runePage, pending.spells)
          : true;

        if (champOk) {
          setRandomChampion(pending.champion ?? null);
          setRandomRunePage(pending.runePage ?? null);
          setRandomSpells(pending.spells ?? null);
          setRandomBuild(pending.build ?? null);

          const runeOk = await exportRunes(pending.runePage, pending.champion);
          const buildOk = randomizeBuild ? await exportBuildToClient(pending.build, pending.champion) : true;

          autoPickDoneRef.current = true;
          setFeedback({
            kind: 'success',
            text: [
              'pick locked',
              runeOk ? 'runes applied' : 'runes failed',
              buildOk ? 'build exported' : 'build copied',
            ].join(' · '),
          });
        } else {
          setFeedback({ kind: 'loading', text: 'Waiting for pick turn...' });
        }
      }
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', text: 'Auto apply failed in mystery flow.' });
    } finally {
      setExporting(false);
    }
  };

  const randomBanChampion = async (options?: { internal?: boolean; requireInProgress?: boolean }) => {
    const internal = options?.internal === true;
    const requireInProgress = options?.requireInProgress === true;
    if (exporting && !internal) return;
    if (!internal) {
      setExporting(true);
      setFeedback({ kind: 'loading', text: 'Trying random ban…' });
    }

    try {
      let sessionPath = '/lol-champ-select/v1/session';
      let session = await lcuRequest({ method: 'GET', endpoint: sessionPath });
      if (!(session.status >= 200 && session.status < 300 && session.body)) {
        sessionPath = '/lol-champ-select-legacy/v1/session';
        session = await lcuRequest({ method: 'GET', endpoint: sessionPath });
      }
      if (!(session.status >= 200 && session.status < 300 && session.body)) {
        setFeedback({ kind: 'error', text: 'Not in champ select' });
        return false;
      }

      const data = JSON.parse(session.body);
      const timerPhase = String(data?.timer?.phase ?? '');
      if (requireInProgress && timerPhase !== 'BAN_PICK') {
        if (!internal) setFeedback({ kind: 'error', text: 'Ban phase not started yet' });
        return false;
      }
      const actionRounds = Array.isArray(data.actions) ? data.actions : [];
      const currentRound = actionRounds.find((round: any) => Array.isArray(round) && round.some((a: any) => a?.isInProgress === true));
      const currentActions = Array.isArray(currentRound) ? currentRound : [];
      const actions = actionRounds.flat();
      const localCellId = data.localPlayerCellId;
      const hasActionId = (action: any) => action && action.id !== undefined && action.id !== null;
      const isOpenBan = (action: any) => action?.type === 'ban' && action?.completed !== true;
      const isInProgressBan = (action: any) => isOpenBan(action) && action?.isInProgress === true;

      const myBan = requireInProgress
        ? currentActions.find((action: any) => action.actorCellId === localCellId && isInProgressBan(action))
        : actions.find((action: any) => action.actorCellId === localCellId && isInProgressBan(action))
          ?? actions.find((action: any) => isInProgressBan(action))
          ?? actions.find((action: any) => action.actorCellId === localCellId && isOpenBan(action))
          ?? actions.find((action: any) => isOpenBan(action));

      if (!hasActionId(myBan)) {
        if (!internal) setFeedback({ kind: 'error', text: 'No open ban action' });
        return false;
      }

      const allChampionIds = Object.keys(championNames).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
      const fallbackPool = eligibleMasteries.map((m) => Number(m.championId)).filter((id) => Number.isFinite(id) && id > 0);
      const banPool = allChampionIds.length > 0 ? allChampionIds : fallbackPool;

      if (banPool.length === 0) {
        setFeedback({ kind: 'error', text: 'No champions available for ban pool' });
        return false;
      }

      const banChampionId = pickOne(banPool);
      const ban = await attemptLcuCandidates([
        {
          method: 'PATCH',
          endpoint: `${sessionPath}/actions/${myBan.id}`,
          body: { ...myBan, championId: banChampionId, completed: true },
        },
        {
          method: 'PATCH',
          endpoint: `${sessionPath}/actions/${myBan.id}`,
          body: { championId: banChampionId, completed: true },
        },
        {
          method: 'POST',
          endpoint: `${sessionPath}/actions/${myBan.id}/complete`,
          body: {},
        },
      ]);

      if (ban) {
        let lockedBanId = banChampionId;
        try {
          const fromBody = ban.body ? JSON.parse(ban.body) : null;
          if (typeof fromBody?.championId === 'number' && fromBody.championId > 0) {
            lockedBanId = fromBody.championId;
          } else {
            const verify = await lcuRequest({ method: 'GET', endpoint: sessionPath });
            if (verify.status >= 200 && verify.status < 300 && verify.body) {
              const verified = JSON.parse(verify.body);
              const verifiedActions = Array.isArray(verified?.actions) ? verified.actions.flat() : [];
              const lockedAction = verifiedActions.find((a: any) => a?.id === myBan.id);
              if (typeof lockedAction?.championId === 'number' && lockedAction.championId > 0) {
                lockedBanId = lockedAction.championId;
              }
            }
          }
        } catch {
          // Keep fallback id.
        }

        const lockedName = await getChampionNameResolved(lockedBanId);
        setFeedback({ kind: 'success', text: `Random ban locked: ${lockedName}` });
        return true;
      } else {
        setFeedback({ kind: 'error', text: 'Ban failed. Wait for your ban turn.' });
        return false;
      }
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', text: 'Ban failed. Check League client state.' });
      return false;
    } finally {
      if (!internal) setExporting(false);
    }
  };

  useEffect(() => {
    if (!autoApplyEnabled) {
      wasInChampSelectRef.current = false;
      autoBanDoneRef.current = false;
      autoPickDoneRef.current = false;
      pendingAutoLoadoutRef.current = null;
      return;
    }

    const interval = setInterval(async () => {
      if (exporting || autoApplying) return;

      const phaseResponse = await lcuRequest({ method: 'GET', endpoint: '/lol-gameflow/v1/gameflow-phase' });
      const phase = phaseResponse.status === 200 && phaseResponse.body ? String(JSON.parse(phaseResponse.body)) : 'Unknown';
      const inChampSelect = phase === 'ChampSelect';

      if (!inChampSelect) {
        wasInChampSelectRef.current = false;
        autoBanDoneRef.current = false;
        autoPickDoneRef.current = false;
        banPhaseDetectedRef.current = false;
        lastBanAttemptRef.current = 0;
        lastBanActionIdRef.current = null;
        pendingAutoLoadoutRef.current = null;
        return;
      }

      wasInChampSelectRef.current = true;

      setAutoApplying(true);
      try {
        await autoApplyMysteryFlow();
      } finally {
        setAutoApplying(false);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [
    autoApplyEnabled,
    autoApplying,
    exporting,
    randomizeChampion,
    randomizeRunes,
    randomizeSpells,
    randomizeBuild,
    includeChaosItems,
    chaosArchetype,
    eligibleMasteries,
    randomChampion,
    randomRunePage,
    randomSpells,
    randomBuild,
  ]);

  const selectedChampionName = randomChampion ? getChampionName(randomChampion.championId) : 'No champion rolled';

  return (
    <div className="p-4 md:p-5 space-y-4 animate-slide-up">
      <section className="card p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-ink-bright">Loadout Randomizer</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[10px] bg-white/[0.05] border border-white/[0.1] text-ink-ghost">{randomChampionCount} in pool</span>
            <span className={`px-2.5 py-1 rounded-full text-[10px] border ${excludeMastery10Plus ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-white/[0.05] border-white/[0.1] text-ink-ghost'}`}>
              <Lock size={10} className="inline-block mr-1" /> M10+ {excludeMastery10Plus ? 'excluded' : 'included'}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            onClick={randomizeAll}
            disabled={loading || (!randomizeChampion && !randomizeRunes && !randomizeSpells && !randomizeBuild)}
            className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-gold via-amber-500 to-teal-500 text-void font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shuffle size={14} /> Roll
          </button>
          <button
            onClick={() => exportEverything()}
            disabled={loading || exporting || (!randomizeChampion && !randomizeRunes && !randomizeSpells && !randomizeBuild)}
            className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-ink-bright font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Apply Now
          </button>
          <button
            onClick={() => randomBanChampion()}
            disabled={exporting}
            className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-ink-bright font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shield size={14} /> Random Ban
          </button>
          <button
            onClick={() => setAutoApplyEnabled((v) => !v)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${autoApplyEnabled ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' : 'bg-white/[0.04] text-ink-bright border-white/[0.08] hover:bg-white/[0.06]'}`}
          >
            {autoApplying ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Auto Apply: {autoApplyEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className={`mt-3 px-2.5 py-1.5 rounded-lg text-[11px] border ${feedback.kind === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : feedback.kind === 'error' ? 'bg-ruby/10 text-ruby border-ruby/30' : feedback.kind === 'loading' ? 'bg-white/[0.06] text-ink-ghost border-white/[0.1]' : 'bg-white/[0.04] text-ink-ghost border-white/[0.08]'}`}>
          {feedback.text || (exporting ? 'Exporting…' : autoApplyEnabled ? 'Auto apply checks champ select every ~4.5s' : 'Ready')}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink-bright">Randomizer Modules</h3>

          <label className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 cursor-pointer">
            <input type="checkbox" checked={randomizeChampion} onChange={(e) => setRandomizeChampion(e.target.checked)} className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-teal-500 checked:border-teal-500 cursor-pointer" />
            <Swords size={14} className="text-teal-300" />
            <span className="text-sm text-ink">Random Champion</span>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 cursor-pointer">
            <input type="checkbox" checked={randomizeRunes} onChange={(e) => setRandomizeRunes(e.target.checked)} className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-orange-500 checked:border-orange-500 cursor-pointer" />
            <Flame size={14} className="text-orange-300" />
            <span className="text-sm text-ink">Full Rune Page</span>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 cursor-pointer">
            <input type="checkbox" checked={randomizeSpells} onChange={(e) => setRandomizeSpells(e.target.checked)} className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-yellow-500 checked:border-yellow-500 cursor-pointer" />
            <span className="text-sm text-ink">Summoner Spells</span>
          </label>

          {randomizeSpells && (
            <p className="text-[11px] text-ink-ghost px-1">Spell key placement is fully random for all roles (including Jungle).</p>
          )}

          <label className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 cursor-pointer">
            <input type="checkbox" checked={randomizeBuild} onChange={(e) => setRandomizeBuild(e.target.checked)} className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-blue-500 checked:border-blue-500 cursor-pointer" />
            <Package size={14} className="text-blue-300" />
            <span className="text-sm text-ink">Build Path</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-muted px-1 pt-1">
            <input type="checkbox" checked={excludeMastery10Plus} onChange={(e) => setExcludeMastery10Plus(e.target.checked)} className="w-3.5 h-3.5 rounded border border-white/[0.1] bg-white/[0.05] checked:bg-gold checked:border-gold cursor-pointer" />
            Exclude Mastery 10+ champions
          </label>
        </section>

        <section className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink-bright">Build Path Chaos Mode</h3>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-muted">
            <input type="checkbox" checked={includeChaosItems} onChange={(e) => setIncludeChaosItems(e.target.checked)} className="w-3.5 h-3.5 rounded border border-white/[0.1] bg-white/[0.05] checked:bg-blue-500 checked:border-blue-500 cursor-pointer" />
            Include fully random legendary builds (boots first)
          </label>

          <div className="grid grid-cols-5 gap-1.5">
            {(['ANY', 'AP', 'AD', 'TANK', 'ASSASSIN'] as ChaosArchetype[]).map((type) => (
              <button
                key={type}
                onClick={() => setChaosArchetype(type)}
                className={`px-2 py-2 rounded-lg text-[10px] font-semibold border ${chaosArchetype === type ? 'bg-blue-500/15 text-blue-200 border-blue-500/30' : 'bg-white/[0.03] text-ink-ghost border-white/[0.07] hover:bg-white/[0.06]'}`}
              >
                {type}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-ink-ghost">When chaos mode is enabled, roll always generates a full random legendary path after boots.</p>
        </section>
      </div>

      <section className="card p-4 space-y-3">
        <h3 className="text-sm font-bold text-ink-bright">Current Roll</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 min-h-[86px]">
            <div className="text-[10px] text-ink-ghost mb-1">Champion</div>
            {randomChampion ? (
              <div className="flex items-center gap-2">
                <img src={getChampionIconUrl(randomChampion.championId)} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/[0.08]" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.35'; }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-bright truncate">{selectedChampionName}</p>
                  <p className="text-[10px] text-ink-ghost">Mastery {randomChampion.championLevel ?? 0}</p>
                </div>
              </div>
            ) : <p className="text-sm text-ink-dim">Not rolled</p>}
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 min-h-[86px]">
            <div className="text-[10px] text-ink-ghost mb-1">Full Rune Page</div>
            {randomRunePage ? (
              <>
                <p className="text-sm font-semibold text-ink-bright truncate">{randomRunePage.name}</p>
                <p className="text-[10px] text-ink-ghost">{runeTreeById.get(randomRunePage.primaryStyleId) ?? 'Unknown'} / {runeTreeById.get(randomRunePage.subStyleId) ?? 'Unknown'}</p>
              </>
            ) : <p className="text-sm text-ink-dim">Not rolled</p>}
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 min-h-[86px]">
            <div className="text-[10px] text-ink-ghost mb-1">Summoner Spells</div>
            {randomSpells ? (
              <>
                <p className="text-sm font-semibold text-ink-bright truncate">{randomSpells.first.name} / {randomSpells.second.name}</p>
                <p className="text-[10px] text-ink-ghost">Keys are randomized every roll</p>
              </>
            ) : <p className="text-sm text-ink-dim">Not rolled</p>}
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 min-h-[86px]">
            <div className="text-[10px] text-ink-ghost mb-1">Build Path</div>
            {randomBuild ? (
              <>
                <p className="text-sm font-semibold text-ink-bright truncate">{randomBuild.name}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {randomBuild.coreItems.slice(0, 4).map((id, idx) => (
                    <img key={`${id}-${idx}`} src={getItemIconUrl(id)} alt="" className="w-7 h-7 rounded-md border border-white/[0.08]" />
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-ink-dim">Not rolled</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
