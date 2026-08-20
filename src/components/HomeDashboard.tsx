import React from 'react';
import { 
  PlusCircle, Search, Settings, Sparkles, AlertCircle, 
  ArrowRight, DollarSign, FileText, TrendingUp, Play, 
  Layers, ShieldCheck, Terminal, HardDrive, Globe,
  Activity, CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppUser, MediaAsset, DealRequest, Contract, UserRole, RightsCatalogueEntry } from '../types';

interface HomeDashboardProps {
  user: AppUser | null;
  activeRole: UserRole;
  assets: MediaAsset[];
  rights: RightsCatalogueEntry[];
  deals: DealRequest[];
  contracts: Contract[];
  onNavigate: (tab: 'home' | 'create' | 'discover' | 'manage' | 'ai') => void;
  onOpenDeal: (dealId: string) => void;
  onOpenScreener: (asset: MediaAsset) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  activeRole,
  assets,
  rights,
  deals,
  contracts,
  onNavigate,
  onOpenDeal,
  onOpenScreener
}) => {
  const pendingDeals = deals.filter(d => d.status === 'REQUESTED');
  const pendingContracts = contracts.filter(c => c.status === 'PENDING');
  const approvedDeals = deals.filter(d => d.status === 'APPROVED');
  const qcNeededAssets = assets.filter(a => a.status === 'QC_REVIEW' || a.status === 'SUBMITTED');

  // Strictly dynamic calculation derived from real approved deals
  const totalRevenue = approvedDeals.reduce((sum, d) => sum + (d.proposedPrice || 0), 0);
  const inNegotiationVolume = pendingDeals.reduce((sum, d) => sum + (d.proposedPrice || 0), 0);

  const userFirstName = user?.displayName ? user.displayName.split(' ')[0] : 'Operator';
  const systemIdentifier = user?.email || 'streamvista-os.node-01.live';

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2 text-slate-100">
      
      {/* =========================================================================
          1. OS HERO BANNER: "Stories move here." with Radiant Celestial Orb
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B0C10] border border-white/10 shadow-2xl p-6 sm:p-10 md:p-12">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Typography & Intent */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Tracked Eyebrow Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono font-bold tracking-[0.22em] text-slate-300 uppercase backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              <span>STORIES &bull; RIGHTS &bull; SCALE</span>
            </div>

            {/* Signature Headline */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
                Stories
              </h1>
              <div className="text-4xl sm:text-5xl md:text-6xl font-normal text-white leading-[1.05]">
                <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-pink-300 pr-2">
                  move
                </span>
                <span className="font-extrabold text-white">here.</span>
              </div>
            </div>

            {/* Subheading */}
            <p className="text-sm sm:text-base text-slate-400 max-w-xl font-normal leading-relaxed">
              An operating system for film rights acquisition, digital distribution, private watermarked screening, and worldwide monetization.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('discover')}
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-all shadow-lg active:scale-98 cursor-pointer"
              >
                <Search size={14} className="text-slate-950" />
                <span>Explore Catalog</span>
                <ArrowRight size={13} className="text-slate-500" />
              </button>

              <button
                onClick={() => onNavigate('create')}
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition-all backdrop-blur-md active:scale-98 cursor-pointer"
              >
                <PlusCircle size={14} className="text-indigo-400" />
                <span>Publish Master Asset</span>
              </button>

              <button
                onClick={() => onNavigate('ai')}
                className="inline-flex items-center space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/40 hover:to-purple-600/40 border border-indigo-500/30 text-indigo-200 font-bold text-xs transition-all backdrop-blur-md cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-300" />
                <span>Ask StreamVista AI</span>
              </button>
            </div>
          </div>

          {/* Right Column: Luminous Cosmic Gradient Orb (Matching Screenshot) */}
          <div className="lg:col-span-5 flex items-center justify-center relative min-h-[260px] sm:min-h-[300px]">
            {/* Ambient Backlight Glow */}
            <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-purple-600/30 blur-[70px] pointer-events-none" />
            <div className="absolute w-44 h-44 rounded-full bg-orange-500/20 blur-[50px] pointer-events-none" />

            {/* The Radiant Celestial Orb */}
            <motion.div
              animate={{ 
                scale: [1, 1.03, 1],
                rotate: [0, 5, 0]
              }}
              transition={{ 
                duration: 9, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="relative w-56 h-56 sm:w-68 sm:h-68 rounded-full shadow-[0_0_90px_rgba(147,51,234,0.45)] cursor-pointer group"
              onClick={() => onNavigate('ai')}
              title="StreamVista AI Engine - Click to interact"
              style={{
                background: `
                  radial-gradient(circle at 35% 35%, #FFF0D6 0%, #FF9248 18%, #F43F5E 38%, #8B5CF6 65%, #312E81 88%, #0F172A 100%)
                `
              }}
            >
              {/* Inner ambient specular lens reflex */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/15 to-transparent opacity-60 pointer-events-none" />
              
              {/* Pulsing center nucleus */}
              <div className="absolute top-[28%] left-[28%] w-14 h-14 rounded-full bg-amber-100/70 blur-xs shadow-[0_0_30px_#FFAE68] pointer-events-none" />

              {/* Dynamic Interactive Tag on Hover */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                AI Engine Online
              </div>
            </motion.div>
          </div>

        </div>

        {/* =========================================================================
            OS Command Bar / Terminal Dock (Directly from Screenshot)
            ========================================================================= */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md font-mono text-xs text-slate-300">
            <Terminal size={14} className="text-indigo-400 shrink-0" />
            <span className="truncate text-slate-400 max-w-xs sm:max-w-md">
              {systemIdentifier}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              LIVE
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>SafePlay Watermarking: Active</span>
            </span>
            <span className="hidden sm:inline-block text-white/20">&bull;</span>
            <span className="hidden sm:flex items-center space-x-1">
              <ShieldCheck size={13} className="text-blue-400" />
              <span>RLS Protected</span>
            </span>
          </div>
        </div>

      </div>

      {/* =========================================================================
          2. THE FOUR OS CORE DOORS
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
            OS Workspaces &amp; Distribution Doors
          </h2>
          <span className="text-xs font-mono text-slate-500">Session: {activeRole}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Door 1: CREATE */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => onNavigate('create')}
            className="p-6 bg-[#0E1017] border border-white/10 hover:border-blue-500/50 rounded-2xl shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <PlusCircle size={20} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400 block mb-1">
                  Door 01 &bull; Ingest
                </span>
                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                  Create &amp; Distribute
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Upload 4K masters, run automated QC compliance, and package for worldwide licensing.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 flex items-center text-xs font-bold text-blue-400 space-x-1">
              <span>Open Studio Ingest</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Door 2: DISCOVER */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => onNavigate('discover')}
            className="p-6 bg-[#0E1017] border border-white/10 hover:border-indigo-500/50 rounded-2xl shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Search size={20} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 block mb-1">
                  Door 02 &bull; Catalog
                </span>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                  Discover &amp; License
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Explore titles on the territory heatmap, review MG pricing, and stream SafePlay screeners.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 flex items-center text-xs font-bold text-indigo-400 space-x-1">
              <span>Browse Global Rights</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Door 3: MANAGE */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => onNavigate('manage')}
            className="p-6 bg-[#0E1017] border border-white/10 hover:border-emerald-500/50 rounded-2xl shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Settings size={20} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 block mb-1">
                  Door 03 &bull; Operations
                </span>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Studio Management
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Arbitrate licensing bids, execute signed agreements, and sync with Google Workspace.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 flex items-center text-xs font-bold text-emerald-400 space-x-1">
              <span>Manage Operations</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Door 4: TALK TO AI */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => onNavigate('ai')}
            className="p-6 bg-gradient-to-b from-[#13111C] to-[#0A0912] border border-purple-500/30 hover:border-amber-400/60 rounded-2xl shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300 block mb-1">
                  Door 04 &bull; Intelligence
                </span>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  StreamVista AI
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Execute natural language intents for catalogue valuations, deal structuring, and rights clearance.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 flex items-center text-xs font-bold text-amber-300 space-x-1">
              <span>Launch Copilot</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

        </div>
      </div>

      {/* =========================================================================
          3. REAL-TIME REVENUE & PIPELINE PULSE (Strictly Derived from State)
          ========================================================================= */}
      <div className="p-6 bg-[#0E1017] border border-white/10 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity size={15} className="text-indigo-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
              Live Commercial Telemetry
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Real-Time Sync</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
          <div>
            <span className="text-xs text-slate-400 font-medium">Realized Licensing Revenue</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-white mt-1">
              ${totalRevenue.toLocaleString()} <span className="text-xs text-slate-500 font-normal">USD</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {approvedDeals.length} executed agreement{approvedDeals.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="pt-4 md:pt-0 md:pl-6">
            <span className="text-xs text-slate-400 font-medium">Negotiation Pipeline</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-indigo-400 mt-1">
              ${inNegotiationVolume.toLocaleString()} <span className="text-xs text-slate-500 font-normal">USD</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {pendingDeals.length} active buyer offer{pendingDeals.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="pt-4 md:pt-0 md:pl-6">
            <span className="text-xs text-slate-400 font-medium">Master Assets in Vault</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-white mt-1">
              {assets.length} <span className="text-xs text-slate-500 font-normal">Titles</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">4K ProRes &amp; Master Stems</p>
          </div>

          <div className="pt-4 md:pt-0 md:pl-6">
            <span className="text-xs text-slate-400 font-medium">Pending Actions</span>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 mt-1">
              {pendingDeals.length + pendingContracts.length + qcNeededAssets.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Arbitration &amp; signatures</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. ACTIONABLE OS PANELS: Active Operations + Featured Titles
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Panel A: Priority Actions Queue */}
        <div className="p-6 bg-[#0E1017] border border-white/10 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-400">
              <AlertCircle size={16} />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Action Queue ({pendingDeals.length + pendingContracts.length + qcNeededAssets.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('manage')}
              className="text-[11px] font-bold text-indigo-400 hover:underline cursor-pointer"
            >
              Open Operations
            </button>
          </div>

          <div className="space-y-2.5">
            {pendingDeals.length === 0 && pendingContracts.length === 0 && qcNeededAssets.length === 0 ? (
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl text-center">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-300">All Operations Synchronized</p>
                <p className="text-[11px] text-slate-500 mt-0.5">No pending offers or contracts requiring approval.</p>
              </div>
            ) : (
              <>
                {pendingDeals.map((deal) => {
                  const asset = assets.find(a => a.id === deal.assetId);
                  return (
                    <div 
                      key={deal.id}
                      className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 font-bold text-xs">
                          <DollarSign size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            Offer on {asset?.title || 'Film Asset'}: ${(deal.proposedPrice || 0).toLocaleString()} USD
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {deal.message || 'Licensing request waiting for decision'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onNavigate('manage')}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg cursor-pointer transition-colors shrink-0"
                      >
                        Arbitrate
                      </button>
                    </div>
                  );
                })}

                {pendingContracts.map((c) => (
                  <div 
                    key={c.id}
                    className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 font-bold text-xs">
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          Contract #{c.id} Ready for Signature
                        </p>
                        <p className="text-[10px] text-slate-400">Distribution licensing execution</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigate('manage')}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg cursor-pointer transition-colors shrink-0"
                    >
                      Sign
                    </button>
                  </div>
                ))}

                {qcNeededAssets.map((a) => (
                  <div 
                    key={a.id}
                    className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 font-bold text-xs">
                        QC
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {a.title} &mdash; Automated QC Check
                        </p>
                        <p className="text-[10px] text-slate-400">Resolution &amp; Bitrate compliance</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigate('create')}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg cursor-pointer transition-colors shrink-0"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Panel B: Available Master Titles */}
        <div className="p-6 bg-[#0E1017] border border-white/10 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Active Vault Titles ({assets.length})
            </h3>
            <button 
              onClick={() => onNavigate('discover')}
              className="text-[11px] font-bold text-indigo-400 hover:underline cursor-pointer"
            >
              Browse Heatmap
            </button>
          </div>

          <div className="space-y-3">
            {assets.slice(0, 3).map((asset) => {
              const assetRights = rights.filter(r => r.assetId === asset.id);
              const territoryDisplay = assetRights[0]?.territories.join(', ') || 'Global';
              return (
                <div 
                  key={asset.id}
                  className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 relative">
                      <img src={asset.thumbnailUrl} alt={asset.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play size={14} className="text-white fill-white opacity-80" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{asset.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {asset.genre.join(', ')} &bull; {territoryDisplay}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => onOpenScreener(asset)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg cursor-pointer"
                    >
                      SafePlay
                    </button>
                    <button
                      onClick={() => onNavigate('discover')}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-950 bg-white hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      License
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
