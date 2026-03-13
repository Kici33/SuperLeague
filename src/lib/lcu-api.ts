import { invoke } from '@tauri-apps/api/core';
import type {
  ConnectionStatus, Summoner, Challenge, ChampionMastery, LobbyMember,
  EternalSet, SkinInfo, LcuRequest, LcuResponse, Account, MatchHistoryEntry,
  MasterySnapshot, DailyMastery
} from './types';

// ── Connection ──

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  try {
    return await invoke('get_connection_status');
  } catch {
    return { connected: false };
  }
}

export async function refreshConnection(): Promise<ConnectionStatus> {
  try {
    return await invoke('refresh_connection');
  } catch {
    return { connected: false };
  }
}

// ── Summoner ──

export async function getCurrentSummoner(): Promise<Summoner | null> {
  try {
    return await invoke('get_current_summoner');
  } catch {
    return null;
  }
}

// ── Challenges ──

export async function getChallenges(): Promise<any[]> {
  try {
    const raw = await invoke('get_challenges');
    // LCU returns an object keyed by challenge ID, not an array
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw);
    return [];
  } catch {
    return [];
  }
}

export async function getChallengesSummary(): Promise<Record<string, number>> {
  try {
    return await invoke('get_challenges_summary');
  } catch {
    return {};
  }
}

// ── Champion Mastery ──

export async function getChampionMasteries(): Promise<any[]> {
  try {
    const raw = await invoke('get_champion_masteries');
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw);
    return [];
  } catch {
    return [];
  }
}

export async function getChampionMastery(championId: number): Promise<ChampionMastery | null> {
  try {
    return await invoke('get_champion_mastery', { championId });
  } catch {
    return null;
  }
}

// ── Lobby ──

export async function getLobbyMembers(): Promise<LobbyMember[]> {
  try {
    return await invoke('get_lobby_members');
  } catch {
    return [];
  }
}

// ── Eternals ──

export async function getEternals(): Promise<any[]> {
  try {
    const raw = await invoke('get_eternals');
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw);
    return [];
  } catch {
    return [];
  }
}

// ── Skins ──

export async function getOwnedSkins(): Promise<any[]> {
  try {
    const raw = await invoke('get_owned_skins');
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw);
    return [];
  } catch {
    return [];
  }
}

// ── Match History ──

export async function getMatchHistory(count?: number): Promise<MatchHistoryEntry[]> {
  try {
    return await invoke('get_match_history', { count: count || 20 });
  } catch {
    return [];
  }
}

export async function getChampionMatchHistory(championId: number): Promise<MatchHistoryEntry[]> {
  try {
    return await invoke('get_champion_match_history', { championId });
  } catch {
    return [];
  }
}

// ── Mastery Snapshots ──

export async function getMasterySnapshots(championId?: number): Promise<MasterySnapshot[]> {
  try {
    return await invoke('get_mastery_snapshots', { championId });
  } catch {
    return [];
  }
}

export async function getDailyMastery(days?: number): Promise<DailyMastery[]> {
  try {
    return await invoke('get_daily_mastery', { days: days || 30 });
  } catch {
    return [];
  }
}

// ── Profile ──

export async function setProfileIcon(iconId: number): Promise<boolean> {
  try {
    return await invoke('set_profile_icon', { iconId });
  } catch {
    return false;
  }
}

export async function setStatus(message: string): Promise<boolean> {
  try {
    return await invoke('set_status', { message });
  } catch {
    return false;
  }
}

export async function setRankedDisplay(queue: string): Promise<boolean> {
  try {
    return await invoke('set_ranked_display', { queue });
  } catch {
    return false;
  }
}

// ── Debug / Generic LCU ──

export async function lcuRequest(request: LcuRequest): Promise<LcuResponse> {
  try {
    return await invoke('lcu_request', { request });
  } catch (e) {
    return { status: 0, body: String(e), headers: {} };
  }
}

// ── Accounts ──

export async function getAccounts(): Promise<Account[]> {
  try {
    return await invoke('get_accounts');
  } catch {
    return [];
  }
}

export async function switchAccount(accountId: number): Promise<boolean> {
  try {
    return await invoke('switch_account', { accountId });
  } catch {
    return false;
  }
}

export async function addAccount(account: Omit<Account, 'id'>): Promise<boolean> {
  try {
    return await invoke('add_account', { account });
  } catch {
    return false;
  }
}

// ── Discord Webhook ──

export async function sendDiscordWebhook(webhookUrl: string, content: string): Promise<boolean> {
  try {
    return await invoke('send_discord_webhook', { webhookUrl, content });
  } catch {
    return false;
  }
}

export async function testDiscordWebhook(webhookUrl: string): Promise<boolean> {
  return sendDiscordWebhook(webhookUrl, '🎮 SuperLeague connected! Webhook test successful.');
}

// ── Champions Data (from Data Dragon) ──

const DDRAGON_VERSION = '14.4.1';

export function getChampionIconUrl(championId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
}

export function getProfileIconUrl(iconId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;
}

export function getItemIconUrl(itemId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/item/${itemId}.png`;
}

export function getSkinSplashUrl(championId: number, skinId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/${championId}/${skinId}.jpg`;
}

export function getSkinTileUrl(championId: number, skinId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-tiles/${championId}/${skinId}.jpg`;
}

export function getSummonerSpellIconUrl(spellId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/data/spells/icons2d/summonerflash.png`;
}

// ── Ranked / LP ──

export async function getRankedStats(): Promise<Record<string, unknown>> {
  try {
    return await invoke('get_ranked_stats');
  } catch {
    return {};
  }
}

export async function getRecentMatches(): Promise<Record<string, unknown>> {
  try {
    return await invoke('get_recent_matches');
  } catch {
    return {};
  }
}

// ── Champions & Builds ──

export async function getAllChampions(): Promise<unknown[]> {
  try {
    return await invoke('get_all_champions');
  } catch {
    return [];
  }
}

export async function getChampionBuilds(championId: number): Promise<unknown> {
  try {
    return await invoke('get_champion_builds', { championId });
  } catch {
    return null;
  }
}

// ── Summoner Lookup (Team Builder) ──

export async function getSummonerByName(name: string): Promise<unknown> {
  try {
    return await invoke('get_summoner_by_name', { name });
  } catch {
    return null;
  }
}

export async function getSummonerChallenges(puuid: string): Promise<unknown> {
  try {
    return await invoke('get_summoner_challenges', { puuid });
  } catch {
    return null;
  }
}

// ── Challenge Summary (convenience) ──

export async function getChallengeSummary(): Promise<Record<string, unknown>> {
  try {
    return await invoke('get_challenges_summary');
  } catch {
    return {};
  }
}
