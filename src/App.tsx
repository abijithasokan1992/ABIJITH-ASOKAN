import React, { useState, useEffect } from 'react';
import { 
  Globe, Shield, Sparkles, Loader2, Video, Key, FileText, 
  CheckCircle, PlusCircle, Clock, Send, Eye, ShieldAlert, ArrowRight, 
  UserCheck, RefreshCw, Lock, Unlock, Check, ThumbsUp, ThumbsDown, LogOut, X,
  BadgeCheck, UserCircle, Briefcase, Film, Scale, ShieldCheck, Building2, User,
  Sliders, Edit3, Save, Database, Home, Search, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getStoredSession, saveSession, loginAsEnterpriseRole, loginWithCustomUser, 
  logoutSession, ENTERPRISE_USERS, syncUserProfile, getUserProfile,
  subscribeAuditLogs, logAuditEvent, fetchAuditLogs
} from './lib/firebase';
import { HomeDashboard } from './components/HomeDashboard';
import { CreatePortal } from './components/CreatePortal';
import { DiscoverPortal } from './components/DiscoverPortal';
import { ManagePortal } from './components/ManagePortal';
import { StreamVistaAISuite } from './components/StreamVistaAISuite';
import { ScreenerModal } from './components/ScreenerModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { 
  isSupabaseConfigured, 
  supabaseFetchAssets, 
  supabaseFetchDeals,
  supabaseInsertDeal,
  supabaseUpdateDealStatus,
  supabaseUpdateAsset
} from './lib/supabase';
import { AppUser, MediaAsset, RightsCatalogueEntry, DealRequest, PrivateScreener, Contract, UserRole, AuditLog } from './types';
import { 
  INITIAL_ASSETS, INITIAL_RIGHTS, INITIAL_DEALS, 
  INITIAL_SCREENERS, INITIAL_CONTRACTS 
} from './data';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(() => getStoredSession());
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Authenticated User Active Role / Perspective
  const [activeRole, setActiveRole] = useState<UserRole>(() => user?.role || 'ADMIN');

  // Custom User Sign-In form state
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customRole, setCustomRole] = useState<UserRole>('ADMIN');
  const [customCompany, setCustomCompany] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Auto-dismiss notification banner
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
  };

  // Core Database/State arrays
  const [assets, setAssets] = useState<MediaAsset[]>(INITIAL_ASSETS);
  const [rights, setRights] = useState<RightsCatalogueEntry[]>(INITIAL_RIGHTS);
  const [deals, setDeals] = useState<DealRequest[]>(INITIAL_DEALS);
  const [screeners, setScreeners] = useState<PrivateScreener[]>(INITIAL_SCREENERS);
  const [contracts, setContracts] = useState<Contract[]>(INITIAL_CONTRACTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);

  // 5 Unified Navigation Pillars
  const [activeTab, setActiveTab] = useState<'home' | 'create' | 'discover' | 'manage' | 'ai'>('home');
  const [activeScreenerVideo, setActiveScreenerVideo] = useState<{ title: string; videoUrl: string; watermarkText: string } | null>(null);

  // Screener Creation Drawer
  const [generatingScreenerForAsset, setGeneratingScreenerForAsset] = useState<MediaAsset | null>(null);
  const [screenerRecipient, setScreenerRecipient] = useState('');
  const [screenerWatermark, setScreenerWatermark] = useState('');
  const [screenerDurationDays, setScreenerDurationDays] = useState(14);

  // Compose Template to bridge catalogue actions directly to Gmail dispatch
  const [composeTemplate, setComposeTemplate] = useState<{ to: string; subject: string; body: string } | null>(null);

  // Supabase Cloud Backend & Sync Modal State
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseActive, setIsSupabaseActive] = useState<boolean>(() => isSupabaseConfigured());
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);

  // Auto-check and pull from Supabase if credentials are configured
  useEffect(() => {
    const checkAndSyncSupabase = async () => {
      if (isSupabaseConfigured()) {
        setIsSupabaseActive(true);
        try {
          const remoteAssets = await supabaseFetchAssets();
          if (remoteAssets && remoteAssets.length > 0) {
            setAssets(remoteAssets);
          }
          const remoteDeals = await supabaseFetchDeals();
          if (remoteDeals && remoteDeals.length > 0) {
            setDeals(remoteDeals);
          }
        } catch (e) {
          console.warn('Supabase auto-sync failed or unconfigured:', e);
        }
      }
    };
    checkAndSyncSupabase();
  }, []);

  // Fetch or subscribe to Realtime Audit Logs
  useEffect(() => {
    if (!user) return;
    setIsAuditLoading(true);
    const unsubscribe = subscribeAuditLogs((logs) => {
      setAuditLogs(logs);
      setIsAuditLoading(false);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Handle Enterprise Role Login
  const handleEnterpriseLogin = async (role: UserRole, targetTab: 'home' | 'create' | 'discover' | 'manage' | 'ai' = 'home') => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const authedUser = await loginAsEnterpriseRole(role);
      setUser(authedUser);
      setActiveRole(authedUser.role);
      saveSession(authedUser);
      setActiveTab(targetTab);
      showNotification(`Signed in as ${authedUser.displayName} (${role})`);
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Custom Login Submit
  const handleCustomLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const authedUser = await loginWithCustomUser(
        customName || customEmail.split('@')[0],
        customEmail,
        customRole,
        customCompany || 'Independent Media'
      );
      setUser(authedUser);
      setActiveRole(authedUser.role);
      saveSession(authedUser);
      showNotification(`Signed in as ${authedUser.displayName}`);
    } catch (err: any) {
      setLoginError(err.message || 'Custom authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logoutSession();
    setUser(null);
    setActiveTab('home');
    showNotification('Signed out successfully.', 'info');
  };

  // Role Perspective Switcher
  const handleRoleChange = async (newRole: UserRole) => {
    setActiveRole(newRole);
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      saveSession(updatedUser);
      await syncUserProfile(updatedUser);
      showNotification(`Switched perspective to ${newRole}`);
    }
  };

  // 1. Propose licensing deal
  const handleProposeDeal = (
    asset: MediaAsset, 
    rightsEntry: RightsCatalogueEntry, 
    price: number, 
    message: string, 
    suggestedCountry?: string
  ) => {
    if (!user) {
      showNotification('Please sign in to submit licensing bids.', 'info');
      return;
    }

    const proposedPrice = price > 0 ? price : (rightsEntry.price || 45000);
    const territoryNotice = suggestedCountry ? ` for ${suggestedCountry}` : '';

    const newDeal: DealRequest = {
      id: `deal-${Date.now()}`,
      buyerId: user.uid,
      assetId: asset.id,
      ownerId: asset.ownerId,
      rightsId: rightsEntry.id,
      status: 'REQUESTED',
      proposedPrice,
      message,
      createdAt: Date.now()
    };

    setDeals([newDeal, ...deals]);
    showNotification(`Submitted offer of $${proposedPrice.toLocaleString()} for "${asset.title}"${territoryNotice}. Content owner notified.`);
    
    if (isSupabaseConfigured()) {
      supabaseInsertDeal(newDeal).catch(err => console.warn('Supabase deal sync note:', err));
    }

    logAuditEvent({
      action: 'deal_proposed',
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email || 'Authenticated User',
      role: activeRole,
      details: `Submitted licensing offer of $${proposedPrice.toLocaleString()} for "${asset.title}" (${suggestedCountry || rightsEntry.territories.join(', ')})`,
      resourceId: newDeal.id,
      resourceType: 'deal',
      metadata: {
        dealId: newDeal.id,
        assetId: asset.id,
        assetTitle: asset.title,
        proposedPrice,
        territories: suggestedCountry ? [suggestedCountry] : rightsEntry.territories,
        message
      }
    });
  };

  // 2. Review Offer
  const handleReviewOffer = (dealId: string, approve: boolean) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    setDeals(deals.map(dealItem => {
      if (dealItem.id === dealId) {
        return {
          ...dealItem,
          status: approve ? 'APPROVED' : 'REJECTED'
        };
      }
      return dealItem;
    }));

    const asset = assets.find(a => a.id === deal.assetId);
    const newStatus = approve ? 'APPROVED' : 'REJECTED';

    if (isSupabaseConfigured()) {
      supabaseUpdateDealStatus(dealId, newStatus).catch(err => console.warn('Supabase deal status sync note:', err));
    }

    if (user) {
      logAuditEvent({
        action: approve ? 'deal_approved' : 'deal_rejected',
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email || 'Authenticated User',
        role: activeRole,
        details: `${approve ? 'Approved' : 'Declined'} licensing deal for "${asset?.title || 'Film Asset'}" (Offer: $${deal.proposedPrice?.toLocaleString() || 'N/A'})`,
        resourceId: deal.id,
        resourceType: 'deal',
        metadata: {
          dealId: deal.id,
          assetId: deal.assetId,
          assetTitle: asset?.title,
          proposedPrice: deal.proposedPrice,
          decision: approve ? 'APPROVED' : 'REJECTED'
        }
      });
    }

    if (approve) {
      const newContract: Contract = {
        id: `contract-${Date.now()}`,
        dealId: deal.id,
        assetId: deal.assetId,
        buyerId: deal.buyerId,
        ownerId: deal.ownerId,
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        status: 'PENDING',
        createdAt: Date.now()
      };
      setContracts([newContract, ...contracts]);
      showNotification('Offer accepted! Generated draft licensing contract ready for signature.');
    } else {
      showNotification('Offer declined.', 'info');
    }
  };

  // 3. e-Sign Contract
  const handleSignContract = (contractId: string) => {
    setContracts(contracts.map(c => {
      if (c.id === contractId) {
        return { ...c, status: 'SIGNED' };
      }
      return c;
    }));

    showNotification('Contract digitally signed and archived.');

    if (user) {
      logAuditEvent({
        action: 'deal_signed',
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email || 'Authenticated User',
        role: activeRole,
        details: `Digitally executed and e-signed distribution contract ${contractId}`,
        resourceId: contractId,
        resourceType: 'contract',
        metadata: { contractId }
      });
    }
  };

  // 4. Upload Master Asset
  const handleUploadAsset = (newAssetData: Partial<MediaAsset>) => {
    const newAsset: MediaAsset = {
      id: `asset-${Date.now()}`,
      title: newAssetData.title || 'Untitled Feature',
      description: newAssetData.description || 'Feature master asset',
      releaseYear: newAssetData.releaseYear || 2026,
      duration: newAssetData.duration || 110,
      genre: newAssetData.genre || ['Drama'],
      language: newAssetData.language || ['English'],
      thumbnailUrl: newAssetData.thumbnailUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
      videoUrl: newAssetData.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      status: newAssetData.status || 'APPROVED',
      ownerId: newAssetData.ownerId || user?.uid || 'owner-creator',
      metadata: {
        resolution: '4K UHD',
        audioFormat: 'Dolby Atmos 7.1',
        framerate: '24fps'
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setAssets([newAsset, ...assets]);
    showNotification(`Uploaded master asset "${newAsset.title}". QC passed.`);

    if (user) {
      logAuditEvent({
        action: 'asset_created',
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email || 'Creator',
        role: activeRole,
        details: `Published master film asset "${newAsset.title}" to StreamVista Rights Cloud`,
        resourceId: newAsset.id,
        resourceType: 'asset',
        metadata: { assetId: newAsset.id, title: newAsset.title }
      });
    }
  };

  // 5. Update Asset
  const handleUpdateAsset = (assetId: string, updates: Partial<MediaAsset>) => {
    const updatedAssets = assets.map(a => {
      if (a.id === assetId) {
        return { ...a, ...updates, updatedAt: Date.now() };
      }
      return a;
    });

    setAssets(updatedAssets);
    setEditingAsset(null);
    showNotification('Updated asset metadata successfully.');

    if (isSupabaseConfigured()) {
      supabaseUpdateAsset(assetId, updates).catch(err => console.warn('Supabase asset update note:', err));
    }
  };

  // 6. Open Screener Player
  const handleOpenScreener = (asset: MediaAsset) => {
    const activeSc = screeners.find(s => s.assetId === asset.id);
    const watermark = activeSc ? activeSc.watermarkText : `CONFIDENTIAL FEED FOR ${user?.email || 'LICENSED BUYER'} // STREAMVISTA`;
    const videoUrl = activeSc ? activeSc.screenerUrl : asset.videoUrl;

    if (user) {
      logAuditEvent({
        action: 'screener_viewed',
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email || 'Authenticated User',
        role: activeRole,
        details: `Viewed forensic watermarked SafePlay stream for "${asset.title}"`,
        resourceId: activeSc ? activeSc.id : asset.id,
        resourceType: 'screener',
        metadata: { assetId: asset.id, assetTitle: asset.title }
      });
    }

    setActiveScreenerVideo({
      title: asset.title,
      videoUrl,
      watermarkText: watermark
    });
  };

  // 7. Custom Screener Creator Modal
  const handleOpenScreenerCreator = (asset: MediaAsset) => {
    setGeneratingScreenerForAsset(asset);
    setScreenerRecipient('acquisitions@paramount.com');
    setScreenerWatermark(`CONFIDENTIAL // FOR: ${user?.email || 'LICENSED REVIEWER'} // UID: ${user?.uid?.substring(0, 8) || 'VERIFIED'}`);
  };

  const handleCreateScreener = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatingScreenerForAsset || !user) return;

    const newScreener: PrivateScreener = {
      id: `screener-${Date.now()}`,
      assetId: generatingScreenerForAsset.id,
      buyerId: user.uid,
      ownerId: generatingScreenerForAsset.ownerId,
      screenerUrl: generatingScreenerForAsset.videoUrl,
      expiryDate: Date.now() + screenerDurationDays * 24 * 60 * 60 * 1000,
      watermarkText: screenerWatermark || `CONFIDENTIAL FEED FOR ${screenerRecipient} // VERIFIED BY ${user.email}`,
      viewCount: 0,
      createdAt: Date.now()
    };

    setScreeners([newScreener, ...screeners]);
    
    logAuditEvent({
      action: 'screener_created',
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email || 'Authenticated User',
      role: activeRole,
      details: `Generated forensically watermarked SafePlay screener for "${generatingScreenerForAsset.title}" dispatched to ${screenerRecipient}`,
      resourceId: newScreener.id,
      resourceType: 'screener',
      metadata: {
        screenerId: newScreener.id,
        assetId: generatingScreenerForAsset.id,
        recipient: screenerRecipient
      }
    });

    setComposeTemplate({
      to: screenerRecipient,
      subject: `SafePlay Screener: "${generatingScreenerForAsset.title}"`,
      body: `Hello,\n\nA private, watermarked preview link has been generated for "${generatingScreenerForAsset.title}".\n\nAccess Link: https://streamvista.live/previews/${newScreener.id}\nWatermark: "${newScreener.watermarkText}"\nValidity: Available until ${new Date(newScreener.expiryDate).toLocaleDateString()}.\n\nIssued by: ${user.displayName || user.email} (StreamVista Rights Platform)`
    });

    setGeneratingScreenerForAsset(null);
    showNotification('SafePlay preview compiled! Opening Manage -> Gmail tab.');
    setActiveTab('manage');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-400 font-mono tracking-widest text-xs uppercase">Initializing StreamVista ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      <AnimatePresence mode="wait">
        {!user ? (
          /* =========================================================================
             1. PUBLIC EXPERIENCE & 4 INTENT DOORS (Simple Outside, Powerful Inside)
             ========================================================================= */
          <motion.div 
            key="public-experience"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-950 text-white overflow-hidden"
          >
            {/* Ambient Lighting */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-full pointer-events-none -z-10">
              <div className="absolute top-[-10%] left-[20%] w-[35rem] h-[35rem] rounded-full bg-blue-900/20 blur-[150px]" />
              <div className="absolute bottom-[10%] right-[20%] w-[35rem] h-[35rem] rounded-full bg-indigo-900/15 blur-[150px]" />
            </div>

            <div className="max-w-xl w-full text-center space-y-10 relative z-10">
              
              {/* Minimalist Brand Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-6 text-xs uppercase tracking-widest font-mono text-slate-400">
                  <span>Discover</span>
                  <span>&bull;</span>
                  <span>Create</span>
                  <span>&bull;</span>
                  <span>Manage</span>
                  <span>&bull;</span>
                  <span>AI</span>
                </div>

                <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-white">
                  STREAM<span className="text-blue-500">VISTA</span>
                </h1>
                
                <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto leading-relaxed">
                  Create. Manage. Discover. Earn.<br />
                  <span className="text-xs text-slate-500">The operating platform for creators, studios and media businesses.</span>
                </p>
              </div>

              {/* What do you want to do? - The 4 Direct Action Doors */}
              <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md space-y-6">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                    What do you want to do?
                  </h2>
                  <p className="text-xs text-slate-500">Select an action to launch instantly</p>
                </div>

                {loginError && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
                    <ShieldAlert size={15} className="shrink-0 text-amber-400" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Action 1: Find Content */}
                  <button
                    onClick={() => handleEnterpriseLogin('BUYER', 'discover')}
                    disabled={isLoggingIn}
                    className="p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 rounded-2xl text-left cursor-pointer transition-all flex flex-col justify-between group active:scale-98"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Search size={16} />
                      </div>
                      <span className="text-[9px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                        Buyer
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                        [ Find Content ]
                      </p>
                      <p className="text-[10px] text-slate-400">Discover titles &amp; SafePlay</p>
                    </div>
                  </button>

                  {/* Action 2: Create & Distribute */}
                  <button
                    onClick={() => handleEnterpriseLogin('CONTENT_OWNER', 'create')}
                    disabled={isLoggingIn}
                    className="p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-blue-500/50 rounded-2xl text-left cursor-pointer transition-all flex flex-col justify-between group active:scale-98"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <PlusCircle size={16} />
                      </div>
                      <span className="text-[9px] font-mono uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                        Creator / Studio
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                        [ Create &amp; Distribute ]
                      </p>
                      <p className="text-[10px] text-slate-400">Upload &amp; QC pipeline</p>
                    </div>
                  </button>

                  {/* Action 3: Manage My Studio */}
                  <button
                    onClick={() => handleEnterpriseLogin('ADMIN', 'manage')}
                    disabled={isLoggingIn}
                    className="p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500/50 rounded-2xl text-left cursor-pointer transition-all flex flex-col justify-between group active:scale-98"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Settings size={16} />
                      </div>
                      <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                        Operations
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                        [ Manage My Studio ]
                      </p>
                      <p className="text-[10px] text-slate-400">Deals, contracts &amp; billing</p>
                    </div>
                  </button>

                  {/* Action 4: Talk to AI */}
                  <button
                    onClick={() => handleEnterpriseLogin('ADMIN', 'ai')}
                    disabled={isLoggingIn}
                    className="p-4 bg-gradient-to-br from-slate-800 to-slate-850 hover:to-slate-800 border border-slate-700 hover:border-amber-400/50 rounded-2xl text-left cursor-pointer transition-all flex flex-col justify-between group active:scale-98"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Sparkles size={16} />
                      </div>
                      <span className="text-[9px] font-mono uppercase bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                        AI Orchestration
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        [ Talk to AI ]
                      </p>
                      <p className="text-[10px] text-slate-400">Intent-driven actions</p>
                    </div>
                  </button>
                </div>

                {/* Custom Credentials Toggle */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(!showCustomForm)}
                    className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center space-x-1.5">
                      <User size={13} className="text-slate-400" />
                      <span className="font-semibold text-[11px]">Sign in with custom email / role</span>
                    </span>
                    <span className="text-[10px] text-blue-400 font-bold">{showCustomForm ? 'Close' : 'Expand'}</span>
                  </button>

                  <AnimatePresence>
                    {showCustomForm && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleCustomLoginSubmit}
                        className="space-y-3 pt-3 overflow-hidden text-left"
                      >
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Jane Doe"
                              value={customName}
                              onChange={(e) => setCustomName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Work Email</label>
                            <input
                              type="email"
                              required
                              placeholder="e.g. jane@studio.com"
                              value={customEmail}
                              onChange={(e) => setCustomEmail(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                          >
                            Launch Workspace
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>

              </div>

              {/* Bottom Tagline */}
              <div className="text-center font-mono text-xs text-slate-500 uppercase tracking-widest">
                Trusted &bull; Simple &bull; Fast
              </div>

            </div>
          </motion.div>
        ) : (
          /* =========================================================================
             2. AUTHENTICATED STREAMVISTA EXPERIENCE (The 5 Clean Pillars)
             ========================================================================= */
          <motion.div 
            key="authenticated-workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex flex-col bg-[#08090C] text-slate-100 font-sans"
          >
            {/* Notification Banner */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="fixed top-6 right-6 z-50 max-w-sm w-full bg-[#12141D] border border-white/15 rounded-2xl p-4 shadow-2xl flex items-start space-x-3 backdrop-blur-xl"
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    <CheckCircle size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">
                      {notification.type === 'success' ? 'Action Confirmed' : 'Notification'}
                    </p>
                    <p className="text-xs text-slate-400 leading-normal mt-0.5">
                      {notification.message}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Streamlined Top Navigation Header (OS Theme) */}
            <header className="sticky top-0 z-40 bg-[#0B0C12]/90 backdrop-blur-xl border-b border-white/10 shadow-lg">
              <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                
                {/* Brand */}
                <div 
                  onClick={() => setActiveTab('home')}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)] group-hover:scale-105 transition-transform">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <h1 className="text-xl font-black tracking-tighter text-white">
                    STREAM<span className="text-indigo-400">VISTA</span>
                  </h1>
                </div>

                {/* The 5 Simplified Core Pillars */}
                <nav className="hidden sm:flex items-center space-x-1 bg-white/5 border border-white/10 p-1 rounded-2xl backdrop-blur-md">
                  {[
                    { id: 'home', label: 'Home', icon: Home },
                    { id: 'create', label: 'Create', icon: PlusCircle },
                    { id: 'discover', label: 'Discover', icon: Search },
                    { id: 'manage', label: 'Manage', icon: Settings, badge: deals.filter(d => d.status === 'REQUESTED').length },
                    { id: 'ai', label: 'AI', icon: Sparkles }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                        activeTab === tab.id
                          ? 'bg-white text-slate-950 shadow-md font-extrabold'
                          : 'text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <tab.icon size={13} className={activeTab === tab.id ? (tab.id === 'ai' ? 'text-amber-500' : 'text-slate-950') : 'text-slate-400'} />
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-indigo-500/20 text-indigo-300'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>

                {/* User & Settings Dropdown */}
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden md:block">
                    <div className="flex items-center justify-end space-x-1.5">
                      <span className="text-xs font-bold text-white">{user?.displayName}</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" title="Verified Session" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {activeRole}
                    </span>
                  </div>

                  <button
                    onClick={() => setIsSupabaseModalOpen(true)}
                    className="p-2 border border-white/10 hover:bg-white/10 rounded-xl text-slate-300 transition-colors cursor-pointer"
                    title="Supabase PostgreSQL Sync"
                  >
                    <span className={`w-2 h-2 rounded-full block ${isSupabaseActive ? 'bg-emerald-400 shadow-[0_0_6px_#34D399]' : 'bg-amber-400'}`} />
                  </button>

                  <button 
                    onClick={handleLogout}
                    className="p-2 border border-white/10 hover:border-red-500/40 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>

              </div>

              {/* Mobile Navigation Bar */}
              <div className="sm:hidden flex items-center justify-around border-t border-white/10 py-1.5 bg-[#0B0C12]">
                {[
                  { id: 'home', label: 'Home', icon: Home },
                  { id: 'create', label: 'Create', icon: PlusCircle },
                  { id: 'discover', label: 'Discover', icon: Search },
                  { id: 'manage', label: 'Manage', icon: Settings },
                  { id: 'ai', label: 'AI', icon: Sparkles }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1 text-xs font-bold flex flex-col items-center space-y-0.5 ${
                      activeTab === tab.id ? 'text-indigo-400 font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    <tab.icon size={15} />
                    <span className="text-[10px]">{tab.label}</span>
                  </button>
                ))}
              </div>
            </header>

            {/* Main Application Body */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
              <AnimatePresence mode="wait">
                {activeTab === 'home' && (
                  <motion.div 
                    key="tab-home"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <HomeDashboard 
                      user={user}
                      activeRole={activeRole}
                      assets={assets}
                      rights={rights}
                      deals={deals}
                      contracts={contracts}
                      onNavigate={(tab) => setActiveTab(tab)}
                      onOpenDeal={(dealId) => {
                        setActiveTab('manage');
                      }}
                      onOpenScreener={(asset) => handleOpenScreener(asset)}
                    />
                  </motion.div>
                )}

                {activeTab === 'create' && (
                  <motion.div 
                    key="tab-create"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <CreatePortal 
                      user={user}
                      activeRole={activeRole}
                      assets={assets}
                      onUploadAsset={handleUploadAsset}
                      onEditAsset={(asset) => setEditingAsset(asset)}
                      onOpenScreener={handleOpenScreener}
                      onNavigateToDiscover={() => setActiveTab('discover')}
                    />
                  </motion.div>
                )}

                {activeTab === 'discover' && (
                  <motion.div 
                    key="tab-discover"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <DiscoverPortal 
                      user={user}
                      activeRole={activeRole}
                      assets={assets}
                      rights={rights}
                      deals={deals}
                      onProposeDeal={handleProposeDeal}
                      onOpenScreener={handleOpenScreener}
                      onCreateCustomScreener={handleOpenScreenerCreator}
                    />
                  </motion.div>
                )}

                {activeTab === 'manage' && (
                  <motion.div 
                    key="tab-manage"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <ManagePortal 
                      user={user}
                      activeRole={activeRole}
                      assets={assets}
                      rights={rights}
                      deals={deals}
                      contracts={contracts}
                      screeners={screeners}
                      auditLogs={auditLogs}
                      isAuditLoading={isAuditLoading}
                      isSupabaseActive={isSupabaseActive}
                      composeTemplate={composeTemplate}
                      onReviewOffer={handleReviewOffer}
                      onSignContract={handleSignContract}
                      onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
                    />
                  </motion.div>
                )}

                {activeTab === 'ai' && (
                  <motion.div 
                    key="tab-ai"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <StreamVistaAISuite 
                      userEmail={user?.email}
                      userName={user?.displayName}
                      userRole={activeRole}
                      onAuditLog={(action, details, metadata) => {
                        if (user) {
                          logAuditEvent({
                            action,
                            userId: user.uid,
                            userEmail: user.email,
                            userName: user.displayName,
                            role: activeRole,
                            details,
                            metadata
                          });
                        }
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Screener Creator Modal */}
            <AnimatePresence>
              {generatingScreenerForAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white border border-slate-200 rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Compile SafePlay Screener</h3>
                        <p className="text-xs text-slate-500">"{generatingScreenerForAsset.title}"</p>
                      </div>
                      <button 
                        onClick={() => setGeneratingScreenerForAsset(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleCreateScreener} className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Recipient Email
                        </label>
                        <input 
                          type="email"
                          required
                          value={screenerRecipient}
                          onChange={(e) => setScreenerRecipient(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Forensic Watermark Burn-in Text
                        </label>
                        <input 
                          type="text"
                          value={screenerWatermark}
                          onChange={(e) => setScreenerWatermark(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Validity (Days)
                        </label>
                        <select
                          value={screenerDurationDays}
                          onChange={(e) => setScreenerDurationDays(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        >
                          <option value={7}>7 Days</option>
                          <option value={14}>14 Days</option>
                          <option value={30}>30 Days</option>
                        </select>
                      </div>

                      <div className="pt-2 flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setGeneratingScreenerForAsset(null)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                        >
                          Generate &amp; Open Gmail
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Edit Asset Metadata Modal */}
            <AnimatePresence>
              {editingAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white border border-slate-200 rounded-3xl shadow-xl max-w-lg w-full p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Edit Asset Metadata</h3>
                        <p className="text-xs text-slate-500">"{editingAsset.title}"</p>
                      </div>
                      <button 
                        onClick={() => setEditingAsset(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdateAsset(editingAsset.id, {
                          title: editingAsset.title,
                          description: editingAsset.description
                        });
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Title</label>
                        <input 
                          type="text"
                          value={editingAsset.title}
                          onChange={(e) => setEditingAsset({ ...editingAsset, title: e.target.value })}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Description / Logline</label>
                        <textarea 
                          rows={3}
                          value={editingAsset.description}
                          onChange={(e) => setEditingAsset({ ...editingAsset, description: e.target.value })}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingAsset(null)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Video Player Modal */}
            <AnimatePresence>
              {activeScreenerVideo && (
                <ScreenerModal 
                  title={activeScreenerVideo.title}
                  videoUrl={activeScreenerVideo.videoUrl}
                  watermarkText={activeScreenerVideo.watermarkText}
                  onClose={() => setActiveScreenerVideo(null)}
                />
              )}
            </AnimatePresence>

            {/* Minimalist Footer */}
            <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400">
              <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">STREAMVISTA</span>
                  <span>&bull;</span>
                  <span>Simple Outside. Powerful Inside.</span>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setIsSupabaseModalOpen(true)}
                    className="text-emerald-600 hover:underline font-bold cursor-pointer"
                  >
                    Supabase PostgreSQL Active
                  </button>
                </div>
              </div>
            </footer>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Supabase Cloud Sync & Auth Modal */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => {
          setIsSupabaseModalOpen(false);
          setIsSupabaseActive(isSupabaseConfigured());
        }}
        user={user}
        assets={assets}
        rights={rights}
        deals={deals}
        onSyncAssetsFromSupabase={(newAssets) => setAssets(newAssets)}
        onSyncDealsFromSupabase={(newDeals) => setDeals(newDeals)}
        onUserAuthenticated={(authedUser) => {
          setUser(authedUser);
          setActiveRole(authedUser.role);
          saveSession(authedUser);
        }}
        onNotify={(msg, type) => showNotification(msg, type)}
      />
    </div>
  );
}
