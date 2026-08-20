import React, { useState } from 'react';
import { 
  FileText, CheckCircle2, XCircle, Clock, Building2, Mail, 
  ShieldCheck, RefreshCw, Layers, DollarSign, Download, ArrowRight,
  Sparkles, Check, Database, Users, Video, CreditCard, Key, Eye, Search, Table
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser, MediaAsset, RightsCatalogueEntry, DealRequest, Contract, PrivateScreener, AuditLog, UserRole } from '../types';
import { GoogleWorkspaceHub } from './GoogleWorkspaceHub';
import { GmailDashboard } from './GmailDashboard';
import { AuditLogView } from './AuditLogView';
import { ProductionDatabaseViewer } from './ProductionDatabaseViewer';
import { 
  REAL_USERS, REAL_FILMS, REAL_FILM_BUYER_MAPPINGS, 
  REAL_RAZORPAY_PAYMENTS, REAL_VIDEO_UPLOADS, REAL_LOGIN_TOKENS, REAL_VIEW_HISTORY 
} from '../data';

interface ManagePortalProps {
  user: AppUser | null;
  activeRole: UserRole;
  assets: MediaAsset[];
  rights?: RightsCatalogueEntry[];
  deals: DealRequest[];
  contracts: Contract[];
  screeners?: PrivateScreener[];
  auditLogs: AuditLog[];
  isAuditLoading: boolean;
  isSupabaseActive: boolean;
  workspaceToken?: string | null;
  composeTemplate: { to: string; subject: string; body: string } | null;
  onReviewOffer: (dealId: string, approve: boolean) => void;
  onSignContract: (contractId: string) => void;
  onOpenSupabaseModal: () => void;
  onRefreshAudit?: () => void;
  onClearComposeTemplate?: () => void;
}

export const ManagePortal: React.FC<ManagePortalProps> = ({
  user,
  activeRole,
  assets,
  rights = [],
  deals,
  contracts,
  screeners = [],
  auditLogs,
  isAuditLoading,
  isSupabaseActive,
  workspaceToken = null,
  composeTemplate,
  onReviewOffer,
  onSignContract,
  onOpenSupabaseModal,
  onRefreshAudit = () => {},
  onClearComposeTemplate = () => {}
}) => {
  const [subSection, setSubSection] = useState<'deals' | 'contracts' | 'workspace' | 'gmail' | 'audit' | 'database'>('deals');
  const [activeDbTable, setActiveDbTable] = useState<'users' | 'films' | 'mappings' | 'payments' | 'uploads' | 'tokens' | 'views'>('films');
  const [dbSearch, setDbSearch] = useState('');

  const pendingDeals = deals.filter(d => d.status === 'REQUESTED');
  const getAssetTitle = (id: string) => assets.find(a => a.id === id)?.title || 'Film Asset';


  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600">Door 3</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Studio Management &amp; Operations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage incoming licensing offers, sign contracts, and coordinate via Google Workspace.
          </p>
        </div>

        <button
          onClick={onOpenSupabaseModal}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <span className={`w-2 h-2 rounded-full ${isSupabaseActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span>Supabase Sync</span>
          <Database size={13} className="text-slate-500" />
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-2">
        <button
          onClick={() => setSubSection('deals')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
            subSection === 'deals' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign size={14} />
          <span>Licensing Offers</span>
          {pendingDeals.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
              {pendingDeals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubSection('contracts')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
            subSection === 'contracts' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText size={14} />
          <span>Contracts &amp; Legal</span>
        </button>

        <button
          onClick={() => setSubSection('workspace')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
            subSection === 'workspace' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers size={14} />
          <span>Google Workspace Hub</span>
        </button>

        <button
          onClick={() => setSubSection('gmail')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
            subSection === 'gmail' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Mail size={14} />
          <span>Gmail</span>
        </button>

        <button
          onClick={() => setSubSection('audit')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
            subSection === 'audit' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Audit Log &amp; Security</span>
        </button>

        <button
          onClick={() => setSubSection('database')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
            subSection === 'database' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60'
          }`}
        >
          <Database size={14} />
          <span>Production DB ({REAL_FILMS.length + REAL_USERS.length + REAL_FILM_BUYER_MAPPINGS.length} records)</span>
        </button>
      </div>

      {/* Sub-Section Content */}
      <AnimatePresence mode="wait">
        {subSection === 'deals' && (
          <motion.div
            key="deals-sub"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Active Licensing Negotiations ({deals.length})
              </h2>
            </div>

            {deals.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-2">
                <p className="text-sm font-bold text-slate-700">No active offers</p>
                <p className="text-xs text-slate-500">Deals proposed by buyers will appear here for studio arbitration.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deals.map((deal) => {
                  const asset = assets.find(a => a.id === deal.assetId);
                  return (
                    <div
                      key={deal.id}
                      className="p-5 bg-white border border-slate-200 rounded-3xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="w-12 h-16 rounded-xl bg-slate-900 overflow-hidden shrink-0">
                          {asset?.thumbnailUrl && (
                            <img src={asset.thumbnailUrl} alt={asset.title} className="w-full h-full object-cover" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-bold text-slate-900 truncate">{getAssetTitle(deal.assetId)}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                              deal.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              deal.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {deal.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500">
                            Offer: <span className="font-bold text-slate-900 font-mono">${deal.proposedPrice?.toLocaleString()} USD</span> &bull; Submitted {new Date(deal.createdAt).toLocaleDateString()}
                          </p>

                          {deal.message && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                              "{deal.message}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Arbitration Actions */}
                      {deal.status === 'REQUESTED' && (
                        <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
                          <button
                            onClick={() => onReviewOffer(deal.id, false)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => onReviewOffer(deal.id, true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center space-x-1"
                          >
                            <Check size={13} />
                            <span>Accept Offer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {subSection === 'contracts' && (
          <motion.div
            key="contracts-sub"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Legal Agreements &amp; Signatures ({contracts.length})
              </h2>
            </div>

            <div className="space-y-3">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="p-5 bg-white border border-slate-200 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{getAssetTitle(contract.assetId)} &mdash; Distribution License</h3>
                      <p className="text-xs text-slate-500">Contract ID: {contract.id} &bull; Generated {new Date(contract.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-full ${
                      contract.status === 'SIGNED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {contract.status}
                    </span>

                    {contract.status === 'PENDING' && (
                      <button
                        onClick={() => onSignContract(contract.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        e-Sign License
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subSection === 'workspace' && (
          <motion.div
            key="workspace-sub"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <GoogleWorkspaceHub 
              user={user}
              activeRole={activeRole}
              assets={assets}
              rights={rights}
              deals={deals}
              contracts={contracts}
              screeners={screeners}
            />
          </motion.div>
        )}

        {subSection === 'gmail' && (
          <motion.div
            key="gmail-sub"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <GmailDashboard 
              user={user}
              token={workspaceToken}
              onLogout={() => {}}
              composeTemplate={composeTemplate}
              clearTemplate={onClearComposeTemplate}
            />
          </motion.div>
        )}

        {subSection === 'audit' && (
          <motion.div
            key="audit-sub"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AuditLogView 
              logs={auditLogs}
              isLoading={isAuditLoading}
              onRefresh={onRefreshAudit}
              currentUserRole={activeRole}
            />
          </motion.div>
        )}

        {subSection === 'database' && (
          <motion.div
            key="database-sub"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ProductionDatabaseViewer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
