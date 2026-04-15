import { useEffect, useState } from 'react';
import { check, relaunch } from '../lib/tauri-updater';

export type UpdaterState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'downloading'; version: string }
  | { status: 'installed'; version: string }
  | { status: 'error'; message: string };

type GitHubRelease = {
  tag_name: string;
  prerelease: boolean;
  draft: boolean;
};

async function getLatestBetaTag(): Promise<string | null> {
  const response = await fetch('https://api.github.com/repos/Kici33/SuperLeague/releases?per_page=20');
  if (!response.ok) {
    throw new Error(`Failed to fetch releases (${response.status})`);
  }

  const releases = (await response.json()) as GitHubRelease[];
  const latestPrerelease = releases.find((release) => release.prerelease && !release.draft);
  return latestPrerelease?.tag_name ?? null;
}

export function useUpdater(): UpdaterState {
  const [state, setState] = useState<UpdaterState>({ status: 'checking' });

  useEffect(() => {
    if (import.meta.env.DEV) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;

    let channel: 'stable' | 'beta' = 'stable';
    try {
      const raw = localStorage.getItem('superleague_settings');
      if (raw) {
        const parsed = JSON.parse(raw) as { releaseChannel?: 'stable' | 'beta' };
        if (parsed.releaseChannel === 'beta') channel = 'beta';
      }
    } catch {
      // Keep stable as default if settings are not readable.
    }

    const run = async () => {
      try {
        let update;
        if (channel === 'beta') {
          const betaTag = await getLatestBetaTag();
          if (!betaTag) {
            setState({ status: 'idle' });
            return;
          }

          update = await check({ target: betaTag });
        } else {
          update = await check();
        }

        if (cancelled) return;

        if (!update) {
          setState({ status: 'idle' });
          return;
        }

        setState({ status: 'downloading', version: update.version });

        await update.downloadAndInstall((event) => {
          if (cancelled) return;

          if (event.event === 'Started') {
            setState({ status: 'downloading', version: update.version });
          }
        });

        if (cancelled) return;

        setState({ status: 'installed', version: update.version });
        await relaunch();
      } catch (error) {
        if (cancelled) return;

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}