import { invoke } from '@tauri-apps/api/core';
import type {
  ConnectionStatus, Summoner, LcuRequest, LcuResponse, Account,
} from './types';

// ══════════════════════════════════════════════════════════════════════════════
// Core helper: ALL LCU data fetching goes through the working lcu_request
// command, which uses lcu_raw under the hood and handles errors properly.
// This avoids irelia type-deserialization issues in the individual commands.
// ══════════════════════════════════════════════════════════════════════════════

async function lcuGet(endpoint: string): Promise<any> {
  try {
    const res: LcuResponse = await invoke('lcu_request', {
      request: { method: 'GET', endpoint },
    });
    if (res.status >= 200 && res.status < 300 && res.body) {
      return JSON.parse(res.body);
    }
    console.error(`[LCU] ${endpoint} → ${res.status}:`, res.body?.slice(0, 200));
    return null;
  } catch (e) {
    console.error(`[LCU] ${endpoint} invoke error:`, e);
    return null;
  }
}

function toArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
}

function normalizeChampionSpellAssetName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '');
}

const championSpellNamesById: Record<number, Record<'Q' | 'W' | 'E', string>> = {};

function cacheChampionSpellNames(championId: number, spellNames: Partial<Record<'Q' | 'W' | 'E', string>>) {
  const current = championSpellNamesById[championId] ?? { Q: '', W: '', E: '' };
  championSpellNamesById[championId] = {
    Q: spellNames.Q ?? current.Q,
    W: spellNames.W ?? current.W,
    E: spellNames.E ?? current.E,
  };
}

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
  const raw = await lcuGet('/lol-challenges/v1/challenges/local-player/');
  return toArray(raw);
}

export async function getChallengesSummary(): Promise<Record<string, any>> {
  return (await lcuGet('/lol-challenges/v1/summary-player-data/local-player')) ?? {};
}

// ── Champion Mastery ──

export async function getChampionMasteries(): Promise<any[]> {
  const raw = await lcuGet('/lol-champion-mastery/v1/local-player/champion-mastery');
  return toArray(raw);
}

export async function getChampionMastery(championId: number): Promise<any> {
  return await lcuGet(`/lol-champion-mastery/v1/local-player/champion-mastery/by-champion-id/${championId}`);
}

// ── Lobby ──

export async function getLobbyMembers(): Promise<any[]> {
  const raw = await lcuGet('/lol-lobby/v2/lobby/members');
  return toArray(raw);
}

// ── Eternals ──

export async function getEternals(): Promise<any[]> {
  // Try to get detailed eternal stats with values
  const detailedEndpoints = [
    '/lol-statstones/v1/vignette/local-player',
    '/lol-statstones/v2/player-statstones-self',
  ];

  for (const endpoint of detailedEndpoints) {
    try {
      const res: LcuResponse = await invoke('lcu_request', {
        request: { method: 'GET', endpoint },
      });
      if (res.status >= 200 && res.status < 300 && res.body) {
        const data = JSON.parse(res.body);
        console.log(`[Eternals] Found detailed data at ${endpoint}:`, data);
        return toArray(data);
      }
    } catch (e) {
      // Continue to next endpoint
    }
  }

  // Fallback to summary endpoint
  const raw = await lcuGet('/lol-statstones/v2/player-summary-self');
  return toArray(raw);
}

export async function getChampionEternals(championId: number): Promise<any> {
  // Try multiple endpoints for detailed per-champion eternal stats
  const endpoints = [
    `/lol-statstones/v1/vignette/${championId}`,
    `/lol-statstones/v2/player-statstones-self/${championId}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res: LcuResponse = await invoke('lcu_request', {
        request: { method: 'GET', endpoint },
      });
      if (res.status >= 200 && res.status < 300 && res.body) {
        const data = JSON.parse(res.body);
        console.log(`[Eternals] Fetched champion ${championId} details from ${endpoint}:`, data);
        return data;
      }
    } catch (e) {
      // Silently continue
    }
  }

  return null;
}

// ── Skins ──

export async function getOwnedSkins(): Promise<any[]> {
  const raw = await lcuGet('/lol-champions/v1/inventories/local-player/skins-minimal');
  return toArray(raw);
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

// ── Asset URLs ──

export function getChampionIconUrl(championId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
}

export function getProfileIconUrl(iconId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;
}

export function getItemIconUrl(itemId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/16.8.1/img/item/${itemId}.png`;
}

export function getChampionSpellName(championId: number, spell: 'Q' | 'W' | 'E'): string | null {
  return championSpellNamesById[championId]?.[spell] ?? null;
}

export function getChampionSpellMaxOrderIconUrls(
  championName: string,
  spell: 'Q' | 'W' | 'E',
  spellName?: string | null,
): string[] {
  const championStem = normalizeChampionSpellAssetName(championName);
  const candidates = [
    `${championStem}${spell}`,
    spellName ? `${championStem}${normalizeChampionSpellAssetName(spellName)}` : null,
  ].filter((candidate): candidate is string => Boolean(candidate));

  return Array.from(new Set(candidates.map((candidate) => `https://ddragon.leagueoflegends.com/cdn/16.8.1/img/spell/${candidate}.png`)));
}

export function getSkinSplashUrl(championId: number, skinId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/${championId}/${skinId}.jpg`;
}

export function getSkinTileUrl(championId: number, skinId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-tiles/${championId}/${skinId}.jpg`;
}

// ── Ranked / LP ──

export async function getRankedStats(): Promise<any> {
  return (await lcuGet('/lol-ranked/v1/current-ranked-stats')) ?? {};
}

export async function getRecentMatches(): Promise<any> {
  return (await lcuGet('/lol-match-history/v1/products/lol/current-summoner/matches')) ?? {};
}

// ── Champions & Builds ──

export async function getAllChampions(): Promise<any[]> {
  const raw = await lcuGet('/lol-champions/v1/owned-champions-minimal');
  return toArray(raw);
}

export async function getChampionBuilds(championId: number): Promise<any> {
  return await lcuGet(`/lol-champions/v1/inventories/local-player/champions/${championId}/recommended-item-defaults`);
}

// ── Summoner Lookup ──

export async function getSummonerByName(name: string): Promise<any> {
  return await lcuGet(`/lol-summoner/v1/summoners?name=${encodeURIComponent(name)}`);
}

export async function getSummonerChallenges(puuid: string): Promise<any> {
  return await lcuGet(`/lol-challenges/v1/summary-player-data/puuid/${puuid}`);
}
