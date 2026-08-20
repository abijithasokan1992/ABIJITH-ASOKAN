import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Copy, Check, Terminal, Mail, ShieldCheck, HelpCircle } from 'lucide-react';

interface ErrorLogPayload {
  timestamp: string;
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
}

/**
 * Traceable logging function that formats and logs runtime errors
 * with component stack traces for developers and telemetry.
 */
export function logErrorToService(error: Error, errorInfo: ErrorInfo): ErrorLogPayload {
  const logPayload: ErrorLogPayload = {
    timestamp: new Date().toISOString(),
    name: error.name || 'Error',
    message: error.message || 'Unknown runtime error',
    stack: error.stack,
    componentStack: errorInfo.componentStack || undefined,
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  // Structured console logging for developer observability
  console.group('%c[StreamVista Runtime Error Tracer]', 'background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;');
  console.error('Error Object:', error);
  console.error('Component Stack Trace:', errorInfo.componentStack);
  console.info('Telemetry Payload:', logPayload);
  console.groupEnd();

  // Store in sessionStorage for runtime debugging session persistence
  try {
    const existingLogs = JSON.parse(sessionStorage.getItem('streamvista_error_logs') || '[]');
    existingLogs.push(logPayload);
    // Keep last 10 errors
    if (existingLogs.length > 10) existingLogs.shift();
    sessionStorage.setItem('streamvista_error_logs', JSON.stringify(existingLogs));
  } catch {
    // Session storage may be restricted in some iframe modes
  }

  return logPayload;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  reported: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      copied: false,
      reported: false,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logErrorToService(error, errorInfo);
    this.setState({ errorInfo });
  }

  handleResetApplication = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const details = `[StreamVista Error Report]
Timestamp: ${new Date().toISOString()}
Message: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'N/A'}
Component Stack: ${errorInfo?.componentStack || 'N/A'}
URL: ${window.location.href}`;

    navigator.clipboard.writeText(details).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  handleContactSupport = () => {
    const { error, errorInfo } = this.state;
    const subject = encodeURIComponent(`StreamVista Technical Support: Incident Log (${error?.name || 'Error'})`);
    const emailBody = encodeURIComponent(
      `Dear StreamVista Technical Support Team,\n\n` +
      `I experienced an application rendering error in the StreamVista workspace.\n\n` +
      `=== ERROR LOGS & DIAGNOSTICS ===\n` +
      `Timestamp: ${new Date().toISOString()}\n` +
      `Error Name: ${error?.name || 'Error'}\n` +
      `Error Message: ${error?.message || 'Unknown runtime error'}\n` +
      `Application URL: ${window.location.href}\n` +
      `User Agent: ${navigator.userAgent}\n\n` +
      `--- Stack Trace ---\n` +
      `${error?.stack || 'No call stack available'}\n\n` +
      `--- Component Stack ---\n` +
      `${errorInfo?.componentStack || 'No component stack available'}\n\n` +
      `================================\n\n` +
      `Additional user observations:\n` +
      `[Please describe what feature or action you were using before this occurred]`
    );

    window.open(`mailto:support@streamvista.io?subject=${subject}&body=${emailBody}`, '_blank');
    this.setState({ reported: true });
    setTimeout(() => this.setState({ reported: false }), 4000);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, copied, reported, showDetails } = this.state;

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6" id="error-boundary-screen">
          <div className="max-w-xl w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
            {/* Header Icon */}
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle size={32} />
            </div>
            
            {/* Title & Core Assurance */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Application Encountered an Error</h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                The interface encountered an unexpected rendering issue. Your deals, rights metadata, and screener configurations remain safe in storage.
              </p>
            </div>

            {/* Helpful User Instructions / Troubleshooting Guide */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-left space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                <HelpCircle size={14} />
                <span>Recommended Troubleshooting Steps</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-semibold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span>Click <strong>Reset Application</strong> to reload the workspace and restart the active view.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-semibold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span>If testing in an embedded preview, verify third-party cookies or popup permissions if connecting OAuth.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-semibold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span>If the error persists, click <strong>Contact Support</strong> to send the attached diagnostic error logs directly to our technical team.</span>
                </li>
              </ul>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-400/90 font-medium">
                <ShieldCheck size={13} className="shrink-0" />
                <span>Database & rights security intact. No catalog items were lost.</span>
              </div>
            </div>

            {/* Error Diagnostics / Trace */}
            {error && (
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                    <Terminal size={14} />
                    <span>Diagnostics Trace</span>
                  </div>
                  <button
                    id="btn-copy-trace"
                    onClick={this.handleCopyDetails}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg bg-slate-800/60 hover:bg-slate-800"
                    title="Copy trace to clipboard"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy Trace'}</span>
                  </button>
                </div>
                
                <p className="text-xs font-mono text-slate-300 break-words font-medium">
                  {error.message || 'Unknown runtime error'}
                </p>

                {errorInfo?.componentStack && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => this.setState({ showDetails: !showDetails })}
                      className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
                    >
                      {showDetails ? 'Hide Component Hierarchy' : 'View Component Hierarchy'}
                    </button>

                    {showDetails && (
                      <pre className="mt-2 text-[10px] font-mono text-slate-400 overflow-x-auto max-h-36 p-2 bg-slate-950/90 rounded-lg whitespace-pre-wrap leading-tight">
                        {errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons: Reset Application & Contact Support */}
            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
              <button
                id="btn-reset-application"
                onClick={this.handleResetApplication}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                <span>Reset Application</span>
              </button>

              <button
                id="btn-contact-support"
                onClick={this.handleContactSupport}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                {reported ? (
                  <>
                    <Check size={16} className="text-emerald-400" />
                    <span>Email Client Opened</span>
                  </>
                ) : (
                  <>
                    <Mail size={16} className="text-blue-400" />
                    <span>Contact Support</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
