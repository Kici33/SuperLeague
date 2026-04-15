import { useEffect, useState } from 'react';
import { check, relaunch } from '../lib/tauri-updater';

export type UpdaterState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'downloading'; version: string }
  | { status: 'installed'; version: string }
  | { status: 'error'; message: string };

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
        const update = await check(
          channel === 'beta'
            ? { target: 'beta' }
            : undefined,
        );

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