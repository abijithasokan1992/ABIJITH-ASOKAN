/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Search, Film, HardDrive, DollarSign, FileText, Bell, User, Play, Pause, Loader2, LogOut, Check, ChevronRight } from 'lucide-react';
import { Film as FilmType, NegotiatingDeal, ScreenerRequest, AuditLog } from '../types';

interface BuyerDashboardProps {
  email: string;
  companyName: string;
  films: FilmType[];
  deals: NegotiatingDeal[];
  screeners: ScreenerRequest[];
  onAddDeal: (deal: NegotiatingDeal) => void;
  onUpdateDeal: (id: string, updated: Partial<NegotiatingDeal>) => void;
  onRequestScreener: (filmId: string, filmTitle: string) => void;
  onSignDeal: (dealId: string, signature: string) => void;
  onAddLog: (action: string, details: string) => void;
  onSignOut: () => void;
}

export default function BuyerDashboard({
  email,
  companyName,
  films,
  deals,
  screeners,
  onAddDeal,
  onUpdateDeal,
  onRequestScreener,
  onSignDeal,
  onAddLog,
  onSignOut
}: BuyerDashboardProps) {
  // Navigation layout based on master directive
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'MARKETPLACE' | 'STORAGE' | 'LICENSING' | 'CONTRACTS' | 'NOTIFICATIONS' | 'ACCOUNT'>('DASHBOARD');

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL');

  // Playback Screener States
  const [activePlaybackFilm, setActivePlaybackFilm] = useState<FilmType | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);

  // Deal Bid States
  const [selectedFilmForBid, setSelectedFilmForBid] = useState<FilmType | null>(null);
  const [bidPrice, setBidPrice] = useState(150000);
  const [bidRightsType, setBidRightsType] = useState('SVOD (Streaming)');
  const [bidDuration, setBidDuration] = useState(3);
  const [bidExclusivity, setBidExclusivity] = useState(true);

  // Counter proposal states
  const [counterPriceInput, setCounterPriceInput] = useState(165000);
  const [signingDealId, setSigningDealId] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');

  // Local helper calculations
  const buyerDeals = deals.filter(d => d.buyerEmail === email);
  const buyerScreeners = screeners.filter(s => s.buyerEmail === email);
  const approvedFilms = films.filter(f => f.status === 'APPROVED');

  // Filter films
  const filteredFilms = approvedFilms.filter(f => {
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || f.synopsis.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'ALL' || f.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  // Simulated player ticking timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (playing && activePlaybackFilm) {
      timer = setInterval(() => {
        setPlaybackSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [playing, activePlaybackFilm]);

  // Request code / Screener flow
  const handleRequestScreenerFlow = (film: FilmType) => {
    onRequestScreener(film.id, film.title);
    onAddLog('SCREENER_REQUEST_SUBMIT', `Requested screening authorization keys for: "${film.title}"`);
    alert(`Request submitted for ${film.title}. It is instantly pre-approved for evaluation under evaluation keys.`);
  };

  // Submit deal bid
  const handleSubmitBidOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFilmForBid) return;

    const newDeal: NegotiatingDeal = {
      id: `deal-${Math.floor(Math.random() * 900) + 400}`,
      filmId: selectedFilmForBid.id,
      filmTitle: selectedFilmForBid.title,
      creatorEmail: selectedFilmForBid.uploadedBy,
      buyerEmail: email,
      buyerCompany: companyName,
      rightsType: bidRightsType,
      territories: ['North America'],
      exclusivity: bidExclusivity,
      durationYears: bidDuration,
      price: bidPrice,
      status: 'PROFFERED',
      auditTrail: [
        {
          sender: 'BUYER',
          senderName: `${email} (${companyName})`,
          action: 'OFFER_CREATED',
          price: bidPrice,
          timestamp: new Date().toISOString(),
          note: `Staged B2B initial offer bid request for ${bidRightsType}.`
        }
      ]
    };

    onAddDeal(newDeal);
    onAddLog('DEAL_BID_TRANSMIT', `Broadcasted licensing offer bid for "${selectedFilmForBid.title}" representing: $${bidPrice.toLocaleString()}`);
    setSelectedFilmForBid(null);
    setActiveTab('LICENSING');

    // Simulate creator Counter Offer 2s later
    setTimeout(() => {
      const counterPrice = Math.floor(bidPrice * 1.15);
      onUpdateDeal(newDeal.id, {
        status: 'COUNTERED',
        price: counterPrice,
        auditTrail: [
          ...newDeal.auditTrail,
          {
            sender: 'CREATOR',
            senderName: `Licensing desk`,
            action: 'COUNTER_PROPOSED',
            price: counterPrice,
            timestamp: new Date().toISOString(),
            note: `We appreciate the bid. Our required target minimum rate for exclusive SVOD parameters on this asset is $${counterPrice.toLocaleString()}.`
          }
        ]
      });
      onAddLog('DEAL_COUNTER_AUTO', `Received counter licensing offer for: "${selectedFilmForBid.title}" at $${counterPrice.toLocaleString()}`);
    }, 2000);
  };

  // Agree or sign logic
  const handlePlaceCounterOffer = (deal: NegotiatingDeal) => {
    const updatedTrail = [
      ...deal.auditTrail,
      {
        sender: 'BUYER',
        senderName: `${email} (${companyName})`,
        action: 'COUNTER_PROPOSED',
        price: counterPriceInput,
        timestamp: new Date().toISOString(),
        note: `Amended bid adjusted price counter: $${counterPriceInput.toLocaleString()}`
      }
    ];

    onUpdateDeal(deal.id, {
      price: counterPriceInput,
      status: 'PROFFERED',
      auditTrail: updatedTrail
    });

    onAddLog('DEAL_COUNTER_TRANSMIT', `Submitted counter pricing proposal block: $${counterPriceInput.toLocaleString()} for ID: ${deal.id}`);

    // Auto acceptance by seller
    setTimeout(() => {
      onUpdateDeal(deal.id, {
        status: 'ACCEPTED',
        auditTrail: [
          ...updatedTrail,
          {
            sender: 'CREATOR',
            senderName: `Licensing Desk`,
            action: 'OFFER_ACCEPTED',
            price: counterPriceInput,
            timestamp: new Date().toISOString(),
            note: 'We have reconciled the Counter Offer terms. Ready for mutual digital signature blocks.'
          }
        ]
      });
      onAddLog('DEAL_ACCEPTED_AUTO', `Seller accepted amended bid. Staging agreement signatures.`);
    }, 1500);
  };

  const handleAgreeAndAccept = (deal: NegotiatingDeal) => {
    onUpdateDeal(deal.id, {
      status: 'ACCEPTED',
      auditTrail: [
        ...deal.auditTrail,
        {
          sender: 'BUYER',
          senderName: `${email} (${companyName})`,
          action: 'OFFER_ACCEPTED',
          price: deal.price,
          timestamp: new Date().toISOString(),
          note: 'Distributor accepted terms as proposed. Proceeding to digital signatures.'
        }
      ]
    });
    onAddLog('BUYER_ACCEPT_DEAL', `Distributor agreed onto terms for proposal ID: ${deal.id}`);
  };

  const handleConfirmSignature = (deal: NegotiatingDeal) => {
    if (!signatureName) return;
    onSignDeal(deal.id, signatureName);
    onAddLog('CONTRACT_SIGNED_MUTUAL', `Digitally signed mutual contract block: ${deal.id} under credentials verification: ${signatureName}`);
    setSignatureName('');
    setSigningDealId(null);
  };

  // Map the film to its exact current step
  // Account → Browse Catalog → Play Screener → Select Terms → Submit Bid → Counter Offer → Agree → Contract → Complete
  const getBuyerWorkflowStep = (film: FilmType) => {
    const hasScreener = buyerScreeners.find(s => s.filmId === film.id);
    const hasDeal = buyerDeals.find(d => d.filmId === film.id);

    if (hasDeal) {
      if (hasDeal.status === 'EXECUTED') return 'Complete';
      if (hasDeal.status === 'ACCEPTED') return 'Contract';
      if (hasDeal.status === 'COUNTERED') return 'Counter Offer';
      return 'Submit Bid';
    }
    if (hasScreener && hasScreener.status === 'APPROVED') {
      return 'Play Screener';
    }
    return 'Browse Catalog';
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans" id="buyer-workspace">
      {/* Navigation Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-900 text-white p-1 rounded-lg">
              <Film className="h-5 w-5" />
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-900">StreamVista Buyer Hub</span>
          </div>

          <nav className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'DASHBOARD' ? 'bg-zinc-900 text-white' : 'text-zinc-650 hover:bg-zinc-100'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('MARKETPLACE')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'MARKETPLACE' ? 'bg-zinc-900 text-white' : 'text-zinc-655 hover:bg-zinc-100'}`}
            >
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab('STORAGE')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'STORAGE' ? 'bg-zinc-900 text-white' : 'text-zinc-655 hover:bg-zinc-100'}`}
            >
              Storage
            </button>
            <button
              onClick={() => setActiveTab('LICENSING')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'LICENSING' ? 'bg-zinc-900 text-white' : 'text-zinc-655 hover:bg-zinc-100'}`}
            >
              Licensing
            </button>
            <button
              onClick={() => setActiveTab('CONTRACTS')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'CONTRACTS' ? 'bg-zinc-900 text-white' : 'text-zinc-655 hover:bg-zinc-100'}`}
            >
              Contracts
            </button>
            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'NOTIFICATIONS' ? 'bg-zinc-900 text-white' : 'text-zinc-655 hover:bg-zinc-100'}`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('ACCOUNT')}
              className={`py-1.5 px-3 rounded-lg transition-all ${activeTab === 'ACCOUNT' ? 'bg-zinc-900 text-white' : 'text-zinc-655 hover:bg-zinc-100'}`}
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
              <h2 className="text-xl font-bold tracking-tight">Buyer Dashboard</h2>
              <p className="text-xs text-zinc-500">Welcome, {email} of {companyName}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-zinc-250 p-5 rounded-xl">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400">Available Cinematic Titles</span>
                <p className="text-2xl font-black mt-1 text-zinc-900">{approvedFilms.length}</p>
              </div>

              <div className="bg-white border border-zinc-250 p-5 rounded-xl">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400">Negotiations In Progress</span>
                <p className="text-2xl font-black mt-1 text-zinc-900">{buyerDeals.filter(d => d.status !== 'EXECUTED').length}</p>
              </div>

              <div className="bg-white border border-zinc-250 p-5 rounded-xl">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400">Completed Contracts</span>
                <p className="text-2xl font-black mt-1 text-zinc-900">{buyerDeals.filter(d => d.status === 'EXECUTED').length}</p>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-xs uppercase text-zinc-450 tracking-wider">Storage Usage Limit</h3>
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
                onClick={() => setActiveTab('MARKETPLACE')}
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                Browse Marketplace
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MARKETPLACE */}
        {activeTab === 'MARKETPLACE' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Active Marketplace Catalog</h2>
              <p className="text-xs text-zinc-500">Browse fully approved films, watch secure watermarked screeners, and submit licensing bids.</p>
            </div>

            {/* Screener Player overlay */}
            {activePlaybackFilm && (
              <div className="bg-black text-white p-6 rounded-xl space-y-4 border border-zinc-800" id="secured-screener-player">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Confidential Viewing Room</span>
                  <button onClick={() => { setPlaying(false); setActivePlaybackFilm(null); }} className="text-xs font-mono text-zinc-400 hover:text-white">
                    Close Screen
                  </button>
                </div>

                <div className="relative aspect-video bg-zinc-950 rounded-lg flex items-center justify-center p-6 text-center select-none">
                  {/* Digital Watermark Stamps */}
                  <div className="absolute inset-0 flex flex-col justify-between items-center p-6 select-none pointer-events-none pointer-events-none text-center">
                    <span className="text-[10px] font-mono leading-relaxed bg-black/40 border border-white/5 px-2.5 py-1 text-zinc-300 tracking-widest font-bold">
                      CONFIDENTIAL EVALUATION ONLY • RECIPIENT: {email.toUpperCase()}
                    </span>
                    <span className="text-sm font-mono text-zinc-500/20 rotate-[-15deg] font-black select-none pointer-events-none leading-loose">
                      {companyName.toUpperCase()}<br/>IP LOGGED CONTINUOUSLY
                    </span>
                    <span className="text-[9px] font-mono text-zinc-650 bg-black/40 px-2 rounded">
                      BLOCK RESOLUTION CHECKPOINT OK
                    </span>
                  </div>

                  <div className="space-y-3 z-10">
                    <p className="font-bold text-sm">{activePlaybackFilm.title} sScreener Player</p>
                    <div className="flex justify-center items-center gap-3">
                      <button
                        onClick={() => setPlaying(!playing)}
                        className="bg-white text-zinc-950 text-xs px-3.5 py-1.5 rounded font-bold font-mono"
                      >
                        {playing ? 'PAUSE' : 'PLAY'}
                      </button>
                      <span className="text-xs text-zinc-400 font-mono">Timestamp: {playbackSeconds}s</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Bid Dialog */}
            {selectedFilmForBid && (
              <div className="bg-[#f0f4f9] border border-blue-200 p-5 rounded-xl space-y-4">
                <div className="flex justify-between items-start border-b border-blue-150 pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900">Bid Offer sheet: {selectedFilmForBid.title}</h3>
                    <p className="text-[10px] text-zinc-500">Formulate and broadcast distribution licensing parameters.</p>
                  </div>
                  <button onClick={() => setSelectedFilmForBid(null)} className="text-xs font-mono text-zinc-550 hover:text-zinc-800">
                    Cancel Bid
                  </button>
                </div>

                <form onSubmit={handleSubmitBidOffer} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 block">Licensing Framework</label>
                    <select
                      value={bidRightsType}
                      onChange={(e) => setBidRightsType(e.target.value)}
                      className="w-full p-2 border border-zinc-200 rounded bg-white outline-none"
                    >
                      <option value="SVOD (Streaming)">SVOD (Streaming)</option>
                      <option value="TVOD (Transactional)">TVOD (Transactional)</option>
                      <option value="AVOD (Ad-supported)">AVOD (Ad-supported)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 block">Proposed Price Bid (USD)</label>
                    <input
                      type="number"
                      required
                      value={bidPrice}
                      onChange={(e) => setBidPrice(Number(e.target.value))}
                      className="w-full p-2 border border-zinc-200 rounded bg-white font-mono font-bold"
                    />
                  </div>

                  <div className="md:col-span-2 pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFilmForBid(null)}
                      className="px-4 py-2 border border-zinc-200 rounded text-zinc-700 bg-white hover:bg-zinc-50 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold"
                    >
                      Transmit Proposal Sheet
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filter Tools */}
            <div className="bg-white border border-zinc-200 p-4 rounded-xl flex gap-3 text-xs">
              <input
                type="text"
                placeholder="Search catalogs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border border-zinc-200 rounded-lg bg-zinc-50 outline-none"
              />
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="border border-zinc-200 rounded-lg p-2 bg-zinc-50 outline-none font-semibold text-zinc-700"
              >
                <option value="ALL">All Genres</option>
                <option value="Drama">Drama</option>
                <option value="Action">Action</option>
                <option value="Science Fiction">Sci-Fi</option>
                <option value="Thriller">Thriller</option>
              </select>
            </div>

            {/* Active Inventory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredFilms.map(film => {
                const scr = buyerScreeners.find(s => s.filmId === film.id);
                const currentStep = getBuyerWorkflowStep(film);

                return (
                  <div key={film.id} className="bg-white border border-zinc-250 p-5 rounded-xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-zinc-900">{film.title}</h4>
                          <span className="text-[10px] font-mono text-zinc-450 uppercase">{film.genre}</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Ready</span>
                      </div>
                      <p className="text-xs text-zinc-650 leading-relaxed line-clamp-2">{film.synopsis}</p>
                    </div>

                    {/* Step visualization mapping */}
                    <div className="bg-zinc-50 border border-zinc-150 p-2 text-[10px] rounded flex justify-between items-center font-sans">
                      <span className="text-zinc-500">Current Step:</span>
                      <span className="font-mono font-black text-zinc-800">{currentStep.toUpperCase()}</span>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-zinc-150">
                      {scr?.status === 'APPROVED' ? (
                        <button
                          onClick={() => { setPlaying(true); setPlaybackSeconds(0); setActivePlaybackFilm(film); }}
                          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-[11px] py-1.5 rounded text-center flex items-center justify-center gap-1 font-bold"
                        >
                          <Play className="h-3 w-3 fill-white" />
                          WATCH SCREENER
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRequestScreenerFlow(film)}
                          className="flex-1 bg-white hover:bg-zinc-100 text-zinc-800 text-[11px] font-mono py-1.5 rounded border border-zinc-200 text-center font-bold"
                        >
                          REQUEST ACCESS
                        </button>
                      )}

                      <button
                        onClick={() => { setSelectedFilmForBid(film); }}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] py-1.5 rounded text-center font-bold"
                      >
                        BID DESK
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: STORAGE */}
        {activeTab === 'STORAGE' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Storage Allocated</h2>
              <p className="text-xs text-zinc-500">Monitor active download allocations and localized evaluate vaults.</p>
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
                StreamVista subscription frameworks provide a unified 1 TB of media safety storage. Review our Billing Policy page for any excess data allocation overage tariffs.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: LICENSING */}
        {activeTab === 'LICENSING' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Active Negotiations</h2>
              <p className="text-xs text-zinc-500">Track and amend price counterproposals and licensing bounds.</p>
            </div>

            {buyerDeals.filter(d => d.status !== 'EXECUTED').length === 0 ? (
              <div className="bg-white border border-zinc-200 p-8 rounded-xl text-center text-xs text-zinc-500">
                No active or pending deal proposals.
              </div>
            ) : (
              <div className="space-y-4 text-xs font-sans">
                {buyerDeals.filter(d => d.status !== 'EXECUTED').map(deal => (
                  <div key={deal.id} className="bg-white border border-zinc-250 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between items-start font-bold">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{deal.filmTitle}</h4>
                        <span className="text-[10px] font-mono text-zinc-400">ID: {deal.id}</span>
                      </div>
                      <span className="text-zinc-900 font-mono text-sm">${deal.price.toLocaleString()}</span>
                    </div>

                    <div className="bg-zinc-50 p-3 rounded border border-zinc-200 font-mono text-[10px] text-zinc-500 space-y-1">
                      <p>Seller Target: {deal.creatorEmail}</p>
                      <p>Framework Exclusivity: {deal.exclusivity ? 'EXCLUSIVE' : 'NON-EXCLUSIVE'}</p>
                    </div>

                    {/* Counter Propose Action block */}
                    <div className="pt-3 border-t border-zinc-150 flex justify-between items-center bg-zinc-50 p-3 rounded-lg">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-amber-50 text-amber-700">
                        {deal.status}
                      </span>

                      {deal.status === 'COUNTERED' && (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            value={counterPriceInput}
                            onChange={(e) => setCounterPriceInput(Number(e.target.value))}
                            className="p-1 border border-zinc-200 bg-white rounded font-mono text-xs w-24 text-center"
                          />
                          <button
                            onClick={() => handlePlaceCounterOffer(deal)}
                            className="bg-zinc-900 hover:bg-zinc-850 text-white font-mono text-[10px] px-2.5 py-1.5 rounded font-bold"
                          >
                            COUNTER
                          </button>
                          <button
                            onClick={() => handleAgreeAndAccept(deal)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] px-2.5 py-1.5 rounded font-bold"
                          >
                            AGREE
                          </button>
                        </div>
                      )}

                      {deal.status === 'ACCEPTED' && (
                        <div>
                          {signingDealId === deal.id ? (
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Type Name to Sign"
                                value={signatureName}
                                onChange={(e) => setSignatureName(e.target.value)}
                                className="text-xs p-1.5 border border-zinc-200 bg-white rounded font-mono w-32"
                              />
                              <button
                                onClick={() => handleConfirmSignature(deal)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded font-bold"
                              >
                                Sign
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSigningDealId(deal.id)}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-bold"
                            >
                              Sign Contract Agreement
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CONTRACTS */}
        {activeTab === 'CONTRACTS' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Fully Executed Contracts</h2>
              <p className="text-xs text-zinc-500">Mutually countersigned legal distribution covenants.</p>
            </div>

            {buyerDeals.filter(d => d.status === 'EXECUTED').length === 0 ? (
              <div className="bg-white border border-zinc-200 p-8 rounded-xl text-center text-xs text-zinc-500">
                No completed agreements found.
              </div>
            ) : (
              <div className="space-y-4">
                {buyerDeals.filter(d => d.status === 'EXECUTED').map(deal => (
                  <div key={deal.id} className="bg-white border border-zinc-250 rounded-xl p-5 space-y-3 font-sans text-xs">
                    <div className="flex justify-between items-start font-bold">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{deal.filmTitle}</h4>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-1 inline-block border border-emerald-100">Contract Locked</span>
                      </div>
                      <span className="text-zinc-900 font-mono text-sm">${deal.price.toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-3 rounded-lg border border-zinc-150 text-[10px] font-mono">
                      <div>
                        <span>CREATOR SIGNATURE:</span>
                        <p className="font-bold text-zinc-900">{deal.creatorSignature}</p>
                      </div>
                      <div>
                        <span>BUYER SIGNATURE:</span>
                        <p className="font-bold text-zinc-900">{deal.buyerSignature}</p>
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
              <h2 className="text-xl font-bold tracking-tight">Notifications Log</h2>
              <p className="text-xs text-zinc-500">Receive platform alerts, negotiations progress, and contract updates.</p>
            </div>

            <div className="bg-white border border-zinc-200 divide-y divide-zinc-100 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 text-xs flex gap-3 items-start">
                <Bell className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-zinc-900 font-sans">Organization Profile Cleared</p>
                  <p className="text-zinc-500 mt-0.5 font-sans">Your acquisition representative credentials have been cleared by administrative review.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ACCOUNT */}
        {activeTab === 'ACCOUNT' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight">Account Information</h2>
              <p className="text-xs text-zinc-500">Configure business acquisitions profile details.</p>
            </div>

            <div className="bg-white border border-zinc-250 rounded-xl p-5 space-y-4 text-xs font-sans">
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Assigned Role</span>
                <span className="font-mono bg-zinc-100 border border-zinc-200 text-zinc-750 px-2.5 py-0.5 rounded font-bold text-[9px]">Marketplace Partner (Buyer)</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Representative Credentials</span>
                <span className="font-mono text-zinc-900 font-medium">{email}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Organization Name</span>
                <span className="font-sans text-zinc-900 font-semibold">{companyName}</span>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={onSignOut}
                  className="bg-transparent text-zinc-650 hover:bg-red-50 hover:text-red-700 border border-zinc-200 py-1.5 px-3.5 tracking-tight rounded-lg flex items-center gap-1.5 text-xs font-mono font-bold transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  SIGN OUT OF PORTAL SESSION
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
