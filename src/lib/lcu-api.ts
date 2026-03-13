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
    return null;
  } catch {
    return null;
  }
}

function toArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
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
  const raw = await lcuGet('/lol-champion-mastery/v1/local-player/champion-mastery/top?count=200');
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
  const raw = await lcuGet('/lol-statstones/v2/player-statstones-self');
  return toArray(raw);
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
  return `https://ddragon.leagueoflegends.com/cdn/14.4.1/img/item/${itemId}.png`;
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
