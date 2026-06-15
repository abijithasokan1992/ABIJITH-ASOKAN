/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LayoutDashboard, Film, HardDrive, DollarSign, FileText, Bell, User, Plus, Check, Loader2, LogOut, ChevronRight } from 'lucide-react';
import { Film as FilmType, FilmAsset, NegotiatingDeal, AuditLog, VaultAsset } from '../types';

interface CreatorDashboardProps {
  email: string;
  films: FilmType[];
  deals: NegotiatingDeal[];
  onAddFilm: (film: FilmType) => void;
  onUpdateFilm: (id: string, updated: Partial<FilmType>) => void;
  onDeleteFilm: (id: string) => void;
  onSignDeal: (dealId: string, signature: string) => void;
  logs: AuditLog[];
  onAddLog: (action: string, details: string) => void;
  onSignOut: () => void;
  vaultAssets: VaultAsset[];
  onAddVaultAsset: (asset: VaultAsset) => void;
  onUpdateVaultAsset: (id: string, updated: Partial<VaultAsset>) => void;
}

export default function CreatorDashboard({
  email,
  films,
  deals,
  onAddFilm,
  onUpdateFilm,
  onDeleteFilm,
  onSignDeal,
  logs,
  onAddLog,
  onSignOut,
  vaultAssets,
  onAddVaultAsset,
  onUpdateVaultAsset
}: CreatorDashboardProps) {
  // Navigation layout based on directive requirements
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'MY_CONTENT' | 'STORAGE' | 'LICENSING' | 'CONTRACTS' | 'NOTIFICATIONS' | 'ACCOUNT'>('DASHBOARD');

  // Simple Create Film States
  const [filmTitle, setFilmTitle] = useState('');
  const [filmGenre, setFilmGenre] = useState('Drama');
  const [filmSynopsis, setFilmSynopsis] = useState('');
  const [filmAssets, setFilmAssets] = useState<FilmAsset[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Sign contract state
  const [signature, setSignature] = useState('');
  const [activeSigningDealId, setActiveSigningDealId] = useState<string | null>(null);

  // Filter content
  const creatorFilms = films.filter(f => f.uploadedBy === email);
  const creatorDeals = deals.filter(d => d.creatorEmail === email);

  // Uploading / creation simulator
  const handleCreateFilm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filmTitle || !filmSynopsis) return;

    setUploadProgress(15);
    onAddLog('FILM_UPLOAD_START', `Began media upload stream for: "${filmTitle}"`);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return 15;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const newFilm: FilmType = {
              id: `f-${Math.floor(Math.random() * 900) + 100}`,
              title: filmTitle,
              genre: filmGenre,
              synopsis: filmSynopsis,
              year: 2026,
              duration: '120 mins',
              languages: ['English'],
              subtitles: ['English'],
              rights: ['SVOD'],
              territories: ['Worldwide'],
              status: 'PENDING',
              assets: [],
              oracleBucket: 'os://storage/vault',
              uploadedBy: email,
              createdAt: new Date().toISOString()
            };
            onAddFilm(newFilm);
            onAddLog('FILM_UPLOAD_COMPLETE', `Successfully uploaded and registered: "${filmTitle}"`);
            setFilmTitle('');
            setFilmSynopsis('');
            setUploadProgress(null);
            // Stay under My Content
            setActiveTab('MY_CONTENT');
          }, 300);
          return 100;
        }
        return prev + 35;
      });
    }, 400);
  };

  // Safe signature deal execution
  const handleExecuteSignature = (dealId: string) => {
    if (!signature) return;
    onSignDeal(dealId, signature);
    setSignature('');
    setActiveSigningDealId(null);
  };

  // Determine the workflow step based on status
  // Account → Create Film → Upload Assets → Submit → Processing → Marketplace → Buyer Interest → Negotiation → Contract → Complete
  const getWorkflowStep = (film: FilmType) => {
    if (film.status === 'DRAFT') return 'Create Film';
    if (film.status === 'PENDING') return 'Processing';
    if (film.status === 'APPROVED') return 'Marketplace';
    return 'Complete';
  };

  // Status mapping
  const getSimpleStatus = (film: FilmType) => {
    if (film.status === 'PENDING') return 'Processing';
    if (film.status === 'APPROVED') return 'Ready';
    if (film.status === 'REJECTED') return 'Failed';
    return film.status;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans" id="creator-workspace">
      {/* Navigation Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-900 text-white p-1 rounded-lg">
              <Film className="h-5 w-5" />
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-900">StreamVista Workspace</span>
          </div>

          <nav className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'DASHBOARD' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('MY_CONTENT')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'MY_CONTENT' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              My Content
            </button>
            <button
              onClick={() => setActiveTab('STORAGE')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'STORAGE' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Storage
            </button>
            <button
              onClick={() => setActiveTab('LICENSING')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'LICENSING' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Licensing
            </button>
            <button
              onClick={() => setActiveTab('CONTRACTS')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'CONTRACTS' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Contracts
            </button>
            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'NOTIFICATIONS' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('ACCOUNT')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'ACCOUNT' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Account
            </button>
          </nav>
        </div>
      </header>

      {/* Main Panel */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-grow w-full">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Creator Dashboard</h2>
              <p className="text-xs text-zinc-500">Welcome, {email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-zinc-250 p-5 rounded-xl">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400">Total Listings</span>
                <p className="text-2xl font-black mt-1 text-zinc-900">{creatorFilms.length}</p>
              </div>

              <div className="bg-white border border-zinc-250 p-5 rounded-xl">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400">Active Deals</span>
                <p className="text-2xl font-black mt-1 text-zinc-900">{creatorDeals.filter(d => d.status !== 'EXECUTED').length}</p>
              </div>

              <div className="bg-white border border-zinc-250 p-5 rounded-xl">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400">Completed Contracts</span>
                <p className="text-2xl font-black mt-1 text-zinc-900">{creatorDeals.filter(d => d.status === 'EXECUTED').length}</p>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider">Storage Limit Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>1.38 GB of 1 TB Used</span>
                  <span className="text-zinc-500">0.13%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-900 rounded-full" style={{ width: '0.13%' }} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveTab('MY_CONTENT')}
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                Upload Content
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MY CONTENT (Film listings / stepper / uploads) */}
        {activeTab === 'MY_CONTENT' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Upload & Manage Content</h2>
              <p className="text-xs text-zinc-500 font-normal">Publish metadata forms, stage film assets, and track processing states.</p>
            </div>

            {/* Create film form */}
            <form onSubmit={handleCreateFilm} className="bg-white border border-zinc-200 p-5 rounded-xl space-y-4">
              <h3 className="font-bold text-xs uppercase text-zinc-400 tracking-wider">New Film Entry</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700">Film Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Moonlight Harmony"
                    value={filmTitle}
                    onChange={(e) => setFilmTitle(e.target.value)}
                    className="w-full text-xs p-2.5 border border-zinc-200 rounded-lg outline-none bg-zinc-50 focus:bg-white focus:border-zinc-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700">Genre</label>
                  <select
                    value={filmGenre}
                    onChange={(e) => setFilmGenre(e.target.value)}
                    className="w-full text-xs p-2.5 border border-zinc-200 rounded-lg outline-none bg-zinc-50 focus:bg-white"
                  >
                    <option value="Drama">Drama</option>
                    <option value="Action">Action</option>
                    <option value="Comedy">Comedy</option>
                    <option value="Thriller">Thriller</option>
                    <option value="Documentary">Documentary</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700">Synopsis</label>
                <textarea
                  required
                  placeholder="Enter direct plot outline and catalog summary..."
                  value={filmSynopsis}
                  onChange={(e) => setFilmSynopsis(e.target.value)}
                  className="w-full text-xs p-2.5 border border-zinc-200 rounded-lg outline-none h-20 bg-zinc-50 focus:bg-white focus:border-zinc-900"
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                {uploadProgress !== null ? (
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-650">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-900" />
                    <span>Uploading... {uploadProgress}%</span>
                  </div>
                ) : <span />}

                <button
                  type="submit"
                  disabled={uploadProgress !== null}
                  className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Submit Content
                </button>
              </div>
            </form>

            {/* List with Active Steps */}
            <div className="space-y-4">
              <h3 className="font-bold text-xs uppercase text-zinc-500 tracking-wider">Active Catalog ({creatorFilms.length})</h3>

              {creatorFilms.length === 0 ? (
                <div className="bg-white border border-zinc-200 p-8 rounded-xl text-center text-xs text-zinc-500">
                  No content uploaded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {creatorFilms.map(film => {
                    const currentStep = getWorkflowStep(film);
                    const simpleStatus = getSimpleStatus(film);

                    return (
                      <div key={film.id} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-zinc-900">{film.title}</h4>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">{film.genre}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            simpleStatus === 'Ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            simpleStatus === 'Failed' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {simpleStatus}
                          </span>
                        </div>

                        {/* STAGE TRACKER: Show only the current step */}
                        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex justify-between items-center text-xs">
                          <span className="text-zinc-550">Current Step:</span>
                          <span className="font-mono bg-zinc-900 text-white px-2.5 py-1 rounded font-bold text-[10px]">
                            {currentStep.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STORAGE */}
        {activeTab === 'STORAGE' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Storage Usage</h2>
              <p className="text-xs text-zinc-500">Monitor your active catalog size and available storage quotas.</p>
            </div>

            <div className="bg-white border border-zinc-250 rounded-xl p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-700">
                  <span>Storage Usage</span>
                  <span>1.38 GB of 1 TB Used</span>
                </div>
                <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-900 rounded-full" style={{ width: '0.13%' }} />
                </div>
              </div>

              <p className="text-xs text-zinc-500 leading-normal font-sans">
                StreamVista standard subscription allocations allow up to 1 TB of asset files. For additional space expansion and relative calculations, please inspect our Storage Policy parameters.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: LICENSING */}
        {activeTab === 'LICENSING' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Active Proposals</h2>
              <p className="text-xs text-zinc-500">Manage rates, pricing proposals, and direct license negotiations.</p>
            </div>

            {creatorDeals.filter(d => d.status !== 'EXECUTED').length === 0 ? (
              <div className="bg-white border border-zinc-200 p-8 rounded-xl text-center text-xs text-zinc-500">
                No active licensing proposals.
              </div>
            ) : (
              <div className="space-y-4">
                {creatorDeals.filter(d => d.status !== 'EXECUTED').map(deal => {
                  const isSigning = activeSigningDealId === deal.id;

                  return (
                    <div key={deal.id} className="bg-white border border-zinc-250 rounded-xl p-5 space-y-3 font-sans">
                      <div className="flex justify-between font-bold text-xs">
                        <span className="text-sm font-bold text-zinc-900">{deal.filmTitle}</span>
                        <span className="text-zinc-900 font-mono text-sm">${deal.price.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-zinc-500 space-y-1">
                        <p>Territories: {deal.territories.join(', ')}</p>
                        <p>Buyer Representative: {deal.buyerCompany}</p>
                      </div>

                      <div className="pt-2 border-t border-zinc-150 flex justify-between items-center">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-orange-50 text-orange-700">
                          {deal.status}
                        </span>

                        {isSigning ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder="Type Full Name to Sign"
                              value={signature}
                              onChange={(e) => setSignature(e.target.value)}
                              className="text-xs p-1.5 border border-zinc-200 rounded outline-none font-mono"
                            />
                            <button
                              onClick={() => handleExecuteSignature(deal.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded"
                            >
                              Confirm
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveSigningDealId(deal.id)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                          >
                            Sign Contract Proposal
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CONTRACTS */}
        {activeTab === 'CONTRACTS' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Mutual Contracts</h2>
              <p className="text-xs text-zinc-500">Review fully countersigned digital licensing agreements.</p>
            </div>

            {creatorDeals.filter(d => d.status === 'EXECUTED').length === 0 ? (
              <div className="bg-white border border-zinc-200 p-8 rounded-xl text-center text-xs text-zinc-500">
                No active agreements or completed transactions.
              </div>
            ) : (
              <div className="space-y-4">
                {creatorDeals.filter(d => d.status === 'EXECUTED').map(deal => (
                  <div key={deal.id} className="bg-white border border-zinc-250 rounded-xl p-5 space-y-3 font-sans">
                    <div className="flex justify-between font-bold text-xs items-start">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{deal.filmTitle}</h4>
                        <span className="text-[10px] text-emerald-600 font-mono uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-1 inline-block">
                          Executed & Secured
                        </span>
                      </div>
                      <span className="text-zinc-900 font-mono text-sm">${deal.price.toLocaleString()}</span>
                    </div>

                    <div className="text-[11px] text-zinc-600 grid grid-cols-2 gap-4 bg-zinc-50 p-3 rounded-lg border border-zinc-150 font-sans">
                      <div>
                        <span className="block text-zinc-400 font-mono text-[9px]">CREATOR SIGNATURE:</span>
                        <span className="font-semibold">{deal.creatorSignature}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-400 font-mono text-[9px]">BUYER SIGNATURE:</span>
                        <span className="font-semibold">{deal.buyerSignature}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: NOTIFICATIONS */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Notifications</h2>
              <p className="text-xs text-zinc-500">Stay up to date with activity, requests, and negotiations.</p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden shadow-xs">
              <div className="p-4 text-xs flex gap-3 items-start">
                <Bell className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-bold text-zinc-900">Workspace Authorized</p>
                  <p className="text-zinc-500 mt-0.5">Welcome to your new Creator portal on StreamVista.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ACCOUNT */}
        {activeTab === 'ACCOUNT' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Account Parameters</h2>
              <p className="text-xs text-zinc-500">Configure business information and manage secure sessions.</p>
            </div>

            <div className="bg-white border border-zinc-250 rounded-xl p-5 space-y-4 text-xs font-sans">
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Account Role</span>
                <span className="font-mono bg-zinc-100 border border-zinc-200 text-zinc-700 px-2.5 py-0.5 rounded font-bold uppercase text-[9px]">Content Partner (Creator)</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Representative Email</span>
                <span className="font-mono text-zinc-900 font-medium">{email}</span>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={onSignOut}
                  className="bg-transparent text-zinc-650 hover:bg-red-50 hover:text-red-700 border border-zinc-200 py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-bold transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  SIGN OUT OF ACCESS SESSION
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-4 text-[10px] text-zinc-400 text-center font-mono">
        Demo Environment • Isolated Account Workspace Session
      </footer>
    </div>
  );
}
