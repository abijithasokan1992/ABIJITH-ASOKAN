import React, { useState } from 'react';
import { 
  Database, Users, Video, DollarSign, Key, Eye, Search, 
  CheckCircle, ArrowUpRight, Copy, Check, ShieldCheck, Film, Layers
} from 'lucide-react';
import { 
  REAL_USERS, REAL_FILMS, REAL_FILM_BUYER_MAPPINGS, 
  REAL_RAZORPAY_PAYMENTS, REAL_VIDEO_UPLOADS, REAL_LOGIN_TOKENS, REAL_VIEW_HISTORY 
} from '../data';

export const ProductionDatabaseViewer: React.FC = () => {
  const [activeTable, setActiveTable] = useState<'films' | 'users' | 'mappings' | 'payments' | 'uploads' | 'tokens' | 'views'>('films');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="space-y-6 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Production PostgreSQL Master Store</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REAL PROD DATA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Direct snapshot of active users, film catalogue, buyer distribution mappings, Razorpay transactions, and S3 multipart assets.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder={`Search ${activeTable}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table Navigation Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'films', label: 'Films & Masters', count: REAL_FILMS.length, icon: Film },
          { id: 'users', label: 'Registered Users', count: REAL_USERS.length, icon: Users },
          { id: 'mappings', label: 'Buyer Mappings', count: REAL_FILM_BUYER_MAPPINGS.length, icon: Layers },
          { id: 'payments', label: 'Razorpay Payments', count: REAL_RAZORPAY_PAYMENTS.length, icon: DollarSign },
          { id: 'uploads', label: 'Video S3 Uploads', count: REAL_VIDEO_UPLOADS.length, icon: Video },
          { id: 'views', label: 'View Telemetry', count: REAL_VIEW_HISTORY.length, icon: Eye },
          { id: 'tokens', label: 'Auth Tokens', count: REAL_LOGIN_TOKENS.length, icon: Key },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTable(tab.id as any); setSearchQuery(''); }}
            className={`px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer ${
              activeTable === tab.id
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
            }`}
          >
            <tab.icon size={13} />
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTable === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700/60 text-slate-300'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table Views */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-inner">
        {/* 1. FILMS TABLE */}
        {activeTable === 'films' && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Title & Language</th>
                  <th className="py-3 px-4">Director / Producer</th>
                  <th className="py-3 px-4">Territory Clearance</th>
                  <th className="py-3 px-4">Duration & Views</th>
                  <th className="py-3 px-4">Master Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {REAL_FILMS
                  .filter(f => !searchQuery || f.title.toLowerCase().includes(searchQuery.toLowerCase()) || f.language.toLowerCase().includes(searchQuery.toLowerCase()) || f.director.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(film => (
                    <tr key={film.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-emerald-400 font-bold">#{film.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{film.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-2 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">{film.language}</span>
                          <span>{film.country}</span>
                          <span>• Release: {film.release_date || 'TBD'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200">Dir: <span className="font-semibold text-white">{film.director || 'N/A'}</span></div>
                        <div className="text-[10px] text-slate-400">Prod: {film.producer || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4 max-w-[220px]">
                        <span className="text-[11px] text-slate-300 truncate block" title={film.distribution_territories}>
                          {film.distribution_territories || 'Worldwide Standard'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div>{film.duration} min</div>
                        <div className="text-slate-500 text-[10px]">{film.views_count} views</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px]">
                        {film.video_file ? (
                          <button
                            onClick={() => copyToClipboard(film.video_file, `film-${film.id}`)}
                            className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                            title="Copy Master Video Path"
                          >
                            <span className="truncate max-w-[120px]">{film.video_file.split('/').pop()}</span>
                            {copiedKey === `film-${film.id}` ? <Check size={12} className="text-emerald-400 shrink-0" /> : <Copy size={12} className="shrink-0" />}
                          </button>
                        ) : (
                          <span className="text-slate-600">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. USERS TABLE */}
        {activeTable === 'users' && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Name / Contact</th>
                  <th className="py-3 px-4">Role &amp; Category</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {REAL_USERS
                  .filter(u => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) || (u.company_name && u.company_name.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map(u => (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-indigo-400 font-bold">#{u.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{u.first_name} {u.last_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                        {u.company_name && <div className="text-[10px] text-amber-300 font-semibold">{u.company_name}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          u.user_type === 'buyer_partner' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          u.user_type === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {u.user_type || 'creator_partner'}
                        </span>
                        {u.user_subcategory && (
                          <div className="text-[10px] text-slate-400 mt-1 capitalize">
                            {u.user_subcategory.replace(/_/g, ' ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        {u.phone || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {u.date_joined.split(' ')[0]}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {u.last_login ? u.last_login.split(' ')[0] : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. BUYER MAPPINGS TABLE */}
        {activeTable === 'mappings' && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mapping ID</th>
                  <th className="py-3 px-4">Buyer Partner</th>
                  <th className="py-3 px-4">Target Film</th>
                  <th className="py-3 px-4">Mapping Notes / Rights Scope</th>
                  <th className="py-3 px-4">Mapped Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {REAL_FILM_BUYER_MAPPINGS
                  .filter(m => !searchQuery || m.notes.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(m => {
                    const buyer = REAL_USERS.find(u => u.id === m.buyer_id);
                    const film = REAL_FILMS.find(f => f.id === m.film_id);
                    return (
                      <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-purple-400 font-bold">#{m.id}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{buyer?.company_name || `${buyer?.first_name} ${buyer?.last_name}`}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{buyer?.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-emerald-300">{film?.title || `Film #${m.film_id}`}</div>
                          <div className="text-[10px] text-slate-400">{film?.language} • {film?.country}</div>
                        </td>
                        <td className="py-3 px-4 max-w-[280px]">
                          <p className="text-[11px] text-slate-300 line-clamp-2" title={m.notes}>
                            {m.notes || 'Direct catalogue distribution mapping.'}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                          {m.mapped_at.split(' ')[0]}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            m.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {m.is_active ? 'ACTIVE' : 'ARCHIVED'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. RAZORPAY PAYMENTS TABLE */}
        {activeTable === 'payments' && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment ID / Status</th>
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {REAL_RAZORPAY_PAYMENTS.map(p => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-cyan-400 font-bold">{p.razorpay_order_id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{p.notes.user_name || `User #${p.user_id}`}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.notes.user_email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ₹{p.amount.toLocaleString()} {p.currency}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {p.status.toUpperCase()}
                        </span>
                      </div>
                      {p.razorpay_payment_id && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{p.razorpay_payment_id}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {p.receipt}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {p.created_at.split('.')[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. VIDEO UPLOADS TABLE */}
        {activeTable === 'uploads' && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Upload ID</th>
                  <th className="py-3 px-4">Film ID</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">S3 Key Path</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Completed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {REAL_VIDEO_UPLOADS.map(u => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-rose-400 font-bold">#{u.id}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">Film #{u.film_id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{u.file_name}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400 max-w-[260px] truncate" title={u.s3_key}>
                      {u.s3_key}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {u.created_at.split(' ')[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. VIEW TELEMETRY TABLE */}
        {activeTable === 'views' && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Film ID</th>
                  <th className="py-3 px-4">User ID / Viewer</th>
                  <th className="py-3 px-4">Watch Duration</th>
                  <th className="py-3 px-4">Playback Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {REAL_VIEW_HISTORY.map(v => {
                  const user = REAL_USERS.find(u => u.id === v.user_id);
                  const film = REAL_FILMS.find(f => f.id === v.film_id);
                  return (
                    <tr key={v.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-amber-400 font-bold">#{v.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{film?.title || `Film #${v.film_id}`}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{film?.language}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{user?.first_name} {user?.last_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{user?.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-emerald-300 font-bold">
                        {v.watch_duration > 0 ? `${v.watch_duration} min` : 'Screened'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {v.watched_at.split('.')[0]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. AUTH TOKENS TABLE */}
        {activeTable === 'tokens' && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Token ID</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">SHA-256 Hash</th>
                  <th className="py-3 px-4">Used</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {REAL_LOGIN_TOKENS.map(t => (
                  <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-teal-400 font-bold">#{t.id}</td>
                    <td className="py-3 px-4 font-mono text-slate-200 font-semibold">User #{t.user_id}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400 max-w-[220px] truncate" title={t.id_hash}>
                      {t.id_hash}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.used ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {t.used ? 'CONSUMED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {t.created_at.split(' ')[0]}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {t.expires_at.split(' ')[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
