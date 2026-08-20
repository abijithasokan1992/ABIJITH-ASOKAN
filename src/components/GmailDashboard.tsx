import React, { useState, useEffect } from 'react';
import { Mail, Send, RefreshCw, LogOut, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser } from '../types';

interface GmailDashboardProps {
  user: AppUser | null;
  token: string | null;
  onLogout: () => void;
  composeTemplate?: {
    to: string;
    subject: string;
    body: string;
  } | null;
  clearTemplate?: () => void;
}

interface Message {
  id: string;
  snippet: string;
  subject?: string;
  from?: string;
  date?: string;
}

const SIMULATED_MESSAGES: Message[] = [
  {
    id: 'sim-1',
    from: 'Netflix Acquisition Group <acquisitions@netflix.com>',
    subject: 'RE: SafePlay Private Screener - "Echoes of Eternity"',
    snippet: 'The team completed the QC screening visual review. The watermarks render perfectly and there are no drop-frame artifacts in the streaming feed. We are preparing a proposed deal.',
    date: 'June 17, 2026'
  },
  {
    id: 'sim-2',
    from: 'A24 Licensing <legal@a24films.com>',
    subject: 'Contract Signed Notification: "The Silent Chord"',
    snippet: 'Contracts for the exclusive SVOD rights of "The Silent Chord" in the DACH territories have been officially counter-signed and counter-logged. PDF copy attached.',
    date: 'June 16, 2026'
  },
  {
    id: 'sim-3',
    from: 'Paramount Studios Admin <distribution@paramount.com>',
    subject: 'Screener Created Alert: "Neon Shadows"',
    snippet: 'Forensic screening link has been compiled for screening tier 2 with specific dynamic buyer identity tracking. Valid for 14 days.',
    date: 'June 14, 2026'
  }
];

export const GmailDashboard: React.FC<GmailDashboardProps> = ({ 
  user, 
  token, 
  onLogout,
  composeTemplate,
  clearTemplate
}) => {
  const isSimulated = !token;

  const [messages, setMessages] = useState<Message[]>(isSimulated ? SIMULATED_MESSAGES : []);
  const [loading, setLoading] = useState(!isSimulated);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form state
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Apply template if passed down from the parent (e.g. from screening dispatch or contract dispatch)
  useEffect(() => {
    if (composeTemplate) {
      setTo(composeTemplate.to);
      setSubject(composeTemplate.subject);
      setBody(composeTemplate.body);
      if (clearTemplate) {
        clearTemplate();
      }
    }
  }, [composeTemplate]);

  const fetchEmails = async (silent = false) => {
    if (isSimulated) {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      
      // Simulate fetch delay
      setTimeout(() => {
        setMessages(SIMULATED_MESSAGES);
        setLoading(false);
        setIsRefreshing(false);
      }, 800);
      return;
    }

    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch messages from Google API');
      const data = await response.json();

      if (data.messages && data.messages.length > 0) {
        const fullMessages = await Promise.all(
          data.messages.map(async (msg: { id: string }) => {
            try {
              const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (!detailRes.ok) return null;
              const detail = await detailRes.json();
              
              const headers = detail.payload.headers;
              const subject = headers.find((h: any) => h.name === 'Subject' || h.name === 'subject')?.value || '(No Subject)';
              const from = headers.find((h: any) => h.name === 'From' || h.name === 'from')?.value || 'Unknown Sender';
              const date = new Date(parseInt(detail.internalDate)).toLocaleDateString();

              return {
                id: detail.id,
                snippet: detail.snippet,
                subject,
                from,
                date
              };
            } catch {
              return null;
            }
          })
        );
        setMessages(fullMessages.filter(Boolean) as Message[]);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with Google Mail APIs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [token]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to || !subject || !body) {
      setError('Please fill in all email fields.');
      return;
    }

    setIsSending(true);
    setError(null);

    if (isSimulated) {
      // Handle beautiful simulated dispatch
      setTimeout(() => {
        const newMessage: Message = {
          id: `sim-new-${Date.now()}`,
          from: `${user?.displayName || 'Studio Manager'} <${user?.email || 'ops@streamvista.live'}>`,
          subject,
          snippet: body.substring(0, 150) + (body.length > 150 ? '...' : ''),
          date: 'Just Now'
        };

        setMessages((prev) => [newMessage, ...prev]);
        setSendSuccess(true);
        setTo('');
        setSubject('');
        setBody('');
        setIsSending(false);
        setTimeout(() => setSendSuccess(false), 3000);
      }, 1200);
      return;
    }

    try {
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');

      const encodedMessage = btoa(unescape(encodeURIComponent(message)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedMessage })
      });

      if (!response.ok) throw new Error('Gmail API response error. Ensure the user has authorized mailing permissions.');
      
      setSendSuccess(true);
      setTo('');
      setSubject('');
      setBody('');
      setTimeout(() => setSendSuccess(false), 3000);
      fetchEmails(true);
    } catch (err: any) {
      setError(err.message || 'Error sending email through Gmail API.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center border border-blue-200">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold text-lg">
                {user?.displayName?.[0] || 'S'}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">{user?.displayName || 'StreamVista Operator'}</h2>
              {isSimulated ? (
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded">
                  Demo Sandbox Mode
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  Gmail Verified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono">{user?.email || 'sandbox@streamvista.cloud'}</p>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-100 hover:border-red-100 rounded-xl transition-all self-end md:self-auto active:scale-95"
        >
          <LogOut size={14} />
          <span>Leave Session</span>
        </button>
      </div>

      {isSimulated && (
        <div className="flex items-start space-x-3 p-4 bg-blue-50/60 border border-blue-100 text-blue-700 rounded-xl text-xs leading-relaxed">
          <AlertCircle size={16} className="shrink-0 text-blue-500 mt-0.5" />
          <div>
            <span className="font-bold">Demo Mode:</span> These emails are simulated for testing. If you sign in with your Google Account on the home screen, you will be able to read and send real emails!
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Logs/Inbox */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Mail className="text-blue-500" size={16} />
              <span>{isSimulated ? 'Recent Emails (Mock Inbox)' : 'Recent Emails'}</span>
            </h3>
            
            <button 
              onClick={() => fetchEmails(true)}
              disabled={isRefreshing}
              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 border border-slate-100 hover:border-blue-100 rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs text-slate-500 animate-pulse font-sans uppercase tracking-wider">Syncing emails...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">
                <p className="text-sm font-medium">Error: {error}</p>
                <button onClick={() => fetchEmails()} className="mt-4 text-xs font-semibold underline text-blue-600">Retry Fetching</button>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-24 text-center text-slate-400 text-sm">
                No emails found.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {messages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 hover:bg-slate-50/50 transition-colors group cursor-default"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className="font-bold text-sm text-slate-950 truncate pr-4">{msg.from}</h4>
                      <span className="text-[10px] font-sans text-slate-400 whitespace-nowrap">{msg.date}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mb-1 leading-snug">{msg.subject}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{msg.snippet}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Mail Box */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <Send className="text-emerald-500" size={16} />
            <span>Send New Email</span>
          </h3>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To</label>
                <input 
                  type="email" 
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject Line</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Movie Deal Update"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message</label>
                <textarea 
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  placeholder="Write your email message here..."
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-400 leading-relaxed"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSending}
                className={`w-full py-3 rounded-xl font-bold text-xs text-white flex items-center justify-center space-x-2 transition-all shadow-md uppercase tracking-wider ${
                  sendSuccess ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800 hover:shadow-lg active:scale-95'
                } disabled:opacity-50`}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : sendSuccess ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSending ? 'Sending...' : sendSuccess ? 'Sent!' : 'Send Email'}</span>
              </button>
            </form>
            
            <AnimatePresence>
              {sendSuccess && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-center text-[10px] text-emerald-600 font-bold uppercase tracking-wider pt-1"
                >
                  Notification record log compiled!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
