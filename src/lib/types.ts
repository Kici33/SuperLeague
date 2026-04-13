// TypeScript interfaces for all data models

// ── Summoner ──
export interface Summoner {
  accountId: string;
  puuid: string;
  summonerId: number;
  displayName: string;
  gameName?: string;
  tagLine?: string;
  internalName: string;
  profileIconId: number;
  summonerLevel: number;
  xpSinceLastLevel: number;
  xpUntilNextLevel: number;
  percentCompleteForNextLevel: number;
  rerollPoints: { currentPoints: number; maxRolls: number; numberOfRolls: number; pointsCostToRoll: number };
}

// ── Challenge ──
export interface Challenge {
  id: number;
  name: string;
  description: string;
  shortDescription: string;
  state: string;
  category: string;
  currentLevel: ChallengeTier;
  currentValue: number;
  nextLevelValue?: number;
  previousLevelValue?: number;
  percentile: number;
  position: number;
  playersInLevel: number;
  thresholds: Record<string, { value: number; rewards?: ChallengeReward[] }>;
  levelToIconPath: Record<string, string>;
  hasLeaderboard: boolean;
  friendsAtLevels?: {name: string; level: string}[];
}

export type ChallengeTier = 'NONE' | 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'CHALLENGER';

export interface ChallengeReward {
  category: string;
  quantity: number;
  title?: string;
  asset?: string;
}

export interface ChallengeCategory {
  id: string;
  name: string;
  description: string;
  challenges: Challenge[];
}

// ── Champion ──
export interface Champion {
  id: number;
  name: string;
  alias: string;
  squarePortraitPath: string;
  roles: string[];
}

export interface ChampionMastery {
  championId: number;
  championLevel: number;
  championPoints: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  lastPlayTime: number;
  tokensEarned: number;
  markRequiredForNextLevel: number;
  milestoneGrades: string[];
  puuid: string;
}

export interface MasterySnapshot {
  id: number;
  accountId: number;
  championId: number;
  masteryLevel: number;
  masteryPoints: number;
  snapshotDate: string;
}

// ── Match History ──
export interface MatchHistoryEntry {
  id: number;
  accountId: number;
  matchId: string;
  championId: number;
  masteryGained: number;
  result: 'win' | 'loss' | 'remake';
  timestamp: number;
  gameData: string; // JSON string with full game data
}

export interface GameData {
  gameMode: string;
  gameDuration: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  items: number[];
  summonerSpells: number[];
  runes: RuneData;
  championName: string;
}

export interface RuneData {
  primaryStyle: number;
  subStyle: number;
  selectedPerks: number[];
}

// ── Lobby ──
export interface LobbyMember {
  summonerId: number;
  summonerName: string;
  puuid: string;
  championId?: number;
  teamId?: number;
  profileIconId: number;
  isBot: boolean;
  isLeader?: boolean;
  isLocalMember?: boolean;
}

// ── Eternals ──
export interface EternalStatStone {
  name: string;
  contentId: string;
  championId: number;
  milestoneLevel: number;
  value: number;
  formattedValue: string;
  formattedMilestoneLevel: string;
  statstoneId: string;
}

export interface EternalSet {
  name: string;
  statstones: EternalStatStone[];
  seriesNumber: number;
}

// ── Skins ──
export interface SkinInfo {
  championId: number;
  skinId: number;
  skinName: string;
  isOwned: boolean;
  splashPath: string;
  tilePath: string;
  rarity: string;
  chromaPath?: string;
  isChroma: boolean;
}

// ── Builds ──
export interface BuildRecommendation {
  championId: number;
  role: string;
  runes: RuneData;
  summonerSpells: number[];
  startingItems: number[];
  coreItems: number[];
  situationalItems: number[];
  abilityOrder: string[];
  winRate?: number;
  pickRate?: number;
}

// ── Teams ──
export interface Team {
  id: string;
  name: string;
  region: string;
  members: TeamMember[];
  createdAt: string;
}

export interface TeamMember {
  summonerName: string;
  puuid?: string;
  role: string;
  championId?: number;
}

// ── Account ──
export interface Account {
  id: number;
  puuid: string;
  summonerName: string;
  region: string;
  isActive: boolean;
}

// ── Settings ──
export interface AppSettings {
  discordWebhookUrl: string;
  refreshInterval: number;
  autoConnect: boolean;
  showNotifications: boolean;
  theme: 'dark';
  activeAccountId: number | null;
}

// ── Connection Status ──
export interface ConnectionStatus {
  connected: boolean;
  summonerName?: string;
  region?: string;
}

// ── LCU Request (Debug) ──
export interface LcuRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  body?: unknown;
}

export interface LcuResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

// ── Daily Mastery ──
export interface DailyMastery {
  id: number;
  accountId: number;
  date: string;
  totalGained: number;
  details: string; // JSON with per-champion breakdown
}

// ── Tier Colors ──
export const TIER_COLORS: Record<ChallengeTier, string> = {
  'NONE': '#5B5A56',
  'IRON': '#6B6B6B',
  'BRONZE': '#8C5A3C',
  'SILVER': '#9AA4AF',
  'GOLD': '#C89B3C',
  'PLATINUM': '#4E9996',
  'DIAMOND': '#576BCE',
  'MASTER': '#9D48E0',
  'GRANDMASTER': '#E84057',
  'CHALLENGER': '#F4C874',
};

// ── Mastery Class Types ──
export type MasteryClass = 
  | 'Marksman' | 'Mage' | 'Assassin' | 'Fighter' 
  | 'Tank' | 'Support' | 'Specialist';

export const MASTERY_CLASSES: MasteryClass[] = [
  'Marksman', 'Mage', 'Assassin', 'Fighter', 'Tank', 'Support', 'Specialist'
];
