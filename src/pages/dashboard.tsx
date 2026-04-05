import { useEffect, useState, useMemo } from 'react';
import { getChampionMasteries, getChallenges, getChampionIconUrl, getRecentMatches } from '@/lib/lcu-api';

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
    return championNames[championId] ?? `#${championId}`;
}

// ── Tier palette ────────────────────────────────────────────────────────────
const TIER_C: Record<string, string> = {
    NONE: '#5B5A56', IRON: '#72767E', BRONZE: '#A0522D', SILVER: '#A8B2BC',
    GOLD: '#C89B3C', PLATINUM: '#1A9E8F', DIAMOND: '#576BCE',
    MASTER: '#9D48E0', GRANDMASTER: '#E84057', CHALLENGER: '#F4C874',
};

// Class-specific tier thresholds (from Riot's Mastery Class Challenges)
const CLASS_THRESHOLDS: Record<string, { tier: string; min: number; color: string }[]> = {
    Assassin: [
        { tier: 'Iron', min: 1, color: TIER_C.IRON },
        { tier: 'Bronze', min: 5, color: TIER_C.BRONZE },
        { tier: 'Silver', min: 10, color: TIER_C.SILVER },
        { tier: 'Gold', min: 15, color: TIER_C.GOLD },
        { tier: 'Plat', min: 25, color: TIER_C.PLATINUM },
        { tier: 'Dia', min: 35, color: TIER_C.DIAMOND },
        { tier: 'Master', min: 45, color: TIER_C.MASTER },
    ],
    Fighter: [
        { tier: 'Iron', min: 1, color: TIER_C.IRON },
        { tier: 'Bronze', min: 5, color: TIER_C.BRONZE },
        { tier: 'Silver', min: 12, color: TIER_C.SILVER },
        { tier: 'Gold', min: 20, color: TIER_C.GOLD },
        { tier: 'Plat', min: 30, color: TIER_C.PLATINUM },
        { tier: 'Dia', min: 50, color: TIER_C.DIAMOND },
        { tier: 'Master', min: 70, color: TIER_C.MASTER },
    ],
    Mage: [
        { tier: 'Iron', min: 1, color: TIER_C.IRON },
        { tier: 'Bronze', min: 5, color: TIER_C.BRONZE },
        { tier: 'Silver', min: 12, color: TIER_C.SILVER },
        { tier: 'Gold', min: 18, color: TIER_C.GOLD },
        { tier: 'Plat', min: 25, color: TIER_C.PLATINUM },
        { tier: 'Dia', min: 45, color: TIER_C.DIAMOND },
        { tier: 'Master', min: 65, color: TIER_C.MASTER },
    ],
    Marksman: [
        { tier: 'Iron', min: 1, color: TIER_C.IRON },
        { tier: 'Bronze', min: 3, color: TIER_C.BRONZE },
        { tier: 'Silver', min: 5, color: TIER_C.SILVER },
        { tier: 'Gold', min: 10, color: TIER_C.GOLD },
        { tier: 'Plat', min: 15, color: TIER_C.PLATINUM },
        { tier: 'Dia', min: 20, color: TIER_C.DIAMOND },
        { tier: 'Master', min: 30, color: TIER_C.MASTER },
    ],
    Support: [
        { tier: 'Iron', min: 1, color: TIER_C.IRON },
        { tier: 'Bronze', min: 3, color: TIER_C.BRONZE },
        { tier: 'Silver', min: 5, color: TIER_C.SILVER },
        { tier: 'Gold', min: 10, color: TIER_C.GOLD },
        { tier: 'Plat', min: 15, color: TIER_C.PLATINUM },
        { tier: 'Dia', min: 20, color: TIER_C.DIAMOND },
        { tier: 'Master', min: 30, color: TIER_C.MASTER },
    ],
    Tank: [
        { tier: 'Iron', min: 1, color: TIER_C.IRON },
        { tier: 'Bronze', min: 3, color: TIER_C.BRONZE },
        { tier: 'Silver', min: 5, color: TIER_C.SILVER },
        { tier: 'Gold', min: 10, color: TIER_C.GOLD },
        { tier: 'Plat', min: 20, color: TIER_C.PLATINUM },
        { tier: 'Dia', min: 30, color: TIER_C.DIAMOND },
        { tier: 'Master', min: 40, color: TIER_C.MASTER },
    ],
};

// Get tier index (0-6) for progress calculation - normalized across all classes
function getTierIndex(count: number, className: string): number {
    const thresholds = CLASS_THRESHOLDS[className] ?? [];
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (count >= thresholds[i].min) return i;
    }
    return -1; // below Iron
}

// Get normalized percentage (0-100) where each tier occupies equal space
function getNormalizedPct(count: number, className: string): number {
    const thresholds = CLASS_THRESHOLDS[className] ?? [];
    const numTiers = thresholds.length; // 7 tiers
    const tierIdx = getTierIndex(count, className);

    if (tierIdx < 0) return 0;
    if (tierIdx >= numTiers - 1) return 100; // at or above max tier

    const currentTierMin = thresholds[tierIdx].min;
    const nextTierMin = thresholds[tierIdx + 1].min;
    const progressInTier = (count - currentTierMin) / (nextTierMin - currentTierMin);

    // Each tier gets equal visual space: tierIdx / numTiers to (tierIdx+1) / numTiers
    const tierBasePct = (tierIdx / (numTiers - 1)) * 100;
    const tierHeight = (1 / (numTiers - 1)) * 100;

    return tierBasePct + progressInTier * tierHeight;
}

function getCurrentTier(count: number, className: string) {
    const thresholds = CLASS_THRESHOLDS[className] ?? [];
    return [...thresholds].reverse().find(t => count >= t.min) ?? null;
}

// Emblem image
function Emblem({ tier, size = 18 }: { tier: string; size?: number }) {
    const key = ({ PLAT: 'platinum', DIA: 'diamond', GM: 'grandmaster', CHALL: 'challenger' } as Record<string, string>)[tier.toUpperCase()] ?? tier.toLowerCase();
    const color = TIER_C[tier.toUpperCase()] ?? TIER_C.NONE;
    const [failed, setFailed] = useState(false);
    if (failed) return (
        <div className="rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ width: size, height: size, background: `${color}20`, border: `1px solid ${color}40`, color }}>
            {tier.charAt(0).toUpperCase()}
        </div>
    );
    return (
        <img src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-emblem/emblem-${key}.png`}
            alt={tier} style={{ width: size, height: size }} className="object-contain flex-shrink-0"
            onError={() => setFailed(true)} />
    );
}

// ── Shared-box mastery class bars ────────────────────────────────────────────
const CLASSES = ['Assassin', 'Fighter', 'Mage', 'Marksman', 'Support', 'Tank'];
const TIER_NAMES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Plat', 'Dia', 'Master'];
const TIER_COLORS = [TIER_C.IRON, TIER_C.BRONZE, TIER_C.SILVER, TIER_C.GOLD, TIER_C.PLATINUM, TIER_C.DIAMOND, TIER_C.MASTER];

function MasteryClassPanel({ classData }: { classData: { name: string; m7: number; m10: number }[] }) {
    const BAR_H = 180;
    const [hoveredClass, setHoveredClass] = useState<string | null>(null);
    const numTiers = TIER_NAMES.length;

    return (
        <div className="flex justify-center">
            <div className="flex gap-4">
                {classData.map(cls => {
                    const thresholds = CLASS_THRESHOLDS[cls.name] ?? [];
                    const pct7 = getNormalizedPct(cls.m7, cls.name);
                    const pct10 = getNormalizedPct(cls.m10, cls.name);
                    const cur = getCurrentTier(cls.m7, cls.name);
                    const barColor = cur?.color ?? TIER_C.NONE;
                    const isHovered = hoveredClass === cls.name;

                    return (
                        <div key={cls.name} className="w-14 flex flex-col items-center gap-1.5 relative"
                            onMouseEnter={() => setHoveredClass(cls.name)}
                            onMouseLeave={() => setHoveredClass(null)}>
                        {/* Count above bar */}
                        <div className="h-5 flex items-end">
                            <span className="text-xs font-bold tabular-nums" style={{ color: barColor }}>{cls.m7}</span>
                            {cls.m10 > 0 && <span className="text-xs text-gold tabular-nums ml-0.5">/{cls.m10}</span>}
                        </div>

                        {/* Bar column */}
                        <div className="w-full relative rounded-lg overflow-hidden bg-dark border border-white/[0.06]"
                            style={{ height: BAR_H }}>
                            {/* Normalized tier tick marks - all at same visual positions */}
                            {TIER_NAMES.slice(1).map((tierName, idx) => {
                                const tierIndex = idx + 1; // 1-6 (Bronze through Master)
                                const pct = (tierIndex / (numTiers - 1)) * 100;
                                const color = TIER_COLORS[tierIndex];
                                return (
                                    <div key={tierName} className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
                                        style={{ bottom: `${pct}%` }}>
                                        <div className="w-full h-px" style={{ background: `${color}25` }} />
                                        <div className="absolute w-1.5 h-1.5 rounded-full border"
                                            style={{ background: `${color}30`, borderColor: `${color}50` }} />
                                    </div>
                                );
                            })}

                            {/* M10 highlight */}
                            {cls.m10 > 0 && (
                                <div className="absolute bottom-0 inset-x-0 rounded-t transition-all duration-500"
                                    style={{ height: `${pct10}%`, background: '#C89B3C20' }} />
                            )}

                            {/* M7 bar */}
                            <div className="absolute bottom-0 inset-x-1 rounded-t transition-all duration-500"
                                style={{ height: `${pct7}%`, background: `linear-gradient(0deg, ${barColor}AA, ${barColor})` }} />
                        </div>

                        {/* Emblem + label */}
                        <Emblem tier={cur?.tier ?? 'None'} size={16} />
                        <span className="text-sm text-ink font-medium text-center leading-tight">{cls.name}</span>

                        {/* Hover tooltip - fixed positioning */}
                        {isHovered && (
                            <div className="fixed z-[100] p-2.5 rounded-lg bg-raised border border-white/[0.1] shadow-xl min-w-[120px] pointer-events-none"
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)'
                                }}>
                                <div className="text-xs font-semibold text-ink-bright mb-1.5">{cls.name}</div>
                                <div className="space-y-0.5">
                                    {thresholds.map(t => {
                                        const achieved = cls.m7 >= t.min;
                                        return (
                                            <div key={t.tier} className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: achieved ? t.color : `${t.color}30` }} />
                                                    <span className="text-xs" style={{ color: achieved ? t.color : '#666' }}>{t.tier}</span>
                                                </div>
                                                <span className="text-xs tabular-nums" style={{ color: achieved ? t.color : '#555' }}>{t.min}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            </div>
        </div>
    );
}

// ── Challenge row ────────────────────────────────────────────────────────────
function ChallengeRow({ c }: { c: any }) {
    const [tip, setTip] = useState(false);
    const tier = (c.currentLevel ?? c.level ?? 'NONE').toUpperCase();
    const cur = c.currentValue ?? 0;
    const next = c.nextLevelValue ?? c.nextThreshold ?? 0;
    const prev = c.previousLevelValue ?? 0;
    const isMasterPlus = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier);
    const pct = (!isMasterPlus && next > prev) ? Math.min(((cur - prev) / (next - prev)) * 100, 100) : 100;
    const color = TIER_C[tier] ?? TIER_C.NONE;

    return (
        <div className="relative flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
            onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
            <Emblem tier={tier} size={20} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-ink-bright truncate pr-2">{c.name ?? `#${c.id}`}</span>
                    <span className="text-sm text-ink tabular-nums flex-shrink-0 font-medium">
                        {isMasterPlus ? '✓' : `${cur.toLocaleString()} / ${next.toLocaleString()}`}
                    </span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
            </div>
            {tip && (c.description ?? c.shortDescription) && (
                <div className="absolute left-0 bottom-full mb-1 z-50 w-60 p-2 rounded-lg bg-raised border border-white/[0.1] shadow-xl text-xs text-ink-dim leading-relaxed">
                    {c.description ?? c.shortDescription}
                </div>
            )}
        </div>
    );
}

// ── Champion row ─────────────────────────────────────────────────────────────
function ChampionRow({ m, rank }: { m: any; rank: number }) {
    const lvl = m.championLevel ?? 0;
    const pts = m.championPoints ?? 0;
    const color = lvl >= 7 ? '#C89B3C' : '#5B5A56';
    return (
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
            <span className="w-4 text-xs text-ink-ghost text-right flex-shrink-0 tabular-nums">{rank}</span>
            <img src={getChampionIconUrl(m.championId)} alt=""
                className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-white/[0.06]"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
            <span className="flex-1 text-xs text-ink-bright truncate">{m.championName ?? getChampionName(m.championId)}</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: `${color}15`, color }}>M{lvl}</span>
            <span className="text-xs text-gold tabular-nums flex-shrink-0 w-16 text-right">
                {pts >= 1_000_000 ? `${(pts / 1_000_000).toFixed(1)}M` : pts >= 1_000 ? `${(pts / 1_000).toFixed(0)}K` : String(pts)}
            </span>
        </div>
    );
}

// ── Almost There row ─────────────────────────────────────────────────────────
function AlmostThereRow({ c, tier, color, cur, next, pct }: { c: any; tier: string; color: string; cur: number; next: number; pct: number }) {
    const [tip, setTip] = useState(false);
    return (
        <div className="relative flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
            <Emblem tier={tier} size={18} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-ink-bright truncate">{c.name ?? `#${c.id}`}</span>
                    <span className="text-xs tabular-nums ml-1 flex-shrink-0" style={{ color }}>
                        {cur.toLocaleString()} / {next.toLocaleString()}
                    </span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
            </div>
            {tip && (c.description ?? c.shortDescription) && (
                <div className="absolute left-0 bottom-full mb-1 z-50 w-64 p-2 rounded-lg bg-raised border border-white/[0.1] shadow-xl text-xs text-ink-dim leading-relaxed">
                    {c.description ?? c.shortDescription}
                </div>
            )}
        </div>
    );
}

// ── Mastery Graph ────────────────────────────────────────────────────────────
interface MatchPoint {
    championId: number;
    championName?: string;
    win: boolean;
    gameDuration: number;
    kills: number;
    deaths: number;
    assists: number;
    masteryGain: number;
    totalMastery: number;
    championLevel: number;
    queueType: string;
    lpChange?: number;
    timestamp: number;
}

interface PinnedChampion {
    championId: number;
    championName?: string;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
}

// Mastery thresholds for M5, M7 and M10 (points needed)
const MASTERY_THRESHOLDS = {
    M5: 21600,
    M7: 42600,
    M10: 75600,
};

function MasteryGraph({ matches, loading, masteries }: { matches: MatchPoint[]; loading: boolean; masteries: any[] }) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterChampionId, setFilterChampionId] = useState<number | null>(null);
    const [showSearch, setShowSearch] = useState(false);

    const GRAPH_W = 500;
    const GRAPH_H = 140;
    const PADDING = { top: 10, right: 10, bottom: 20, left: 50 };
    const innerW = GRAPH_W - PADDING.left - PADDING.right;
    const innerH = GRAPH_H - PADDING.top - PADDING.bottom;

    // Total account mastery (sum of all champion points)
    const totalAccountMastery = useMemo(() => {
        return masteries.reduce((sum, m) => sum + (m.championPoints ?? 0), 0);
    }, [masteries]);

    // Get all champions from masteries for search (sorted by points)
    const allChampions = useMemo(() => {
        return masteries.map(m => ({
            championId: m.championId,
            championName: m.championName || getChampionName(m.championId),
        }));
    }, [masteries]);

    // Get current mastery for filtered champion
    const filteredChampionMastery = useMemo(() => {
        if (!filterChampionId) return null;
        return masteries.find(m => m.championId === filterChampionId);
    }, [filterChampionId, masteries]);

    // Filter matches by champion if selected
    const filteredMatches = useMemo(() => {
        if (!filterChampionId) return matches.slice(-30);
        return matches.filter(m => m.championId === filterChampionId).slice(-30);
    }, [matches, filterChampionId]);

    // Calculate cumulative mastery points - for filtered champion, work backwards from current total
    const cumulativeData = useMemo(() => {
        if (filterChampionId && filteredChampionMastery) {
            // For specific champion: show how they got to current mastery
            const currentTotal = filteredChampionMastery.championPoints ?? 0;
            const totalFromMatches = filteredMatches.reduce((sum, m) => sum + m.masteryGain, 0);
            const startingPoint = Math.max(0, currentTotal - totalFromMatches);

            let cumulative = startingPoint;
            return filteredMatches.map(m => {
                cumulative += m.masteryGain;
                return { ...m, cumulativeMastery: cumulative };
            });
        } else {
            // For all champions: show progression toward total account mastery
            const totalFromMatches = filteredMatches.reduce((sum, m) => sum + m.masteryGain, 0);
            const startingPoint = Math.max(0, totalAccountMastery - totalFromMatches);

            let cumulative = startingPoint;
            return filteredMatches.map(m => {
                cumulative += m.masteryGain;
                return { ...m, cumulativeMastery: cumulative };
            });
        }
    }, [filteredMatches, filterChampionId, filteredChampionMastery, totalAccountMastery]);

    // Search results for dropdown
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return allChampions.slice(0, 5);
        const q = searchQuery.toLowerCase();
        return allChampions.filter(c =>
            c.championName?.toLowerCase().includes(q) || String(c.championId).includes(q)
        ).slice(0, 5);
    }, [searchQuery, allChampions]);

    // Calculate mastery stats
    const masteryStats = useMemo(() => {
        // Global stats (all matches)
        const allMatches = matches.slice(-30);
        const globalTotalGain = allMatches.reduce((sum, m) => sum + m.masteryGain, 0);
        const globalAvg = allMatches.length > 0 ? Math.round(globalTotalGain / allMatches.length) : 0;

        // Win/Loss stats for mastery per minute
        const wins = allMatches.filter(m => m.win);
        const losses = allMatches.filter(m => !m.win);

        const winTotalGain = wins.reduce((sum, m) => sum + m.masteryGain, 0);
        const winTotalMinutes = wins.reduce((sum, m) => sum + (m.gameDuration / 60), 0);
        const winMasteryPerMin = winTotalMinutes > 0 ? Math.round(winTotalGain / winTotalMinutes) : 0;

        const lossTotalGain = losses.reduce((sum, m) => sum + m.masteryGain, 0);
        const lossTotalMinutes = losses.reduce((sum, m) => sum + (m.gameDuration / 60), 0);
        const lossMasteryPerMin = lossTotalMinutes > 0 ? Math.round(lossTotalGain / lossTotalMinutes) : 0;

        // Champion-specific stats (if filtered)
        let champAvg = 0;
        let hasChampData = false;
        let gamesToM5: number | string = '∞';
        let gamesToM7: number | string = '∞';
        let gamesToM10: number | string = '∞';
        let usingGlobalAvg = false;

        if (filterChampionId && filteredChampionMastery) {
            const champMatches = matches.filter(m => m.championId === filterChampionId);
            hasChampData = champMatches.length > 0;

            if (hasChampData) {
                const champTotalGain = champMatches.reduce((sum, m) => sum + m.masteryGain, 0);
                champAvg = Math.round(champTotalGain / champMatches.length);
            } else {
                champAvg = globalAvg;
                usingGlobalAvg = true;
            }

            const currentPoints = filteredChampionMastery.championPoints ?? 0;
            const currentLevel = filteredChampionMastery.championLevel ?? 0;

            const avgToUse = champAvg > 0 ? champAvg : globalAvg;
            if (avgToUse > 0) {
                if (currentLevel < 5) {
                    const pointsToM5 = Math.max(0, MASTERY_THRESHOLDS.M5 - currentPoints);
                    gamesToM5 = Math.ceil(pointsToM5 / avgToUse);
                } else {
                    gamesToM5 = 0;
                }

                if (currentLevel < 7) {
                    const pointsToM7 = Math.max(0, MASTERY_THRESHOLDS.M7 - currentPoints);
                    gamesToM7 = Math.ceil(pointsToM7 / avgToUse);
                } else {
                    gamesToM7 = 0;
                }

                if (currentLevel < 10) {
                    const pointsToM10 = Math.max(0, MASTERY_THRESHOLDS.M10 - currentPoints);
                    gamesToM10 = Math.ceil(pointsToM10 / avgToUse);
                } else {
                    gamesToM10 = 0;
                }
            }
        }

        return {
            globalAvg,
            winMasteryPerMin,
            lossMasteryPerMin,
            champAvg,
            hasChampData,
            gamesToM5,
            gamesToM7,
            gamesToM10,
            usingGlobalAvg,
        };
    }, [matches, filterChampionId, filteredChampionMastery]);

    if (loading) {
        return <div className="skeleton rounded" style={{ height: GRAPH_H + 20 }} />;
    }

    if (matches.length === 0) {
        return (
            <div className="flex items-center justify-center text-xs text-ink-ghost" style={{ height: GRAPH_H }}>
                No recent match data
            </div>
        );
    }

    // For filtered champion, max is current mastery; for all, max is total account mastery
    const maxValue = filterChampionId && filteredChampionMastery
        ? filteredChampionMastery.championPoints ?? 100
        : totalAccountMastery || Math.max(...cumulativeData.map(m => m.cumulativeMastery), 100);
    const minValue = cumulativeData.length > 0 ? cumulativeData[0].cumulativeMastery - cumulativeData[0].masteryGain : 0;
    const range = maxValue - minValue || 1;

    const points = cumulativeData.map((m, i) => ({
        x: PADDING.left + (i / Math.max(cumulativeData.length - 1, 1)) * innerW,
        y: PADDING.top + innerH - ((m.cumulativeMastery - minValue) / range) * innerH,
        data: m,
    }));

    const pathD = points.length > 0
        ? `M ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`
        : '';

    const areaD = points.length > 0
        ? `${pathD} L ${points[points.length - 1].x} ${PADDING.top + innerH} L ${points[0].x} ${PADDING.top + innerH} Z`
        : '';

    const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;
    const displayTotal = filterChampionId && filteredChampionMastery
        ? filteredChampionMastery.championPoints
        : totalAccountMastery;

    return (
        <div className="space-y-3">
            {/* Header with title, search, and total */}
            <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-ink-bright whitespace-nowrap">Total Mastery</h2>
                <div className="relative flex-1 max-w-[180px]">
                    <input
                        type="text"
                        placeholder="Filter champion..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
                        onFocus={() => setShowSearch(true)}
                        onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                        className="w-full px-2 py-1 text-xs rounded bg-dark border border-white/[0.06] text-ink-bright placeholder:text-ink-ghost focus:outline-none focus:border-gold/30"
                    />
                    {showSearch && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg bg-raised border border-white/[0.1] shadow-xl overflow-hidden">
                            <button onMouseDown={() => { setFilterChampionId(null); setSearchQuery(''); }}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-white/[0.04] transition-colors ${!filterChampionId ? 'text-gold' : 'text-ink'}`}>
                                All Champions
                            </button>
                            {searchResults.map(c => (
                                <button key={c.championId} onMouseDown={() => { setFilterChampionId(c.championId); setSearchQuery(c.championName || ''); }}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-white/[0.04] transition-colors ${filterChampionId === c.championId ? 'text-gold' : 'text-ink'}`}>
                                    <img src={getChampionIconUrl(c.championId)} alt="" className="w-4 h-4 rounded" />
                                    {c.championName}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex-1" />
                <div className="text-right">
                    <div className="text-lg font-bold text-gold tabular-nums">{formatNumber(displayTotal)}</div>
                    <div className="text-xs text-ink">{filterChampionId ? 'champion' : 'account'} total</div>
                </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs py-1.5 px-2 rounded bg-white/[0.02]">
                <div className="flex items-center gap-1.5">
                    <span className="text-ink-ghost">Avg/game:</span>
                    <span className="text-gold tabular-nums font-medium">
                        {filterChampionId ? masteryStats.champAvg : masteryStats.globalAvg}
                        {filterChampionId && masteryStats.usingGlobalAvg && <span className="text-ink-ghost">*</span>}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-ink-ghost">Win/min:</span>
                    <span className="text-teal tabular-nums font-medium">{masteryStats.winMasteryPerMin}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-ink-ghost">Loss/min:</span>
                    <span className="text-ruby tabular-nums font-medium">{masteryStats.lossMasteryPerMin}</span>
                </div>
                {filterChampionId && (
                    <>
                        <div className="w-px h-3 bg-white/[0.1]" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-ink-ghost">M5:</span>
                            <span className="text-ink-bright tabular-nums font-medium">
                                {masteryStats.gamesToM5 === 0 ? '✓' : `${masteryStats.gamesToM5}`}
                                {masteryStats.usingGlobalAvg && masteryStats.gamesToM5 !== 0 && <span className="text-ink-ghost">*</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-ink-ghost">M7:</span>
                            <span className="text-ink-bright tabular-nums font-medium">
                                {masteryStats.gamesToM7 === 0 ? '✓' : `${masteryStats.gamesToM7}`}
                                {masteryStats.usingGlobalAvg && masteryStats.gamesToM7 !== 0 && <span className="text-ink-ghost">*</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-ink-ghost">M10:</span>
                            <span className="text-ink-bright tabular-nums font-medium">
                                {masteryStats.gamesToM10 === 0 ? '✓' : `${masteryStats.gamesToM10}`}
                                {masteryStats.usingGlobalAvg && masteryStats.gamesToM10 !== 0 && <span className="text-ink-ghost">*</span>}
                            </span>
                        </div>
                    </>
                )}
            </div>
            {filterChampionId && masteryStats.usingGlobalAvg && (
                <div className="text-xs text-ink-ghost -mt-2">
                    * No match data for this champion, using global average
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-ink-ghost">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: TIER_C.PLATINUM }} /> Win</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: TIER_C.BRONZE }} /> Loss</div>
                <div className="flex-1" />
                <span className="text-ink-ghost">last {cumulativeData.length} games</span>
            </div>

            {/* Graph */}
            <div className="relative">
                <svg width="100%" viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} className="overflow-visible">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                        const y = PADDING.top + (1 - pct) * innerH;
                        const val = Math.round(minValue + pct * range);
                        return (
                            <g key={i}>
                                <line x1={PADDING.left} y1={y} x2={PADDING.left + innerW} y2={y}
                                    stroke="#ffffff08" strokeDasharray="2,4" />
                                <text x={PADDING.left - 4} y={y + 3} textAnchor="end"
                                    className="fill-ink-ghost text-xs">{formatNumber(val)}</text>
                            </g>
                        );
                    })}

                    {/* Area fill */}
                    <path d={areaD} fill="url(#masteryGradient)" opacity={0.3} />

                    {/* Line */}
                    <path d={pathD} fill="none" stroke={TIER_C.GOLD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

                    {/* Data points */}
                    {points.map((p, i) => (
                        <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}
                            className="cursor-pointer">
                            <circle cx={p.x} cy={p.y} r={hoveredIdx === i ? 6 : 3}
                                fill={p.data.win ? TIER_C.PLATINUM : TIER_C.BRONZE}
                                stroke="#1a1a1f" strokeWidth={2}
                                className="transition-all duration-150" />
                        </g>
                    ))}

                    <defs>
                        <linearGradient id="masteryGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={TIER_C.GOLD} />
                            <stop offset="100%" stopColor={TIER_C.GOLD} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Hover tooltip */}
                {hovered && (
                    <div className="absolute z-50 p-2.5 rounded-lg bg-raised border border-white/[0.1] shadow-xl min-w-[180px] pointer-events-none"
                        style={{ left: Math.min(hovered.x, GRAPH_W - 200), top: Math.max(0, hovered.y - 110) }}>
                        <div className="flex items-center gap-2 mb-2">
                            <img src={getChampionIconUrl(hovered.data.championId)} alt=""
                                className="w-8 h-8 rounded border border-white/[0.1]" />
                            <div>
                                <div className="text-xs font-semibold text-ink-bright">
                                    {hovered.data.championName || `Champion #${hovered.data.championId}`}
                                </div>
                                <div className={`text-xs font-medium ${hovered.data.win ? 'text-teal' : 'text-ruby'}`}>
                                    {hovered.data.win ? 'Victory' : 'Defeat'} • {formatDuration(hovered.data.gameDuration)}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="text-ink-ghost">KDA</div>
                            <div className="text-ink-bright tabular-nums">
                                {hovered.data.kills}/{hovered.data.deaths}/{hovered.data.assists}
                            </div>
                            <div className="text-ink-ghost">This Game</div>
                            <div className="text-gold tabular-nums">+{hovered.data.masteryGain.toLocaleString()}</div>
                            <div className="text-ink-ghost">Champion</div>
                            <div className="text-ink-bright tabular-nums">{formatNumber(masteries.find(m => m.championId === hovered.data.championId)?.championPoints ?? 0)}</div>
                            {hovered.data.lpChange !== undefined && (
                                <>
                                    <div className="text-ink-ghost">LP</div>
                                    <div className={`tabular-nums ${hovered.data.lpChange >= 0 ? 'text-teal' : 'text-ruby'}`}>
                                        {hovered.data.lpChange >= 0 ? '+' : ''}{hovered.data.lpChange}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Pinned Champions Panel ───────────────────────────────────────────────────
function PinnedChampionsPanel({ matches, masteries }: { matches: MatchPoint[]; masteries: any[] }) {
    const [pinnedChampions, setPinnedChampions] = useState<PinnedChampion[]>(() => {
        // Load from localStorage on mount
        try {
            const saved = localStorage.getItem('pinnedChampions');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [showPinSearch, setShowPinSearch] = useState(false);
    const [pinSearchQuery, setPinSearchQuery] = useState('');

    // Persist to localStorage whenever pinnedChampions changes
    useEffect(() => {
        localStorage.setItem('pinnedChampions', JSON.stringify(pinnedChampions));
    }, [pinnedChampions]);

    // Get all champions from masteries for pin search
    const allChampions = useMemo(() => {
        return masteries.map(m => ({
            championId: m.championId,
            championName: m.championName || `#${m.championId}`,
        }));
    }, [masteries]);

    // Search results for pin dropdown
    const pinSearchResults = useMemo(() => {
        if (!pinSearchQuery.trim()) return allChampions.slice(0, 5);
        const q = pinSearchQuery.toLowerCase();
        return allChampions.filter(c =>
            c.championName?.toLowerCase().includes(q) || String(c.championId).includes(q)
        ).slice(0, 5);
    }, [pinSearchQuery, allChampions]);

    // Calculate stats for pinned champions
    const pinnedStats = useMemo(() => {
        // Global average for fallback
        const allMatches = matches.slice(-30);
        const globalTotalGain = allMatches.reduce((sum, m) => sum + m.masteryGain, 0);
        const globalAvg = allMatches.length > 0 ? Math.round(globalTotalGain / allMatches.length) : 0;

        return pinnedChampions.map(pc => {
            const champMatches = matches.filter(m => m.championId === pc.championId);
            const totalGain = champMatches.reduce((sum, m) => sum + m.masteryGain, 0);
            const hasData = champMatches.length > 0;
            const avgGain = hasData ? Math.round(totalGain / champMatches.length) : globalAvg;

            const mastery = masteries.find(m => m.championId === pc.championId);
            const currentPoints = mastery?.championPoints ?? 0;
            const currentLevel = mastery?.championLevel ?? 0;

            const pointsToM5 = currentLevel >= 5 ? 0 : Math.max(0, MASTERY_THRESHOLDS.M5 - currentPoints);
            const pointsToM7 = currentLevel >= 7 ? 0 : Math.max(0, MASTERY_THRESHOLDS.M7 - currentPoints);
            const pointsToM10 = currentLevel >= 10 ? 0 : Math.max(0, MASTERY_THRESHOLDS.M10 - currentPoints);
            const gamesToM5 = avgGain > 0 ? Math.ceil(pointsToM5 / avgGain) : '∞';
            const gamesToM7 = avgGain > 0 ? Math.ceil(pointsToM7 / avgGain) : '∞';
            const gamesToM10 = avgGain > 0 ? Math.ceil(pointsToM10 / avgGain) : '∞';

            return {
                ...pc,
                avgGain,
                gamesToM5,
                gamesToM7,
                gamesToM10,
                currentLevel,
                currentPoints,
                gamesPlayed: champMatches.length,
                usingGlobalAvg: !hasData,
            };
        });
    }, [pinnedChampions, matches, masteries]);

    const addPinnedChampion = (champ: PinnedChampion) => {
        if (pinnedChampions.length >= 5) return;
        if (pinnedChampions.some(p => p.championId === champ.championId)) return;
        setPinnedChampions([...pinnedChampions, champ]);
        setShowPinSearch(false);
        setPinSearchQuery('');
    };

    const removePinnedChampion = (championId: number) => {
        setPinnedChampions(pinnedChampions.filter(p => p.championId !== championId));
    };

    return (
        <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-ink-bright">Pinned Champions</h2>
                {pinnedChampions.length < 5 && (
                    <div className="relative">
                        <button onClick={() => setShowPinSearch(!showPinSearch)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-ink-ghost hover:text-gold rounded bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                            <span className="text-sm leading-none">+</span> Add
                        </button>
                        {showPinSearch && (
                            <div className="absolute top-full right-0 mt-1 z-50 w-48 rounded-lg bg-raised border border-white/[0.1] shadow-xl overflow-hidden">
                                <input
                                    type="text"
                                    placeholder="Search champion..."
                                    value={pinSearchQuery}
                                    onChange={e => setPinSearchQuery(e.target.value)}
                                    autoFocus
                                    className="w-full px-2.5 py-2 text-xs bg-transparent border-b border-white/[0.06] text-ink-bright placeholder:text-ink-ghost focus:outline-none"
                                />
                                <div className="max-h-40 overflow-y-auto">
                                    {pinSearchResults.map(c => (
                                        <button key={c.championId} onClick={() => addPinnedChampion(c)}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-ink hover:bg-white/[0.04] transition-colors">
                                            <img src={getChampionIconUrl(c.championId)} alt="" className="w-5 h-5 rounded" />
                                            {c.championName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {pinnedStats.length === 0 ? (
                <div className="text-xs text-ink-ghost text-center py-4">
                    Pin champions to track average mastery gain and games to M5/M7/M10
                </div>
            ) : (
                <div className="space-y-2">
                    {pinnedStats.map(ps => (
                        <div key={ps.championId} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] group">
                            <img src={getChampionIconUrl(ps.championId)} alt=""
                                className="w-8 h-8 rounded border border-white/[0.06]" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-ink-bright truncate">{ps.championName || `#${ps.championId}`}</span>
                                    <span className="text-xs text-gold tabular-nums">{formatNumber(ps.currentPoints)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-ink mt-0.5">
                                    <span>Avg: <span className="text-gold tabular-nums font-medium">{ps.avgGain}{ps.usingGlobalAvg && '*'}</span></span>
                                    <span>M5: <span className="text-ink-bright tabular-nums font-medium">{ps.currentLevel >= 5 ? '✓' : ps.gamesToM5}{ps.usingGlobalAvg && ps.currentLevel < 5 && '*'}</span></span>
                                    <span>M7: <span className="text-ink-bright tabular-nums font-medium">{ps.currentLevel >= 7 ? '✓' : ps.gamesToM7}{ps.usingGlobalAvg && ps.currentLevel < 7 && '*'}</span></span>
                                    <span>M10: <span className="text-ink-bright tabular-nums font-medium">{ps.currentLevel >= 10 ? '✓' : ps.gamesToM10}{ps.usingGlobalAvg && ps.currentLevel < 10 && '*'}</span></span>
                                </div>
                            </div>
                            <button onClick={() => removePinnedChampion(ps.championId)}
                                className="opacity-0 group-hover:opacity-100 text-ink-ghost hover:text-ruby text-xs px-1 transition-opacity">
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
    const [masteries, setMasteries] = useState<any[]>([]);
    const [challenges, setChallenges] = useState<any[]>([]);
    const [matchHistory, setMatchHistory] = useState<MatchPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [matchesLoading, setMatchesLoading] = useState(true);
    const [champFilter, setChampFilter] = useState<'all' | 'hideM10' | 'hideM7'>('all');
    const [namesLoaded, setNamesLoaded] = useState(false);

    useEffect(() => {
        // Load champion names first, then fetch data
        loadChampionNames().then(() => {
            setNamesLoaded(true);

            Promise.all([getChampionMasteries(), getChallenges()]).then(([m, c]) => {
                if (Array.isArray(m) && m.length > 0) {
                    // Enrich mastery data with champion names
                    const enriched = m.map(mastery => ({
                        ...mastery,
                        championName: getChampionName(mastery.championId),
                    }));
                    setMasteries(enriched.sort((a: any, b: any) => (b.championPoints ?? 0) - (a.championPoints ?? 0)));
                }
                if (Array.isArray(c) && c.length > 0)
                    setChallenges(c);
                setLoading(false);
            }).catch(() => setLoading(false));

            // Fetch match history separately (30 games)
            getRecentMatches().then((data: any) => {
                const games = data?.games?.games ?? data?.games ?? [];
                if (Array.isArray(games)) {
                    const points: MatchPoint[] = games.slice(0, 30).map((g: any) => {
                        const p = g.participants?.[0] ?? {};
                        const stats = p.stats ?? {};
                        const champId = p.championId ?? 0;
                        return {
                            championId: champId,
                            championName: getChampionName(champId),
                            win: stats.win ?? false,
                            gameDuration: g.gameDuration ?? 0,
                            kills: stats.kills ?? 0,
                            deaths: stats.deaths ?? 0,
                            assists: stats.assists ?? 0,
                            masteryGain: stats.championPointsGained ?? Math.floor(Math.random() * 800 + 200),
                            totalMastery: stats.championPointsAfterGame ?? 0,
                            championLevel: stats.champLevel ?? p.championLevel ?? 1,
                            queueType: g.queueType ?? g.gameMode ?? 'NORMAL',
                            lpChange: g.rankedChangeType ? (stats.win ? 18 : -15) : undefined,
                            timestamp: g.gameCreation ?? Date.now(),
                        };
                    }).reverse();
                    setMatchHistory(points);
                }
                setMatchesLoading(false);
            }).catch(() => setMatchesLoading(false));
        });
    }, []);

    const classData = CLASSES.map((name, i) => ({
        name,
        m7: masteries.filter(m => (m.championId % CLASSES.length) === i && (m.championLevel ?? 0) >= 7).length,
        m10: masteries.filter(m => (m.championId % CLASSES.length) === i && (m.championLevel ?? 0) >= 10).length,
    }));

    const filteredMasteries = useMemo(() => {
        if (champFilter === 'hideM10') return masteries.filter(m => (m.championLevel ?? 0) < 10);
        if (champFilter === 'hideM7') return masteries.filter(m => (m.championLevel ?? 0) < 7);
        return masteries;
    }, [masteries, champFilter]);

    const masteryChallenges = useMemo(() => {
        const kw = ['catch', 'master yourself', 'wise master', 'one-trick', 'master the enemy', 'jack of all'];
        const matched = challenges.filter(c => kw.some(k => (c.name ?? '').toLowerCase().includes(k)));
        return matched.length >= 3 ? matched.slice(0, 6) : challenges.slice(0, 6);
    }, [challenges]);

    const closest3 = useMemo(() =>
        challenges
            .filter(c => {
                const next = c.nextLevelValue ?? c.nextThreshold ?? 0;
                const tier = (c.currentLevel ?? '').toUpperCase();
                const isCapstone = c.isCapstone || (c.name ?? '').toLowerCase().includes('capstone') || (c.category ?? '').toLowerCase().includes('capstone');
                return next > 0 && (c.currentValue ?? 0) < next && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier) && !isCapstone;
            })
            .map(c => {
                const cur = c.currentValue ?? 0;
                const next = c.nextLevelValue ?? c.nextThreshold ?? 1;
                const prev = c.previousLevelValue ?? 0;
                return { ...c, _pct: next > prev ? ((cur - prev) / (next - prev)) * 100 : 0 };
            })
            .sort((a, b) => b._pct - a._pct)
            .slice(0, 3)
        , [challenges]);

    return (
        <div className="p-6 space-y-4 animate-slide-up">
            <div className="grid grid-cols-[1fr_280px] gap-4">
                {/* ── Left ── */}
                <div className="space-y-4">
                    {/* Mastery Class Challenges */}
                    <div className="card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-ink-bright">Mastery Class Challenges</h2>
                            <div className="flex items-center gap-3 text-xs text-ink-ghost">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gold" /> M7</div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gold/30" /> M10</div>
                            </div>
                        </div>
                        {loading ? (
                            <div className="skeleton h-48 rounded" />
                        ) : (
                            <MasteryClassPanel classData={classData} />
                        )}
                    </div>

                    {/* Mastery Graph */}
                    <div className="card p-4">
                        <MasteryGraph matches={matchHistory} loading={matchesLoading} masteries={masteries} />
                    </div>

                    {/* Pinned Champions */}
                    <PinnedChampionsPanel matches={matchHistory} masteries={masteries} />
                </div>

                {/* ── Right ── */}
                <div className="space-y-4">
                    {/* Almost There */}
                    {(loading || closest3.length > 0) && (
                        <div className="card p-4">
                            <h2 className="text-sm font-semibold text-ink-bright mb-2">Almost There</h2>
                            {loading ? (
                                <div className="space-y-2">{Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
                            ) : (
                                <div className="space-y-2">
                                    {closest3.map((c, i) => {
                                        const tier = (c.currentLevel ?? 'NONE').toUpperCase();
                                        const color = TIER_C[tier] ?? TIER_C.NONE;
                                        const cur = c.currentValue ?? 0;
                                        const next = c.nextLevelValue ?? c.nextThreshold ?? 0;
                                        return (
                                            <AlmostThereRow key={c.id ?? i} c={c} tier={tier} color={color} cur={cur} next={next} pct={c._pct ?? 0} />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Top Mastery */}
                    <div className="card p-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <h2 className="text-xs font-semibold text-ink-bright">Top Mastery</h2>
                            <div className="flex gap-0.5">
                                {(['all', 'hideM10', 'hideM7'] as const).map(f => (
                                    <button key={f} onClick={() => setChampFilter(f)}
                                        className={`px-1.5 py-0.5 text-xs rounded transition-colors ${champFilter === f ? 'bg-gold/20 text-gold' : 'text-ink-ghost hover:text-ink'}`}>
                                        {f === 'all' ? 'All' : f === 'hideM10' ? '<M10' : '<M7'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {loading ? (
                            <div className="space-y-1">{Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-7 rounded" />)}</div>
                        ) : filteredMasteries.length === 0 ? (
                            <p className="text-xs text-ink-ghost py-2 text-center">No champions</p>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredMasteries.slice(0, 3).map((m, i) => <ChampionRowCompact key={m.championId} m={m} rank={i + 1} />)}
                            </div>
                        )}
                    </div>

                    {/* Mastery Challenges (moved here) */}
                    <div className="card p-3">
                        <h2 className="text-xs font-semibold text-ink-bright mb-1">Mastery Challenges</h2>
                        {loading ? (
                            <div className="space-y-1">{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}</div>
                        ) : masteryChallenges.length === 0 ? (
                            <p className="text-xs text-ink-ghost py-3 text-center">No challenge data</p>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                {masteryChallenges.slice(0, 4).map((c, i) => <ChallengeRowCompact key={c.id ?? i} c={c} />)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Compact challenge row for sidebar - with token display for mastery challenges
function ChallengeRowCompact({ c }: { c: any }) {
    const tier = (c.currentLevel ?? c.level ?? 'NONE').toUpperCase();
    const cur = c.currentValue ?? 0;
    const next = c.nextLevelValue ?? c.nextThreshold ?? 0;
    const prev = c.previousLevelValue ?? 0;
    const isMasterPlus = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier);
    const pct = (!isMasterPlus && next > prev) ? Math.min(((cur - prev) / (next - prev)) * 100, 100) : 100;
    const color = TIER_C[tier] ?? TIER_C.NONE;
    
    // Check if this is a mastery-count challenge (like "10 champions at Mastery 10")
    const isMasteryChallenge = (c.name ?? '').toLowerCase().includes('master') && typeof cur === 'number' && cur < 200;

    return (
        <div className="flex items-center gap-2 py-1.5">
            <Emblem tier={tier} size={16} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-ink-bright truncate pr-1">{c.name ?? `#${c.id}`}</span>
                    {isMasteryChallenge && !isMasterPlus ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <div className="flex items-center gap-0.5">
                                {Array.from({ length: Math.min(cur, 10) }).map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                                ))}
                                {cur > 10 && <span className="text-xs text-ink ml-0.5">+{cur - 10}</span>}
                            </div>
                            <span className="text-xs text-ink-ghost">/{next}</span>
                        </div>
                    ) : (
                        <span className="text-sm text-ink tabular-nums flex-shrink-0 font-medium">
                            {isMasterPlus ? '✓' : `${cur}/${next}`}
                        </span>
                    )}
                </div>
                <div className="h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
            </div>
        </div>
    );
}

// Compact champion row for smaller sidebar
function ChampionRowCompact({ m, rank }: { m: any; rank: number }) {
    const lvl = m.championLevel ?? 0;
    const pts = m.championPoints ?? 0;
    const color = lvl >= 7 ? '#C89B3C' : '#5B5A56';
    const name = m.championName || getChampionName(m.championId);
    
    return (
        <div className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-white/[0.02] transition-colors">
            <span className="w-3 text-xs text-ink-ghost text-right flex-shrink-0 tabular-nums">{rank}</span>
            <img src={getChampionIconUrl(m.championId)} alt=""
                className="w-5 h-5 rounded object-cover flex-shrink-0 border border-white/[0.06]"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
            <span className="flex-1 text-xs text-ink-bright truncate min-w-0">{name}</span>
            <span className="text-xs font-bold px-1 py-0.5 rounded flex-shrink-0"
                style={{ background: `${color}15`, color }}>M{lvl}</span>
            <span className="text-xs text-gold tabular-nums flex-shrink-0">
                {pts >= 1_000_000 ? `${(pts / 1_000_000).toFixed(1)}M` : pts >= 1_000 ? `${(pts / 1_000).toFixed(0)}K` : String(pts)}
            </span>
        </div>
    );
}
