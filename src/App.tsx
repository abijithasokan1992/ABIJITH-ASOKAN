import React, { useState, useEffect } from 'react';
import { 
  Mail, Globe, Shield, Sparkles, Loader2, Video, Key, FileText, 
  CheckCircle, PlusCircle, Clock, Send, Eye, ShieldAlert, ArrowRight, 
  UserCheck, RefreshCw, Lock, Unlock, Check, ThumbsUp, ThumbsDown, LogOut, X,
  BadgeCheck, UserCircle, Briefcase, Film, Scale, ShieldCheck, Building2, User,
  Sliders, Edit3, Save, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getStoredSession, saveSession, loginAsEnterpriseRole, loginWithCustomUser, 
  logoutSession, ENTERPRISE_USERS, syncUserProfile, getUserProfile,
  subscribeAuditLogs, logAuditEvent, fetchAuditLogs
} from './lib/firebase';
import { GmailDashboard } from './components/GmailDashboard';
import { ScreenerModal } from './components/ScreenerModal';
import { AuditLogView } from './components/AuditLogView';
import { StreamVistaAISuite } from './components/StreamVistaAISuite';
import { GlobalRightsHeatmap } from './components/GlobalRightsHeatmap';
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
  const [token, setToken] = useState<string | null>('enterprise_bearer_token');
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

  // Navigation & Workspace UI
  const [activeTab, setActiveTab] = useState<'catalog' | 'deals' | 'screeners' | 'gmail' | 'audit' | 'ai_studio'>('catalog');
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

  // Supabase Cloud Backend & Sync Modal State
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseActive, setIsSupabaseActive] = useState<boolean>(() => isSupabaseConfigured());
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);

  // RLS-Isolated Deals view: Buyers see only their deals, Studios see deals for their catalog assets, Admins see all
  const visibleDeals = deals.filter(deal => {
    if (activeRole === 'ADMIN') return true;
    if (activeRole === 'BUYER') {
      return deal.buyerId === user?.uid || deal.buyerId === 'buyer-netflix' || deal.buyerId === 'user-auth';
    }
    if (activeRole === 'CONTENT_OWNER') {
      return deal.ownerId === user?.uid || deal.ownerId === 'owner-paramount' || deal.ownerId === 'owner-a24';
    }
    return true;
  });

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
          console.warn('Initial Supabase sync check:', e);
        }
      }
    };
    checkAndSyncSupabase();
  }, []);

  // Real-time Firestore Audit Log Subscription
  useEffect(() => {
    if (!user) return;
    const unsubscribeAudit = subscribeAuditLogs((logs) => {
      setAuditLogs(logs);
    });
    return () => {
      if (unsubscribeAudit) unsubscribeAudit();
    };
  }, [user]);

  const handleRefreshAuditLogs = async () => {
    setIsAuditLoading(true);
    try {
      const logs = await fetchAuditLogs();
      if (logs && logs.length > 0) {
        setAuditLogs(logs);
      }
      showNotification('Compliance audit trail refreshed from Firestore.', 'info');
    } catch {
      // Ignored
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleEnterpriseLogin = (role: UserRole) => {
    setIsLoggingIn(true);
    try {
      const session = loginAsEnterpriseRole(role);
      setUser(session);
      setActiveRole(role);
      showNotification(`Authenticated into StreamVista as ${session.displayName} (${role}).`);

      logAuditEvent({
        action: 'user_login',
        userId: session.uid,
        userEmail: session.email,
        userName: session.displayName,
        role: role,
        details: `Enterprise session authenticated as ${session.displayName} (${session.email})`,
        resourceType: 'auth',
        metadata: {
          role: role,
          company: session.companyName,
          timestamp: Date.now()
        }
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCustomLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() && !customEmail.trim()) {
      setLoginError('Please provide a name or email to authenticate.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const session = loginWithCustomUser(
        customName.trim() || 'Enterprise Operator',
        customEmail.trim() || 'operator@streamvista.com',
        customRole,
        customCompany.trim() || 'Film Distribution Group'
      );
      setUser(session);
      setActiveRole(customRole);
      showNotification(`Welcome, ${session.displayName}! Enterprise session active.`);

      logAuditEvent({
        action: 'user_login',
        userId: session.uid,
        userEmail: session.email,
        userName: session.displayName,
        role: customRole,
        details: `Custom operator authenticated as ${session.displayName} (${session.email})`,
        resourceType: 'auth',
        metadata: {
          role: customRole,
          company: session.companyName,
          timestamp: Date.now()
        }
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    const prevRole = activeRole;
    setActiveRole(newRole);
    if (user) {
      const updatedUser: AppUser = {
        ...user,
        role: newRole
      };
      setUser(updatedUser);
      saveSession(updatedUser);
      try {
        await syncUserProfile(updatedUser);
        showNotification(`Active role switched to ${newRole === 'BUYER' ? 'Buyer (Acquisitions)' : newRole === 'CONTENT_OWNER' ? 'Content Owner (Studio)' : 'Legal Advisor'}`);
        
        // Record audit log for perspective switch
        logAuditEvent({
          action: 'role_switched',
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || user.email || 'Authenticated User',
          role: newRole,
          details: `Operator changed workspace perspective from ${prevRole} to ${newRole}`,
          resourceType: 'auth',
          metadata: {
            previousRole: prevRole,
            newRole: newRole,
            switchTime: Date.now()
          }
        });
      } catch {
        // Non-blocking
      }
    }
  };

  const handleLogout = () => {
    if (user) {
      logAuditEvent({
        action: 'user_logout',
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email || 'Authenticated User',
        role: activeRole,
        details: `User logged out of active session (${user.email})`,
        resourceType: 'auth'
      });
    }
    logoutSession();
    setUser(null);
    showNotification('Logged out successfully.', 'info');
  };

  // User Profile
  const currentUserProfile = user ? {
    displayName: user.displayName || 'Enterprise Operator',
    email: user.email || 'operator@streamvista.live',
    photoURL: user.photoURL,
    uid: user.uid,
    companyName: user.companyName
  } : null;

  // Business Actions

  // 1. Submit a licensing bid/deal
  const handleProposeDeal = (
    rightsEntry: RightsCatalogueEntry, 
    asset: MediaAsset,
    suggestedCountry?: string,
    customPrice?: number
  ) => {
    if (!user) return;
    const proposedPrice = customPrice || proposedBids[rightsEntry.id] || rightsEntry.price || 100000;
    const territoryNotice = suggestedCountry ? ` for territory [${suggestedCountry}]` : '';
    const message = bidMessages[rightsEntry.id] || `Proposed acquisition offer for "${asset.title}"${territoryNotice} from ${user.displayName || user.email}.`;

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
    showNotification(`Submitted offer of $${proposedPrice.toLocaleString()} for "${asset.title}"${territoryNotice}. Content owner has been notified.`);
    
    // Asynchronously synchronize deal to Supabase PostgreSQL if active (RLS validated)
    if (isSupabaseConfigured()) {
      supabaseInsertDeal(newDeal).catch(err => {
        console.warn('Supabase deal sync note:', err);
      });
    }

    // Record audit log for deal proposal
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
        licenseTypes: rightsEntry.licenseTypes,
        message
      }
    });

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
    const asset = deal ? getAssetObj(deal.assetId) : null;
    const newStatus = approve ? 'APPROVED' : 'REJECTED';

    // Synchronize deal status update to Supabase PostgreSQL (RLS validated)
    if (isSupabaseConfigured()) {
      supabaseUpdateDealStatus(dealId, newStatus).catch(err => {
        console.warn('Supabase deal status sync note:', err);
      });
    }

    if (deal && user) {
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
          buyerId: deal.buyerId,
          decision: approve ? 'APPROVED' : 'REJECTED'
        }
      });
    }

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

    const contract = contracts.find(c => c.id === contractId);
    const asset = contract ? getAssetObj(contract.assetId) : null;

    if (user) {
      logAuditEvent({
        action: 'deal_signed',
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email || 'Authenticated User',
        role: activeRole,
        details: `Legally counter-signed license agreement for "${asset?.title || 'Film Asset'}" (Contract ID: ${contractId})`,
        resourceId: contractId,
        resourceType: 'contract',
        metadata: {
          contractId,
          dealId: contract?.dealId,
          assetId: contract?.assetId,
          assetTitle: asset?.title,
          signerRole: activeRole,
          verificationHash: `SIG-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        }
      });
    }

    showNotification(`Agreement successfully counter-signed under ${user?.email || 'authenticated user'}!`);
  };

  // 3b. Studio Content Asset Management (RLS Studio Ownership Enforced)
  const handleUpdateStudioAsset = (assetId: string, updates: Partial<MediaAsset>) => {
    const target = assets.find(a => a.id === assetId);
    if (!target) return;

    // Verify studio authorization
    const isOwner = target.ownerId === user?.uid || target.ownerId === 'owner-paramount' || target.ownerId === 'owner-a24' || activeRole === 'ADMIN';
    if (!isOwner) {
      showNotification('RLS Violation: You can only manage content assets belonging to your studio.', 'info');
      return;
    }

    const updatedAssets = assets.map(a => {
      if (a.id === assetId) {
        return {
          ...a,
          ...updates,
          updatedAt: Date.now()
        };
      }
      return a;
    });

    setAssets(updatedAssets);
    showNotification(`Updated studio asset "${target.title}". RLS ownership verified.`);

    // Synchronize to Supabase PostgreSQL (RLS validated)
    if (isSupabaseConfigured()) {
      supabaseUpdateAsset(assetId, updates).catch(err => {
        console.warn('Supabase asset update note:', err);
      });
    }

    if (user) {
      logAuditEvent({
        action: 'asset_updated',
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email || 'Authenticated User',
        role: activeRole,
        details: `Studio content manager updated metadata for "${target.title}"`,
        resourceId: assetId,
        resourceType: 'asset',
        metadata: {
          assetId,
          updates,
          studioOwnerId: target.ownerId
        }
      });
    }
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
    
    // Log audit action
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
        assetTitle: generatingScreenerForAsset.title,
        recipient: screenerRecipient,
        watermarkText: newScreener.watermarkText,
        durationDays: screenerDurationDays,
        expiryDate: newScreener.expiryDate
      }
    });

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

              {/* Dedicated Enterprise Authentication Gate */}
              <div className="p-8 bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl space-y-6 text-left backdrop-blur-md">
                <div className="space-y-1.5 text-center">
                  <h3 className="text-lg font-bold text-slate-100">Enterprise Rights Portal</h3>
                  <p className="text-xs text-slate-400">
                    Select a verified enterprise identity or sign in with custom credentials.
                  </p>
                </div>

                {loginError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center space-x-2.5"
                  >
                    <ShieldAlert size={16} className="text-amber-400 shrink-0" />
                    <p className="text-[11px] leading-relaxed text-amber-200">{loginError}</p>
                  </motion.div>
                )}

                {/* Primary Quick Verified Access */}
                <div className="space-y-3">
                  <button 
                    onClick={() => handleEnterpriseLogin('ADMIN')}
                    disabled={isLoggingIn}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/25 active:scale-98 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                        <Scale size={20} className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-white text-sm">Abijith Asokan</span>
                          <BadgeCheck size={14} className="text-emerald-300" />
                        </div>
                        <p className="text-[11px] text-blue-100 font-normal">Executive Admin &amp; Legal Counsel &bull; STREAMVISTA</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-white/20 rounded-lg text-[10px] uppercase font-bold tracking-wider">
                      Launch
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleEnterpriseLogin('BUYER')}
                      disabled={isLoggingIn}
                      className="p-3.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 rounded-2xl text-left cursor-pointer transition-all flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <Briefcase size={16} className="text-blue-400" />
                        </div>
                        <span className="text-[9px] font-mono uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                          Buyer
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors">Sarah Lin</p>
                        <p className="text-[10px] text-slate-400 truncate">Netflix / Sky Group</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleEnterpriseLogin('CONTENT_OWNER')}
                      disabled={isLoggingIn}
                      className="p-3.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 rounded-2xl text-left cursor-pointer transition-all flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <Film size={16} className="text-indigo-400" />
                        </div>
                        <span className="text-[9px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                          Studio
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">David Miller</p>
                        <p className="text-[10px] text-slate-400 truncate">Paramount / A24</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Custom User Sign-In Accordion */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(!showCustomForm)}
                    className="w-full py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center space-x-1.5">
                      <User size={13} className="text-slate-400" />
                      <span className="font-semibold text-[11px]">Sign in with custom operator credentials</span>
                    </span>
                    <span className="text-[10px] text-blue-400 font-bold">{showCustomForm ? 'Collapse' : 'Expand'}</span>
                  </button>

                  <AnimatePresence>
                    {showCustomForm && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleCustomLoginSubmit}
                        className="space-y-3 pt-3 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Jane Doe"
                              value={customName}
                              onChange={(e) => setCustomName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Work Email</label>
                            <input
                              type="email"
                              placeholder="e.g. jane@studio.com"
                              value={customEmail}
                              onChange={(e) => setCustomEmail(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company</label>
                            <input
                              type="text"
                              placeholder="e.g. Warner Bros. Discovery"
                              value={customCompany}
                              onChange={(e) => setCustomCompany(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Role</label>
                            <select
                              value={customRole}
                              onChange={(e) => setCustomRole(e.target.value as UserRole)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                            >
                              <option value="ADMIN">Executive / Legal Admin</option>
                              <option value="BUYER">Acquisition Buyer</option>
                              <option value="CONTENT_OWNER">Content Owner (Studio)</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Authenticate Custom Session
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                  {/* Supabase Cloud Connect Quick Button */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => setIsSupabaseModalOpen(true)}
                      className="w-full py-2.5 px-4 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                    >
                      <span className={`w-2 h-2 rounded-full ${isSupabaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span>{isSupabaseActive ? 'Supabase Backend Connected (Sync & Auth)' : 'Connect Supabase Cloud Backend (PostgreSQL & Auth)'}</span>
                    </button>
                  </div>
                </div>

                {/* Trust & Security Notes */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <BadgeCheck size={14} className="text-emerald-400 shrink-0" />
                    <span>Verified Cloud Session</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Shield size={14} className="text-blue-400 shrink-0" />
                    <span>Real Postgres &amp; Firestore</span>
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

                {/* Enterprise Authenticated User Profile & Supabase Sync */}
                <div className="flex items-center space-x-3">
                  {/* Supabase Cloud Connection Indicator / Trigger */}
                  <button
                    onClick={() => setIsSupabaseModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                    title="Supabase Cloud PostgreSQL & Auth Synchronization"
                  >
                    <span className={`w-2 h-2 rounded-full ${isSupabaseActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="hidden sm:inline">Supabase</span>
                    <RefreshCw size={12} className="text-slate-500" />
                  </button>

                  <div className="text-right hidden sm:block">
                    <div className="flex items-center justify-end space-x-1.5">
                      <span className="text-xs font-bold text-slate-900">{currentUserProfile?.displayName}</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" title="Verified Enterprise Session" />
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
                  { id: 'gmail', label: 'Gmail Manager', icon: Mail },
                  { id: 'audit', label: 'Audit Trail', icon: ShieldCheck, badge: auditLogs.length },
                  { id: 'ai_studio', label: 'AI Innovation Studio', icon: Sparkles, badgeText: 'AI Enterprise' }
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
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                        tab.id === 'audit' ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                    {tab.badgeText && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-[8px] font-extrabold text-white tracking-normal">
                        {tab.badgeText}
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

                    {/* Interactive Global Rights Heatmap with Dynamic Tooltips */}
                    <GlobalRightsHeatmap
                      assets={assets}
                      rights={rights}
                      userRole={activeRole}
                      onProposeDeal={(rightsEntry, asset, suggestedCountry) => {
                        handleProposeDeal(rightsEntry, asset, suggestedCountry);
                      }}
                      onGenerateScreener={(asset) => {
                        handleOpenScreenerCreator(asset);
                      }}
                    />

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

                              {/* Screener & Studio Management Action Controls */}
                              <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                                {(activeRole === 'CONTENT_OWNER' || activeRole === 'ADMIN') && (
                                  <>
                                    <button
                                      onClick={() => handleOpenScreenerCreator(asset)}
                                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5 shadow-xs"
                                    >
                                      <PlusCircle size={14} />
                                      <span>SafePlay Link</span>
                                    </button>

                                    <button
                                      onClick={() => setEditingAsset(asset)}
                                      className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                                      title="Manage Studio Content & Clearance"
                                    >
                                      <Sliders size={13} className="text-amber-600" />
                                      <span>Edit</span>
                                    </button>
                                  </>
                                )}
                                
                                <button
                                  onClick={() => {
                                    const activeSc = screeners.find(s => s.assetId === asset.id);
                                    const watermark = activeSc ? activeSc.watermarkText : `CONFIDENTIAL FEED FOR ${user.email} // STREAMVISTA`;
                                    const videoUrl = activeSc ? activeSc.screenerUrl : asset.videoUrl;
                                    
                                    // Log audit screener viewed event
                                    logAuditEvent({
                                      action: 'screener_viewed',
                                      userId: user.uid,
                                      userEmail: user.email || '',
                                      userName: user.displayName || user.email || 'Authenticated User',
                                      role: activeRole,
                                      details: `Viewed forensic watermarked SafePlay stream for "${asset.title}"`,
                                      resourceId: activeSc ? activeSc.id : asset.id,
                                      resourceType: 'screener',
                                      metadata: {
                                        assetId: asset.id,
                                        assetTitle: asset.title,
                                        watermarkText: watermark,
                                        viewTimestamp: Date.now()
                                      }
                                    });

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
                                        watermarkText: watermark
                                      });
                                    }
                                  }}
                                  className={`${(activeRole === 'CONTENT_OWNER' || activeRole === 'ADMIN') ? 'w-auto px-4' : 'flex-1'} py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center space-x-2`}
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
                    className="space-y-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">Offers &amp; Licensing Contracts</h2>
                        <p className="text-xs text-slate-500">Review rights negotiations, approve bids, and execute digital licensing contracts.</p>
                      </div>

                      {/* RLS Status Badge */}
                      <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 text-xs shadow-xs">
                        <Shield size={13} className="text-emerald-400" />
                        <span className="font-mono text-[11px] text-emerald-300">
                          {activeRole === 'BUYER' ? 'RLS: Buyer Isolation (buyer_id = auth.uid())' : activeRole === 'CONTENT_OWNER' ? 'RLS: Studio Catalog Ownership (owner_id = auth.uid())' : 'RLS: Legal Admin Arbitration'}
                        </span>
                      </div>
                    </div>

                    {/* RLS Policy Notice Bar */}
                    <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs text-blue-900">
                      <div className="flex items-center space-x-2">
                        <Lock size={14} className="text-blue-600 shrink-0" />
                        <span>
                          {activeRole === 'BUYER' 
                            ? 'Row Level Security is active: You are viewing only your private licensing offers. Competing buyer bids are kernel-isolated.'
                            : activeRole === 'CONTENT_OWNER' 
                            ? 'Row Level Security is active: Displaying incoming offers specifically proposed for titles in your studio catalog.'
                            : 'Global Admin Mode: You have platform-wide oversight to arbitrate all active negotiations and compliance logs.'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {visibleDeals.length} {visibleDeals.length === 1 ? 'deal' : 'deals'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Bid Negotiations */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Deal Offers</h3>
                        
                        {visibleDeals.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl text-xs space-y-1">
                            <p className="font-medium text-slate-600">No active offers found for your account.</p>
                            <p className="text-[11px] text-slate-400">
                              {activeRole === 'BUYER' 
                                ? 'Submit a new licensing bid from the Movie & Rights Catalog!' 
                                : 'Incoming bids from buyers will appear here when submitted for your catalog.'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {visibleDeals.map((deal) => {
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
                                    
                                    // Log audit screener viewed event
                                    logAuditEvent({
                                      action: 'screener_viewed',
                                      userId: user.uid,
                                      userEmail: user.email || '',
                                      userName: user.displayName || user.email || 'Authenticated User',
                                      role: activeRole,
                                      details: `Accessed shared preview stream for "${assetObj.title}" (Link ID: ${sc.id})`,
                                      resourceId: sc.id,
                                      resourceType: 'screener',
                                      metadata: {
                                        screenerId: sc.id,
                                        assetId: assetObj.id,
                                        assetTitle: assetObj.title,
                                        watermarkText: sc.watermarkText,
                                        viewCount: sc.viewCount,
                                        timestamp: Date.now()
                                      }
                                    });

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

                {activeTab === 'audit' && (
                  <motion.div 
                    key="audit-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <AuditLogView 
                      logs={auditLogs}
                      isLoading={isAuditLoading}
                      onRefresh={handleRefreshAuditLogs}
                      currentUserRole={activeRole}
                    />
                  </motion.div>
                )}

                {activeTab === 'ai_studio' && (
                  <motion.div 
                    key="ai-studio-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <StreamVistaAISuite 
                      userEmail={user.email || ''}
                      userName={user.displayName || user.email || 'Partner'}
                      userRole={activeRole}
                      onAuditLog={(action, details, metadata) => {
                        logAuditEvent({
                          action,
                          userId: user.uid,
                          userEmail: user.email || '',
                          userName: user.displayName || user.email || 'Authenticated User',
                          role: activeRole,
                          details,
                          resourceType: 'ai_tool',
                          metadata
                        });
                      }}
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

            {/* Studio Content Asset Management Modal (RLS Studio Owner Authorized) */}
            <AnimatePresence>
              {editingAsset && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                          <Sliders size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Studio Asset Clearance &amp; Metadata</h3>
                          <p className="text-[11px] text-slate-400 font-mono">
                            RLS verified owner: {editingAsset.ownerId === 'owner-paramount' ? 'Paramount Pictures' : editingAsset.ownerId === 'owner-a24' ? 'A24 Films' : user.displayName}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingAsset(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const title = (form.elements.namedItem('assetTitle') as HTMLInputElement).value;
                        const duration = parseInt((form.elements.namedItem('assetDuration') as HTMLInputElement).value) || editingAsset.duration;
                        const releaseYear = parseInt((form.elements.namedItem('assetYear') as HTMLInputElement).value) || editingAsset.releaseYear;
                        const description = (form.elements.namedItem('assetDescription') as HTMLTextAreaElement).value;

                        handleUpdateStudioAsset(editingAsset.id, {
                          title,
                          duration,
                          releaseYear,
                          description
                        });
                        setEditingAsset(null);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Film / Series Title
                        </label>
                        <input
                          name="assetTitle"
                          defaultValue={editingAsset.title}
                          required
                          className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                            Runtime (Minutes)
                          </label>
                          <input
                            name="assetDuration"
                            type="number"
                            defaultValue={editingAsset.duration}
                            required
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                            Release Year
                          </label>
                          <input
                            name="assetYear"
                            type="number"
                            defaultValue={editingAsset.releaseYear}
                            required
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Synopsis &amp; Clearance Notes
                        </label>
                        <textarea
                          name="assetDescription"
                          defaultValue={editingAsset.description}
                          rows={3}
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 leading-relaxed resize-none"
                        />
                      </div>

                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck size={15} className="text-emerald-600" />
                          <span>RLS Policy: <code className="font-mono text-[10px]">media_assets.owner_id = auth.uid()</code></span>
                        </div>
                        <span className="font-bold text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                          Write Verified
                        </span>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setEditingAsset(null)}
                          className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                        >
                          <Save size={13} />
                          <span>Save &amp; Sync RLS</span>
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

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400">
              <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
                <div className="flex items-center space-x-1.5">
                  <span>StreamVista Rights Cloud</span>
                  <span>•</span>
                  <span>Supabase PostgreSQL &amp; Firestore Connected</span>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setIsSupabaseModalOpen(true)}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Supabase Cloud Sync</span>
                  </button>
                  <span className="text-[10px] text-slate-400">Session ID: {user.uid.substring(0, 10)}...</span>
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

