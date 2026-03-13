import { useEffect, useState } from 'react';
import { Search, Swords } from 'lucide-react';
import { getChampionMasteries, getChampionMastery, getChampionIconUrl } from '@/lib/lcu-api';

export default function ChampionBreakdown() {
  const [masteries, setMasteries] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChampionMasteries().then((m) => {
      if (Array.isArray(m) && m.length > 0) {
        const sorted = m.sort((a: any, b: any) => (b.championPoints ?? 0) - (a.championPoints ?? 0));
        setMasteries(sorted);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    getChampionMastery(selected.championId).then(setDetail);
  }, [selected]);

  const filtered = masteries.filter(m => {
    if (!search) return true;
    const id = String(m.championId ?? '');
    return id.includes(search);
  });

  return (
    <div className="p-6 animate-slide-up flex gap-5 h-[calc(100vh-80px)]">
      {/* Left: champion list */}
      <div className="w-56 flex flex-col gap-3 flex-shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost" />
          <input type="text" placeholder="Search by ID…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-search text-xs" />
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5">
          {loading ? Array(10).fill(0).map((_, i) => <div key={i} className="skeleton h-10 rounded" />) :
            filtered.length === 0 ? (
              <div className="text-center py-8 text-xs text-ink-ghost">No champions found</div>
            ) :
            filtered.map(m => (
              <button
                key={m.championId}
                onClick={() => setSelected(m)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  selected?.championId === m.championId ? 'bg-gold/10 border border-gold/20' : 'hover:bg-white/[0.04]'
                }`}
              >
                <img src={getChampionIconUrl(m.championId)} alt="" className="w-7 h-7 rounded object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-bright truncate">#{m.championId}</p>
                  <p className="text-[10px] text-ink-ghost">M{m.championLevel ?? 0} · {(m.championPoints ?? 0).toLocaleString()}</p>
                </div>
              </button>
            ))
          }
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-ink-ghost">
            <Swords size={40} className="mb-3 opacity-20" />
            <p className="text-sm text-ink-dim">Select a champion</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card p-5 flex items-center gap-4">
              <img src={getChampionIconUrl(selected.championId)} alt="" className="w-14 h-14 rounded-lg border border-gold/30 object-cover" />
              <div>
                <h2 className="text-base font-semibold text-ink-bright">Champion #{selected.championId}</h2>
                <p className="text-xs text-ink-muted mt-0.5">Mastery {selected.championLevel ?? 0} · {(selected.championPoints ?? 0).toLocaleString()} pts</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Points', value: (detail?.championPoints ?? selected.championPoints ?? 0).toLocaleString(), color: '#C89B3C' },
                { label: 'Tokens', value: String(detail?.tokensEarned ?? selected.tokensEarned ?? 0), color: '#10D48A' },
                { label: 'Level', value: `M${detail?.championLevel ?? selected.championLevel ?? 0}`, color: '#9D48E0' },
              ].map(({ label, value, color }) => (
                <div key={label} className="card-inset text-center">
                  <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
                  <p className="text-[10px] text-ink-ghost">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
