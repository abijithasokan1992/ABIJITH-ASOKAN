/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, Film, Handshake, ShieldAlert, CheckCircle, XCircle, FileText, Database, Radio, UserCheck, RefreshCw, LogOut, ChevronRight, Terminal, HardDrive, Edit2, ArrowLeftRight, Link, Truck, Trash2, Filter, Loader2, Calendar, Plus, Shield, Copy } from 'lucide-react';
import { Film as FilmType, BridgeRegistration, NegotiatingDeal, AuditLog, VaultAsset, DemoInvitation, LeadRequest } from '../types';
import OracleInfraHub from './OracleInfraHub';

interface AdminDashboardProps {
  films: FilmType[];
  registrations: BridgeRegistration[];
  deals: NegotiatingDeal[];
  onApproveRegistration: (id: string) => void;
  onRejectRegistration: (id: string) => void;
  onApproveFilm: (id: string, notes?: string) => void;
  onRejectFilm: (id: string, notes?: string) => void;
  logs: AuditLog[];
  onAddLog: (action: string, details: string) => void;
  onSignOut: () => void;
  vaultAssets: VaultAsset[];
  onDeleteVaultAsset: (id: string) => void;
  onUpdateVaultAsset: (id: string, updated: Partial<VaultAsset>) => void;

  // Demo features props
  currentDomain: 'PRODUCTION' | 'DEMO';
  demoInvitations: DemoInvitation[];
  leadRequests: LeadRequest[];
  demoAccounts: any[];
  onCreateDemoInvitation: (invite: Omit<DemoInvitation, 'id' | 'createdAt' | 'currentUsers'>) => void;
  onExpireInvitation: (id: string) => void;
  onDisableInvitation: (id: string) => void;
  onCreateDemoAccount: (account: any) => void;
  onResetDemoEnvironment: () => void;
  onConvertLead: (leadId: string, inviteCode: string) => void;
  onDeleteLead: (leadId: string) => void;
}

export default function AdminDashboard({
  films,
  registrations,
  deals,
  onApproveRegistration,
  onRejectRegistration,
  onApproveFilm,
  onRejectFilm,
  logs,
  onAddLog,
  onSignOut,
  vaultAssets,
  onDeleteVaultAsset,
  onUpdateVaultAsset,
  
  currentDomain,
  demoInvitations = [],
  leadRequests = [],
  demoAccounts = [],
  onCreateDemoInvitation,
  onExpireInvitation,
  onDisableInvitation,
  onCreateDemoAccount,
  onResetDemoEnvironment,
  onConvertLead,
  onDeleteLead
}: AdminDashboardProps) {
  const [activeTab, setActiveTab ] = useState<'OVERVIEW' | 'USERS' | 'FILMS' | 'DEALS' | 'INFRA' | 'VAULT' | 'DEMOCENTER'>('OVERVIEW');
  const [selectedFilmReview, setSelectedFilmReview] = useState<FilmType | null>(null);
  const [reviewNote, setReviewNote] = useState('');


  // Interactive Vault Desk States
  const [vaultFilterType, setVaultFilterType] = useState<string>('all');
  const [vaultSearchQuery, setVaultSearchQuery] = useState<string>('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');

  // Edit / Rename Staging
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAssetName, setEditingAssetName] = useState<string>('');
  const [editingAssetType, setEditingAssetType] = useState<'video' | 'audio' | 'image' | 'doc' | 'subtitle'>('doc');

  // Transfer Ownership Staging
  const [transferringAssetId, setTransferringAssetId] = useState<string | null>(null);
  const [transferTargetEmail, setTransferTargetEmail] = useState<string>('');

  // C2C Ingestion Mapping Staging
  const [mappingAssetId, setMappingAssetId] = useState<string | null>(null);
  const [mappingFilmId, setMappingFilmId] = useState<string>('');

  // Deliver Packaging Staging
  const [deliveringAssetId, setDeliveringAssetId] = useState<string | null>(null);
  const [deliveryTargetCompany, setDeliveryTargetCompany] = useState<string>('');
  const [expandedAdminAssetId, setExpandedAdminAssetId] = useState<string | null>(null);

  // Local helper stats
  const pendingRegistrations = registrations.filter(r => r.status === 'PENDING').length;
  const pendingFilms = films.filter(f => f.status === 'PENDING').length;
  const activeNegotiations = deals.filter(d => d.status !== 'EXECUTED' && d.status !== 'REJECTED').length;
  const signedContracts = deals.filter(d => d.status === 'EXECUTED').length;

  // Custom visualizer status simple-mappings and calculations
  const getSimpleStatus = (detailedStatus?: string): string => {
    if (!detailedStatus) return 'Ready';
    switch (detailedStatus) {
      case 'QUEUED':
      case 'UPLOADING':
      case 'UPLOADED':
        return 'Uploading';
      case 'VERIFYING':
      case 'OBJECT_URL_CREATED':
      case 'DATABASE_SAVING':
      case 'DATABASE_SAVED':
      case 'PROCESSING':
      case 'TRANSCODING':
      case 'THUMBNAIL_GENERATING':
      case 'PREVIEW_GENERATING':
      case 'INDEXING':
        return 'Processing';
      case 'READY':
        return 'Ready';
      case 'FAILED':
        return 'Failed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'Ready';
    }
  };

  const getTimelineCheckpoints = (asset: VaultAsset) => {
    const status = asset.detailedStatus || 'READY';
    const isVideo = asset.type === 'video';

    const statesOrder = [
      'QUEUED',
      'UPLOADING',
      'UPLOADED',
      'VERIFYING',
      'OBJECT_URL_CREATED',
      'DATABASE_SAVING',
      'DATABASE_SAVED',
      'PROCESSING',
      'TRANSCODING',
      'THUMBNAIL_GENERATING',
      'PREVIEW_GENERATING',
      'INDEXING',
      'READY'
    ];

    const getIndex = (st: string) => statesOrder.indexOf(st);
    const currentIdx = getIndex(status);

    const isDone = (targetStep: string) => {
      if (status === 'READY') return true;
      if (status === 'FAILED' || status === 'CANCELLED') return false;

      switch (targetStep) {
        case 'Uploading':
          return currentIdx > getIndex('UPLOADING');
        case 'Cloud Storage':
          return currentIdx >= getIndex('UPLOADED');
        case 'Database':
          return currentIdx >= getIndex('DATABASE_SAVED');
        case 'Processing':
          return currentIdx > getIndex('PREVIEW_GENERATING');
        case 'Streaming Assets':
          return currentIdx > getIndex('INDEXING');
        case 'Ready':
          return (status as string) === 'READY';
        default:
          return false;
      }
    };

    const isActive = (targetStep: string) => {
      if (status === 'FAILED' || status === 'CANCELLED') return false;

      switch (targetStep) {
        case 'Uploading':
          return status === 'QUEUED' || status === 'UPLOADING';
        case 'Cloud Storage':
          return status === 'UPLOADED';
        case 'Database':
          return status === 'VERIFYING' || status === 'OBJECT_URL_CREATED' || status === 'DATABASE_SAVING' || status === 'DATABASE_SAVED';
        case 'Processing':
          return status === 'PROCESSING' || status === 'TRANSCODING' || status === 'THUMBNAIL_GENERATING' || status === 'PREVIEW_GENERATING';
        case 'Streaming Assets':
          return status === 'INDEXING';
        case 'Ready':
          return false;
        default:
          return false;
      }
    };

    return [
      { key: 'Uploading', label: 'Uploading' },
      { key: 'Cloud Storage', label: 'Cloud Storage' },
      { key: 'Database', label: 'Database Sync' },
      { key: 'Processing', label: isVideo ? 'Core Processing' : 'Compliance Scan' },
      { key: 'Streaming Assets', label: isVideo ? 'Streaming Assets' : 'System Index' },
      { key: 'Ready', label: 'Ready' }
    ].map(item => {
      const done = isDone(item.key);
      const active = isActive(item.key);
      return {
        label: item.label,
        status: done ? 'COMPLETED' : active ? 'ACTIVE' : 'PENDING'
      };
    });
  };

  const handleAdminReprocessAsset = (id: string, name: string) => {
    onUpdateVaultAsset(id, {
      status: 'QUEUED',
      detailedStatus: 'QUEUED',
      progress: 0,
      currentStep: 'Waiting for upload to start',
      statusMessage: 'Queue position #1 - starting soon',
      processingHistory: [
        { status: 'QUEUED', timestamp: new Date().toISOString() }
      ]
    });
    onAddLog('REPROCESS_TRIGGER', `Admin triggered manual background processing pipeline simulation for: "${name}"`);
    setExpandedAdminAssetId(id);
  };

  const handleReviewApprove = (id: string) => {
    onApproveFilm(id, reviewNote || 'All asset requirements satisfied. Metadata synchronized to Oracle index catalogs.');
    setSelectedFilmReview(null);
    setReviewNote('');
  };

  const handleReviewReject = (id: string) => {
    onRejectFilm(id, reviewNote || 'Incomplete technical parameters. Check video chunk profile layout or music cue sheet.');
    setSelectedFilmReview(null);
    setReviewNote('');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans" id="admin-workspace">
      {/* Internal Navigation Bar */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-zinc-900 text-white p-1.5 rounded-lg flex items-center justify-center shadow-xs">
              <Film className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-zinc-900">StreamVista</span>
              <span className="font-semibold text-[10px] text-zinc-500 ml-2 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">Admin</span>
            </div>
          </div>

          <nav className="flex items-center gap-5 text-xs font-semibold font-mono">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`py-1.5 px-2.5 rounded-md transition-all ${activeTab === 'OVERVIEW' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
              id="admin-nav-overview"
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('USERS')}
              className={`py-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'USERS' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
              id="admin-nav-users"
            >
              Partners
              {pendingRegistrations > 0 && <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />}
            </button>
            <button
              onClick={() => setActiveTab('FILMS')}
              className={`py-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'FILMS' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
              id="admin-nav-films"
            >
              Film Catalog
              {pendingFilms > 0 && <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />}
            </button>
            <button
              onClick={() => setActiveTab('DEALS')}
              className={`py-1.5 px-2.5 rounded-md transition-all ${activeTab === 'DEALS' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
              id="admin-nav-deals"
            >
              Licensing Deals
            </button>
            <button
              onClick={() => setActiveTab('INFRA')}
              className={`py-1.5 px-2.5 rounded-md transition-all ${activeTab === 'INFRA' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
              id="admin-nav-infra"
            >
              Diagnostics Console
            </button>
            <button
              onClick={() => setActiveTab('VAULT')}
              className={`py-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'VAULT' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
              id="admin-nav-vault"
            >
              <HardDrive className="h-3.5 w-3.5" />
              Media Vault
            </button>
          </nav>

          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-zinc-600 hover:text-red-600 text-xs font-mono font-bold hover:bg-zinc-100 px-3 py-1.5 rounded-lg transition-colors border border-transparent"
            id="admin-btn-signout"
          >
            <LogOut className="h-3.5 w-3.5" />
            SIGN OUT
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 animate-fade-in" id="admin-overview-view">
            {/* Header section */}
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-sans">Admin Console</h2>
              <p className="text-xs text-zinc-500 font-sans mt-0.5 font-sans">Manage partner onboarding, film submissions, contracts, and cloud storage.</p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400">Bridge Registrations</span>
                  <p className="text-3xl font-bold text-zinc-900 mt-1 font-sans">{registrations.length}</p>
                  <p className="text-[10px] text-amber-600 font-semibold mt-1 font-mono">{pendingRegistrations} Pending review</p>
                </div>
                <div className="bg-purple-50 text-purple-700 p-3 rounded-xl border border-purple-100">
                  <Users className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400">Sovereign Catalogs</span>
                  <p className="text-3xl font-bold text-zinc-900 mt-1 font-sans">{films.length}</p>
                  <p className="text-[10px] text-amber-600 font-semibold mt-1 font-mono">{pendingFilms} Awaiting approval</p>
                </div>
                <div className="bg-blue-50 text-blue-700 p-3 rounded-xl border border-blue-100">
                  <Film className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400">Total B2B Deals</span>
                  <p className="text-3xl font-bold text-zinc-900 mt-1 font-sans">{deals.length}</p>
                  <p className="text-[10px] text-indigo-600 font-semibold mt-1 font-mono">{activeNegotiations} In progress</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl border border-indigo-100">
                  <Handshake className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400">Executed Contracts</span>
                  <p className="text-3xl font-bold text-zinc-900 mt-1 font-sans">{signedContracts}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1 font-mono">100% Fully Verified Ledger</p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Core Action Boards Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left col: Pending Approvals */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                  <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-purple-700" />
                    Pending Partner Registrations ({pendingRegistrations})
                  </h3>
                  <button onClick={() => setActiveTab('USERS')} className="text-xs text-purple-700 hover:underline font-mono">Manage All</button>
                </div>

                {pendingRegistrations === 0 ? (
                  <div className="text-center py-10 text-zinc-400 space-y-2">
                    <CheckCircle className="h-8 w-8 text-zinc-300 mx-auto" />
                    <p className="text-xs font-sans">No pending bridge applications in this block partition.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registrations.filter(r => r.status === 'PENDING').map(reg => (
                      <div key={reg.id} className="p-3 bg-zinc-50 border border-zinc-150 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-950 font-sans">{reg.companyName}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                              reg.role === 'CREATOR' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {reg.role}
                            </span>
                          </div>
                          <p className="text-zinc-500 font-mono mt-0.5">{reg.email}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onApproveRegistration(reg.id)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white font-mono px-3 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1"
                          >
                            APPROVE
                          </button>
                          <button
                            onClick={() => onRejectRegistration(reg.id)}
                            className="bg-white hover:bg-zinc-50 text-red-600 border border-zinc-200 font-mono px-3 py-1.5 rounded text-[11px] font-semibold"
                          >
                            REJECT
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side: Quick Action Catalog */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 pb-3 border-b border-zinc-100 flex items-center gap-1.5">
                    <Film className="h-4 w-4 text-orange-600" />
                    Catalog Action List ({pendingFilms})
                  </h3>

                  {pendingFilms === 0 ? (
                    <div className="text-center py-10 text-zinc-400 space-y-2">
                      <CheckCircle className="h-8 w-8 text-zinc-300 mx-auto" />
                      <p className="text-xs font-sans">All film submissions resolved.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-4">
                      {films.filter(f => f.status === 'PENDING').map(film => (
                        <div key={film.id} className="p-2.5 bg-zinc-50 border border-zinc-100 rounded-lg text-xs space-y-2" id={`film-quick-review-${film.id}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-zinc-900">{film.title}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">{film.genre} | {film.duration}</p>
                            </div>
                            <span className="font-mono text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-bold uppercase">PENDING</span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFilmReview(film);
                              setActiveTab('FILMS');
                            }}
                            className="w-full text-center bg-zinc-900 text-white text-[11px] py-1 rounded hover:bg-zinc-800 font-semibold font-mono"
                          >
                            LAUNCH ASSESSMENT PANEL
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-100 text-center">
                  <p className="text-[10px] h-3 select-all text-zinc-400 font-mono">STAGING SCHEMA ISOLATED MODE</p>
                </div>
              </div>
            </div>

            {/* Platform Status */}
            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-800 font-sans">StreamVista Platform Services are active and healthy</h4>
                  <p className="text-[10px] text-zinc-500 font-sans">All secure streaming services and marketplace tools are online.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('INFRA')}
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs px-3.5 py-1.5 rounded-lg font-medium font-sans"
              >
                View Diagnostics
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: USERS ADMINISTRATION */}
        {activeTab === 'USERS' && (
          <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 animate-fade-in" id="admin-users-view">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Partner Registrations</h2>
              <p className="text-xs text-zinc-500">Approve or reject onboarding applications from creators and buyers.</p>
            </div>

            <div className="space-y-4">
              {registrations.length === 0 ? (
                <p className="text-xs text-center py-10 text-zinc-400">Approved partners will be listed here.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-400 font-mono uppercase bg-zinc-50 text-[10px]">
                        <th className="p-3">Dossier ID</th>
                        <th className="p-3">Company / contact</th>
                        <th className="p-3">framework</th>
                        <th className="p-3">Email Staging</th>
                        <th className="p-3">Scale</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {registrations.map(reg => (
                        <tr key={reg.id} className="hover:bg-zinc-50">
                          <td className="p-3 font-mono text-[10px] text-zinc-450">{reg.id}</td>
                          <td className="p-3">
                            <div className="font-semibold text-zinc-900">{reg.companyName}</div>
                            <div className="text-zinc-500 text-[11px]">{reg.contactName}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                              reg.role === 'CREATOR' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {reg.role}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-zinc-650">{reg.email}</td>
                          <td className="p-3 font-sans text-zinc-600">{reg.catalogSize}</td>
                          <td className="p-3">
                            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                              reg.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                              reg.status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {reg.status === 'PENDING' ? (
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => onApproveRegistration(reg.id)}
                                  className="bg-zinc-900 text-white font-mono font-semibold px-2.5 py-1 rounded hover:bg-zinc-800"
                                >
                                  APPROVE
                                </button>
                                <button
                                  onClick={() => onRejectRegistration(reg.id)}
                                  className="bg-white text-red-650 border border-zinc-200 font-mono font-semibold px-2.5 py-1 rounded hover:bg-zinc-50"
                                >
                                  REJECT
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-mono">RESOLVED LOG</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FILM CATALOG */}
        {activeTab === 'FILMS' && (
          <div className="space-y-6 animate-fade-in" id="admin-films-view">
            
            {selectedFilmReview && (
              <div className="bg-zinc-950 text-white rounded-2xl p-6 border border-zinc-850 space-y-6" id="assessment-panel">
                <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-orange-400">QUALITATIVE ASSESSMENT DESK</span>
                    <h3 className="text-xl font-bold mt-1 text-white font-sans">{selectedFilmReview.title}</h3>
                  </div>
                  <button
                    onClick={() => { setSelectedFilmReview(null); setReviewNote(''); }}
                    className="text-zinc-400 hover:text-white font-mono text-xs"
                  >
                    CLOSE ASSESSMENT
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4">
                    <div>
                      <p className="text-zinc-500 uppercase font-mono text-[10px]">Synopsis</p>
                      <p className="text-zinc-300 mt-1 text-sm leading-relaxed">{selectedFilmReview.synopsis}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t border-zinc-850 pt-3">
                      <div>
                        <p className="text-zinc-500 font-mono text-[9px] uppercase">GENRE</p>
                        <p className="text-zinc-200 font-sans text-xs font-semibold">{selectedFilmReview.genre}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 font-mono text-[9px] uppercase">YEAR</p>
                        <p className="text-zinc-200 font-sans text-xs font-semibold">{selectedFilmReview.year}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 font-mono text-[9px] uppercase">DURATION</p>
                        <p className="text-zinc-200 font-sans text-xs font-semibold">{selectedFilmReview.duration}</p>
                      </div>
                    </div>

                    <div className="border-t border-zinc-850 pt-3">
                      <p className="text-zinc-500 font-mono text-[9px] uppercase mb-1">Attached Secured Assets on Object Storage</p>
                      <div className="bg-zinc-900 rounded p-3 divide-y divide-zinc-850">
                        {selectedFilmReview.assets.map((asset, i) => (
                          <div key={i} className="flex justify-between py-1 text-[10px] font-mono">
                            <span className="text-zinc-300 truncate max-w-xs">{asset.name}</span>
                            <span className="text-zinc-500">{asset.size}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                    <div>
                      <h4 className="font-mono text-zinc-400 text-xs pb-2 border-b border-zinc-800">AUTOMATIC QUALITY CONTROL RECONCILIATION</h4>
                      
                      <div className="space-y-2 mt-3 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">1. Video Master Hash Verification:</span>
                          <span className="text-emerald-500 font-bold">MATCHED [AES256]</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">2. Chain of Subtitles Layout Compliance:</span>
                          <span className="text-emerald-500 font-bold">VERIFIED [UTF-8]</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">3. Music cue & clearance documents attached:</span>
                          <span className="text-emerald-500 font-bold">SUCCESS [PDF]</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">4. Safe Area Boundary Validation:</span>
                          <span className="text-emerald-500 font-bold">PASS [16:9 REC709]</span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5">
                        <label className="text-zinc-400 text-[10px] font-mono uppercase">Review notes & Sovereign stamp parameters</label>
                        <textarea
                          placeholder="Provide reasons for approval or specified correction recommendations..."
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          className="w-full text-xs font-mono p-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-300 h-20 outline-none focus:border-orange-500 resize-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <button
                        onClick={() => handleReviewApprove(selectedFilmReview.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-semibold py-2 rounded text-xs text-center"
                      >
                        STAMP & APPROVE CATALOG
                      </button>
                      <button
                        onClick={() => handleReviewReject(selectedFilmReview.id)}
                        className="bg-red-650 hover:bg-red-600 text-white font-mono font-semibold py-2 rounded text-xs text-center"
                      >
                        REJECT WITH AUDIT LOG
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Film Catalog Oversight</h2>
                <p className="text-xs text-zinc-500">Review submissions, check details, and update license parameters.</p>
              </div>

              {films.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50 border border-zinc-150 rounded-xl space-y-1">
                  <p className="font-semibold text-zinc-800 text-sm">No content uploaded yet.</p>
                  <p className="text-xs text-zinc-500">Your uploaded titles will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-450 font-mono uppercase bg-zinc-50 text-[10px]">
                        <th className="p-3">Film ID</th>
                        <th className="p-3">Cinematic Title</th>
                        <th className="p-3">Genre / Year</th>
                        <th className="p-3">Submitted By</th>
                        <th className="p-3">Oracle storage bucket</th>
                        <th className="p-3">Audit Stamp</th>
                        <th className="p-3 text-right font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {films.map(film => (
                        <tr key={film.id} className="hover:bg-zinc-50">
                          <td className="p-3 font-mono text-[10px] text-zinc-500">{film.id}</td>
                          <td className="p-3 font-semibold text-zinc-900">{film.title}</td>
                          <td className="p-3 text-zinc-600 font-sans">{film.genre} ({film.year})</td>
                          <td className="p-3 text-zinc-650 font-mono text-[11px]">{film.uploadedBy}</td>
                          <td className="p-3 font-mono text-[10px] text-zinc-550 select-all truncate max-w-[180px]">{film.oracleBucket}</td>
                          <td className="p-3">
                            <span className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase ${
                              film.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-850 border-emerald-100' :
                              film.status === 'REJECTED' ? 'bg-red-50 text-red-850 border-red-105' : 'bg-amber-50 text-amber-850 border-amber-105'
                            }`}>
                              {film.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {film.status === 'PENDING' ? (
                              <button
                                onClick={() => setSelectedFilmReview(film)}
                                className="bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-[11px] px-2.5 py-1 rounded font-semibold"
                              >
                                ASSESS
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-mono">ARCHIVED RECORD</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: B2B DEAL SUPERVISION */}
        {activeTab === 'DEALS' && (
          <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 animate-fade-in" id="admin-deals-view">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">B2B Deal Ledger</h2>
              <p className="text-xs text-zinc-500">Monitor active buyer-seller negotiations and signed contract files.</p>
            </div>

            <div className="space-y-4 text-xs">
              {deals.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-800">No licensing requests available.</p>
                  <p className="text-xs text-zinc-500">Buyer requests will appear here once received.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-400 font-mono uppercase bg-zinc-50 text-[10px]">
                        <th className="p-3">Deal Block ID</th>
                        <th className="p-3">Film Title</th>
                        <th className="p-3">Distributor (Buyer)</th>
                        <th className="p-3">Licensed Rights & Region</th>
                        <th className="p-3">Price (USD)</th>
                        <th className="p-3">Ecosystem Status</th>
                        <th className="p-3">Sovereign Contract ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {deals.map(deal => (
                        <tr key={deal.id} className="hover:bg-zinc-50">
                          <td className="p-3 font-mono text-[10px] text-zinc-450">{deal.id}</td>
                          <td className="p-3 font-semibold text-zinc-950">{deal.filmTitle}</td>
                          <td className="p-3">
                            <div className="font-medium text-zinc-900">{deal.buyerCompany}</div>
                            <div className="text-[11px] font-mono text-zinc-500">{deal.buyerEmail}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-zinc-800">{deal.rightsType}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">{deal.territories.join(', ')} ({deal.durationYears} Years)</div>
                          </td>
                          <td className="p-3 font-bold font-mono text-zinc-900">${deal.price.toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              deal.status === 'EXECUTED' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                              deal.status === 'ACCEPTED' ? 'bg-indigo-50 text-indigo-800 border-indigo-150' :
                              deal.status === 'REJECTED' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-amber-50 text-amber-800 border-amber-100'
                            }`}>
                              {deal.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-zinc-500">
                            {deal.oracleContractId ? (
                              <span className="select-all text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">{deal.oracleContractId}</span>
                            ) : (
                              <span className="italic text-zinc-400">PENDING_EXECUTION</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ORACLE Hub */}
        {activeTab === 'INFRA' && (
          <div className="animate-fade-in" id="admin-infra-view">
            <OracleInfraHub logs={logs} onAddLog={onAddLog} />
          </div>
        )}

        {/* TAB 6: VAULT DESK PANEL */}
        {activeTab === 'VAULT' && (
          <div className="space-y-6 animate-fade-in" id="admin-vault-view">
            
            {/* Header statistics block */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                <span className="p-2.5 bg-purple-50 text-purple-700 rounded-lg shrink-0 border border-purple-100">
                  <HardDrive className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">Cross-Tenant Space</div>
                  {(() => {
                    const bytes = vaultAssets.reduce((sum, a) => sum + a.sizeBytes, 0);
                    const gb = bytes / (1024 * 1024 * 1024);
                    return <div className="text-lg font-extrabold text-zinc-900">{gb.toFixed(1)} GB</div>;
                  })()}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                <span className="p-2.5 bg-blue-50 text-blue-700 rounded-lg shrink-0 border border-blue-100">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">Total Registered Items</div>
                  <div className="text-lg font-extrabold text-zinc-900">{vaultAssets.length} Objects</div>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0 border border-emerald-100">
                  <Link className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">Mapped Ingestions</div>
                  <div className="text-lg font-extrabold text-zinc-900">{vaultAssets.filter(a => a.mappedFilmId).length} Assets</div>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
                <span className="p-2.5 bg-orange-50 text-orange-700 rounded-lg shrink-0 border border-orange-100">
                  <Truck className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">B2B Delivered Assets</div>
                  <div className="text-lg font-extrabold text-orange-700 font-bold">{vaultAssets.filter(a => a.deliveredTo).length} Dispatched</div>
                </div>
              </div>
            </div>

            {/* Filter and Content workspace */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3 font-sans pb-4 border-b border-zinc-150">
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm font-sans">Sovereign Vault Console</h3>
                  <p className="text-xs text-zinc-500 font-sans">
                    Transfer ownership, map film codes, and deliver secure stream packages.
                  </p>
                </div>

                {/* Filter and search utilities */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-200">
                    <Filter className="h-3.5 w-3.5 text-zinc-400" />
                    <select
                      className="bg-transparent font-semibold text-zinc-700 outline-none"
                      value={selectedOrgFilter}
                      onChange={(e) => setSelectedOrgFilter(e.target.value)}
                    >
                      <option value="all">ORG: ALL PARTNERS</option>
                      {Array.from(new Set(vaultAssets.map(a => a.uploadedBy))).map(email => (
                        <option key={email} value={email}>{email.split('@')[0].toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-200">
                    <select
                      className="bg-transparent font-semibold text-zinc-700 outline-none"
                      value={vaultFilterType}
                      onChange={(e) => setVaultFilterType(e.target.value)}
                    >
                      <option value="all">TYPE: ALL FILES</option>
                      <option value="video">VIDEO MXF/MOV</option>
                      <option value="audio">AUDIO WAV/MP3</option>
                      <option value="subtitle">SUBTITLES SRT</option>
                      <option value="image">IMAGES JPG/PNG</option>
                      <option value="doc">LEGAL DOCS PDF</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="QUERY FILENAME..."
                    className="bg-zinc-50 font-sans font-medium text-zinc-700 outline-none px-3 py-1.5 rounded-lg border border-zinc-200 w-44 focus:border-purple-600 focus:bg-white"
                    value={vaultSearchQuery}
                    onChange={(e) => setVaultSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Assets list with operation controls */}
              {(() => {
                const filtered = vaultAssets.filter(asset => {
                  const matchesSearch = asset.name.toLowerCase().includes(vaultSearchQuery.toLowerCase()) || 
                                       asset.oraclePath.toLowerCase().includes(vaultSearchQuery.toLowerCase());
                  const matchesType = vaultFilterType === 'all' || asset.type === vaultFilterType;
                  const matchesOrg = selectedOrgFilter === 'all' || asset.uploadedBy === selectedOrgFilter;
                  return matchesSearch && matchesType && matchesOrg;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-zinc-400 text-xs font-sans">
                      <HardDrive className="h-8 w-8 text-zinc-350 mx-auto mb-2" />
                      No secure vault objects found matching filter queries.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-zinc-600 border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 font-mono font-bold text-zinc-400 border-b border-zinc-200 uppercase text-[10px]">
                            <th className="p-3">File Object (OCI Hash ID)</th>
                            <th className="p-3">Partner Tenant</th>
                            <th className="p-3">Foldering Reference</th>
                            <th className="p-3">Vault Status / Pairing</th>
                            <th className="p-3 text-right">Actions Panel</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-250 font-sans">
                           {filtered.map(asset => {
                            const isExpanded = expandedAdminAssetId === asset.id;
                            const progress = asset.progress ?? 100;
                            const simpleStatus = getSimpleStatus(asset.detailedStatus);
                            const detailedStatus = asset.detailedStatus || 'READY';
                            const checkpoints = getTimelineCheckpoints(asset);
                            const isVideo = asset.type === 'video';

                            return (
                              <React.Fragment key={asset.id}>
                                <tr className={`hover:bg-zinc-50/50 transition-colors ${isExpanded ? 'bg-zinc-50/75 border-l-2 border-indigo-600' : ''}`} id={`admin-asset-row-${asset.id}`}>
                                  <td className="p-3">
                                    <div className="flex items-start gap-2.5">
                                      <span className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                                        asset.type === 'video' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                        asset.type === 'audio' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                        asset.type === 'subtitle' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                        asset.type === 'image' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        'bg-purple-50 text-purple-600 border border-purple-100'
                                      }`}>
                                        <HardDrive className={`h-4 w-4 ${simpleStatus === 'Processing' ? 'animate-pulse text-indigo-650' : ''}`} />
                                      </span>
                                      <div>
                                        <div className="font-bold text-zinc-950 flex items-center gap-1.5 flex-wrap">
                                          {asset.name}
                                          <span className="font-mono text-[9px] bg-zinc-150 px-1.5 py-0.5 rounded text-zinc-500 font-normal">
                                            ID: {asset.id}
                                          </span>
                                          {isVideo && (
                                            <span className="bg-orange-50 text-orange-800 border border-orange-200 font-mono text-[8px] font-bold px-1 rounded uppercase">
                                              VIDEO_PRO
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-zinc-405 mt-1 font-mono truncate max-w-[280px]" title={asset.oraclePath}>
                                          {asset.sizeFormatted} • {asset.oraclePath}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="p-3">
                                    <div className="font-semibold text-zinc-850 uppercase text-[10px] tracking-wider">{asset.uploadedBy.split('@')[0]}</div>
                                    <div className="text-[10px] text-zinc-400 font-mono truncate max-w-[150px]">{asset.uploadedBy}</div>
                                  </td>

                                  <td className="p-3 font-mono text-[10px] text-zinc-500">
                                    <div className="truncate max-w-[185px]" title={asset.folderPath}>{asset.folderPath}</div>
                                    <div className="text-[9px] text-zinc-405">Created: {new Date(asset.uploadedAt).toLocaleDateString()}</div>
                                  </td>

                                  <td className="p-3">
                                    <div className="space-y-1">
                                      {/* Advanced Status Pill */}
                                      <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase border tracking-wider flex items-center gap-1 ${
                                          detailedStatus === 'READY' ? 'bg-emerald-50 text-emerald-800 border-emerald-250' :
                                          detailedStatus === 'FAILED' ? 'bg-red-50 text-red-800 border-red-200' :
                                          detailedStatus === 'QUEUED' ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse' :
                                          'bg-indigo-50 text-indigo-805 border-indigo-200 animate-pulse'
                                        }`}>
                                          <span className={`h-1 w-1 rounded-full ${
                                            detailedStatus === 'READY' ? 'bg-emerald-500' :
                                            detailedStatus === 'FAILED' ? 'bg-red-500' :
                                            detailedStatus === 'QUEUED' ? 'bg-amber-500' : 'bg-indigo-500 animate-ping'
                                          }`} />
                                          {detailedStatus} {detailedStatus !== 'READY' && `(${progress}%)`}
                                        </span>
                                      </div>

                                      {/* Pairing / Mapping Info */}
                                      <div className="text-[9px]">
                                        {asset.mappedFilmId ? (
                                          <div className="flex items-center gap-1">
                                            <span className="bg-emerald-50 text-emerald-805 border border-emerald-100 font-mono text-[8px] font-bold px-1 rounded uppercase">
                                              INGEST
                                            </span>
                                            {(() => {
                                              const matching = films.find(f => f.id === asset.mappedFilmId);
                                              return (
                                                <span className="text-[10px] text-zinc-500 font-semibold truncate max-w-[100px]" title={matching ? matching.title : asset.mappedFilmId}>
                                                  → {matching ? matching.title : asset.mappedFilmId}
                                                </span>
                                              );
                                            })()}
                                          </div>
                                        ) : asset.deliveredTo ? (
                                          <div className="flex items-center gap-1">
                                            <span className="bg-blue-50 text-blue-805 border border-blue-105 font-mono text-[8px] font-bold px-1 rounded uppercase">
                                              SHIPPED
                                            </span>
                                            <span className="text-[10px] text-blue-700 font-semibold truncate max-w-[100px]" title={asset.deliveredTo}>
                                              → {asset.deliveredTo}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="bg-amber-50 text-amber-850 border border-amber-100 font-mono text-[8px] font-bold px-1 rounded uppercase">
                                            STAGED
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1 flex-wrap max-w-[340px]">
                                      
                                      <button
                                        onClick={() => setExpandedAdminAssetId(isExpanded ? null : asset.id)}
                                        className={`font-mono text-[10px] py-1 px-2 rounded border flex items-center gap-1 font-bold transition-all ${
                                          isExpanded 
                                            ? 'bg-zinc-800 text-white border-zinc-900' 
                                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                        }`}
                                        title="View Advanced Telemetry Logs"
                                      >
                                        <Terminal className="h-3 w-3" />
                                        {isExpanded ? 'CLOSE LOG' : 'TELEM'}
                                      </button>

                                      <button
                                        onClick={() => {
                                          setEditingAssetId(asset.id);
                                          setEditingAssetName(asset.name);
                                          setEditingAssetType(asset.type);
                                          // close others
                                          setTransferringAssetId(null);
                                          setMappingAssetId(null);
                                          setDeliveringAssetId(null);
                                        }}
                                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono text-[10px] py-1 px-2 rounded border border-zinc-200 flex items-center gap-1 font-semibold hover:shadow-xs"
                                        title="Rename or edit metadata category"
                                      >
                                        <Edit2 className="h-3 w-3 text-zinc-500" />
                                        RENAME
                                      </button>

                                      <button
                                        onClick={() => {
                                          setTransferringAssetId(asset.id);
                                          setTransferTargetEmail(asset.uploadedBy);
                                          // close others
                                          setEditingAssetId(null);
                                          setMappingAssetId(null);
                                          setDeliveringAssetId(null);
                                        }}
                                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono text-[10px] py-1 px-2 rounded border border-zinc-200 flex items-center gap-1 font-semibold"
                                        title="Transfer possession other tenant context"
                                      >
                                        <ArrowLeftRight className="h-3 w-3 text-blue-500" />
                                        TRANSFER
                                      </button>

                                      <button
                                        onClick={() => {
                                          setMappingAssetId(asset.id);
                                          setMappingFilmId(asset.mappedFilmId || '');
                                          // close others
                                          setEditingAssetId(null);
                                          setTransferringAssetId(null);
                                          setDeliveringAssetId(null);
                                        }}
                                        className="bg-purple-50 hover:bg-purple-100 text-purple-800 font-mono text-[10px] py-1 px-2 rounded border border-purple-150 flex items-center gap-1 font-semibold"
                                        title="Map file metadata as catalog content ingest"
                                      >
                                        <Link className="h-3 w-3 text-purple-600" />
                                        MAP C2C
                                      </button>

                                      {!asset.deliveredTo && (
                                        <button
                                          onClick={() => {
                                            setDeliveringAssetId(asset.id);
                                            setDeliveryTargetCompany('');
                                            // close others
                                            setEditingAssetId(null);
                                            setTransferringAssetId(null);
                                            setMappingAssetId(null);
                                          }}
                                          className="bg-orange-50 hover:bg-orange-100 text-orange-850 font-mono text-[10px] py-1 px-2 rounded border border-orange-100 flex items-center gap-1 font-semibold"
                                          title="Dispatch asset package to Buyer company of signed deal"
                                        >
                                          <Truck className="h-3 w-3 text-orange-600" />
                                          DELIVER
                                        </button>
                                      )}

                                      <button
                                        onClick={() => {
                                          if (confirm(`CRITICAL SECURITY INTERFACE WARNING:\nAre you sure you want to permanently purge this asset partition: "${asset.name}"?\nThis operation deletes object records from active Autonomous table indicators.`)) {
                                            onDeleteVaultAsset(asset.id);
                                          }
                                        }}
                                        className="bg-red-50 hover:bg-red-100 text-red-600 font-mono text-[10px] p-1 rounded border border-red-150"
                                        title="Purge OOCI sector binary"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Nested Admin Telemetry Drawer Row with OCI details logs */}
                                {isExpanded && (
                                  <tr className="bg-zinc-50/70 border-b border-zinc-250">
                                    <td colSpan={5} className="p-4">
                                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left font-sans">
                                        
                                        {/* Telemetry Logger Column - Logs active transitions */}
                                        <div className="lg:col-span-8 bg-zinc-950 text-zinc-200 p-4 rounded-xl shadow-xl border border-zinc-800 font-mono text-[11px] space-y-3">
                                          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                                            <div className="flex items-center gap-2 text-indigo-400">
                                              <Terminal className="h-4 w-4 animate-pulse" />
                                              <span className="font-bold uppercase tracking-wider text-xs text-indigo-300">File Ingestion & Processing Status</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-500 font-bold">STANDARD MEDIA INGESTION</span>
                                          </div>

                                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                            <p className="text-zinc-550 italic">// Ingestion connection active...</p>
                                            <p className="text-zinc-400">Initializing connection stream for "{asset.name}"</p>
                                            
                                            {asset.processingHistory && asset.processingHistory.map((h, i) => (
                                              <p key={i} className="text-emerald-400">
                                                [{new Date(h.timestamp).toLocaleTimeString()}] Status transition: [{h.status}] - verified.
                                              </p>
                                            ))}

                                            <div className="pt-1 select-none">
                                              {detailedStatus !== 'READY' ? (
                                                <div className="text-indigo-400 animate-pulse flex items-center gap-1.5">
                                                  <span>●</span>
                                                  <span>Pipeline active: "{asset.currentStep}" - {progress}% complete. {asset.statusMessage}</span>
                                                </div>
                                              ) : (
                                                <p className="text-zinc-400">
                                                  File successfully verified. Path: {asset.oraclePath}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Mini Status Dashboard */}
                                          <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850 space-y-1.5 text-[11px]">
                                            <div className="flex justify-between">
                                              <span className="text-zinc-450 font-bold uppercase text-[9px]">Storage Location:</span>
                                              <span className="text-zinc-350">{asset.oraclePath.split('/')[2] || 'us-ashburn-1'} (Admin Locked)</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-zinc-450 font-bold uppercase text-[9px]">File Size (Raw):</span>
                                              <span className="text-zinc-350">{asset.sizeBytes.toLocaleString()} Bytes ({asset.sizeFormatted})</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-zinc-450 font-bold uppercase text-[9px]">Asset Reference ID:</span>
                                              <span className="text-zinc-350">{asset.id}-MD5-OCI-Autonomous-3982e</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Actions, Checklist, and Verification Panel */}
                                        <div className="lg:col-span-4 bg-white border border-zinc-200 p-4 rounded-xl shadow-xs space-y-4">
                                          <div>
                                            <h6 className="font-bold text-zinc-900 text-xs uppercase font-mono tracking-wider">Administrative Ingress</h6>
                                            <p className="text-[10px] text-zinc-500 mt-0.5">Control pipeline states or trigger manual re-evaluation</p>
                                          </div>

                                          {/* Step/Progress Visualizer Panel */}
                                          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2.5">
                                            <div className="flex justify-between items-center">
                                              <span className="text-[10px] font-bold text-zinc-650 font-mono uppercase">System Verification</span>
                                              <span className="text-[10px] font-mono font-bold text-indigo-705 bg-indigo-55 px-1 rounded">{progress}%</span>
                                            </div>

                                            {/* Checklist checkpoints listing matching what is required */}
                                            <div className="space-y-1.5 font-mono text-[10px] text-zinc-700">
                                              {checkpoints.map((cp, idx) => {
                                                const done = cp.status === 'COMPLETED';
                                                const active = cp.status === 'ACTIVE';
                                                return (
                                                  <div key={idx} className="flex items-center gap-2">
                                                    <span className="font-extrabold flex-shrink-0 text-zinc-900">
                                                      {done ? '[✓]' : active ? '[⟳]' : '[ ]'}
                                                    </span>
                                                    <span className={done ? 'text-zinc-400 line-through' : active ? 'text-indigo-600 font-bold animate-pulse' : 'text-zinc-500'}>
                                                      {cp.label}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Trigger debug reprocessing inline */}
                                          <div className="pt-1">
                                            <button
                                              onClick={() => handleAdminReprocessAsset(asset.id, asset.name)}
                                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[11px] font-bold py-1.5 px-3 rounded shadow-sm border border-indigo-500 flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                              FORCE PROCESSOR SIMULATION
                                            </button>
                                            <p className="text-[9px] text-zinc-450 italic text-center mt-1.5 leading-snug">
                                              Updates Sovereign DB schema variables and OCI object cache parameters dynamically.
                                            </p>
                                          </div>
                                        </div>

                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Operational Drawer Forms right under table when an asset is selected */}
                    {editingAssetId && (() => {
                      const asset = vaultAssets.find(a => a.id === editingAssetId);
                      if (!asset) return null;
                      return (
                        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 font-sans animate-fade-in text-xs max-w-lg">
                          <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                            <h4 className="font-bold text-zinc-900 flex items-center gap-1.5">
                              <Edit2 className="h-4 w-4 text-purple-600" />
                              Metadata Refactor Console: {asset.name}
                            </h4>
                            <button onClick={() => setEditingAssetId(null)} className="text-zinc-400 hover:text-zinc-600 font-mono text-[10px]">Close</button>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-zinc-400">Object Name String:</label>
                              <input 
                                type="text"
                                className="w-full p-2 border border-zinc-200 bg-white rounded font-mono outline-none focus:border-purple-600"
                                value={editingAssetName}
                                onChange={(e) => setEditingAssetName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-zinc-400">Security Category:</label>
                              <select 
                                className="w-full p-2 border border-zinc-200 bg-white rounded font-mono outline-none focus:border-purple-600"
                                value={editingAssetType}
                                onChange={(e) => setEditingAssetType(e.target.value as any)}
                              >
                                <option value="video">VIDEO (MASTER FILE)</option>
                                <option value="audio">AUDIO (STEMS/MIXES)</option>
                                <option value="subtitle">SUBTITLE (SRT/VTT)</option>
                                <option value="image">IMAGE (POSTERS/BANNER GRAPHICS)</option>
                                <option value="doc">DOCUMENT (LEGAL/CUE SHEETS)</option>
                              </select>
                            </div>
                            <button
                              onClick={() => {
                                onUpdateVaultAsset(asset.id, { name: editingAssetName, type: editingAssetType });
                                setEditingAssetId(null);
                              }}
                              className="bg-purple-900 hover:bg-purple-950 text-white font-mono text-[11px] font-bold px-3 py-1.5 rounded"
                            >
                              COMMIT METADATA REFACTOR
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {transferringAssetId && (() => {
                      const asset = vaultAssets.find(a => a.id === transferringAssetId);
                      if (!asset) return null;
                      return (
                        <div className="p-4 bg-blue-50/55 border border-blue-200 rounded-xl space-y-3 font-sans animate-fade-in text-xs max-w-lg">
                          <div className="flex justify-between items-center pb-2 border-b border-blue-150">
                            <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
                              <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                              Possession Tenant Migration: {asset.name}
                            </h4>
                            <button onClick={() => setTransferringAssetId(null)} className="text-zinc-400 hover:text-zinc-600 font-mono text-[10px]">Close</button>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-blue-800">Target Tenant Partner Workspace:</label>
                              <select 
                                className="w-full p-2 border border-blue-200 bg-white rounded font-mono outline-none focus:border-blue-600"
                                value={transferTargetEmail}
                                onChange={(e) => setTransferTargetEmail(e.target.value)}
                              >
                                <option value="partner@crayond.com">partner@crayond.com [CRAYOND CONTENT PARTNER]</option>
                                <option value="creator@streamvista.com">creator@streamvista.com [STREAMVISTA PORTAL PARTNER]</option>
                              </select>
                            </div>
                            <p className="text-[10px] text-zinc-500">
                              Warning: Relocates file directory path keys to `vault/&lt;type&gt;s/{transferTargetEmail.split('@')[0]}/` and modifies database ownership descriptors.
                            </p>
                            <button
                              onClick={() => {
                                const folderType = asset.type + 's';
                                const userSub = transferTargetEmail.split('@')[0];
                                onUpdateVaultAsset(asset.id, { 
                                  uploadedBy: transferTargetEmail,
                                  folderPath: `vault/${folderType}/${userSub}/`,
                                  oraclePath: `os://us-ashburn-1/vault/${folderType}/${userSub}/${asset.name}`
                                });
                                setTransferringAssetId(null);
                              }}
                              className="bg-blue-700 hover:bg-blue-800 text-white font-mono text-[11px] font-bold px-3 py-1.5 rounded"
                            >
                              EXECUTE TENANT WORKSPACE TRANSFER
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {mappingAssetId && (() => {
                      const asset = vaultAssets.find(a => a.id === mappingAssetId);
                      if (!asset) return null;
                      return (
                        <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3 font-sans animate-fade-in text-xs max-w-lg">
                          <div className="flex justify-between items-center pb-2 border-b border-purple-150">
                            <h4 className="font-bold text-purple-950 flex items-center gap-1.5">
                              <Link className="h-4 w-4 text-purple-600" />
                              C2C Ingestion Title Mapping: {asset.name}
                            </h4>
                            <button onClick={() => setMappingAssetId(null)} className="text-zinc-400 hover:text-zinc-600 font-mono text-[10px]">Close</button>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-purple-800">Assign Platform Catalog Title:</label>
                              <select 
                                className="w-full p-2 border border-purple-200 bg-white rounded font-mono outline-none focus:border-purple-600"
                                value={mappingFilmId}
                                onChange={(e) => setMappingFilmId(e.target.value)}
                              >
                                <option value="">-- UNMAPPED DECOUPLING --</option>
                                {films.map(f => (
                                  <option key={f.id} value={f.id}>{f.title.toUpperCase()} [{f.id}]</option>
                                ))}
                              </select>
                            </div>
                            <p className="text-[10px] text-zinc-500">
                              Appends content references on target title. Sets ingestion status to INGESTAL_COMPLETE on security audits.
                            </p>
                            <button
                              onClick={() => {
                                onUpdateVaultAsset(asset.id, { 
                                  mappedFilmId: mappingFilmId || undefined,
                                  ingestionStatus: mappingFilmId ? 'INGESTAL_COMPLETE' : undefined
                                });
                                setMappingAssetId(null);
                              }}
                              className="bg-purple-800 hover:bg-purple-900 text-white font-mono text-[11px] font-bold px-3 py-1.5 rounded"
                            >
                              BIND CODES AND UPDATE INDEX
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {deliveringAssetId && (() => {
                      const asset = vaultAssets.find(a => a.id === deliveringAssetId);
                      if (!asset) return null;
                      
                      const executedDeals = deals.filter(d => d.status === 'EXECUTED');
                      const companies = Array.from(new Set(executedDeals.map(d => d.buyerCompany)));

                      return (
                        <div className="p-4 bg-orange-50/50 border border-orange-200 rounded-xl space-y-3 font-sans animate-fade-in text-xs max-w-lg">
                          <div className="flex justify-between items-center pb-2 border-b border-orange-150">
                            <h4 className="font-bold text-orange-950 flex items-center gap-1.5">
                              <Truck className="h-4 w-4 text-orange-700" />
                              Sovereign Buyer Packaging Delivery: {asset.name}
                            </h4>
                            <button onClick={() => setDeliveringAssetId(null)} className="text-zinc-400 hover:text-zinc-600 font-mono text-[10px]">Close</button>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-mono font-bold text-orange-800">Select Deliver Recipient (Signed Contracts):</label>
                              {companies.length === 0 ? (
                                <div className="p-2.5 bg-white border border-orange-200 text-orange-800 font-semibold rounded italic">
                                  No business deals are signed yet or active buyer clients found.
                                </div>
                              ) : (
                                <select 
                                  className="w-full p-2 border border-orange-200 bg-white rounded font-mono outline-none focus:border-orange-600"
                                  value={deliveryTargetCompany}
                                  onChange={(e) => setDeliveryTargetCompany(e.target.value)}
                                >
                                  <option value="">-- SELECT RECIPIENT BUYER --</option>
                                  {companies.map(c => (
                                    <option key={c} value={c}>{c.toUpperCase()}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500">
                              Dispatches a custom cloud package. Mappable to user's storage lockers for immediate retrieval under OCCI endpoints.
                            </p>
                            <button
                              onClick={() => {
                                if (!deliveryTargetCompany) return;
                                onUpdateVaultAsset(asset.id, { 
                                  deliveredTo: deliveryTargetCompany,
                                  ingestionStatus: 'DELIVERED'
                                });
                                setDeliveringAssetId(null);
                              }}
                              disabled={!deliveryTargetCompany}
                              className="bg-orange-650 hover:bg-orange-700 disabled:opacity-50 text-white font-mono text-[11px] font-bold px-3 py-1.5 rounded"
                            >
                              SHIP SECURE STREAM PACKAGE
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                );
              })()}

            </div>
          </div>
        )}

        {/* TAB 7: DEMO CENTER admin management console */}
        {activeTab === 'DEMOCENTER' && (
          <div className="space-y-6 animate-fade-in" id="admin-democenter-view">
            
            {/* Top Summary Board */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-2xl p-6 border border-zinc-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-500 rounded text-neutral-900 font-extrabold flex items-center justify-center">
                    <Shield className="h-4 w-4" />
                  </span>
                  <h2 className="text-xl font-bold tracking-tight">Admin Demo Management Center</h2>
                </div>
                <p className="text-xs text-zinc-300 mt-1 max-w-xl font-sans">
                  Govern evaluation link routing, review prospects, create simulated test accounts, and trigger environment purge sequences under Strict isolation rules.
                </p>
                <div className="text-[10px] uppercase font-mono tracking-widest text-amber-500 mt-2 font-bold select-all">
                  DEMO INSTANCE: demo.crayonspictures.in
                </div>
              </div>

              <div className="flex gap-4 shrink-0 font-sans text-right">
                <div className="bg-zinc-800 border border-zinc-700 px-4 py-2.5 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-400 block font-bold">Active Trials</span>
                  <span className="text-xl font-black text-amber-500">{demoInvitations.length}</span>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 px-4 py-2.5 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-400 block font-bold">Sales Opportunities</span>
                  <span className="text-xl font-black text-amber-500">{leadRequests.filter(l => l.status === 'PENDING').length}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* SECTION A: INVITATION SYSTEM BUILDER */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
                <div className="pb-3 border-b border-zinc-150 flex justify-between items-center">
                  <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    Generate Evaluation Invitation
                  </h3>
                  <span className="text-[9px] font-mono text-zinc-400">DEMO INVITATION SYSTEM</span>
                </div>

                {/* Form state management */}
                {(() => {
                  const [invOrg, setInvOrg] = useState('');
                  const [invRole, setInvRole] = useState<'CREATOR' | 'BUYER' | 'ADMIN' | 'FULL_PLATFORM'>('CREATOR');
                  const [invDuration, setInvDuration] = useState('7 Days');
                  const [invMaxUsers, setInvMaxUsers] = useState(5);
                  const [invExpiry, setInvExpiry] = useState(() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    return d.toISOString().split('T')[0];
                  });
                  // Restrictions checklist
                  const [restrictions, setRestrictions] = useState<string[]>([
                    'Demo Isolated DB',
                    'Zero Licensing Costs processed'
                  ]);

                  const toggleRestriction = (restName: string) => {
                    setRestrictions(prev => 
                      prev.includes(restName) ? prev.filter(r => r !== restName) : [...prev, restName]
                    );
                  };

                  const handleGenerate = (e: React.FormEvent) => {
                    e.preventDefault();
                    if (!invOrg) return;
                    
                    onCreateDemoInvitation({
                      code: `INV_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                      inviteUrl: '', // auto assigned in API
                      expiryDate: invExpiry,
                      maxUsers: invMaxUsers,
                      organizationName: invOrg,
                      demoRole: invRole,
                      demoDuration: invDuration,
                      featureRestrictions: restrictions,
                      status: 'ACTIVE'
                    });

                    setInvOrg('');
                    onAddLog('DEMO_INVITATION_GENERATED', `Generated unique demonstration link for organization "${invOrg}" representing role "${invRole}"`);
                  };

                  return (
                    <form onSubmit={handleGenerate} className="space-y-4 font-sans text-xs">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-700">Prospect Organization:</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Paramount Regional"
                            value={invOrg}
                            onChange={(e) => setInvOrg(e.target.value)}
                            className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 rounded"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-700">Demo Role Tier:</label>
                          <select
                            value={invRole}
                            onChange={(e) => setInvRole(e.target.value as any)}
                            className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 rounded"
                          >
                            <option value="CREATOR">Creator Demo</option>
                            <option value="BUYER">Buyer Demo</option>
                            <option value="ADMIN">Admin Demo</option>
                            <option value="FULL_PLATFORM">Full Platform Demo</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-700">Evaluation Window:</label>
                          <select
                            value={invDuration}
                            onChange={(e) => setInvDuration(e.target.value)}
                            className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 rounded"
                          >
                            <option value="7 Days">7 Days Trial</option>
                            <option value="14 Days">14 Days Trial</option>
                            <option value="30 Days">30 Days Corporate</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-700">Max Users Capacity:</label>
                          <input
                            type="number"
                            min={1}
                            value={invMaxUsers}
                            onChange={(e) => setInvMaxUsers(parseInt(e.target.value) || 1)}
                            className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 rounded font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-700">Expiry Date Threshold:</label>
                          <input
                            type="date"
                            required
                            value={invExpiry}
                            onChange={(e) => setInvExpiry(e.target.value)}
                            className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 rounded font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 p-3 bg-zinc-50 border border-zinc-150 rounded-lg">
                        <label className="font-bold text-[10px] text-zinc-500 uppercase tracking-wider block">Configure Feature Restrictions</label>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={restrictions.includes('Read-only Dashboard')}
                              onChange={() => toggleRestriction('Read-only Dashboard')}
                            />
                            <span>Lock Content editing (Read-only)</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={restrictions.includes('Limited Storage (10 GB)')}
                              onChange={() => toggleRestriction('Limited Storage (10 GB)')}
                            />
                            <span>Storage limit 10 GB</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={restrictions.includes('Secure player restriction')}
                              onChange={() => toggleRestriction('Secure player restriction')}
                            />
                            <span>Force screener watermarking</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={restrictions.includes('Block real signature keys')}
                              onChange={() => toggleRestriction('Block real signature keys')}
                            />
                            <span>No external payments processed</span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-zinc-900 border border-zinc-900 hover:bg-zinc-800 text-white font-mono text-[11px] font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        CREATION UNIQUE EVALUATION LINK
                      </button>
                    </form>
                  );
                })()}

              </div>

              {/* SECTION B: SALES WORKFLOW & LEAD LISTING */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="pb-3 border-b border-zinc-150 flex justify-between items-center">
                    <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                      <Handshake className="h-4 w-4 text-amber-600" />
                      Sales Funnel & Lead Opportunities
                    </h3>
                    <span className="text-[9px] font-mono text-zinc-400">ADMIN SALES WORKFLOW</span>
                  </div>

                  {leadRequests.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400 space-y-1">
                      <Users className="h-8 w-8 text-zinc-300 mx-auto" />
                      <p className="text-xs">No active corporate evaluation leads captured.</p>
                      <p className="text-[9.5px]">Leads will register here once prospects tap "Request Demo" CTA on the pricing page.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-3 max-h-80 overflow-y-auto">
                      {leadRequests.map(lead => (
                        <div key={lead.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-zinc-900 font-sans">{lead.companyName}</span>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                                  lead.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                  lead.status === 'INVITATION_SENT' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                                  lead.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-800 border-emerald-250' : 'bg-zinc-100 text-zinc-500'
                                }`}>
                                  {lead.status}
                                </span>
                              </div>
                              <p className="text-zinc-500 font-mono text-[10.5px] mt-0.5">{lead.contactName} &bull; {lead.email}</p>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">{new Date(lead.timestamp).toLocaleDateString()}</span>
                          </div>

                          <div className="bg-white p-2 border border-zinc-200 rounded text-zinc-600 italic">
                            &ldquo;{lead.useCase}&rdquo;
                          </div>

                          <div className="flex justify-end gap-2 text-[10.5px] font-mono">
                            {lead.status === 'PENDING' && (
                              <button
                                onClick={() => {
                                  // Instantly generate a custom invitation code
                                  const code = `INV_LEAD_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                                  onCreateDemoInvitation({
                                    code,
                                    inviteUrl: '',
                                    expiryDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
                                    maxUsers: 5,
                                    organizationName: lead.companyName,
                                    demoRole: 'FULL_PLATFORM',
                                    demoDuration: '14 Days',
                                    featureRestrictions: ['Demo Isolated DB', 'Zero Real Licenses'],
                                    status: 'ACTIVE'
                                  });
                                  onConvertLead(lead.id, code);
                                  onAddLog('LEAD_EVALUATION_APPROVED', `Qualified sales opportunity lead for ${lead.companyName}. Sent secure invitation link "${code}"`);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-2 py-1 rounded"
                              >
                                APPROVE & DISPATCH INVITATION
                              </button>
                            )}

                            {lead.status === 'INVITATION_SENT' && (
                              <button
                                onClick={() => {
                                  onConvertLead(lead.id, 'CONVERT');
                                  onAddLog('LEAD_PRODUCTION_CONVERTED', `Converted evaluation account for ${lead.companyName} into standard corporate billing tiers.`);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1 rounded"
                              >
                                CONVERT TO PRODUCTION CLIENT
                              </button>
                            )}

                            <button
                              onClick={() => onDeleteLead(lead.id)}
                              className="text-red-650 hover:bg-red-50 hover:border-red-200 px-2 py-1 rounded border border-transparent"
                            >
                              PURGE OPPORTUNITY
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-150 flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                  <span>SALES PIPELINE LEDGER STABLE</span>
                  <span>OOCI ENGAGEMENT RADAR OK</span>
                </div>
              </div>

            </div>

            {/* SECTIONS C & D: ACTIVE DEMO INVITATIONS REGISTRY & CREATED DEMO USERS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ACTIVE INVITATIONS GRID (2/3 width) */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 lg:col-span-2">
                <div className="pb-3 border-b border-zinc-150 flex justify-between items-center">
                  <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                    <Radio className="h-4 w-4 text-amber-600 shrink-0" />
                    Demo Evaluation Link Registry ({demoInvitations.length})
                  </h3>
                  <span className="text-[9px] font-mono text-zinc-400">TRACK DEMO USAGE</span>
                </div>

                {demoInvitations.length === 0 ? (
                  <p className="text-zinc-400 text-xs text-center py-12">No active evaluation links generated. Use form above to create one.</p>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-400 font-mono uppercase bg-zinc-50 text-[10px]">
                          <th className="p-2">Code / Link</th>
                          <th className="p-2">Org context</th>
                          <th className="p-2">Role</th>
                          <th className="p-2 text-center">clicks usage</th>
                          <th className="p-2">Restricted tags</th>
                          <th className="p-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150">
                        {demoInvitations.map(invite => (
                          <tr key={invite.id} className="hover:bg-zinc-50">
                            <td className="p-2 font-mono">
                              <span className="font-bold text-zinc-900 block">{invite.code}</span>
                              <div className="flex items-center gap-1.5 text-[9.5px] mt-0.5 text-zinc-400">
                                <span className="text-zinc-500 font-bold truncate max-w-[124px] select-all">{invite.inviteUrl}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(invite.inviteUrl);
                                    onAddLog('CLIPBOARD_COPY', `Copied evaluation link to system clipboard: ${invite.inviteUrl}`);
                                  }}
                                  className="text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-1 rounded bg-white hover:bg-zinc-50 flex items-center justify-center h-4 text-[9px] font-sans"
                                  title="Copy evaluation URL"
                                >
                                  Copy Link
                                </button>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="font-semibold text-zinc-900">{invite.organizationName}</div>
                              <span className="text-[10px] text-zinc-500">{invite.demoDuration} trial &bull; Expires {invite.expiryDate}</span>
                            </td>
                            <td className="p-2 font-mono text-[10.5px] text-zinc-700">{invite.demoRole}</td>
                            <td className="p-2 text-center font-mono font-bold text-zinc-900 bg-zinc-50">
                              {invite.currentUsers} / {invite.maxUsers} max
                            </td>
                            <td className="p-2">
                              <div className="flex flex-wrap gap-1">
                                {invite.featureRestrictions.map((r, i) => (
                                  <span key={i} className="text-[9px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 rounded">{r}</span>
                                ))}
                              </div>
                            </td>
                            <td className="p-2 text-right">
                              {invite.status === 'ACTIVE' ? (
                                <div className="inline-flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      onExpireInvitation(invite.id);
                                      onAddLog('DEMO_INVITATION_EXPIRED', `Manually expired demo access invitation code: ${invite.code}`);
                                    }}
                                    className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-800 font-mono text-[9px] font-bold px-1.5 py-1 rounded"
                                  >
                                    EXPIRE ACCESS
                                  </button>
                                  <button
                                    onClick={() => {
                                      onDisableInvitation(invite.id);
                                      onAddLog('DEMO_INVITATION_DISABLED', `Manually disabled/revoked access to invitation code: ${invite.code}`);
                                    }}
                                    className="bg-white border border-red-200 text-red-650 hover:bg-red-50 font-mono text-[9px] font-bold px-1.5 py-1 rounded"
                                  >
                                    DISABLE
                                  </button>
                                </div>
                              ) : (
                                <span className="font-mono text-[9.5px] uppercase font-bold text-red-500 py-1 block">{invite.status}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* CREATED DEMO USER ACCOUNTS LIST */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="pb-3 border-b border-zinc-150 flex justify-between items-center">
                    <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      Provision Demo Users & Accounts
                    </h3>
                    <span className="text-[9px] font-mono text-zinc-400">Super Admin Node</span>
                  </div>

                  {/* Account creation form */}
                  {(() => {
                    const [accEmail, setAccEmail] = useState('');
                    const [accRole, setAccRole] = useState<'CREATOR' | 'BUYER' | 'ADMIN'>('CREATOR');
                    const [accCompany, setAccCompany] = useState('');

                    const handleAccSubmit = (e: React.FormEvent) => {
                      e.preventDefault();
                      if (!accEmail) return;
                      onCreateDemoAccount({
                        id: `demouser-${Math.floor(Math.random() * 900) + 100}`,
                        email: accEmail,
                        role: accRole,
                        company: accCompany || 'Demo Partner Corp',
                        status: 'ACTIVE',
                        createdAt: new Date().toISOString()
                      });
                      setAccEmail('');
                      setAccCompany('');
                      onAddLog('DEMO_USER_CREATED', `Provisioned isolated demo user account credentials: ${accEmail} (${accRole})`);
                    };

                    return (
                      <form onSubmit={handleAccSubmit} className="space-y-3 pt-2 text-xs font-sans">
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-650">Simulated Email Username:</label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. buyer.test@streamvista.com"
                            value={accEmail}
                            onChange={(e) => setAccEmail(e.target.value)}
                            className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 rounded font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="font-semibold text-zinc-650">Default Role:</label>
                            <select
                              value={accRole}
                              onChange={(e) => setAccRole(e.target.value as any)}
                              className="w-full text-xs p-1.5 border border-zinc-200 bg-zinc-50 rounded"
                            >
                              <option value="CREATOR">Creator Account</option>
                              <option value="BUYER">Buyer Account</option>
                              <option value="ADMIN">Super Admin</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="font-semibold text-zinc-650">Assigned Corp:</label>
                            <input
                              type="text"
                              placeholder="e.g. Disney-Eval"
                              value={accCompany}
                              onChange={(e) => setAccCompany(e.target.value)}
                              className="w-full text-xs p-1.5 border border-zinc-200 bg-zinc-50 rounded"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-1.5 rounded uppercase tracking-wider text-[10px] font-mono"
                        >
                          PROVISION EVAL ACCOUNTS credentials
                        </button>
                      </form>
                    );
                  })()}

                  {/* Created Accounts list */}
                  {demoAccounts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-150 space-y-2">
                      <h4 className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block">Active Sandbox User Accounts</h4>
                      <div className="space-y-1.5 max-h-24 overflow-y-auto font-mono text-[10.5px]">
                        {demoAccounts.map(acc => (
                          <div key={acc.id} className="flex justify-between items-center py-1 border-b border-zinc-100 last:border-b-0">
                            <div className="truncate max-w-[124px]">
                              <span className="font-bold text-zinc-900 block truncate">{acc.email}</span>
                              <span className="text-[9.5px] text-zinc-400 block">{acc.company} ({acc.role})</span>
                            </div>
                            <button
                              onClick={() => {
                                onCreateDemoAccount({
                                  ...acc,
                                  status: acc.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
                                });
                                onAddLog('DEMO_USER_TOGGLED', `Toggled demo account "${acc.email}" status to: ${acc.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'}`);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                acc.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {acc.status}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-150 text-[10px] text-zinc-400 font-mono text-center">
                  PROVISIONING LEDGER BUFFERED
                </div>
              </div>

            </div>

            {/* SECTIONS E: BIG RESET NODE */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3 font-sans">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                <h3 className="font-bold text-red-800 text-sm">Dangerous Node: Reset Staged Environment</h3>
              </div>
              <p className="text-xs text-red-750 font-medium leading-relaxed">
                Resetting the demo environment will permanently wipe all mock film records, deals, registrations, test assets, invitations, and telemetry databases that are tagged under evaluation keys on localStorage. This has <strong>zero effect</strong> on production client records or active assets running in the isolated <code>app.crayonspictures.in</code> databases.
              </p>
              
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("CRITICAL DECISION: Are you absolutely sure you want to reset the Demo Environment? This operation is irreversible and purges all simulated databases, logs, opportunities and trials under the demo domain prefix.")) {
                    onResetDemoEnvironment();
                    onAddLog('SYSTEM_RESET', `Super Administrator reset the entire evaluation workspace environment back to factory specifications.`);
                    alert("Demo structures cleared. Initial partner contexts have been re-seeded.");
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                id="btn-env-reset"
              >
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                PURGE & RESET DEMO EVALUATION INFRASTRUCTURE
              </button>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
