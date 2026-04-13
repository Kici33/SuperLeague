import { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardCopy, Loader2, Package, Play, Shield, Shuffle, Swords, Zap, Flame, Sparkles, Lock } from 'lucide-react';
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

type RuneTree = {
  id: number;
  name: string;
  accent: string;
  tagline: string;
};

const RUNE_TREES: RuneTree[] = [
  { id: 8000, name: 'Precision', accent: '#C89B3C', tagline: 'Damage, tempo, finishing power' },
  { id: 8100, name: 'Domination', accent: '#E84057', tagline: 'Burst, picks, and snowballing' },
  { id: 8200, name: 'Sorcery', accent: '#576BCE', tagline: 'Poke, scaling, and spell weaving' },
  { id: 8300, name: 'Resolve', accent: '#4E9996', tagline: 'Durability, sustain, and front line' },
  { id: 8400, name: 'Inspiration', accent: '#9D48E0', tagline: 'Utility, tricks, and tempo' },
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
];

const ROLE_TO_STYLE: Record<string, string> = {
  Assassin: 'Assassin',
  Fighter: 'Fighter',
  Mage: 'Mage',
  Marksman: 'Marksman',
  Support: 'Support',
  Tank: 'Tank',
};

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function uniqueRandomPair<T>(items: T[]): [T, T] {
  const first = pickOne(items);
  let second = pickOne(items);
  while (second === first && items.length > 1) second = pickOne(items);
  return [first, second];
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
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
  const [flashPosition, setFlashPosition] = useState<'D' | 'F'>('D');
  const [randomChampion, setRandomChampion] = useState<any | null>(null);
  const [randomRunePage, setRandomRunePage] = useState<RuneTemplate | null>(null);
  const [perkStyles, setPerkStyles] = useState<PerkStyle[]>([]);
  const [randomSpells, setRandomSpells] = useState<{ first: any; second: any; flashReference: string } | null>(null);
  const [randomBuild, setRandomBuild] = useState<BuildTemplate | null>(null);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'idle' | 'success' | 'error' | 'loading'; text: string }>({ kind: 'idle', text: '' });

  useEffect(() => {
    loadChampionNames();
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

  const runeTreeById = useMemo(() => new Map(RUNE_TREES.map(t => [t.id, t])), []);

  const buildRandomRuneTemplate = (): RuneTemplate => {
    if (!perkStyles.length) return pickOne(RUNE_TEMPLATES);

    const perkIdsFromSlot = (slot?: { perks?: Array<number | { id: number; name?: string }> }): number[] => {
      if (!slot?.perks || !Array.isArray(slot.perks)) return [];
      return slot.perks
        .map((perk) => (typeof perk === 'number' ? perk : perk?.id))
        .filter((id): id is number => typeof id === 'number');
    };

    const primary = pickOne(perkStyles);
    const secondaryPool = perkStyles.filter((style) => {
      if (style.id === primary.id) return false;
      if (Array.isArray(primary.allowedSubStyles) && primary.allowedSubStyles.length > 0) {
        return primary.allowedSubStyles.includes(style.id);
      }
      return true;
    });
    const secondary = secondaryPool.length > 0 ? pickOne(secondaryPool) : pickOne(perkStyles.filter(s => s.id !== primary.id));

    const primarySlots = primary.slots ?? [];
    const primaryRegularSlots = primarySlots.filter((slot) => slot.type !== 'kStatMod');
    const primaryStatSlots = primarySlots.filter((slot) => slot.type === 'kStatMod');
    if (primaryRegularSlots.length < 4 || primaryStatSlots.length < 3) return pickOne(RUNE_TEMPLATES);

    const keystone = pickOne(perkIdsFromSlot(primaryRegularSlots[0]));
    const p1 = pickOne(perkIdsFromSlot(primaryRegularSlots[1]));
    const p2 = pickOne(perkIdsFromSlot(primaryRegularSlots[2]));
    const p3 = pickOne(perkIdsFromSlot(primaryRegularSlots[3]));

    const secondarySlots = (secondary.slots ?? []).filter((slot) => slot.type !== 'kStatMod').slice(1);
    const validSecondarySlots = secondarySlots.filter((slot) => perkIdsFromSlot(slot).length > 0);
    if (validSecondarySlots.length < 2) return pickOne(RUNE_TEMPLATES);
    const firstSecondarySlot = pickOne(validSecondarySlots);
    const secondSecondaryPool = validSecondarySlots.filter(s => s !== firstSecondarySlot);
    const secondSecondarySlot = secondSecondaryPool.length > 0 ? pickOne(secondSecondaryPool) : firstSecondarySlot;
    const s1 = pickOne(perkIdsFromSlot(firstSecondarySlot));
    const s2 = pickOne(perkIdsFromSlot(secondSecondarySlot));

    const stat1 = pickOne(perkIdsFromSlot(primaryStatSlots[0]));
    const stat2 = pickOne(perkIdsFromSlot(primaryStatSlots[1]));
    const stat3 = pickOne(perkIdsFromSlot(primaryStatSlots[2]));

    const selectedPerkIds = [keystone, p1, p2, p3, s1, s2, stat1, stat2, stat3]
      .filter((id): id is number => typeof id === 'number');

    if (selectedPerkIds.length !== 9 || new Set(selectedPerkIds).size !== 9) {
      return pickOne(RUNE_TEMPLATES);
    }

    return {
      name: `${primary.name} / ${secondary.name}`,
      primaryStyleId: primary.id,
      subStyleId: secondary.id,
      selectedPerkIds,
      highlight: `${primary.name} core with ${secondary.name} secondary`,
    };
  };

  const randomizeAll = () => {
    if (randomizeChampion && eligibleMasteries.length > 0) {
      setRandomChampion(pickOne(eligibleMasteries));
    }

    if (randomizeRunes) {
      setRandomRunePage(buildRandomRuneTemplate());
    }

    if (randomizeSpells) {
      const flash = SUMMONER_SPELLS.find(s => s.name === 'Flash') ?? SUMMONER_SPELLS[0];
      const others = SUMMONER_SPELLS.filter(s => s.id !== flash.id);
      const [firstOther, secondOther] = uniqueRandomPair(others);
      const prefersD = flashPosition === 'D';
      const flashReference = `Flash preference: ${flashPosition} key`;

      // Keep Flash on the preferred key when it is rolled; otherwise use the preference as the visual anchor.
      if (prefersD) {
        setRandomSpells({
          first: firstOther.id === flash.id ? flash : firstOther,
          second: secondOther.id === flash.id ? flash : secondOther,
          flashReference,
        });
      } else {
        setRandomSpells({
          first: firstOther.id === flash.id ? flash : firstOther,
          second: secondOther.id === flash.id ? flash : secondOther,
          flashReference,
        });
      }
    }

    if (randomizeBuild) {
      setRandomBuild(pickOne(BUILD_TEMPLATES));
    }

    setFeedback({ kind: 'success', text: 'Randomized new loadout' });
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

  const exportRunes = async () => {
    if (!randomRunePage) return false;
    const currentPage = await lcuRequest({ method: 'GET', endpoint: '/lol-perks/v1/currentpage' });
    const currentPageData = currentPage.status === 200 && currentPage.body ? JSON.parse(currentPage.body) : {};
    if (!currentPageData?.id) return false;
    const championName = randomChampion ? getChampionName(randomChampion.championId) : 'Random';
    const pagePayload = {
      id: currentPageData.id,
      name: `SuperLeague · ${championName} · ${randomRunePage.name}`,
      primaryStyleId: randomRunePage.primaryStyleId,
      subStyleId: randomRunePage.subStyleId,
      selectedPerkIds: randomRunePage.selectedPerkIds,
      current: true,
    };

    const updated = await attemptLcuCandidates([
      { method: 'PUT', endpoint: `/lol-perks/v1/pages/${currentPageData.id}`, body: pagePayload },
      { method: 'POST', endpoint: '/lol-perks/v1/pages', body: pagePayload },
    ]);

    if (!updated) return false;

    const verify = await lcuRequest({ method: 'GET', endpoint: '/lol-perks/v1/currentpage' });
    if (verify.status >= 200 && verify.status < 300 && verify.body) {
      const selected = JSON.parse(verify.body);
      const selectedIds = Array.isArray(selected?.selectedPerkIds) ? selected.selectedPerkIds : [];
      const samePerks = selectedIds.length === randomRunePage.selectedPerkIds.length
        && selectedIds.every((id: number, idx: number) => id === randomRunePage.selectedPerkIds[idx]);
      if (!samePerks) return false;
    }

    return true;
  };

  const exportChampionToClient = async () => {
    if (!randomChampion) return false;
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

    const spell1Id = randomSpells?.first?.id ?? 4;
    const spell2Id = randomSpells?.second?.id ?? 12;
    const championId = randomChampion.championId;

    const mySelection = await attemptLcuCandidates([
      {
        method: 'PATCH',
        endpoint: mySelectionPath,
        body: {
          championId,
          spell1Id,
          spell2Id,
          selectedPerkIds: randomRunePage?.selectedPerkIds ?? [],
        },
      },
      {
        method: 'PUT',
        endpoint: mySelectionPath,
        body: {
          championId,
          spell1Id,
          spell2Id,
          selectedPerkIds: randomRunePage?.selectedPerkIds ?? [],
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

  const exportBuildToClient = async () => {
    if (!randomBuild) return false;
    const summoner = await getCurrentSummoner();
    const accountId = summoner?.accountId ?? summoner?.summonerId ?? summoner?.id ?? 0;
    const buildSet = {
      accountId,
      itemSets: [{
        title: `SuperLeague · ${randomBuild.name}`,
        type: 'custom',
        map: 'SR',
        mode: 'CLASSIC',
        priority: 0,
        sortrank: 0,
        blocks: [
          { type: 'Starting', items: randomBuild.startingItems.map((id) => ({ id: String(id), count: 1 })) },
          { type: 'Core', items: randomBuild.coreItems.map((id) => ({ id: String(id), count: 1 })) },
          { type: 'Situational', items: randomBuild.situationalItems.map((id) => ({ id: String(id), count: 1 })) },
        ],
        associatedChampions: randomChampion ? [randomChampion.championId] : [],
        associatedMaps: [11],
      }],
    };

    const summonerId = summoner?.summonerId ?? summoner?.id ?? null;
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

  const exportEverything = async () => {
    if (exporting) return;
    setExporting(true);
    setFeedback({ kind: 'loading', text: 'Exporting to client…' });

    try {
      const phaseResponse = await lcuRequest({ method: 'GET', endpoint: '/lol-gameflow/v1/gameflow-phase' });
      const phase = phaseResponse.status === 200 && phaseResponse.body ? String(JSON.parse(phaseResponse.body)) : 'Unknown';

      const runeOk = randomizeRunes ? await exportRunes() : true;
      const champOk = randomizeChampion ? await exportChampionToClient() : true;
      const buildOk = randomizeBuild ? await exportBuildToClient() : true;

      setFeedback({
        kind: 'success',
        text: [
          runeOk ? 'runes applied' : 'runes skipped',
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

  const selectedChampionName = randomChampion ? getChampionName(randomChampion.championId) : 'No champion rolled';
  const buildTemplate = randomBuild;
  const runeTemplate = randomRunePage;

  const renderItemRow = (items: number[], compact = false) => (
    <div className="flex flex-wrap gap-2">
      {items.map((id, index) => (
        <div key={`${id}-${index}`} className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg border border-white/[0.08] bg-dark overflow-hidden`}>
          <img src={getItemIconUrl(id)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[radial-gradient(circle_at_15%_20%,rgba(200,155,60,0.18),transparent_40%),radial-gradient(circle_at_75%_10%,rgba(78,153,150,0.2),transparent_35%),linear-gradient(140deg,rgba(9,15,28,0.92),rgba(12,22,40,0.95))] p-5 md:p-6">
        <div className="absolute -top-20 right-10 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-4 h-56 w-56 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/[0.1] bg-white/[0.04]">
              <Sparkles size={20} className="text-gold" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-ink-bright">Loadout Randomizer</h2>
              <p className="text-xs text-ink-muted max-w-[560px]">Keep your existing export logic, but spin a fresh champion, runes, spells, and build in a cleaner control surface.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[10px] bg-white/[0.05] border border-white/[0.1] text-ink-ghost">{randomChampionCount} in pool</span>
            <span className={`px-2.5 py-1 rounded-full text-[10px] border ${excludeMastery10Plus ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-white/[0.05] border-white/[0.1] text-ink-ghost'}`}>
              <Lock size={10} className="inline-block mr-1" /> M10+ {excludeMastery10Plus ? 'excluded' : 'included'}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <aside className="xl:col-span-4 space-y-5">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-ink-bright">Control Deck</h3>
                <p className="text-[10px] text-ink-ghost">Toggle what gets randomized before each roll</p>
              </div>
              <button
                onClick={randomizeAll}
                disabled={loading || (!randomizeChampion && !randomizeRunes && !randomizeSpells && !randomizeBuild)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold via-amber-500 to-teal-500 text-void font-semibold text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shuffle size={14} /> Roll All
              </button>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={randomizeChampion} onChange={(e) => setRandomizeChampion(e.target.checked)} className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-teal-500 checked:border-teal-500 cursor-pointer" />
              <Swords size={14} className="text-teal-300" />
              <span className="text-sm text-ink">Random Champion</span>
            </label>

            <div className="ml-7 pl-4 border-l border-white/[0.1] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-muted">
                <input type="checkbox" checked={excludeMastery10Plus} onChange={(e) => setExcludeMastery10Plus(e.target.checked)} className="w-3.5 h-3.5 rounded border border-white/[0.1] bg-white/[0.05] checked:bg-gold checked:border-gold cursor-pointer" />
                Exclude Mastery 10+ champions
              </label>
              <p className="text-[10px] text-ink-ghost">Keeps overplayed picks out of your roll pool.</p>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={randomizeRunes} onChange={(e) => setRandomizeRunes(e.target.checked)} className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-orange-500 checked:border-orange-500 cursor-pointer" />
              <Flame size={14} className="text-orange-300" />
              <span className="text-sm text-ink">Full Rune Page</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={randomizeSpells} onChange={(e) => setRandomizeSpells(e.target.checked)} className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-yellow-500 checked:border-yellow-500 cursor-pointer" />
              <Zap size={14} className="text-yellow-300" />
              <span className="text-sm text-ink">Summoner Spells</span>
            </label>

            {randomizeSpells && (
              <div className="ml-7 pl-4 border-l border-white/[0.1] space-y-2">
                <p className="text-[10px] text-ink-ghost">Flash key preference is used as the slot reference.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setFlashPosition('D')} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${flashPosition === 'D' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-white/[0.03] text-ink-ghost border border-white/[0.07] hover:bg-white/[0.06]'}`}>D Key</button>
                  <button onClick={() => setFlashPosition('F')} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${flashPosition === 'F' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-white/[0.03] text-ink-ghost border border-white/[0.07] hover:bg-white/[0.06]'}`}>F Key</button>
                </div>
              </div>
            )}

            <label className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={randomizeBuild} onChange={(e) => setRandomizeBuild(e.target.checked)} className="w-4 h-4 rounded border-2 border-white/[0.1] bg-white/[0.05] checked:bg-blue-500 checked:border-blue-500 cursor-pointer" />
              <Package size={14} className="text-blue-300" />
              <span className="text-sm text-ink">Build Path</span>
            </label>
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink-bright">Rune Trees</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {RUNE_TREES.map((tree) => (
                <div key={tree.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5" style={{ boxShadow: `inset 0 1px 0 ${tree.accent}22` }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: tree.accent }} />
                    <span className="text-[10px] font-semibold text-ink-bright">{tree.name}</span>
                  </div>
                  <p className="text-[10px] text-ink-ghost leading-snug">{tree.tagline}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="xl:col-span-8 space-y-5">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-ink-bright">Loadout Console</h3>
                <p className="text-[10px] text-ink-ghost">One-click export to client with the current rolled setup</p>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[10px] border ${feedback.kind === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : feedback.kind === 'error' ? 'bg-ruby/10 text-ruby border-ruby/30' : feedback.kind === 'loading' ? 'bg-white/[0.06] text-ink-ghost border-white/[0.1]' : 'bg-white/[0.04] text-ink-ghost border-white/[0.08]'}`}>
                {feedback.text || (exporting ? 'Exporting…' : 'Ready')}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={exportEverything} disabled={loading || exporting || (!randomizeChampion && !randomizeRunes && !randomizeSpells && !randomizeBuild)} className="px-4 py-3 rounded-xl bg-gradient-to-r from-gold via-amber-500 to-teal-500 text-void font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {exporting ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                Export to Client
              </button>
              <button
                onClick={async () => {
                  const summary = [
                    randomChampion ? `Champion: ${selectedChampionName}` : 'Champion: none',
                    randomRunePage ? `Rune page: ${randomRunePage.name}` : 'Rune page: none',
                    randomSpells ? `Spells: ${randomSpells.first.name} / ${randomSpells.second.name}` : 'Spells: none',
                    randomBuild ? `Build: ${randomBuild.name}` : 'Build: none',
                  ].join('\n');
                  await navigator.clipboard.writeText(summary);
                  setFeedback({ kind: 'success', text: 'Loadout summary copied' });
                }}
                className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-ink-bright font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/[0.06]"
              >
                <ClipboardCopy size={15} /> Copy Summary
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-ink-bright">Champion Spotlight</h3>
                  <p className="text-[10px] text-ink-ghost">Pulled from your mastery pool</p>
                </div>
                <button onClick={randomizeAll} className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-ink-bright hover:bg-white/[0.06] flex items-center gap-2">
                  <Shuffle size={12} /> Roll
                </button>
              </div>

              {randomChampion ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(120deg,rgba(16,148,135,0.15),rgba(200,155,60,0.08),rgba(0,0,0,0.15))] p-4 flex items-center gap-4">
                  <img src={getChampionIconUrl(randomChampion.championId)} alt="" className="w-16 h-16 rounded-2xl object-cover border border-white/[0.08]" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.35'; }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-bold text-ink-bright truncate">{selectedChampionName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/20">M{randomChampion.championLevel ?? 0}</span>
                    </div>
                    <p className="text-xs text-ink-ghost">{excludeMastery10Plus ? 'M10+ champions excluded from roll' : 'All mastery champions are eligible'}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center text-ink-ghost">
                  <Swords size={34} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-ink-dim">Roll a champion to fill this panel</p>
                </div>
              )}
            </div>

            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-yellow-300" />
                <h3 className="text-sm font-bold text-ink-bright">Summoner Spells</h3>
              </div>
              {randomSpells ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <p className="text-[10px] text-ink-ghost mb-1">Preferred {flashPosition} slot</p>
                      <p className="text-sm font-semibold text-ink-bright">{randomSpells.first.name}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <p className="text-[10px] text-ink-ghost mb-1">Second slot</p>
                      <p className="text-sm font-semibold text-ink-bright">{randomSpells.second.name}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-ink-ghost">{randomSpells.flashReference}</p>
                </>
              ) : (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 text-center text-ink-ghost">
                  <Zap size={24} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-ink-dim">Roll summoner spells to populate this area</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-orange-300" />
                <h3 className="text-sm font-bold text-ink-bright">Rune Blueprint</h3>
              </div>
              {runeTemplate ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="text-[10px] text-ink-ghost mb-1">Primary</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: runeTreeById.get(runeTemplate.primaryStyleId)?.accent ?? '#fff' }} />
                        <span className="text-sm font-semibold text-ink-bright">{runeTreeById.get(runeTemplate.primaryStyleId)?.name ?? 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <div className="text-[10px] text-ink-ghost mb-1">Secondary</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: runeTreeById.get(runeTemplate.subStyleId)?.accent ?? '#fff' }} />
                        <span className="text-sm font-semibold text-ink-bright">{runeTreeById.get(runeTemplate.subStyleId)?.name ?? 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-semibold text-ink-bright">{runeTemplate.name}</p>
                        <p className="text-[10px] text-ink-ghost">{runeTemplate.highlight}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-orange-500/10 text-orange-200 border border-orange-500/20">{runeTemplate.selectedPerkIds.length} perks</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {runeTemplate.selectedPerkIds.map((perkId, index) => (
                        <span key={`${perkId}-${index}`} className="px-2 py-1 rounded-full text-[10px] bg-white/[0.04] border border-white/[0.08] text-ink-ghost">#{perkId}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-ink-ghost">
                  <Flame size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-ink-dim">Roll a rune page to populate this area</p>
                </div>
              )}
            </div>

            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-blue-300" />
                <h3 className="text-sm font-bold text-ink-bright">Build Path</h3>
              </div>
              {buildTemplate ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink-bright">{buildTemplate.name}</p>
                      <p className="text-[10px] text-ink-ghost">{buildTemplate.note}</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-200 border border-blue-500/20">{buildTemplate.role}</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-ghost mb-1">Starting</div>
                      {renderItemRow(buildTemplate.startingItems, true)}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-ghost mb-1">Core</div>
                      {renderItemRow(buildTemplate.coreItems)}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-ghost mb-1">Situational</div>
                      {renderItemRow(buildTemplate.situationalItems, true)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 text-center text-ink-ghost">
                  <Package size={24} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-ink-dim">Roll a build path to populate this area</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
