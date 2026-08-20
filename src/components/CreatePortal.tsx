import React, { useState } from 'react';
import { 
  UploadCloud, Film, CheckCircle2, AlertTriangle, Play, Sparkles, 
  Layers, Globe2, Plus, Edit2, ShieldCheck, DollarSign, Clock, ArrowRight,
  Eye, Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppUser, MediaAsset, UserRole } from '../types';

interface CreatePortalProps {
  user: AppUser | null;
  activeRole: UserRole;
  assets: MediaAsset[];
  onUploadAsset: (newAsset: Partial<MediaAsset>) => void;
  onEditAsset: (asset: MediaAsset) => void;
  onOpenScreener: (asset: MediaAsset) => void;
  onNavigateToDiscover: () => void;
}

export const CreatePortal: React.FC<CreatePortalProps> = ({
  user,
  activeRole,
  assets,
  onUploadAsset,
  onEditAsset,
  onOpenScreener,
  onNavigateToDiscover
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Drama, Sci-Fi');
  const [language, setLanguage] = useState('English, Malayalam');
  const [videoUrl, setVideoUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  const [thumbnailUrl, setThumbnailUrl] = useState('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80');

  // Filter studio assets if in studio mode
  const studioAssets = assets.filter(a => {
    if (activeRole === 'ADMIN') return true;
    if (activeRole === 'CONTENT_OWNER') return a.ownerId === user?.uid || a.ownerId === 'owner-paramount' || a.ownerId === 'owner-a24';
    return true;
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    onUploadAsset({
      title,
      description,
      genre: genre.split(',').map(s => s.trim()),
      language: language.split(',').map(s => s.trim()),
      videoUrl,
      thumbnailUrl,
      ownerId: user?.uid || 'owner-creator',
      status: 'APPROVED'
    });

    setTitle('');
    setDescription('');
    setShowUploadModal(false);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-600">Door 1</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Create &amp; Distribute
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Publish films, run automated QC compliance, and package for global buyer licensing.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Upload New Master Asset</span>
        </button>
      </div>

      {/* 4-Step Creator Pipeline */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-2xs">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block mb-3">
          Creator &amp; Studio Distribution Pipeline
        </span>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl">
            <span className="text-[10px] font-bold text-blue-600 block">Step 1</span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">Upload &amp; Metadata</p>
            <p className="text-[10px] text-slate-500 mt-0.5">ProRes / 4K UHD masters</p>
          </div>

          <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
            <span className="text-[10px] font-bold text-emerald-600 block">Step 2</span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">Automated QC</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Color gamut, audio stems</p>
          </div>

          <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
            <span className="text-[10px] font-bold text-indigo-600 block">Step 3</span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">SafePlay Watermarking</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Dynamic forensic burn-in</p>
          </div>

          <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl">
            <span className="text-[10px] font-bold text-amber-600 block">Step 4</span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">Monetize &amp; License</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Receive buyer bids &amp; MGs</p>
          </div>
        </div>
      </div>

      {/* Studio Assets List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Studio Master Inventory ({studioAssets.length} Titles)
          </h2>
          <span className="text-xs text-slate-500">Live RLS Protected</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studioAssets.map((asset) => (
            <motion.div
              key={asset.id}
              whileHover={{ y: -2 }}
              className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex space-x-4">
                <div className="w-20 h-28 rounded-xl bg-slate-900 overflow-hidden shrink-0 shadow-xs relative">
                  <img src={asset.thumbnailUrl} alt={asset.title} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs rounded text-[9px] font-mono text-white font-bold">
                    4K
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{asset.title}</h3>
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shrink-0 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>QC Passed</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{asset.description}</p>
                  
                  <div className="flex flex-wrap gap-1 pt-1">
                    {asset.genre.map(g => (
                      <span key={g} className="px-2 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-600 rounded-md">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Asset Action Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Languages:</span> {asset.language.join(', ')}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEditAsset(asset)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Edit Metadata"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onOpenScreener(asset)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Play size={12} className="fill-white" />
                    <span>SafePlay</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Upload Master Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl shadow-xl max-w-lg w-full p-6 space-y-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Upload New Feature Master</h3>
                <p className="text-xs text-slate-500">Publish your master film for automated QC and global licensing.</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Film Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Quantum Horizon"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Logline / Synopsis</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A cinematic sci-fi thriller exploring temporal convergence..."
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Genre</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Languages</label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                >
                  Publish Asset
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
