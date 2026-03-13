import { useEffect, useState, useMemo } from 'react';
import { Search, Palette } from 'lucide-react';
import { getOwnedSkins } from '@/lib/lcu-api';

/* Community Dragon skin tile URL */
function getSkinTileUrl(skinId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-tiles/${Math.floor(skinId / 1000)}/${skinId}.jpg`;
}

const RARITY_DOT: Record<string, string> = {
  kMythic: '#FF8C42', kUltimate: '#FF5733', kLegendary: '#E84057',
  kEpic: '#9D48E0', kRare: '#576BCE', kCommon: '#5B5A56',
};

export default function Skins() {
  const [skins, setSkins] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'owned' | 'unowned'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOwnedSkins().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setSkins(data);
      }
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return skins.filter((s: any) => {
      const name = (s.name ?? '').toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase());
      const isOwned = s.ownership?.owned ?? s.isOwned ?? false;
      const matchFilter =
        filter === 'all' ||
        (filter === 'owned' && isOwned) ||
        (filter === 'unowned' && !isOwned);
      return matchSearch && matchFilter;
    });
  }, [skins, search, filter]);

  const ownedCount = skins.filter((s: any) => s.ownership?.owned ?? s.isOwned ?? false).length;

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      {/* Filter bar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-ghost" />
          <input
            type="text"
            placeholder="Search skins…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-search text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'owned', 'unowned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                filter === f ? 'bg-gold text-void' : 'bg-raised text-ink-muted border border-white/[0.06] hover:text-ink'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {!loading && (
          <span className="text-xs text-ink-ghost tabular-nums ml-auto">
            {ownedCount} / {skins.length} owned
          </span>
        )}
      </div>

      {/* Skin grid */}
      {loading ? (
        <div className="grid grid-cols-5 gap-2.5">
          {Array(20).fill(0).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4] rounded-lg" />
          ))}
        </div>
      ) : skins.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-ink-ghost">
          <Palette size={40} className="mb-3 opacity-20" />
          <p className="text-sm text-ink-dim">No skin data available</p>
          <p className="text-xs mt-1">Make sure you're connected to the League client</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2.5">
          {filtered.map((skin: any) => {
            const isOwned = skin.ownership?.owned ?? skin.isOwned ?? false;
            const rarity = skin.rarity ?? skin.rarityGemPath ?? '';
            const rarityKey = Object.keys(RARITY_DOT).find(k => rarity.includes?.(k)) ?? 'kCommon';
            const skinId = skin.id ?? skin.skinId ?? 0;

            return (
              <div
                key={skinId}
                className={`relative rounded-lg overflow-hidden border transition-all group cursor-pointer ${
                  isOwned ? 'border-gold/20 hover:border-gold/40' : 'border-white/[0.05] opacity-40 hover:opacity-70'
                }`}
              >
                <img
                  src={getSkinTileUrl(skinId)}
                  alt={skin.name ?? ''}
                  className="w-full aspect-[3/4] object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent" />
                {/* Name */}
                <div className="absolute bottom-0 inset-x-0 p-2">
                  <p className="text-[10px] font-medium text-white truncate leading-tight">{skin.name ?? `Skin #${skinId}`}</p>
                </div>
                {/* Rarity dot */}
                <div
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{ background: RARITY_DOT[rarityKey], boxShadow: `0 0 4px ${RARITY_DOT[rarityKey]}60` }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
