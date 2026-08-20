import React, { useState, useEffect } from 'react';
import { 
  Mail, Globe, Shield, Sparkles, Loader2, Video, Key, FileText, 
  CheckCircle, PlusCircle, Clock, Send, Eye, ShieldAlert, ArrowRight, 
  UserCheck, RefreshCw, Lock, Unlock, Check, ThumbsUp, ThumbsDown, LogOut, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout as firebaseLogout } from './lib/firebase';
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

  // Demo Sandbox State
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoRole, setDemoRole] = useState<UserRole>('BUYER');
  const [demoUser, setDemoUser] = useState<{ displayName: string; email: string; photoURL: string | null } | null>(null);

  // Core Database/State arrays (stored locally in memory for instant high-fidelity responsiveness)
  const [assets, setAssets] = useState<MediaAsset[]>(INITIAL_ASSETS);
  const [rights, setRights] = useState<RightsCatalogueEntry[]>(INITIAL_RIGHTS);
  const [deals, setDeals] = useState<DealRequest[]>(INITIAL_DEALS);
  const [screeners, setScreeners] = useState<PrivateScreener[]>(INITIAL_SCREENERS);
  const [contracts, setContracts] = useState<Contract[]>(INITIAL_CONTRACTS);

  // Navigation & Workspace UI
  const [activeTab, setActiveTab] = useState<'catalog' | 'deals' | 'screeners' | 'gmail'>('catalog');
  const [activeScreenerVideo, setActiveScreenerVideo] = useState<{ title: string; videoUrl: string; watermarkText: string } | null>(null);

  // Forms / Actions
  const [submittingDealId, setSubmittingDealId] = useState<string | null>(null);
  const [proposedBids, setProposedBids] = useState<Record<string, number>>({});
  const [bidMessages, setBidMessages] = useState<Record<string, string>>({});
  
  // Screener Creation Drawer
  const [generatingScreenerForAsset, setGeneratingScreenerForAsset] = useState<MediaAsset | null>(null);
  const [screenerRecipient, setScreenerRecipient] = useState('');
  const [screenerWatermark, setScreenerWatermark] = useState('');
  const [screenerDurationDays, setScreenerDurationDays] = useState(14);

  // Compose Template to bridge catalogue actions directly to Gmail/sandbox dispatch drawer
  const [composeTemplate, setComposeTemplate] = useState<{ to: string; subject: string; body: string } | null>(null);

  useEffect(() => {
    // Initialise Firebase Auth observer
    const unsubscribe = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
        setIsDemoMode(false);
        setLoading(false);
      },
      () => {
        // If not authenticated via Firebase, check if we're in simulated demo
        if (!isDemoMode) {
          setUser(null);
          setToken(null);
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [isDemoMode]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setIsDemoMode(false);
      }
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err?.code || err?.message || err);
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/internal-error' || err?.message?.includes('internal-error')) {
        setLoginError('The browser preview sandboxing blocked the Google login popup. Please select any role on the left to enter the workspace right away, or open the app in a new tab.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setLoginError('Google sign-in window was closed. You can retry or choose an instant role on the left.');
      } else {
        setLoginError('Google login is not available in this embedded frame. You can use any role on the left to test all features immediately.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    setIsDemoMode(true);
    setDemoRole(role);
    
    // Set realistic user profiles depending on selected role
    if (role === 'BUYER') {
      setDemoUser({
        displayName: 'Sarah Jenkins (Netflix Acquisition)',
        email: 'acquisitions@netflix.com',
        photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
      });
    } else if (role === 'CONTENT_OWNER') {
      setDemoUser({
        displayName: 'Richard Vance (Paramount Creative)',
        email: 'vance@paramount.com',
        photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
      });
    } else {
      setDemoUser({
        displayName: 'Elena Rostova (StreamVista Platform Legal)',
        email: 'legal@streamvista.cloud',
        photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'
      });
    }
    setActiveTab('catalog');
  };

  const handleLogout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setDemoUser(null);
    } else {
      await firebaseLogout();
      setUser(null);
      setToken(null);
    }
  };

  // Derived Values
  const currentRole: UserRole = isDemoMode ? demoRole : 'ADMIN'; // Default Google login as ADMIN access representation
  const currentUserProfile = isDemoMode ? demoUser : (user ? {
    displayName: user.displayName || 'Google Operator',
    email: user.email || 'operator@gmail.com',
    photoURL: user.photoURL
  } : null);

  // Business Actions

  // 1. Submit a licensing bid/deal
  const handleProposeDeal = (rightsEntry: RightsCatalogueEntry, asset: MediaAsset) => {
    const proposedPrice = proposedBids[rightsEntry.id] || rightsEntry.price || 100000;
    const message = bidMessages[rightsEntry.id] || `Proposed partnership request for ${asset.title}.`;

    const newDeal: DealRequest = {
      id: `deal-${Date.now()}`,
      buyerId: isDemoMode ? 'buyer-netflix' : 'buyer-google-user',
      assetId: asset.id,
      ownerId: asset.ownerId,
      rightsId: rightsEntry.id,
      status: 'REQUESTED',
      proposedPrice,
      message,
      createdAt: Date.now()
    };

    setDeals([newDeal, ...deals]);
    showNotification(`Proposed an offer of $${proposedPrice.toLocaleString()} for "${asset.title}". The studio has been notified!`);
    
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
      // Auto-compile a draft contract in matching list
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
    showNotification('Agreement successfully signed and saved!');
  };

  // 4. Create custom private safeplay viewing link
  const handleOpenScreenerCreator = (asset: MediaAsset) => {
    setGeneratingScreenerForAsset(asset);
    setScreenerRecipient(currentRole === 'BUYER' ? currentUserProfile?.email || 'acquisitions@netflix.com' : 'buyer@acquisitiongroup.com');
    setScreenerWatermark(`CONFIDENTIAL // FOR REVIEW ONLY // BY: ${currentUserProfile?.email || 'OPERATIONS'}`);
  };

  const handleCreateScreener = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatingScreenerForAsset) return;

    const newScreener: PrivateScreener = {
      id: `screener-${Date.now()}`,
      assetId: generatingScreenerForAsset.id,
      buyerId: 'buyer-netflix',
      ownerId: generatingScreenerForAsset.ownerId,
      screenerUrl: generatingScreenerForAsset.videoUrl,
      expiryDate: Date.now() + screenerDurationDays * 24 * 60 * 60 * 1000,
      watermarkText: screenerWatermark || `CONFIDENTIAL FEED FOR ${screenerRecipient}`,
      viewCount: 0,
      createdAt: Date.now()
    };

    setScreeners([newScreener, ...screeners]);
    
    // Automatically pre-fill a gorgeous email draft for dispatch!
    setComposeTemplate({
      to: screenerRecipient,
      subject: `Movie Preview Link: "${generatingScreenerForAsset.title}"`,
      body: `Hi,\n\nI have created a private preview link to watch "${generatingScreenerForAsset.title}" online.\n\nAccess Link: https://streamvista.live/previews/${newScreener.id}\nWatermark: "${newScreener.watermarkText}"\nThis link is ready and will be available until ${new Date(newScreener.expiryDate).toLocaleDateString()}.\n\nLet me know what you think!\n\nBest regards,\nStreamVista Management Team`
    });

    setGeneratingScreenerForAsset(null);
    showNotification('Preview created! Opening your email tab to review and send to your partner.');
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
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-blue-200/50 font-mono tracking-widest text-xs uppercase">Connecting StreamVista Engine ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      <AnimatePresence mode="wait">
        {!currentUserProfile ? (
          <motion.div 
            key="authorization-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-slate-950"
          >
            {/* Ambient Background decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none -z-10">
              <div className="absolute top-[-10%] left-[10%] w-[35rem] h-[35rem] rounded-full bg-blue-900/15 blur-[120px]" />
              <div className="absolute bottom-[5%] right-[5%] w-[40rem] h-[40rem] rounded-full bg-indigo-900/10 blur-[150px]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>

            <div className="max-w-4xl w-full text-center space-y-10 py-12 relative z-10">
              {/* Top Tagline */}
              <div className="flex justify-center">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium text-xs uppercase tracking-wider">
                  <Sparkles size={12} className="animate-pulse text-blue-400" />
                  <span>StreamVista Film Manager</span>
                </div>
              </div>

              {/* Title & Slogan */}
              <div className="space-y-4">
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white">
                  STREAM<span className="text-blue-500">VISTA</span>
                </h1>
                <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  A simple place to share movie previews, review offers, and track signed deal agreements. Clean and uncomplicated for everyone.
                </p>
              </div>

              {/* Login Gate options (Dual Setup: Enterprise Google Authenticated vs Demo Sandbox) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-3xl mx-auto pt-6 text-left">
                {/* Simulated Quick Sandbox Gate */}
                <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-6">
                  <div className="space-y-2">
                    <div className="inline-flex p-2 bg-amber-500/10 rounded-lg text-amber-400">
                      <Unlock size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Try Out Demo</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Click below to enter the StreamVista Workspace right away. You can switch roles to see how easy it is to receive offers or send previews.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <button 
                      onClick={() => handleDemoLogin('BUYER')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <UserCheck size={16} className="text-blue-400" />
                        <span>Enter as BUYER (Netflix)</span>
                      </div>
                      <ArrowRight size={14} className="text-slate-500" />
                    </button>

                    <button 
                      onClick={() => handleDemoLogin('CONTENT_OWNER')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <UserCheck size={16} className="text-emerald-400" />
                        <span>Enter as CONTENT OWNER (Paramount)</span>
                      </div>
                      <ArrowRight size={14} className="text-slate-500" />
                    </button>

                    <button 
                      onClick={() => handleDemoLogin('ADMIN')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <UserCheck size={16} className="text-amber-400" />
                        <span>Enter as Legal Advisor</span>
                      </div>
                      <ArrowRight size={14} className="text-slate-500" />
                    </button>
                  </div>
                </div>

                {/* Google Authenticated Gate */}
                <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-6">
                  <div className="space-y-2">
                    <div className="inline-flex p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <Lock size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">Log in with Google</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Connect your google account to automatically send real, tracked email updates to your partners when you share movie previews or accept deals.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {loginError && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start space-x-2">
                        <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-200">Sandbox Preview Note</p>
                          <p className="text-[11px] leading-relaxed text-amber-300/90">{loginError}</p>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="w-full flex items-center justify-center space-x-3 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-98 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                    >
                      {isLoggingIn ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
                          <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.9 3.34-2 4.6-1.56 1.56-3.21 2.12-5.84 2.12-4.41 0-8-3.59-8-8s3.59-8 8-8c2.48 0 4.5 1 5.8 2.33l2.3-2.3C18.66 2.66 15.65 1.25 12 1.25 6.06 1.25 1.25 6.06 1.25 12s4.81 10.75 10.75 10.75c3.23 0 5.67-1.06 7.54-3.03 1.93-1.93 2.54-4.66 2.54-7.1 0-.69-.06-1.35-.18-1.95h-9.42Z" />
                        </svg>
                      )}
                      <span>{isLoggingIn ? 'Connecting...' : 'Google Login'}</span>
                    </button>

                    <div className="flex items-start space-x-2 text-[10px] text-slate-500 leading-normal">
                      <ShieldAlert size={12} className="shrink-0 mt-0.5 text-blue-500" />
                      <span>App requests standard Gmail authorization to read and safely send emails in your browser.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Specs Column */}
              <div className="flex flex-wrap justify-center gap-6 pt-4 text-slate-500 text-xs font-sans">
                <div className="flex items-center space-x-1.5">
                  <Shield size={14} className="text-blue-500/50" />
                  <span>Subtle Watermark Player</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-800 hidden md:inline" />
                <div className="flex items-center space-x-1.5">
                  <Globe size={14} className="text-indigo-500/50" />
                  <span>Simple Territory Rights</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-800 hidden md:inline" />
                <div className="flex items-center space-x-1.5">
                  <Mail size={14} className="text-emerald-500/50" />
                  <span>Fast Email Integration</span>
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
            {/* Elegant micro toast notification */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="fixed top-6 right-6 z-50 max-w-sm w-full bg-white border border-slate-150 rounded-2xl p-4 shadow-xl flex items-start space-x-3"
                >
                  <div className={`p-1 rounded-lg shrink-0 ${notification.type === 'success' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    <CheckCircle size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900">
                      {notification.type === 'success' ? 'Success' : 'Notice'}
                    </p>
                    <p className="text-xs text-slate-500 leading-normal mt-0.5">
                      {notification.message}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Workspace Header */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-150 shadow-xs backdrop-blur-md bg-white/95">
              <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
                
                {/* Brand Name */}
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                    STREAM<span className="text-blue-600 font-black">VISTA</span>
                  </h1>
                  <div className="h-4 w-[1px] bg-slate-200" />
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider bg-slate-900 text-slate-100 rounded-sm">
                      SIMPLE PREVIEWS
                    </span>
                  </div>
                </div>

                {/* Center Role Toggle (Excellent Multi-user demo utility!) */}
                {isDemoMode && (
                  <div className="hidden lg:flex items-center space-x-2.5 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switch Persona:</span>
                    <div className="flex space-x-1">
                      {(['BUYER', 'CONTENT_OWNER', 'ADMIN'] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => setDemoRole(r)}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            demoRole === r 
                              ? 'bg-blue-600 text-white shadow-xs' 
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          {r === 'BUYER' ? 'Buyer (Netflix)' : r === 'CONTENT_OWNER' ? 'Seller (Paramount)' : 'Legal Advisor'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Status Block */}
                <div className="flex items-center space-x-4">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center justify-end space-x-1.5">
                      <span className="text-xs font-bold text-slate-900">{currentUserProfile.displayName}</span>
                      <span className={`h-2 w-2 rounded-full ${isDemoMode ? 'bg-amber-400' : 'bg-green-500'}`} />
                    </div>
                    <span className="text-[10px] font-sans text-slate-450 font-bold uppercase tracking-wider">
                      Role: {currentRole === 'BUYER' ? 'Film Buyer' : currentRole === 'CONTENT_OWNER' ? 'Film Seller' : 'Platform legal advisor'}
                    </span>
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="p-2 border border-slate-150 hover:border-red-100 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all cursor-pointer active:scale-95"
                    title="Log Out Session"
                  >
                    <LogOut size={16} />
                  </button>
                </div>

              </div>
            </header>

            {/* Sub Nav Tab Menu bar */}
            <div className="bg-slate-100/60 border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-6 h-12 flex items-center md:justify-start overflow-x-auto gap-4">
                {[
                  { id: 'catalog', label: 'Movie Catalogue', icon: Globe },
                  { id: 'deals', label: 'Offers & Deals', icon: FileText, badge: deals.filter(d => d.status === 'REQUESTED').length },
                  { id: 'screeners', label: 'Shared Previews', icon: Video, badge: screeners.length },
                  { id: 'gmail', label: 'Email Manager (Gmail)', icon: Mail }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative h-full flex items-center space-x-2 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all capitalize cursor-pointer whitespace-nowrap ${
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

            {/* Main tab viewer area */}
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
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">Movie Catalog</h2>
                        <p className="text-xs text-slate-500">Watch preview videos, check region availabilities, or send licensing offers.</p>
                      </div>
                      
                      {currentRole === 'CONTENT_OWNER' && (
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10">
                          <PlusCircle size={14} className="text-emerald-500" />
                          <span className="font-semibold text-emerald-800">Studio Film Manager Active</span>
                        </div>
                      )}
                    </div>

                    {/* Media Grid Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {assets.map((asset) => {
                        const assetRights = rights.filter(r => r.assetId === asset.id);
                        
                        return (
                          <motion.div 
                            key={asset.id}
                            className="bg-white border border-slate-150 rounded-2xl overflow-hidden flex flex-col h-full hover:shadow-xl transition-all duration-300"
                          >
                            {/* Graphic Poster Banner */}
                            <div className="relative h-60 w-full overflow-hidden">
                              <img 
                                src={asset.thumbnailUrl} 
                                alt={asset.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                              
                              {/* Metadata Badge indicators over graphic */}
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
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                  {asset.description}
                                </p>

                                <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3 text-xs font-mono">
                                  <div>
                                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Studio Studio</span>
                                    <span className="text-slate-800 font-bold uppercase">{asset.ownerId === 'owner-paramount' ? 'Paramount Studios' : 'A24 Films'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">duration</span>
                                    <span className="text-slate-800 font-bold">{asset.duration} minutes</span>
                                  </div>
                                </div>
                              </div>

                              {/* Rights catalogs availability listings */}
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Territories & Base Pricing:</h4>
                                
                                {assetRights.length === 0 ? (
                                  <div className="text-xs text-slate-400 italic">No region options specified.</div>
                                ) : (
                                  <div className="space-y-2.5">
                                    {assetRights.map((entry) => (
                                      <div 
                                        key={entry.id}
                                        className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col space-y-2"
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
                                          <div className="text-[10px] font-sans text-slate-505">
                                            Type: <span className="font-bold text-slate-700">{entry.licenseTypes.join(' / ')}</span>
                                          </div>
                                          <div className="text-xs font-sans font-bold text-slate-900">
                                            Price: ${entry.price?.toLocaleString()}
                                          </div>
                                        </div>

                                        {/* Dynamic role workflows */}
                                        {currentRole === 'BUYER' && entry.availabilityStatus === 'AVAILABLE' && (
                                          <div className="pt-2 border-t border-slate-200/60 flex flex-col space-y-2">
                                            <div className="flex gap-2">
                                              <input 
                                                type="number"
                                                placeholder={`Proposed price (USD)`}
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
                                              placeholder="Optional comment or note..."
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

                              {/* Creative Screening action triggers */}
                              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                                {currentRole === 'CONTENT_OWNER' && asset.ownerId === 'owner-paramount' && (
                                  <button
                                    onClick={() => handleOpenScreenerCreator(asset)}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center space-x-2 shadow-xs"
                                  >
                                    <PlusCircle size={14} />
                                    <span>Share Preview Link</span>
                                  </button>
                                )}
                                
                                {currentRole === 'BUYER' && (
                                  <button
                                    onClick={() => {
                                      // Find associated screeners or let them request one!
                                      const activeSc = screeners.find(s => s.assetId === asset.id);
                                      if (activeSc) {
                                        setActiveScreenerVideo({
                                          title: asset.title,
                                          videoUrl: activeSc.screenerUrl,
                                          watermarkText: activeSc.watermarkText
                                        });
                                      } else {
                                        showNotification('The preview for this film is not active yet. You can submit an offer or ask the owner to share a preview link.', 'info');
                                      }
                                    }}
                                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center space-x-2"
                                  >
                                    <Video size={14} />
                                    <span>Watch Preview</span>
                                  </button>
                                )}
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
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Offers & Agreements</h2>
                      <p className="text-xs text-slate-500">Review licensing choices, sign deal files, and save signed documents.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Bid Negotiations */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Received Offers</h3>
                        
                        {deals.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 bg-white border border-slate-150 rounded-2xl text-xs">
                            No offers created yet.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {deals.map((deal) => {
                              const asset = getAssetObj(deal.assetId);
                              if (!asset) return null;

                              return (
                                <motion.div 
                                  key={deal.id}
                                  className="p-5 bg-white border border-slate-150 rounded-2xl space-y-4 shadow-xs"
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-bold text-sm text-slate-900">{asset.title}</h4>
                                      <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider">
                                        Seller Studio: {deal.ownerId === 'owner-paramount' ? 'Paramount' : 'A24 Films'} // Buyer Partner: Netflix
                                      </span>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-wider ${
                                      deal.status === 'REQUESTED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                      deal.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                      'bg-red-50 text-red-600 border border-red-200'
                                    }`}>
                                      {deal.status === 'REQUESTED' ? 'New Request' : deal.status === 'APPROVED' ? 'Accepted' : 'Declined'}
                                    </span>
                                  </div>

                                  <div className="bg-slate-50 p-3 rounded-lg text-xs leading-relaxed text-slate-600 font-medium whitespace-pre-line">
                                    "{deal.message}"
                                  </div>

                                  <div className="flex items-center justify-between text-xs text-slate-700 pt-2 border-t border-slate-100">
                                    <span>Offered Price:</span>
                                    <span className="font-bold text-slate-900 text-sm">
                                      ${deal.proposedPrice?.toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Dynamic review action based on role */}
                                  {currentRole === 'CONTENT_OWNER' && deal.status === 'REQUESTED' && (
                                    <div className="flex gap-2.5 pt-2">
                                      <button 
                                        onClick={() => handleReviewOffer(deal.id, true)}
                                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                                      >
                                        <ThumbsUp size={12} />
                                        <span>Accept Offer</span>
                                      </button>
                                      <button 
                                        onClick={() => handleReviewOffer(deal.id, false)}
                                        className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
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

                      {/* Cryptographic counterparts/Contracts */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signed Agreements</h3>
                        
                        {contracts.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 bg-white border border-slate-150 rounded-2xl text-xs">
                            No agreements yet. An agreement file will appear here as soon as a bid is accepted.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {contracts.map((contract) => (
                              <motion.div 
                                key={contract.id}
                                className="p-5 bg-white border border-slate-150 rounded-2xl space-y-4 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2.5 text-xs">
                                    <FileText className="text-blue-500" size={16} />
                                    <span className="font-extrabold text-slate-900">Agreement No: {contract.id.substring(13, 21)}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-sans font-bold uppercase tracking-wider ${
                                    contract.status === 'SIGNED' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                                  }`}>
                                    {contract.status === 'SIGNED' ? 'Signed & Finalized' : 'Waiting for Signature'}
                                  </span>
                                </div>

                                <div className="text-xs space-y-1.5 text-slate-600 py-1">
                                  <div>Film Title: <span className="font-bold text-slate-800">{getAssetTitle(contract.assetId)}</span></div>
                                  <div>Seller: <span className="uppercase text-slate-800 font-bold">{contract.ownerId === 'owner-paramount' ? 'Paramount' : 'A24'}</span></div>
                                  <div>Buyer: <span className="uppercase text-slate-800 font-bold">{contract.buyerId === 'buyer-netflix' ? 'Netflix Acquisitions' : 'Google Operator Office'}</span></div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                                  <a 
                                    href={contract.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:underline flex items-center space-x-1"
                                  >
                                    <Eye size={12} />
                                    <span>Download agreement (PDF)</span>
                                  </a>

                                  {currentRole === 'BUYER' && contract.status === 'PENDING' && (
                                    <button 
                                      onClick={() => handleSignContract(contract.id)}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer flex items-center space-x-1"
                                    >
                                      <CheckCircle size={12} />
                                      <span>Sign Agreement</span>
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
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Shared Previews</h2>
                      <p className="text-xs text-slate-500">Watch shared pre-release movie previews or send them to other buyers.</p>
                    </div>

                    {screeners.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 bg-white border border-slate-150 rounded-2xl text-xs">
                        No active previews created yet. Log in as a Film Seller to generate a new preview link from the Catalog tab!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {screeners.map((sc) => {
                          const assetObj = getAssetObj(sc.assetId);
                          if (!assetObj) return null;

                          return (
                            <motion.div 
                              key={sc.id}
                              className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-xs hover:border-slate-300 transition-all"
                            >
                              <div className="space-y-1.5">
                                <div className="text-[10px] font-sans text-blue-500 uppercase tracking-wider font-bold">
                                  Secure Preview Link
                                </div>
                                <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">
                                  {assetObj.title}
                                </h4>
                              </div>

                              <div className="space-y-2 border-t border-b border-slate-100 py-3 text-xs font-sans">
                                <div className="text-[10px] text-slate-600 uppercase font-bold">Watermark Label Stamp:</div>
                                <div className="bg-slate-50 p-2 rounded text-[10px] text-slate-500 leading-tight select-all">
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
                                    // Increment screen view logs
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
                                  <span>Watch movie</span>
                                </button>

                                {currentRole === 'CONTENT_OWNER' && (
                                  <button 
                                    onClick={() => {
                                      // precomposition template setup
                                      setComposeTemplate({
                                        to: 'acquisitions@netflix.com',
                                        subject: `Movie Preview: "${assetObj.title}"`,
                                        body: `Hi Partners,\n\nHere is the preview link for "${assetObj.title}".\n\nPreview Link: https://streamvista.live/previews/${sc.id}\nWatermark: [${sc.watermarkText}]\n\nPlease review at your convenience within 14 days.`
                                      });
                                      showNotification('Email message ready! Opening your email tab.');
                                      setActiveTab('gmail');
                                    }}
                                    className="p-2 border border-slate-150 hover:bg-slate-100 hover:border-slate-200 text-slate-500 rounded-xl transition-all capitalize"
                                    title="Reshare Preview Email"
                                  >
                                    <Send size={14} />
                                  </button>
                                )}
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
                      user={currentUserProfile ? { displayName: currentUserProfile.displayName, email: currentUserProfile.email, photoURL: currentUserProfile.photoURL } as any : null}
                      token={token}
                      onLogout={handleLogout}
                      composeTemplate={composeTemplate}
                      clearTemplate={() => setComposeTemplate(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Custom Interactive Floating Drawer for compiling screeners */}
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
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feeds Lease Lifetime (Days)</label>
                          <select 
                            value={screenerDurationDays}
                            onChange={(e) => setScreenerDurationDays(parseInt(e.target.value))}
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          >
                            <option value={7}>7 Days - Express Trial</option>
                            <option value={14}>14 Days - Standard screening lease</option>
                            <option value={30}>30 Days - Corporate Review lease</option>
                          </select>
                        </div>

                        <button 
                          type="submit"
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md mt-6"
                        >
                          Sealed Screener Compilation & Dispatch
                        </button>
                      </form>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1.5">
                      <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Dynamic Forensic Stamp Notice</h4>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        StreamVista stamps frame coordinates with deep-embedded tracking protocols. Unauthorized stream capture will flag client details natively via the decrypter.
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Global player viewport modal fallback */}
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

            {/* Custom Page footer */}
            <footer className="bg-white border-t border-slate-150 py-6 mt-12 text-center text-xs text-slate-400">
              <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
                <div className="flex items-center space-x-1">
                  <span>StreamVista Rights Cloud Platform</span>
                  <span>© 2026</span>
                </div>
                <div className="flex space-x-4">
                  <a href="#" className="hover:text-slate-600 transition-colors uppercase font-bold text-[10px]">Security specs</a>
                  <a href="#" className="hover:text-slate-600 transition-colors uppercase font-bold text-[10px]">API Reference</a>
                </div>
              </div>
            </footer>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
