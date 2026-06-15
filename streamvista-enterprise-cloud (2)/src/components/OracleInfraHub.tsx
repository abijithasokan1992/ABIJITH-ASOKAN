/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Database, Shield, Radio, Activity, Terminal, RefreshCw, Layers, HardDrive, CheckCircle2, Info } from 'lucide-react';
import { OracleHealthState, AuditLog } from '../types';

interface OracleInfraHubProps {
  logs: AuditLog[];
  onAddLog: (action: string, details: string) => void;
}

export default function OracleInfraHub({ logs, onAddLog }: OracleInfraHubProps) {
  const [healthState, setHealthState] = useState<OracleHealthState>({
    dbStatus: 'CONNECTED',
    storageStatus: 'HEALTHY',
    readWriteLatency: 12,
    connectionString: 'adb.us-ashburn-1.oraclecloud.com/streamvista_atp',
    dbVersion: 'Oracle Autonomous Database v23',
    bucketSizeGB: 342.8,
    lastChecked: new Date().toISOString(),
    username: 'STREAMVISTA_SECURE_ADMIN'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [responseJson, setResponseJson] = useState<any>(null);

  const runApiCheck = async () => {
    setIsLoading(true);
    setResponseJson(null);
    onAddLog('DB_HEALTH_POLL', 'Autonomous ATP connection and schema validation probe completed.');
    
    setTimeout(() => {
      const ping = Math.floor(Math.random() * 12) + 5;
      setHealthState(prev => ({
        ...prev,
        readWriteLatency: ping,
        lastChecked: new Date().toISOString()
      }));
      setResponseJson({
        status: "ok",
        database: {
          connection: "CONNECTED",
          host: "adb.us-ashburn-1.oraclecloud.com",
          latencyMs: ping,
          poolSize: 16,
          tablesVerified: ["USERS", "FILMS", "CONTRACTS", "NEGOTIATIONS", "AUDITS"]
        },
        storage: {
          region: "us-ashburn-1",
          encryption: "AES256",
          activeBuckets: 3,
          health: "HEALTHY"
        },
        timestamp: new Date().toISOString()
      });
      setIsLoading(false);
    }, 600);
  };

  useEffect(() => {
    runApiCheck();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" id="oracle-infrastructure-hub">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 font-sans flex items-center gap-2">
            System Diagnostics Center
            <span className="relative group cursor-help text-zinc-400 font-normal text-xs uppercase font-sans">
              <Info className="h-4 w-4 inline text-zinc-400" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-zinc-905 bg-gray-900 text-white text-[10px] p-2 rounded shadow-md w-52 z-30 font-sans text-center">
                Interactive panel for verifying system connection and platform log details.
              </div>
            </span>
          </h2>
          <p className="text-xs text-zinc-500 font-sans">Monitor platform integration health and verify secure transaction states.</p>
        </div>
        <button
          onClick={runApiCheck}
          disabled={isLoading}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors border border-zinc-900 disabled:opacity-50"
          id="btn-re-verify-infra"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Verify System Connection
        </button>
      </div>

      {/* Main stats layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Autonomous Database */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col justify-between" id="card-db-health">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="bg-amber-50 text-amber-700 p-2 rounded-lg border border-amber-100">
                <Database className="h-5 w-5" />
              </div>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                Connected
              </span>
            </div>
            
            <h3 className="text-sm font-bold text-zinc-900">Primary Database</h3>
            <p className="text-xs text-zinc-500 font-mono truncate">{healthState.connectionString}</p>

            <div className="border-t border-zinc-100 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Service Version</span>
                <span className="font-mono text-zinc-800 font-semibold">Serverless Core v23</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Service Status</span>
                <span className="font-mono text-emerald-600 font-bold">ACTIVE</span>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500 font-sans">
            <span>Secure Data Encryption</span>
            <Shield className="h-3 w-3 text-emerald-600" />
          </div>
        </div>

        {/* Card 2: Object Storage Vault */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col justify-between" id="card-storage-health">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="bg-blue-50 text-blue-700 p-2 rounded-lg border border-blue-100">
                <HardDrive className="h-5 w-5" />
              </div>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
            
            <h3 className="text-sm font-bold text-zinc-900">Media File Vault Storage</h3>
            <p className="text-xs text-zinc-500 font-mono truncate">os://us-ashburn-1/films/*</p>

            <div className="border-t border-zinc-100 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Primary Region</span>
                <span className="font-sans text-zinc-805">Ashburn, Virginia</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Allocated Storage</span>
                <span className="font-mono text-zinc-850 font-semibold">{healthState.bucketSizeGB} GB</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500 font-sans">
            <span>Redundant Cloud Backups Available</span>
            <CheckCircle2 className="h-3 w-3 text-blue-600" />
          </div>
        </div>

        {/* Card 3: Network Integrity / Health Latency */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col justify-between" id="card-network-health">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="bg-zinc-50 text-zinc-700 p-2 rounded-lg border border-zinc-100">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600">{healthState.readWriteLatency} ms latency</span>
            </div>
            
            <h3 className="text-sm font-bold text-zinc-900">API Connection Handshake</h3>
            <p className="text-xs text-zinc-500 leading-normal">
              Continuous TLS-validated verification link active with low local routing latency.
            </p>

            <div className="border-t border-zinc-100 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Connection Mode</span>
                <span className="font-mono text-[10px] text-zinc-700 bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded">Standard TLS</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500 font-sans">
            <span>Secure Session Stream Active</span>
            <Radio className="h-3 w-3 text-zinc-650 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Simplified Endpoint Prober */}
      <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-5 text-white" id="db-health-api-terminal">
        <div className="flex justify-between items-center pb-2 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono font-semibold tracking-wider text-zinc-300">HTTP Prober: <span className="hover:underline">/api/db-health</span></span>
          </div>
          <span className="bg-emerald-950 font-mono text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-900/60 font-semibold">GET - 200 OK</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4 lg:col-span-1">
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Test database connection responses instantly inside the workspace simulator loop.
            </p>

            <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 space-y-2 text-xs font-mono text-zinc-300">
              <div>
                <p className="text-[10px] text-zinc-500">DB_USER</p>
                <p className="text-xs font-bold text-emerald-400">{healthState.username}</p>
              </div>
              <div className="relative group cursor-help">
                <p className="text-[10px] text-zinc-500">CREDENTIALS [!]</p>
                <p className="text-xs text-zinc-400 font-semibold select-all font-mono">AUTONOMOUS_WALLETS</p>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-zinc-950 text-white text-[10px] p-2 rounded shadow-xl w-48 border border-zinc-800 text-center font-sans">
                  Private wallet keys reside within encrypted backend environment maps.
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <div className="bg-black rounded-lg p-4 font-mono text-xs text-zinc-350 h-44 overflow-y-auto border border-zinc-850 scrollbar-thin">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-550">
                  <RefreshCw className="h-5 w-5 animate-spin mb-1 text-zinc-400" />
                  <p className="text-[10px]">Pinging cloud controller...</p>
                </div>
              ) : responseJson ? (
                <pre>{JSON.stringify(responseJson, null, 2)}</pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                  <p className="text-xs">Click "Verify" above or execute system action to sync.</p>
                </div>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono block text-right">Format: application/json</span>
          </div>
        </div>
      </div>

      {/* Sovereign Audit Trail */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5" id="ledger-audit-trail">
        <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-zinc-700" />
            <h3 className="text-sm font-bold text-zinc-900">Security Ledger Audits</h3>
          </div>
          <span className="text-[10px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full font-mono">{logs.length} Blocks Registered</span>
        </div>

        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {logs.map((log) => (
            <div key={log.id} className="p-3 bg-zinc-50 border border-zinc-150 rounded-lg hover:border-zinc-200 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-zinc-400 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={`px-1.5 py-0.2 select-none uppercase text-[9px] font-mono font-bold ${
                    log.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                    log.role === 'CREATOR' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                    'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {log.role}
                  </span>
                  <span className="bg-zinc-200 text-zinc-800 font-mono text-[9px] px-1 rounded uppercase font-bold">
                    {log.action}
                  </span>
                </div>
                <p className="text-xs font-sans text-zinc-700">
                  {log.details}
                </p>
              </div>

              <div className="text-right">
                <span className="font-mono text-[9px] text-zinc-400 select-all font-bold block">
                  HASH: {log.oracleHash.substring(0, 8)}
                </span>
                <span className="text-[10.5px] text-zinc-500 font-sans block">{log.user.split('@')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
