import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { getEternals, getChampionIconUrl } from '@/lib/lcu-api';

export default function Eternals() {
  const [eternals, setEternals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEternals().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setEternals(data);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-3 w-48 rounded" />
              <div className="skeleton h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : eternals.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-ink-ghost">
          <Star size={40} className="mb-3 opacity-20" />
          <p className="text-sm text-ink-dim">No eternals data available</p>
          <p className="text-xs mt-1">Eternals data will appear when available from the League client</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {eternals.map((set: any, i: number) => {
            const statstones = set.statstones ?? set.sets ?? set.milestones ?? [];
            const displayStones = Array.isArray(statstones) ? statstones : Object.values(statstones);
            return (
              <div key={i} className="card p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  {set.championId && (
                    <img
                      src={getChampionIconUrl(set.championId)}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                  )}
                  <h3 className="text-sm font-semibold text-ink-bright">
                    {set.name ?? set.seriesName ?? `Eternal Set ${i + 1}`}
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {displayStones.map((st: any, j: number) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-ink truncate">{st.name ?? st.description ?? `Stat ${j + 1}`}</span>
                          <span className="text-xs text-gold tabular-nums flex-shrink-0">
                            {st.formattedValue ?? st.value ?? '—'}
                          </span>
                        </div>
                        <span className="text-[10px] text-ink-ghost">Milestone {st.milestoneLevel ?? st.milestone ?? 0}</span>
                      </div>
                    </div>
                  ))}
                  {displayStones.length === 0 && (
                    <p className="text-xs text-ink-ghost">No stats for this set</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
