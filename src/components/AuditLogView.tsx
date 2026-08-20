import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, Search, Filter, Download, Clock, User, 
  FileCheck2, Eye, RefreshCw, Key, ShieldAlert, Sparkles,
  ChevronDown, ChevronRight, CheckCircle2, ArrowRightLeft,
  Film, Briefcase, Scale, AlertCircle, HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuditLog, AuditAction, UserRole } from '../types';
import { AuditFrequencyChart } from './AuditFrequencyChart';

interface AuditLogViewProps {
  logs: AuditLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
  currentUserRole?: UserRole;
  onManualLog?: (action: AuditAction, details: string) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  isLoading = false,
  onRefresh,
  currentUserRole = 'BUYER',
  onManualLog
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Action filter
      if (selectedActionFilter !== 'ALL' && log.action !== selectedActionFilter) {
        return false;
      }
      // Role filter
      if (selectedRoleFilter !== 'ALL' && log.role !== selectedRoleFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDetails = log.details?.toLowerCase().includes(q);
        const matchesEmail = log.userEmail?.toLowerCase().includes(q);
        const matchesName = log.userName?.toLowerCase().includes(q);
        const matchesResource = log.resourceId?.toLowerCase().includes(q);
        const matchesAction = log.action?.toLowerCase().includes(q);
        if (!matchesDetails && !matchesEmail && !matchesName && !matchesResource && !matchesAction) {
          return false;
        }
      }
      return true;
    });
  }, [logs, selectedActionFilter, selectedRoleFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const dealsSigned = logs.filter(l => l.action === 'deal_signed').length;
    const rlsViolations = logs.filter(l => l.action === 'RLS_VIOLATION').length;
    const screenersViewed = logs.filter(l => l.action === 'screener_viewed').length;
    const roleSwitches = logs.filter(l => l.action === 'role_switched').length;
    return { total, dealsSigned, rlsViolations, screenersViewed, roleSwitches };
  }, [logs]);

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'RLS_VIOLATION':
        return {
          label: 'RLS VIOLATION (BLOCKED)',
          bg: 'bg-rose-500/10 text-rose-700 border-rose-500/30 font-extrabold',
          icon: <ShieldAlert size={13} className="text-rose-600 animate-pulse" />
        };
      case 'deal_signed':
        return {
          label: 'DEAL SIGNED',
          bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
          icon: <FileCheck2 size={13} className="text-emerald-600" />
        };
      case 'screener_viewed':
        return {
          label: 'SCREENER VIEWED',
          bg: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
          icon: <Eye size={13} className="text-violet-600" />
        };
      case 'role_switched':
        return {
          label: 'ROLE SWITCHED',
          bg: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
          icon: <ArrowRightLeft size={13} className="text-amber-600" />
        };
      case 'deal_proposed':
        return {
          label: 'DEAL PROPOSED',
          bg: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
          icon: <Briefcase size={13} className="text-blue-600" />
        };
      case 'screener_created':
        return {
          label: 'SCREENER CREATED',
          bg: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30',
          icon: <Film size={13} className="text-indigo-600" />
        };
      case 'user_login':
        return {
          label: 'AUTH LOGIN',
          bg: 'bg-slate-500/10 text-slate-700 border-slate-500/30',
          icon: <Key size={13} className="text-slate-600" />
        };
      case 'asset_updated':
        return {
          label: 'STUDIO ASSET UPDATED',
          bg: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
          icon: <Film size={13} className="text-amber-600" />
        };
      default:
        return {
          label: action.replace('_', ' ').toUpperCase(),
          bg: 'bg-slate-500/10 text-slate-700 border-slate-500/30',
          icon: <ShieldCheck size={13} className="text-slate-600" />
        };
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'BUYER':
        return <Briefcase size={12} className="text-blue-500" />;
      case 'CONTENT_OWNER':
        return <Film size={12} className="text-emerald-500" />;
      case 'ADMIN':
        return <Scale size={12} className="text-amber-500" />;
      default:
        return <User size={12} className="text-slate-400" />;
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'ISO Date', 'Action', 'User Name', 'User Email', 'Role', 'Details', 'Resource ID'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      new Date(l.timestamp).toISOString(),
      l.action,
      `"${l.userName.replace(/"/g, '""')}"`,
      l.userEmail,
      l.role,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.resourceId || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `streamvista_compliance_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Compliance &amp; Activity Audit Trail</h2>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Firebase Firestore Synced</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident activity logs stored in the Firebase <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">audit_logs</code> collection for governance, security, and licensing verification.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Refresh logs from Firestore"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'} />
              <span>Refresh</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-40"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Recorded Logs</span>
            <ShieldCheck size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.total}</div>
          <p className="text-[11px] text-slate-500">Firestore &amp; Supabase items</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Deals Signed</span>
            <FileCheck2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">{stats.dealsSigned}</div>
          <p className="text-[11px] text-slate-500">Counter-signed contracts</p>
        </div>

        <div className={`p-4 rounded-2xl shadow-2xs space-y-1 border ${stats.rlsViolations > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${stats.rlsViolations > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
              RLS Violations Blocked
            </span>
            <ShieldAlert size={16} className={stats.rlsViolations > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'} />
          </div>
          <div className={`text-2xl font-black tracking-tight ${stats.rlsViolations > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {stats.rlsViolations}
          </div>
          <p className={`text-[11px] ${stats.rlsViolations > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
            {stats.rlsViolations > 0 ? 'Security breaches logged' : 'Zero policy violations'}
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Screeners Viewed</span>
            <Eye size={16} className="text-violet-500" />
          </div>
          <div className="text-2xl font-black text-violet-600 tracking-tight">{stats.screenersViewed}</div>
          <p className="text-[11px] text-slate-500">Watermarked safeplay sessions</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Role Transitions</span>
            <ArrowRightLeft size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">{stats.roleSwitches}</div>
          <p className="text-[11px] text-slate-500">Perspective modifications</p>
        </div>
      </div>

      {/* 30-Day Activity Frequency D3 Line Chart */}
      <AuditFrequencyChart logs={logs} />

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, email, user, details, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Action Type Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Action:</span>
          <select
            value={selectedActionFilter}
            onChange={(e) => setSelectedActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            <option value="RLS_VIOLATION">🚨 RLS Violation (Security Alert)</option>
            <option value="deal_signed">Deal Signed</option>
            <option value="screener_viewed">Screener Viewed</option>
            <option value="role_switched">Role Switched</option>
            <option value="deal_proposed">Deal Proposed</option>
            <option value="screener_created">Screener Created</option>
            <option value="asset_updated">Studio Asset Updated</option>
            <option value="user_login">Auth Login</option>
          </select>
        </div>

        {/* Role Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Role:</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="BUYER">Buyer (Acquisitions)</option>
            <option value="CONTENT_OWNER">Studio (Seller)</option>
            <option value="ADMIN">Legal Advisor</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table / List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShieldAlert size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">No matching audit events found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {logs.length === 0 
                ? "Key user actions like signing deals, viewing screeners, switching roles, and blocked RLS violations will be recorded here in real-time."
                : "Try adjusting your search criteria or resetting filters."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const isExpanded = expandedLogId === log.id;
              const formattedDate = new Date(log.timestamp).toLocaleString();
              const isRlsViolation = log.action === 'RLS_VIOLATION';

              return (
                <div 
                  key={log.id} 
                  className={`transition-colors ${isRlsViolation ? 'bg-rose-50/30 border-l-4 border-l-rose-500 hover:bg-rose-50/50' : 'hover:bg-slate-50/70'}`}
                >
                  <div 
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                  >
                    {/* Left: Action badge & details */}
                    <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        <button 
                          className="text-slate-400 hover:text-slate-600 transition-transform"
                          aria-label="Toggle details"
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badge.bg}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>

                          <span className="text-[11px] font-mono text-slate-400">
                            {log.id}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-900 leading-snug">
                          {log.details}
                        </p>

                        {log.resourceId && (
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                            <span>Target: <span className="font-mono text-slate-700 font-semibold">{log.resourceId}</span></span>
                            {log.resourceType && (
                              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] uppercase font-bold">
                                {log.resourceType}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actor & Timestamp */}
                    <div className="flex flex-row md:flex-col md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 shrink-0 gap-1 text-right">
                      <div className="flex items-center md:justify-end space-x-1.5">
                        {getRoleIcon(log.role)}
                        <span className="text-xs font-bold text-slate-800">{log.userName || log.userEmail}</span>
                      </div>
                      
                      <div className="text-[11px] text-slate-500 font-mono flex items-center md:justify-end space-x-1">
                        <Clock size={11} className="text-slate-400" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Metadata Inspector */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-6 pb-4 bg-slate-50 border-t border-slate-100"
                      >
                        <div className="pt-3 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            <span>Audit Record Metadata &amp; Compliance Context</span>
                            <span className="font-mono text-blue-600">UID: {log.userId}</span>
                          </div>

                          <div className="bg-slate-950 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto shadow-inner">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify({
                                logId: log.id,
                                action: log.action,
                                actor: {
                                  userId: log.userId,
                                  userEmail: log.userEmail,
                                  userName: log.userName,
                                  role: log.role
                                },
                                resource: {
                                  id: log.resourceId || null,
                                  type: log.resourceType || null
                                },
                                metadata: log.metadata || {},
                                timestamp: log.timestamp,
                                isoDate: new Date(log.timestamp).toISOString()
                              }, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
