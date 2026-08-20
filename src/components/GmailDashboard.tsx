import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, RefreshCw, LogOut, Loader2, CheckCircle2, AlertCircle, 
  Search, Reply, Forward, Sparkles, Tag, Film, FileText, Lock, Eye, 
  Inbox, SendHorizontal, Check, CornerDownRight, X
} from 'lucide-react';
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
  to?: string;
  date?: string;
  body?: string;
  category?: 'SCREENER' | 'DEAL' | 'LEGAL' | 'INQUIRY' | 'GENERAL';
}

const LICENSING_TEMPLATES = [
  {
    id: 'screener_invitation',
    label: 'SafePlay Screener Invitation',
    icon: Film,
    subject: 'SafePlay Private Screener Access: [Movie Title]',
    body: `Dear Acquisition Team,

We are pleased to grant you private, forensically watermarked screening access for "[Movie Title]".

Access Details:
• Title: [Movie Title]
• Security: Forensic Burn-in Dynamic Watermark
• Screening Link: https://streamvista.ai/screeners/demo
• Validity: 14 Days from issuance

Please feel free to reach out with your territory requirements and licensing proposals.

Best regards,
StreamVista Content Rights & Distribution Team`
  },
  {
    id: 'deal_term_sheet',
    label: 'Licensing Term Sheet',
    icon: FileText,
    subject: 'Licensing Offer & Term Sheet: [Movie Title] - [Territory]',
    body: `Dear Licensor / Sales Agent,

Following our internal review, we are formalizing our commercial distribution proposal:

• Title: [Movie Title]
• Territory: [e.g. North America / DACH / APAC]
• Media Rights: SVOD & Pay-TV Exclusive
• Minimum Guarantee: $450,000 USD
• License Term: 36 Months

Please review the attached terms and let us know if we can proceed to the standard distribution contract.

Sincerely,
Content Acquisition Group`
  },
  {
    id: 'rights_inquiry',
    label: 'Territory Rights Availability',
    icon: Lock,
    subject: 'Rights Clearance Inquiry: [Movie Title] ([Territory])',
    body: `Hello Distribution Operations,

We are requesting a real-time rights clearance and holdback status verification for:

• Feature: [Movie Title]
• Target Territories: [Territory Names]
• Target Windows: SVOD / AVOD (2026-2029)

Please confirm if current holdbacks or prior exclusive output deals conflict with these territories.

Thank you,
Rights Management Desk`
  }
];

const SIMULATED_MESSAGES: Message[] = [
  {
    id: 'sim-1',
    from: 'Netflix Acquisition Group <acquisitions@netflix.com>',
    to: 'licensing@streamvista.cloud',
    subject: 'RE: SafePlay Private Screener - "Echoes of Eternity"',
    snippet: 'The team completed the QC screening visual review. The watermarks render perfectly and there are no drop-frame artifacts in the streaming feed. We are preparing a proposed deal.',
    body: `Hi StreamVista Licensing Team,

Our acquisitions and QC teams finished evaluating "Echoes of Eternity" via the SafePlay player.

The forensic watermarking rendered cleanly on our test hardware, and video/audio bitrates met all studio compliance specifications. 

We would like to schedule a call this Thursday at 2:00 PM PST to discuss exclusive SVOD rights for North America and Latin America.

Best,
Acquisitions & Global Content
Netflix, Inc.`,
    date: 'June 17, 2026',
    category: 'SCREENER'
  },
  {
    id: 'sim-2',
    from: 'A24 Licensing <legal@a24films.com>',
    to: 'licensing@streamvista.cloud',
    subject: 'Contract Signed Notification: "The Silent Chord"',
    snippet: 'Contracts for the exclusive SVOD rights of "The Silent Chord" in the DACH territories have been officially counter-signed and counter-logged. PDF copy attached.',
    body: `Dear Distribution Partners,

We are pleased to confirm that the Content Licensing and Distribution Agreement for "The Silent Chord" (DACH Territory, SVOD Exclusive) has been counter-signed by our Executive Vice President.

The countersigned agreement has been uploaded to the StreamVista Rights Cloud ledger and logged for immutable audit. 

Please find delivery schedules and master tape delivery protocols in the portal.

Kind regards,
Business & Legal Affairs
A24 Films`,
    date: 'June 16, 2026',
    category: 'LEGAL'
  },
  {
    id: 'sim-3',
    from: 'Paramount Studios Admin <distribution@paramount.com>',
    to: 'licensing@streamvista.cloud',
    subject: 'Screener Created Alert: "Neon Shadows"',
    snippet: 'Forensic screening link has been compiled for screening tier 2 with specific dynamic buyer identity tracking. Valid for 14 days.',
    body: `Automated Notification:

A new private screener link has been issued:
• Title: Neon Shadows (4K UHD Master)
• Watermark: Forensic Dynamic IP Burn-in
• Recipient: buyers-desk@warner.com
• Expiration: 14 days

Any unauthorized screen capture or stream interception attempts will trigger immediate IP revocation.`,
    date: 'June 14, 2026',
    category: 'DEAL'
  }
];

export const GmailDashboard: React.FC<GmailDashboardProps> = ({ 
  user, 
  token, 
  onLogout,
  composeTemplate,
  clearTemplate
}) => {
  const isSimulated = !token || token.includes('enterprise_bearer');

  const [messages, setMessages] = useState<Message[]>(SIMULATED_MESSAGES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Selected Email for Detail Reading Modal
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Compose Form state
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
      
      setTimeout(() => {
        setMessages(SIMULATED_MESSAGES);
        setLoading(false);
        setIsRefreshing(false);
      }, 600);
      return;
    }

    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15', {
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
              const subj = headers.find((h: any) => h.name === 'Subject' || h.name === 'subject')?.value || '(No Subject)';
              const fromVal = headers.find((h: any) => h.name === 'From' || h.name === 'from')?.value || 'Unknown Sender';
              const toVal = headers.find((h: any) => h.name === 'To' || h.name === 'to')?.value || '';
              const dateVal = new Date(parseInt(detail.internalDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              let category: Message['category'] = 'GENERAL';
              const lowSubj = subj.toLowerCase();
              if (lowSubj.includes('screener') || lowSubj.includes('safeplay') || lowSubj.includes('preview')) category = 'SCREENER';
              else if (lowSubj.includes('deal') || lowSubj.includes('term sheet') || lowSubj.includes('offer')) category = 'DEAL';
              else if (lowSubj.includes('contract') || lowSubj.includes('agreement') || lowSubj.includes('legal')) category = 'LEGAL';
              else if (lowSubj.includes('rights') || lowSubj.includes('inquiry')) category = 'INQUIRY';

              return {
                id: detail.id,
                snippet: detail.snippet,
                subject: subj,
                from: fromVal,
                to: toVal,
                body: detail.snippet,
                date: dateVal,
                category
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
      setTimeout(() => {
        const newMessage: Message = {
          id: `sim-new-${Date.now()}`,
          from: `${user?.displayName || 'StreamVista Operator'} <${user?.email || 'operator@streamvista.cloud'}>`,
          to,
          subject,
          snippet: body.substring(0, 140) + (body.length > 140 ? '...' : ''),
          body,
          date: 'Just Now',
          category: 'DEAL'
        };

        setMessages((prev) => [newMessage, ...prev]);
        setSendSuccess(true);
        setTo('');
        setSubject('');
        setBody('');
        setIsSending(false);
        setTimeout(() => setSendSuccess(false), 3000);
      }, 800);
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

      if (!response.ok) throw new Error('Gmail API response error. Ensure mailing permissions are granted.');
      
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

  const handleQuickReply = (msg: Message) => {
    // Extract email from "Name <email@domain.com>"
    const emailMatch = msg.from?.match(/<([^>]+)>/) || [null, msg.from];
    const replyTo = emailMatch[1] || msg.from || '';
    
    setTo(replyTo);
    setSubject(msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject || ''}`);
    setBody(`\n\n--- Original Message from ${msg.from} on ${msg.date} ---\n${msg.body || msg.snippet}`);
    setSelectedMessage(null);
  };

  const handleApplyTemplate = (tmpl: typeof LICENSING_TEMPLATES[0]) => {
    setSubject(tmpl.subject);
    setBody(tmpl.body);
  };

  // Filtered Messages
  const filteredMessages = messages.filter((msg) => {
    const matchesSearch = 
      (msg.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (msg.from?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (msg.snippet || '').includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || msg.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="gmail-dashboard-container" className="space-y-6">
      {/* Account Info Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center border border-blue-200 shrink-0">
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
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Gmail API Connected</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">{user?.email || 'abijithasokan1992@gmail.com'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => fetchEmails()}
            disabled={isRefreshing || loading}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
            <span>Sync Mailbox</span>
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-xl transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Mail Grid: Inbox & Fast Composer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Email Thread Browser (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Inbox size={15} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Licensing Mailbox</h3>
                <p className="text-[11px] text-slate-500">Inbox & deal notifications from film buyers & studios</p>
              </div>
            </div>

            {/* Category Pills */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded-xl text-[11px] font-semibold overflow-x-auto">
              {['ALL', 'SCREENER', 'DEAL', 'LEGAL'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'ALL' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by sender, movie title, or deal subject..."
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Email List Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Fetching emails from Gmail API...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-rose-600 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
                <p className="text-xs font-semibold">{error}</p>
                <button 
                  onClick={() => fetchEmails()} 
                  className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer underline"
                >
                  Retry Connection
                </button>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No matching messages found in mailbox.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredMessages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedMessage(msg)}
                    className="p-4 hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="font-bold text-xs text-slate-900 truncate">{msg.from}</span>
                        {msg.category && (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            msg.category === 'SCREENER' ? 'bg-violet-50 text-violet-700' :
                            msg.category === 'DEAL' ? 'bg-emerald-50 text-emerald-700' :
                            msg.category === 'LEGAL' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {msg.category}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap pl-2">{msg.date}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mb-1 leading-snug line-clamp-1">{msg.subject}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{msg.snippet}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fast Email Dispatcher (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <SendHorizontal size={15} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Compose & Dispatch</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Gmail Send API</span>
          </div>

          {/* Quick Licensing Templates */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles size={11} className="text-amber-500" />
                <span>Quick Licensing Templates</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LICENSING_TEMPLATES.map((tmpl) => {
                const IconComponent = tmpl.icon;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-[11px] font-semibold text-slate-700 hover:text-blue-700 transition-all cursor-pointer shadow-2xs"
                  >
                    <IconComponent size={12} className="text-slate-500" />
                    <span>{tmpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Composer Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <form onSubmit={handleSendEmail} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient (To)</label>
                <input 
                  type="email" 
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="buyer@netflix.com or studio@a24.com"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium"
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="SafePlay Screening / Deal Term Sheet"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message Content</label>
                <textarea 
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Compose your distribution memo, screener instructions, or deal reply..."
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none placeholder:text-slate-400 leading-relaxed font-sans"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSending}
                className={`w-full py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer ${
                  sendSuccess ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800 active:scale-98'
                } disabled:opacity-50`}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching via Gmail...</span>
                  </>
                ) : sendSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Email Sent Successfully!</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Message Reader Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      Gmail Message
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{selectedMessage.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                    {selectedMessage.subject}
                  </h3>
                  <div className="text-xs text-slate-600 font-medium">
                    From: <span className="font-semibold text-slate-900">{selectedMessage.from}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Message Body */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                {selectedMessage.body || selectedMessage.snippet}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">StreamVista Secure Gateway</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleQuickReply(selectedMessage)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Reply size={13} />
                    <span>Reply in Composer</span>
                  </button>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

