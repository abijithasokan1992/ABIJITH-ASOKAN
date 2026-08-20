import React, { useState } from 'react';
import { 
  Search, Globe, Play, DollarSign, MapPin
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppUser, MediaAsset, RightsCatalogueEntry, DealRequest, UserRole } from '../types';
import { GlobalRightsHeatmap } from './GlobalRightsHeatmap';

interface DiscoverPortalProps {
  user: AppUser | null;
  activeRole: UserRole;
  assets: MediaAsset[];
  rights: RightsCatalogueEntry[];
  deals: DealRequest[];
  onProposeDeal: (asset: MediaAsset, rightsEntry: RightsCatalogueEntry, price: number, message: string, country?: string) => void;
  onOpenScreener: (asset: MediaAsset) => void;
  onCreateCustomScreener: (asset: MediaAsset) => void;
}

export const DiscoverPortal: React.FC<DiscoverPortalProps> = ({
  user,
  activeRole,
  assets,
  rights,
  deals,
  onProposeDeal,
  onOpenScreener,
  onCreateCustomScreener
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [bids, setBids] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  const genres = ['ALL', 'Sci-Fi', 'Drama', 'Thriller', 'Action', 'Documentary', 'Animation'];

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre === 'ALL' || asset.genre.some(g => g.toLowerCase().includes(selectedGenre.toLowerCase()));
    return matchesSearch && matchesGenre;
  });

  const handleBidChange = (rightsId: string, val: number) => {
    setBids(prev => ({ ...prev, [rightsId]: val }));
  };

  const handleMessageChange = (rightsId: string, val: string) => {
    setMessages(prev => ({ ...prev, [rightsId]: val }));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600">Door 2</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Discover &amp; License Content
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search 4K master titles, inspect territory rights clearance, and submit licensing offers.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search titles, genres, studios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
          />
        </div>
      </div>

      {/* Genre Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {genres.map(g => (
          <button
            key={g}
            onClick={() => setSelectedGenre(g)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedGenre === g
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Global Interactive Rights Heatmap */}
      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Global Territory Rights Availability
            </h2>
            <p className="text-xs text-slate-500">
              Select any territory to review holdbacks, Minimum Guarantees (MG), and exclusivity.
            </p>
          </div>
        </div>

        <GlobalRightsHeatmap 
          assets={assets}
          rights={rights}
          userRole={activeRole}
          onProposeDeal={(rightsEntry, asset, suggestedCountry) => {
            const price = bids[rightsEntry.id] || rightsEntry.price || 45000;
            const msg = messages[rightsEntry.id] || '';
            onProposeDeal(asset, rightsEntry, price, msg, suggestedCountry);
          }}
          onGenerateScreener={(asset) => {
            onCreateCustomScreener(asset);
          }}
        />
      </div>

      {/* Catalog & Deal Submission Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
          Available Titles ({filteredAssets.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAssets.map((asset) => {
            const assetRights = rights.filter(r => r.assetId === asset.id);
            const primaryRight = assetRights[0];
            const defaultPrice = primaryRight?.price || 45000;
            const currentBid = bids[primaryRight?.id || ''] || defaultPrice;
            const currentMsg = messages[primaryRight?.id || ''] || '';

            return (
              <motion.div
                key={asset.id}
                whileHover={{ y: -2 }}
                className="p-5 bg-white border border-slate-200 rounded-3xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Media Presentation */}
                <div className="flex space-x-4">
                  <div className="w-24 h-36 rounded-2xl bg-slate-900 overflow-hidden shrink-0 shadow-xs relative">
                    <img src={asset.thumbnailUrl} alt={asset.title} className="w-full h-full object-cover" />
                    <button
                      onClick={() => onOpenScreener(asset)}
                      className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                      title="Watch Watermarked SafePlay Screener"
                    >
                      <Play size={24} className="fill-white drop-shadow-md" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-base font-bold text-slate-900 truncate">{asset.title}</h3>
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 rounded-md shrink-0">
                        {asset.genre[0]}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {asset.description}
                    </p>

                    <div className="space-y-1 text-[11px] text-slate-600">
                      <p><span className="font-semibold text-slate-800">Territories:</span> {primaryRight?.territories.join(', ') || 'Global'}</p>
                      <p><span className="font-semibold text-slate-800">Licensing:</span> {primaryRight?.licenseTypes.join(' • ') || 'SVOD'}</p>
                    </div>
                  </div>
                </div>

                {/* Offer / Deal Submission Box */}
                {primaryRight && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Minimum Guarantee (MG):</span>
                      <span className="font-black text-slate-900 font-mono">
                        ${(primaryRight.price || 45000).toLocaleString()} USD
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Your Licensing Offer ($)
                        </label>
                        <input
                          type="number"
                          value={currentBid}
                          onChange={(e) => handleBidChange(primaryRight.id, Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Terms / Notes
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 24-mo SVOD holdback"
                          value={currentMsg}
                          onChange={(e) => handleMessageChange(primaryRight.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => onCreateCustomScreener(asset)}
                        className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 cursor-pointer"
                      >
                        Request Screener Link
                      </button>

                      <button
                        onClick={() => onProposeDeal(asset, primaryRight, currentBid, currentMsg)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-98"
                      >
                        <DollarSign size={13} />
                        <span>Submit Offer</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
