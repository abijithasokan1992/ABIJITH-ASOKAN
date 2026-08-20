import React, { useState, useEffect } from 'react';
import { 
  Mail, Globe, Shield, Sparkles, Loader2, Video, Key, FileText, 
  CheckCircle, PlusCircle, Clock, Send, Eye, ShieldAlert, ArrowRight, 
  UserCheck, RefreshCw, Lock, Unlock, Check, ThumbsUp, ThumbsDown, LogOut, X,
  BadgeCheck, UserCircle, Briefcase, Film, Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { 
  initAuth, googleSignIn, logout as firebaseLogout, 
  syncUserProfile, getUserProfile 
} from './lib/firebase';
import { GmailDashboard } from './components/GmailDashboard';
import { ScreenerModal } from './components/ScreenerModal';
import { MediaAsset, RightsCatalogueEntry, DealRequest, PrivateScreener, Contract, UserRole } from './types';
import { 
  INITIAL_ASSETS, INITIAL_RIGHTS, INITIAL_DEALS, 
  INITIAL_SCREENERS, INITIAL_CONTRACTS 
} from './data';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Authenticated User Active Role / Perspective
  const [activeRole, setActiveRole] = useState<UserRole>('BUYER');

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

  // Navigation & Workspace UI
  const [activeTab, setActiveTab] = useState<'catalog' | 'deals' | 'screeners' | 'gmail'>('catalog');
  const [activeScreenerVideo, setActiveScreenerVideo] = useState<{ title: string; videoUrl: string; watermarkText: string } | null>(null);

  // Forms / Actions
  const [proposedBids, setProposedBids] = useState<Record<string, number>>({});
  const [bidMessages, setBidMessages] = useState<Record<string, string>>({});
  
  // Screener Creation Drawer
  const [generatingScreenerForAsset, setGeneratingScreenerForAsset] = useState<MediaAsset | null>(null);
  const [screenerRecipient, setScreenerRecipient] = useState('');
  const [screenerWatermark, setScreenerWatermark] = useState('');
  const [screenerDurationDays, setScreenerDurationDays] = useState(14);

  // Compose Template to bridge catalogue actions directly to Gmail dispatch drawer
  const [composeTemplate, setComposeTemplate] = useState<{ to: string; subject: string; body: string } | null>(null);

  useEffect(() => {
    // Initialise Firebase Auth session observer
    const unsubscribe = initAuth(
      async (u, t) => {
        setUser(u);
        setToken(t);
        
        // Fetch or assign initial user role preference from Firestore
        if (u) {
          try {
            const profile = await getUserProfile(u.uid);
            if (profile?.role) {
              setActiveRole(profile.role);
            } else {
              const defaultRole: UserRole = u.email?.includes('admin') || u.email?.includes('legal') ? 'ADMIN' : 'BUYER';
              setActiveRole(defaultRole);
            }
          } catch {
            // fallback
          }
        }
        setLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showNotification(`Welcome, ${result.user.displayName || result.user.email || 'Authenticated User'}! Google session initialized.`);
      }
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err?.code || err?.message || err);
      if (err?.code === 'auth/popup-blocked') {
        setLoginError('The browser blocked the Google authentication popup. Please allow popups or open the app in a new tab.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setLoginError('Sign-in cancelled. Click "Continue with Google" whenever you are ready.');
      } else {
        setLoginError(err?.message || 'Authentication error. Please retry connecting with Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    setActiveRole(newRole);
    if (user) {
      try {
        await syncUserProfile(user, newRole);
        showNotification(`Active role switched to ${newRole === 'BUYER' ? 'Buyer (Acquisitions)' : newRole === 'CONTENT_OWNER' ? 'Content Owner (Studio)' : 'Legal Advisor'}`);
      } catch {
        // Non-blocking
      }
    }
  };

  const handleLogout = async () => {
    await firebaseLogout();
    setUser(null);
    setToken(null);
    showNotification('Logged out successfully.', 'info');
  };

  // User Profile derived from real Firebase Google identity
  const currentUserProfile = user ? {
    displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
    email: user.email || 'operator@streamvista.live',
    photoURL: user.photoURL,
    uid: user.uid,
    emailVerified: user.emailVerified
  } : null;

  // Business Actions

  // 1. Submit a licensing bid/deal
  const handleProposeDeal = (rightsEntry: RightsCatalogueEntry, asset: MediaAsset) => {
    if (!user) return;
    const proposedPrice = proposedBids[rightsEntry.id] || rightsEntry.price || 100000;
    const message = bidMessages[rightsEntry.id] || `Proposed acquisition offer for "${asset.title}" from ${user.displayName || user.email}.`;

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
    showNotification(`Submitted offer of $${proposedPrice.toLocaleString()} for "${asset.title}". Content owner has been notified.`);
    
    // Auto clear input state
    setProposedBids(prev => {
      const copy = { ...prev };
      delete copy[rightsEntry.id];
      return copy;
    });
    setBidMessages(prev => {
      const copy = { ...prev };
      delete copy[rightsEntry.id];
      return copy;
    });
  };

  // 2. Approve or Reject a proposed licensing offer (Content Owner action)
  const handleReviewOffer = (dealId: string, approve: boolean) => {
    setDeals(deals.map(deal => {
      if (deal.id === dealId) {
        return {
          ...deal,
          status: approve ? 'APPROVED' : 'REJECTED'
        };
      }
      return deal;
    }));

    const deal = deals.find(d => d.id === dealId);
    if (deal && approve) {
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

  // 3. Counter-sign / e-sign a pending contract (Buyer action)
  const handleSignContract = (contractId: string) => {
    setContracts(contracts.map(c => {
      if (c.id === contractId) {
        return { ...c, status: 'SIGNED' };
      }
      return c;
    }));
    showNotification(`Agreement successfully counter-signed under ${user?.email || 'authenticated user'}!`);
  };

  // 4. Create custom private safeplay viewing link
  const handleOpenScreenerCreator = (asset: MediaAsset) => {
    setGeneratingScreenerForAsset(asset);
    setScreenerRecipient('acquisitions@paramount.com');
    setScreenerWatermark(`CONFIDENTIAL // AUTHORIZED FOR: ${user?.email || 'LICENSED REVIEWER'} // UID: ${user?.uid?.substring(0, 8) || 'VERIFIED'}`);
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
    
    // Automatically pre-fill a professional email draft for dispatch!
    setComposeTemplate({
      to: screenerRecipient,
      subject: `SafePlay Screener: "${generatingScreenerForAsset.title}"`,
      body: `Hello,\n\nA private, watermarked preview link has been generated for "${generatingScreenerForAsset.title}".\n\nAccess Link: https://streamvista.live/previews/${newScreener.id}\nWatermark: "${newScreener.watermarkText}"\nValidity: Available until ${new Date(newScreener.expiryDate).toLocaleDateString()}.\n\nIssued by: ${user.displayName || user.email} (StreamVista Rights Platform)`
    });

    setGeneratingScreenerForAsset(null);
    showNotification('SafePlay preview link compiled! Opening Email tab to send to your partner.');
    setActiveTab('gmail');
  };

  const getAssetTitle = (id: string) => {
    return assets.find(a => a.id === id)?.title || 'Unknown Film';
  };

  const getAssetObj = (id: string) => {
    return assets.find(a => a.id === id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-400 font-mono tracking-widest text-xs uppercase">Initializing Firebase Session ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="authorization-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-slate-950"
          >
            {/* Ambient Background decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none -z-10">
              <div className="absolute top-[-10%] left-[15%] w-[35rem] h-[35rem] rounded-full bg-blue-900/20 blur-[140px]" />
              <div className="absolute bottom-[5%] right-[15%] w-[40rem] h-[40rem] rounded-full bg-indigo-900/15 blur-[160px]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>

            <div className="max-w-xl w-full text-center space-y-8 py-12 relative z-10">
              {/* Top Tagline */}
              <div className="flex justify-center">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium text-xs uppercase tracking-wider">
                  <Sparkles size={13} className="text-blue-400" />
                  <span>Enterprise Rights &amp; Screeners</span>
                </div>
              </div>

              {/* Title & Slogan */}
              <div className="space-y-3">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
                  STREAM<span className="text-blue-500">VISTA</span>
                </h1>
                <p className="text-sm md:text-base text-slate-400 max-w-md mx-auto leading-relaxed">
                  B2B Film &amp; Television Content Licensing, Forensic Watermarked SafePlay Previews, and Deal Management.
                </p>
              </div>

              {/* Dedicated Google Authentication Gate */}
              <div className="p-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl space-y-6 text-left backdrop-blur-md">
                <div className="space-y-1.5 text-center">
                  <h3 className="text-lg font-bold text-slate-100">Sign in to StreamVista</h3>
                  <p className="text-xs text-slate-400">
                    Use your Google credentials for verified authentication and cloud session persistence.
                  </p>
                </div>

                {loginError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start space-x-2.5"
                  >
                    <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 flex-1">
                      <p className="font-semibold text-amber-200">Notice</p>
                      <p className="text-[11px] leading-relaxed text-amber-300/90">{loginError}</p>
                    </div>
                  </motion.div>
                )}

                {/* Primary Google Auth Button */}
                <button 
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center space-x-3 py-3.5 px-6 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/25 active:scale-98 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating with Google...</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-white shrink-0">
                        <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.9 3.34-2 4.6-1.56 1.56-3.21 2.12-5.84 2.12-4.41 0-8-3.59-8-8s3.59-8 8-8c2.48 0 4.5 1 5.8 2.33l2.3-2.3C18.66 2.66 15.65 1.25 12 1.25 6.06 1.25 1.25 6.06 1.25 12s4.81 10.75 10.75 10.75c3.23 0 5.67-1.06 7.54-3.03 1.93-1.93 2.54-4.66 2.54-7.1 0-.69-.06-1.35-.18-1.95h-9.42Z" />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                {/* Trust & Security Notes */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <BadgeCheck size={14} className="text-emerald-400 shrink-0" />
                    <span>Firebase Auth</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Shield size={14} className="text-blue-400 shrink-0" />
                    <span>Cloud Firestore DB</span>
                  </div>
                </div>
              </div>

              {/* Platform Badges */}
              <div className="flex flex-wrap justify-center gap-6 pt-2 text-slate-500 text-xs font-sans">
                <div className="flex items-center space-x-1.5">
                  <Film size={14} className="text-blue-400/60" />
                  <span>4K SafePlay Streaming</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-800 hidden md:inline" />
                <div className="flex items-center space-x-1.5">
                  <Globe size={14} className="text-indigo-400/60" />
                  <span>Territory Rights Catalog</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-800 hidden md:inline" />
                <div className="flex items-center space-x-1.5">
                  <Mail size={14} className="text-emerald-400/60" />
                  <span>Gmail Dispatch Integration</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="application-workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex flex-col bg-slate-50 text-slate-800"
          >
            {/* Notification Toast */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="fixed top-6 right-6 z-50 max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-xl flex items-start space-x-3"
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${notification.type === 'success' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    <CheckCircle size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900">
                      {notification.type === 'success' ? 'Confirmed' : 'Notification'}
                    </p>
                    <p className="text-xs text-slate-600 leading-normal mt-0.5">
                      {notification.message}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Workspace Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs backdrop-blur-md bg-white/95">
              <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
                
                {/* Brand Name */}
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                    STREAM<span className="text-blue-600 font-black">VISTA</span>
                  </h1>
                  <div className="h-4 w-[1px] bg-slate-200" />
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider bg-slate-900 text-slate-100 rounded-sm">
                      RIGHTS CLOUD
                    </span>
                  </div>
                </div>

                {/* Role Switcher for the Authenticated Google Operator */}
                <div className="hidden lg:flex items-center space-x-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Perspective:</span>
                  <div className="flex space-x-1">
                    {([
                      { role: 'BUYER', label: 'Buyer (Acquisitions)', icon: Briefcase },
                      { role: 'CONTENT_OWNER', label: 'Studio (Seller)', icon: Film },
                      { role: 'ADMIN', label: 'Legal Advisor', icon: Scale }
                    ] as const).map(({ role, label }) => (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(role)}
                        className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          activeRole === role 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Google Authenticated User Profile */}
                <div className="flex items-center space-x-4">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center justify-end space-x-1.5">
                      <span className="text-xs font-bold text-slate-900">{currentUserProfile?.displayName}</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" title="Firebase Authenticated" />
                    </div>
                    <span className="text-[10px] font-sans text-slate-500 font-medium block">
                      {currentUserProfile?.email}
                    </span>
                  </div>

                  {currentUserProfile?.photoURL ? (
                    <img 
                      src={currentUserProfile.photoURL} 
                      alt={currentUserProfile.displayName} 
                      className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-200">
                      {currentUserProfile?.displayName?.charAt(0) || 'U'}
                    </div>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="p-2 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer active:scale-95"
                    title="Sign Out Google Session"
                  >
                    <LogOut size={16} />
                  </button>
                </div>

              </div>
            </header>

            {/* Sub Navigation Bar */}
            <div className="bg-slate-100/70 border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-6 h-12 flex items-center md:justify-start overflow-x-auto gap-4">
                {[
                  { id: 'catalog', label: 'Movie Catalogue', icon: Globe },
                  { id: 'deals', label: 'Offers & Deals', icon: FileText, badge: deals.filter(d => d.status === 'REQUESTED').length },
                  { id: 'screeners', label: 'Shared Previews', icon: Video, badge: screeners.length },
                  { id: 'gmail', label: 'Gmail Manager', icon: Mail }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative h-full flex items-center space-x-2 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <tab.icon size={14} className={activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-[9px] font-bold text-white font-mono">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'catalog' && (
                  <motion.div 
                    key="catalog-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-8"
                  >
                    {/* Header Summary */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">Movie &amp; Rights Catalog</h2>
                        <p className="text-xs text-slate-500">Review available territories, submit licensing bids, or compile watermarked SafePlay screeners.</p>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-slate-600 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <UserCircle size={14} className="text-blue-600" />
                        <span className="font-semibold text-slate-800">
                          Active Mode: {activeRole === 'BUYER' ? 'Buyer (Acquisitions)' : activeRole === 'CONTENT_OWNER' ? 'Content Owner (Studio)' : 'Legal Administrator'}
                        </span>
                      </div>
                    </div>

                    {/* Media Grid Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {assets.map((asset) => {
                        const assetRights = rights.filter(r => r.assetId === asset.id);
                        
                        return (
                          <motion.div 
                            key={asset.id}
                            className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full hover:shadow-xl transition-all duration-300"
                          >
                            {/* Graphic Poster Banner */}
                            <div className="relative h-60 w-full overflow-hidden bg-slate-900">
                              <img 
                                src={asset.thumbnailUrl} 
                                alt={asset.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                              
                              {/* Metadata Badge indicators */}
                              <div className="absolute top-4 left-4 flex gap-1.5">
                                <span className="bg-slate-900/80 backdrop-blur-xs border border-white/10 text-white font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
                                  {asset.releaseYear}
                                </span>
                                <span className="bg-blue-600/90 border border-blue-500/20 text-white font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
                                  {asset.metadata.resolution}
                                </span>
                              </div>

                              <div className="absolute bottom-4 left-4 right-4 text-white">
                                <div className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-widest mb-1">
                                  {asset.genre.join(' // ')}
                                </div>
                                <h3 className="text-xl font-bold tracking-tight text-white leading-tight">
                                  {asset.title}
                                </h3>
                              </div>
                            </div>

                            {/* Info & Description details */}
                            <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                              <div className="space-y-4">
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                  {asset.description}
                                </p>

                                <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3 text-xs font-mono">
                                  <div>
                                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Studio Licensor</span>
                                    <span className="text-slate-800 font-bold uppercase">{asset.ownerId === 'owner-paramount' ? 'Paramount Pictures' : 'A24 Films'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Runtime</span>
                                    <span className="text-slate-800 font-bold">{asset.duration} minutes</span>
                                  </div>
                                </div>
                              </div>

                              {/* Rights catalogs availability listings */}
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Territories &amp; Pricing:</h4>
                                
                                {assetRights.length === 0 ? (
                                  <div className="text-xs text-slate-400 italic">No region options specified.</div>
                                ) : (
                                  <div className="space-y-2.5">
                                    {assetRights.map((entry) => (
                                      <div 
                                        key={entry.id}
                                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col space-y-2"
                                      >
                                        <div className="flex items-center justify-between text-xs">
                                          <div className="font-bold text-slate-900">{entry.territories.join(', ')}</div>
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-sans font-bold uppercase tracking-wider ${
                                            entry.availabilityStatus === 'AVAILABLE' 
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                              : 'bg-amber-50 text-amber-600 border border-amber-200'
                                          }`}>
                                            {entry.availabilityStatus === 'AVAILABLE' ? 'Available' : 'Unavailable'}
                                          </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                          <div className="text-[10px] font-sans text-slate-500">
                                            Type: <span className="font-bold text-slate-700">{entry.licenseTypes.join(' / ')}</span>
                                          </div>
                                          <div className="text-xs font-sans font-bold text-slate-900">
                                            Price: ${entry.price?.toLocaleString()}
                                          </div>
                                        </div>

                                        {/* Offer Submission for Buyers */}
                                        {(activeRole === 'BUYER' || activeRole === 'ADMIN') && entry.availabilityStatus === 'AVAILABLE' && (
                                          <div className="pt-2 border-t border-slate-200 flex flex-col space-y-2">
                                            <div className="flex gap-2">
                                              <input 
                                                type="number"
                                                placeholder="Proposed price (USD)"
                                                value={proposedBids[entry.id] || ''}
                                                onChange={(e) => setProposedBids({
                                                  ...proposedBids,
                                                  [entry.id]: parseInt(e.target.value) || 0
                                                })}
                                                className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                                              />
                                              <button 
                                                onClick={() => handleProposeDeal(entry, asset)}
                                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer flex items-center space-x-1"
                                              >
                                                <span>Send Offer</span>
                                              </button>
                                            </div>
                                            <input 
                                              type="text"
                                              placeholder="Optional terms or note..."
                                              value={bidMessages[entry.id] || ''}
                                              onChange={(e) => setBidMessages({
                                                ...bidMessages,
                                                [entry.id]: e.target.value
                                              })}
                                              className="w-full text-[10px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Screener Action Controls */}
                              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                                {(activeRole === 'CONTENT_OWNER' || activeRole === 'ADMIN') && (
                                  <button
                                    onClick={() => handleOpenScreenerCreator(asset)}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center space-x-2 shadow-xs"
                                  >
                                    <PlusCircle size={14} />
                                    <span>Share SafePlay Screener</span>
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => {
                                    const activeSc = screeners.find(s => s.assetId === asset.id);
                                    if (activeSc) {
                                      setActiveScreenerVideo({
                                        title: asset.title,
                                        videoUrl: activeSc.screenerUrl,
                                        watermarkText: activeSc.watermarkText
                                      });
                                    } else {
                                      showNotification('Preview stream generated. Loading player...', 'info');
                                      setActiveScreenerVideo({
                                        title: asset.title,
                                        videoUrl: asset.videoUrl,
                                        watermarkText: `CONFIDENTIAL FEED FOR ${user.email} // STREAMVISTA`
                                      });
                                    }
                                  }}
                                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center space-x-2"
                                >
                                  <Video size={14} />
                                  <span>Watch Preview</span>
                                </button>
                              </div>

                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'deals' && (
                  <motion.div 
                    key="deals-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-8"
                  >
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Offers &amp; Licensing Contracts</h2>
                      <p className="text-xs text-slate-500">Review rights negotiations, approve bids, and execute digital licensing contracts.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Bid Negotiations */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Deal Offers</h3>
                        
                        {deals.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl text-xs">
                            No offers created yet. Submit an offer from the Movie Catalog tab!
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {deals.map((deal) => {
                              const asset = getAssetObj(deal.assetId);
                              if (!asset) return null;

                              return (
                                <motion.div 
                                  key={deal.id}
                                  className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs"
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-bold text-sm text-slate-900">{asset.title}</h4>
                                      <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider">
                                        Studio: {deal.ownerId === 'owner-paramount' ? 'Paramount Pictures' : 'A24 Films'}
                                      </span>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-wider ${
                                      deal.status === 'REQUESTED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                      deal.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                      'bg-red-50 text-red-600 border border-red-200'
                                    }`}>
                                      {deal.status === 'REQUESTED' ? 'Pending Review' : deal.status === 'APPROVED' ? 'Accepted' : 'Declined'}
                                    </span>
                                  </div>

                                  <div className="bg-slate-50 p-3 rounded-lg text-xs leading-relaxed text-slate-600 font-medium whitespace-pre-line border border-slate-100">
                                    "{deal.message}"
                                  </div>

                                  <div className="flex items-center justify-between text-xs text-slate-700 pt-2 border-t border-slate-100">
                                    <span>Proposed Bid Amount:</span>
                                    <span className="font-bold text-slate-900 text-sm">
                                      ${deal.proposedPrice?.toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Review Actions for Studio/Admin */}
                                  {(activeRole === 'CONTENT_OWNER' || activeRole === 'ADMIN') && deal.status === 'REQUESTED' && (
                                    <div className="flex gap-2.5 pt-2">
                                      <button 
                                        onClick={() => handleReviewOffer(deal.id, true)}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                                      >
                                        <ThumbsUp size={12} />
                                        <span>Accept Offer &amp; Draft Contract</span>
                                      </button>
                                      <button 
                                        onClick={() => handleReviewOffer(deal.id, false)}
                                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                                      >
                                        <ThumbsDown size={12} />
                                        <span>Decline</span>
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Contracts & Agreements */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Digital Licensing Contracts</h3>
                        
                        {contracts.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl text-xs">
                            No agreements yet. An agreement will be created when a studio accepts an offer.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {contracts.map((contract) => (
                              <motion.div 
                                key={contract.id}
                                className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2.5 text-xs">
                                    <FileText className="text-blue-500" size={16} />
                                    <span className="font-extrabold text-slate-900">Contract #{contract.id.substring(9, 17)}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-sans font-bold uppercase tracking-wider ${
                                    contract.status === 'SIGNED' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                                  }`}>
                                    {contract.status === 'SIGNED' ? 'Signed & Executed' : 'Awaiting Counter-Signature'}
                                  </span>
                                </div>

                                <div className="text-xs space-y-1.5 text-slate-600 py-1">
                                  <div>Title: <span className="font-bold text-slate-800">{getAssetTitle(contract.assetId)}</span></div>
                                  <div>Licensor: <span className="uppercase text-slate-800 font-bold">{contract.ownerId === 'owner-paramount' ? 'Paramount' : 'A24'}</span></div>
                                  <div>Licensee: <span className="text-slate-800 font-bold">{user.displayName} ({user.email})</span></div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                                  <a 
                                    href={contract.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:underline flex items-center space-x-1"
                                  >
                                    <Eye size={12} />
                                    <span>Download Contract PDF</span>
                                  </a>

                                  {contract.status === 'PENDING' && (
                                    <button 
                                      onClick={() => handleSignContract(contract.id)}
                                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer flex items-center space-x-1"
                                    >
                                      <CheckCircle size={12} />
                                      <span>Counter-Sign Contract</span>
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'screeners' && (
                  <motion.div 
                    key="screeners-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-8"
                  >
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">SafePlay Private Screeners</h2>
                      <p className="text-xs text-slate-500">Forensically watermarked viewing sessions for acquisitions and pre-release review.</p>
                    </div>

                    {screeners.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl text-xs">
                        No screeners active. Create a new SafePlay screener from the Movie Catalog tab!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {screeners.map((sc) => {
                          const assetObj = getAssetObj(sc.assetId);
                          if (!assetObj) return null;

                          return (
                            <motion.div 
                              key={sc.id}
                              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs hover:border-slate-300 transition-all"
                            >
                              <div className="space-y-1.5">
                                <div className="text-[10px] font-sans text-blue-500 uppercase tracking-wider font-bold">
                                  Forensic SafePlay Link
                                </div>
                                <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">
                                  {assetObj.title}
                                </h4>
                              </div>

                              <div className="space-y-2 border-t border-b border-slate-100 py-3 text-xs font-sans">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Watermark Security Stamp:</div>
                                <div className="bg-slate-50 p-2 rounded text-[10px] text-slate-600 leading-tight font-mono select-all border border-slate-100">
                                  {sc.watermarkText}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                                  <span>Expires: {new Date(sc.expiryDate).toLocaleDateString()}</span>
                                  <span className="flex items-center space-x-1 text-slate-400">
                                    <Eye size={12} />
                                    <span>{sc.viewCount} views</span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    sc.viewCount++;
                                    setActiveScreenerVideo({
                                      title: assetObj.title,
                                      videoUrl: sc.screenerUrl,
                                      watermarkText: sc.watermarkText
                                    });
                                  }}
                                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center justify-center space-x-1.5 shadow-xs"
                                >
                                  <Eye size={14} />
                                  <span>Watch Stream</span>
                                </button>

                                <button 
                                  onClick={() => {
                                    setComposeTemplate({
                                      to: 'acquisitions@streamvista.live',
                                      subject: `SafePlay Screener: "${assetObj.title}"`,
                                      body: `Hello,\n\nHere is your private preview link for "${assetObj.title}".\n\nPreview Link: https://streamvista.live/previews/${sc.id}\nWatermark Stamp: [${sc.watermarkText}]\nValidity: Active for 14 days.\n\nBest regards,\n${user.displayName || user.email}`
                                    });
                                    showNotification('Email message drafted! Opening Gmail tab.');
                                    setActiveTab('gmail');
                                  }}
                                  className="p-2 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 rounded-xl transition-all"
                                  title="Dispatch Screener Email"
                                >
                                  <Send size={14} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'gmail' && (
                  <motion.div 
                    key="gmail-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <GmailDashboard 
                      user={user}
                      token={token}
                      onLogout={handleLogout}
                      composeTemplate={composeTemplate}
                      clearTemplate={() => setComposeTemplate(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Custom Drawer for creating screeners */}
            <AnimatePresence>
              {generatingScreenerForAsset && (
                <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex justify-end">
                  <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    className="w-full max-w-md bg-white border-l border-slate-200 h-full p-6 shadow-2xl flex flex-col justify-between"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 uppercase">Compile SafePlay Screener</h3>
                          <p className="text-xs text-slate-500">Asset: {generatingScreenerForAsset.title}</p>
                        </div>
                        <button 
                          onClick={() => setGeneratingScreenerForAsset(null)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {/* Compilation Form details */}
                      <form onSubmit={handleCreateScreener} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Buyer Recipient Email</label>
                          <input 
                            type="email"
                            value={screenerRecipient}
                            onChange={(e) => setScreenerRecipient(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Forensic Watermark Stamp Layer</label>
                          <textarea 
                            value={screenerWatermark}
                            onChange={(e) => setScreenerWatermark(e.target.value)}
                            rows={3}
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-mono resize-none uppercase"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Access Expiry (Days)</label>
                          <select 
                            value={screenerDurationDays}
                            onChange={(e) => setScreenerDurationDays(parseInt(e.target.value))}
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          >
                            <option value={7}>7 Days - Fast Track Review</option>
                            <option value={14}>14 Days - Standard screening</option>
                            <option value={30}>30 Days - Corporate Acquisition lease</option>
                          </select>
                        </div>

                        <button 
                          type="submit"
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md mt-6 cursor-pointer"
                        >
                          Compile &amp; Open Dispatch Email
                        </button>
                      </form>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                      <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Dynamic Forensic Stamp Notice</h4>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        StreamVista dynamic watermarking renders authenticated Google credentials onto streaming frames.
                      </p>
                    </div>
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

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400">
              <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
                <div className="flex items-center space-x-1.5">
                  <span>StreamVista Rights Cloud</span>
                  <span>•</span>
                  <span>Firebase Auth &amp; Firestore Connected</span>
                </div>
                <div className="flex space-x-4">
                  <span className="text-[10px] text-slate-400">Session ID: {user.uid.substring(0, 10)}...</span>
                </div>
              </div>
            </footer>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

