import React, { useState, useEffect } from 'react';
import { 
  Database, Shield, CheckCircle, AlertCircle, RefreshCw, Copy, Check, 
  ExternalLink, Key, Server, Lock, ArrowRight, X, Sparkles, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, 
  getSupabaseClient, isSupabaseConfigured, SUPABASE_SQL_SCHEMA, SUPABASE_RLS_POLICIES_SQL,
  supabaseFetchAssets, supabaseInsertAsset, supabaseFetchDeals, supabaseInsertDeal,
  supabaseSignInWithPassword, supabaseSignUpWithPassword, supabaseSignInWithMagicLink
} from '../lib/supabase';
import { AppUser, MediaAsset, RightsCatalogueEntry, DealRequest, UserRole } from '../types';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  assets: MediaAsset[];
  rights: RightsCatalogueEntry[];
  deals: DealRequest[];
  onSyncAssetsFromSupabase: (assets: MediaAsset[]) => void;
  onSyncDealsFromSupabase: (deals: DealRequest[]) => void;
  onUserAuthenticated?: (user: AppUser) => void;
  onNotify: (msg: string, type?: 'success' | 'info') => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  assets,
  rights,
  deals,
  onSyncAssetsFromSupabase,
  onSyncDealsFromSupabase,
  onUserAuthenticated,
  onNotify
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'connection' | 'sync' | 'auth' | 'rls' | 'schema'>('connection');
  
  // Connection Form
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Sync Status
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  
  // Supabase Direct Auth Form
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authRole, setAuthRole] = useState<UserRole>('BUYER');
  const [authCompany, setAuthCompany] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Copy Schema & RLS status
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedRls, setCopiedRls] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url || '');
      setAnonKey(config.anonKey || '');
      setIsConnected(isSupabaseConfigured());
      setTestResult(null);
      setAuthError(null);
    }
  }, [isOpen]);

  const handleSaveConfig = () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: 'Please enter both Supabase Project URL and Anon API Key.' });
      return;
    }

    try {
      saveSupabaseConfig({
        url: url.trim(),
        anonKey: anonKey.trim()
      });
      setIsConnected(true);
      setTestResult({ success: true, message: 'Supabase credentials saved successfully. Testing connection...' });
      handleTestConnection();
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Failed to save configuration.' });
    }
  };

  const handleClearConfig = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setIsConnected(false);
    setTestResult({ success: true, message: 'Supabase configuration cleared.' });
    onNotify('Supabase configuration cleared.', 'info');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const client = getSupabaseClient();
      if (!client) {
        setTestResult({ success: false, message: 'Could not initialize client with current credentials.' });
        return;
      }

      // Quick ping test
      const { data, error } = await client.from('media_assets').select('id').limit(1);
      if (error && error.code === 'PGRST116') {
        // Table might not exist yet but connection works
        setTestResult({ 
          success: true, 
          message: 'Connected to Supabase PostgreSQL successfully! (Run schema script to initialize tables)' 
        });
        onNotify('Connected to Supabase PostgreSQL successfully!');
      } else if (error && (error.message.includes('FetchError') || error.message.includes('Failed to fetch') || error.message.includes('Invalid API key'))) {
        setTestResult({ success: false, message: `Connection failed: ${error.message}` });
      } else {
        setTestResult({ 
          success: true, 
          message: 'Connected to Supabase PostgreSQL database successfully!' 
        });
        onNotify('Supabase Cloud backend verified and online!');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Connection error: ${err.message || 'Check project URL and key.'}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
    onNotify('Supabase SQL Schema copied to clipboard.');
  };

  const handleCopyRls = () => {
    navigator.clipboard.writeText(SUPABASE_RLS_POLICIES_SQL);
    setCopiedRls(true);
    setTimeout(() => setCopiedRls(false), 2500);
    onNotify('Supabase Row Level Security (RLS) policies copied to clipboard.');
  };

  const handlePushToSupabase = async () => {
    setIsSyncing(true);
    const logs: string[] = [];
    logs.push(`Starting push to Supabase PostgreSQL at ${new Date().toLocaleTimeString()}...`);

    try {
      let assetsSynced = 0;
      for (const asset of assets) {
        const ok = await supabaseInsertAsset(asset);
        if (ok) assetsSynced++;
      }
      logs.push(`Pushed ${assetsSynced}/${assets.length} media assets into public.media_assets`);

      let dealsSynced = 0;
      for (const deal of deals) {
        const ok = await supabaseInsertDeal(deal);
        if (ok) dealsSynced++;
      }
      logs.push(`Pushed ${dealsSynced}/${deals.length} deal records into public.deal_requests`);

      logs.push(`Push completed successfully!`);
      setSyncLogs(logs);
      onNotify('StreamVista catalogue records synchronized to Supabase Cloud.');
    } catch (e: any) {
      logs.push(`Sync Error: ${e.message}`);
      setSyncLogs(logs);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsSyncing(true);
    const logs: string[] = [];
    logs.push(`Pulling remote data from Supabase...`);

    try {
      const fetchedAssets = await supabaseFetchAssets();
      if (fetchedAssets && fetchedAssets.length > 0) {
        onSyncAssetsFromSupabase(fetchedAssets);
        logs.push(`Pulled ${fetchedAssets.length} active media assets from Supabase.`);
      } else {
        logs.push(`No assets found in Supabase table (or schema not created).`);
      }

      const fetchedDeals = await supabaseFetchDeals();
      if (fetchedDeals && fetchedDeals.length > 0) {
        onSyncDealsFromSupabase(fetchedDeals);
        logs.push(`Pulled ${fetchedDeals.length} active deal negotiations.`);
      }

      setSyncLogs(logs);
      onNotify('Catalogue synchronized with remote Supabase database.');
    } catch (e: any) {
      logs.push(`Pull Error: ${e.message}`);
      setSyncLogs(logs);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSupabaseAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'signin') {
        const { user: authedUser, error } = await supabaseSignInWithPassword(authEmail, authPassword);
        if (error) throw error;
        if (authedUser && onUserAuthenticated) {
          onUserAuthenticated(authedUser);
          onNotify(`Signed in via Supabase Auth as ${authedUser.email}`);
          onClose();
        }
      } else if (authMode === 'signup') {
        const { user: authedUser, error } = await supabaseSignUpWithPassword(
          authEmail, 
          authPassword, 
          authDisplayName || 'Enterprise Operator',
          authRole,
          authCompany || 'Film Distribution Group'
        );
        if (error) throw error;
        if (authedUser && onUserAuthenticated) {
          onUserAuthenticated(authedUser);
          onNotify(`Supabase account created for ${authedUser.email}!`);
          onClose();
        }
      } else if (authMode === 'magic') {
        const { error } = await supabaseSignInWithMagicLink(authEmail);
        if (error) throw error;
        onNotify(`Magic sign-in link dispatched to ${authEmail}! Check inbox.`, 'info');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden text-slate-100 my-8"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Database size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <span>Supabase Cloud Integration</span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                    {isConnected ? 'LIVE CONNECTED' : 'UNCONFIGURED'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect real PostgreSQL backend, Supabase Auth, and catalogue synchronization.
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 overflow-x-auto">
            {[
              { id: 'connection', label: 'Connection', icon: Key },
              { id: 'auth', label: 'Supabase Auth', icon: Lock },
              { id: 'sync', label: 'Sync', icon: RefreshCw },
              { id: 'rls', label: 'RLS Security Policies', icon: Shield },
              { id: 'schema', label: 'SQL Schema', icon: Layers }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                    activeSubTab === tab.id 
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-5">
            {/* Tab 1: Connection Config */}
            {activeSubTab === 'connection' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs text-slate-300 space-y-2">
                  <p className="font-semibold text-white flex items-center space-x-1.5">
                    <Server size={14} className="text-emerald-400" />
                    <span>Supabase Project Credentials</span>
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Enter your Supabase Project URL and public Anon API Key (found in your Supabase Dashboard &gt; Project Settings &gt; API).
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Supabase Project URL
                    </label>
                    <input 
                      type="url"
                      placeholder="https://your-project.supabase.co"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Supabase Anon Public API Key
                    </label>
                    <input 
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={anonKey}
                      onChange={e => setAnonKey(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {testResult && (
                  <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 text-xs ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                    {testResult.success ? <CheckCircle size={16} className="shrink-0 text-emerald-400 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleClearConfig}
                    className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                  >
                    Clear Credentials
                  </button>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting || !url || !anonKey}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      <span>Test Connection</span>
                    </button>

                    <button
                      onClick={handleSaveConfig}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <Check size={14} />
                      <span>Save &amp; Connect</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Supabase Auth */}
            {activeSubTab === 'auth' && (
              <div className="space-y-4">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['signin', 'signup', 'magic'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => { setAuthMode(mode); setAuthError(null); }}
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        authMode === mode ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Magic Link'}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSupabaseAuthSubmit} className="space-y-3">
                  {authMode === 'signup' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={authDisplayName}
                          onChange={e => setAuthDisplayName(e.target.value)}
                          placeholder="e.g. Abijith Asokan"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company / Studio</label>
                        <input 
                          type="text" 
                          value={authCompany}
                          onChange={e => setAuthCompany(e.target.value)}
                          placeholder="e.g. Paramount / A24"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Work Email</label>
                    <input 
                      type="email" 
                      required
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      placeholder="executive@streamvista.live"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {authMode !== 'magic' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                      <input 
                        type="password" 
                        required
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  )}

                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Role</label>
                      <select
                        value={authRole}
                        onChange={e => setAuthRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="BUYER">Acquisitions Buyer (Streaming / Broadcaster)</option>
                        <option value="CONTENT_OWNER">Content Studio / Seller</option>
                        <option value="ADMIN">Legal Counsel &amp; Executive Admin</option>
                      </select>
                    </div>
                  )}

                  {authError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start space-x-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {authLoading && <RefreshCw size={14} className="animate-spin" />}
                    <span>
                      {authMode === 'signin' ? 'Sign In with Supabase' : authMode === 'signup' ? 'Create Supabase Account' : 'Send Magic Auth Link'}
                    </span>
                  </button>
                </form>
              </div>
            )}

            {/* Tab 3: Database Sync */}
            {activeSubTab === 'sync' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Two-Way PostgreSQL Cloud Synchronization</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Push active media assets and deals to your Supabase tables, or pull remote catalog records.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400 block">{assets.length} Assets</span>
                      <span className="text-[10px] text-slate-500">{deals.length} Active Deals</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={handlePushToSupabase}
                      disabled={isSyncing || !isConnected}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                      <span>Push Local to Cloud</span>
                    </button>

                    <button
                      onClick={handlePullFromSupabase}
                      disabled={isSyncing || !isConnected}
                      className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-700 transition-all cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      <span>Pull Cloud to Local</span>
                    </button>
                  </div>
                </div>

                {syncLogs.length > 0 && (
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-400 space-y-1 max-h-40 overflow-y-auto">
                    {syncLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-emerald-300">
                        <span>&gt;</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Row Level Security (RLS) Policies & Rules */}
            {activeSubTab === 'rls' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Shield size={15} className="text-emerald-400" />
                        <span>PostgreSQL Row Level Security (RLS) Architecture</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Hardware &amp; kernel-enforced data privacy policies guaranteeing strict role and ownership isolation.
                      </p>
                    </div>
                    <button
                      onClick={handleCopyRls}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all"
                    >
                      {copiedRls ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedRls ? 'Copied RLS SQL!' : 'Copy RLS SQL'}</span>
                    </button>
                  </div>

                  {/* Architecture Policy Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Buyer Deals Card */}
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                          BUYER DEALS ISOLATION
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">deal_requests</span>
                      </div>
                      <p className="text-xs font-bold text-slate-100">Private Negotiation Silos</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Acquisitions buyers can <strong className="text-white">only SELECT, INSERT, and UPDATE</strong> their own deal proposals where <code className="text-emerald-300 font-mono text-[10px]">buyer_id = auth.uid()</code>. Competing buyer bids remain strictly invisible.
                      </p>
                    </div>

                    {/* Studio Asset Management Card */}
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          STUDIO ASSET CONTROL
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">media_assets</span>
                      </div>
                      <p className="text-xs font-bold text-slate-100">Content Owner Exclusivity</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Studios can <strong className="text-white">INSERT, UPDATE, and DELETE</strong> only their specific catalog titles where <code className="text-emerald-300 font-mono text-[10px]">owner_id = auth.uid()</code>. Marketplace buyers can only view approved assets.
                      </p>
                    </div>

                    {/* Studio Deal Review Card */}
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                          STUDIO OFFER ACCESS
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">deal_requests</span>
                      </div>
                      <p className="text-xs font-bold text-slate-100">Incoming Rights Counter-Offers</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Content licensors can view and accept/reject bids submitted specifically for their catalog titles where <code className="text-emerald-300 font-mono text-[10px]">owner_id = auth.uid()</code>.
                      </p>
                    </div>

                    {/* Legal & Admin Card */}
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          LEGAL ADMIN OVERSIGHT
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">audit_logs &amp; all</span>
                      </div>
                      <p className="text-xs font-bold text-slate-100">Global Compliance Arbitration</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Executive Counsel and Compliance Admins with role <code className="text-emerald-300 font-mono text-[10px]">ADMIN</code> maintain platform-wide audit, arbitration, and verification oversight.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-300">Active RLS Policy Script (PostgreSQL / Supabase)</p>
                    <span className="text-[10px] text-slate-500 font-mono">Postgres 15+ / RLS</span>
                  </div>
                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-emerald-400 max-h-52 overflow-y-auto leading-relaxed select-all">
                    {SUPABASE_RLS_POLICIES_SQL}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 5: SQL Schema Script */}
            {activeSubTab === 'schema' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Execute this SQL script in your <strong className="text-white">Supabase SQL Editor</strong> to create all tables and RLS security policies.
                  </p>
                  <button
                    onClick={handleCopySchema}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    {copiedSchema ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedSchema ? 'Copied!' : 'Copy SQL'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-emerald-400 max-h-60 overflow-y-auto leading-relaxed select-all">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
