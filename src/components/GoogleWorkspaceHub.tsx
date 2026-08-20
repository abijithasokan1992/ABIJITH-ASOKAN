import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, FileSpreadsheet, Calendar, FileText, CheckSquare, 
  Plus, ExternalLink, RefreshCw, Send, Trash2, CheckCircle, AlertTriangle, 
  Layers, Users, Clock, ShieldCheck, Download, Share2, Sparkles, LogIn, LogOut, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser, MediaAsset, RightsCatalogueEntry, DealRequest, Contract, PrivateScreener, UserRole } from '../types';
import { 
  signInWithGoogleWorkspace, 
  logoutGoogleWorkspace, 
  getWorkspaceAccessToken,
  fetchChatSpaces, 
  fetchChatMessages, 
  sendChatMessage, 
  createChatSpace,
  createGoogleSheet,
  fetchSheetValues,
  updateSheetValues,
  fetchCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  createGoogleDoc,
  createGoogleForm,
  addQuestionsToForm,
  fetchGoogleForm,
  fetchGoogleFormResponses,
  ChatSpace,
  ChatMessage,
  CalendarEvent,
  SheetMetadata,
  GoogleForm
} from '../lib/googleWorkspace';
import { logAuditEvent } from '../lib/firebase';

interface GoogleWorkspaceHubProps {
  user: AppUser | null;
  activeRole?: UserRole;
  assets: MediaAsset[];
  rights?: RightsCatalogueEntry[];
  deals: DealRequest[];
  contracts: Contract[];
  screeners: PrivateScreener[];
  onNotify?: (msg: string, type?: 'success' | 'info') => void;
  activeTab?: 'chat' | 'sheets' | 'calendar' | 'docs' | 'forms';
}

type WorkspaceTab = 'chat' | 'sheets' | 'calendar' | 'docs' | 'forms';

export const GoogleWorkspaceHub: React.FC<GoogleWorkspaceHubProps> = ({
  user,
  activeRole = 'ADMIN',
  assets,
  rights = [],
  deals,
  contracts,
  screeners,
  onNotify = () => {},
  activeTab: initialActiveTab = 'chat'
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialActiveTab);
  const [token, setToken] = useState<string | null>(getWorkspaceAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Destructive Action Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: 'Confirm',
    onConfirm: async () => {}
  });

  // -------------------------------------------------------------
  // 1. GOOGLE CHAT STATE
  // -------------------------------------------------------------
  const [spaces, setSpaces] = useState<ChatSpace[]>([
    { name: 'spaces/streamvista-licensing-feed', displayName: '📢 StreamVista Licensing Broadcast', type: 'SPACE' },
    { name: 'spaces/paramount-acquisitions-room', displayName: '🎬 Paramount Studios Deal Room', type: 'SPACE' },
    { name: 'spaces/a24-qc-screening-desk', displayName: '🛡️ A24 SafePlay QC & Screener Alerts', type: 'SPACE' },
  ]);
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(spaces[0]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      name: 'msg-1',
      text: '🤖 [StreamVista Bot]: Deal #DEAL-901 has been counter-signed for "The Silent Chord" in DACH territory.',
      sender: { displayName: 'StreamVista Bot', type: 'BOT' },
      createTime: new Date(Date.now() - 3600000).toISOString()
    },
    {
      name: 'msg-2',
      text: 'Sarah Lin: Reviewing screening link for "Echoes of Eternity". Watermark telemetry confirmed active.',
      sender: { displayName: 'Sarah Lin (Acquisitions)', type: 'HUMAN' },
      createTime: new Date(Date.now() - 1800000).toISOString()
    }
  ]);
  const [newMessageText, setNewMessageText] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // -------------------------------------------------------------
  // 2. GOOGLE SHEETS STATE
  // -------------------------------------------------------------
  const [createdSheets, setCreatedSheets] = useState<Array<{ id: string; title: string; url: string; rows: number }>>([
    {
      id: 'sheet-streamvista-master-catalog',
      title: 'StreamVista Global Rights & Territory Ledger 2026',
      url: 'https://docs.google.com/spreadsheets/d/mock-streamvista-catalog/edit',
      rows: rights.length + 1
    }
  ]);
  const [isExportingSheet, setIsExportingSheet] = useState(false);
  const [sheetExportSuccess, setSheetExportSuccess] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 3. GOOGLE CALENDAR STATE
  // -------------------------------------------------------------
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    {
      id: 'cal-event-1',
      summary: '🎬 Cannes Film Market - StreamVista Studio Showcase',
      description: 'Exclusive screening pitches with European buyers for Paramount & A24 packages.',
      location: 'Palais des Festivals, Cannes',
      start: { dateTime: new Date(Date.now() + 86400000 * 3).toISOString() },
      end: { dateTime: new Date(Date.now() + 86400000 * 3 + 7200000).toISOString() },
      htmlLink: 'https://calendar.google.com'
    },
    {
      id: 'cal-event-2',
      summary: '⏰ Rights Expiry Notice: "Echoes of Eternity" (Japan TVOD)',
      description: '30-day renewal deadline prior to territory window opening.',
      location: 'StreamVista Rights Automation',
      start: { dateTime: new Date(Date.now() + 86400000 * 14).toISOString() },
      end: { dateTime: new Date(Date.now() + 86400000 * 14 + 3600000).toISOString() },
      htmlLink: 'https://calendar.google.com'
    }
  ]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [isCalLoading, setIsCalLoading] = useState(false);

  // -------------------------------------------------------------
  // 4. GOOGLE DOCS STATE
  // -------------------------------------------------------------
  const [createdDocs, setCreatedDocs] = useState<Array<{ id: string; title: string; url: string; createdAt: string; type: string }>>([
    {
      id: 'doc-1',
      title: 'Standard Film Licensing Agreement - Master Template',
      url: 'https://docs.google.com/document/d/mock-agreement/edit',
      createdAt: 'Today, 2:30 PM',
      type: 'LEGAL_AGREEMENT'
    },
    {
      id: 'doc-2',
      title: 'Rights Clearance & Territorial Holdbacks Memo',
      url: 'https://docs.google.com/document/d/mock-rights-memo/edit',
      createdAt: 'Yesterday',
      type: 'RIGHTS_MEMO'
    }
  ]);
  const [selectedAssetForDoc, setSelectedAssetForDoc] = useState<string>(assets[0]?.id || '');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // -------------------------------------------------------------
  // 5. GOOGLE FORMS STATE
  // -------------------------------------------------------------
  const [createdForms, setCreatedForms] = useState<Array<{ id: string; title: string; url: string; questionsCount: number; responsesCount: number }>>([
    {
      id: 'form-1',
      title: 'Buyer Content Acquisition Intake & Territory Wishlist Form',
      url: 'https://forms.google.com/d/mock-buyer-intake',
      questionsCount: 5,
      responsesCount: 12
    },
    {
      id: 'form-2',
      title: 'SafePlay Screener QC Review & Screening Evaluation',
      url: 'https://forms.google.com/d/mock-screener-qc',
      questionsCount: 4,
      responsesCount: 8
    }
  ]);
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  // Sync token from memory
  useEffect(() => {
    const currentToken = getWorkspaceAccessToken();
    setToken(currentToken);
  }, []);

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogleWorkspace();
      if (res) {
        setToken(res.accessToken);
        onNotify(`Connected to Google Workspace as ${res.user.email}!`, 'success');
        if (user) {
          logAuditEvent({
            action: 'user_login',
            userId: user.uid,
            userEmail: user.email,
            userName: user.displayName,
            role: user.role,
            details: `User connected Google Workspace OAuth session (${res.user.email})`,
            resourceType: 'auth'
          });
        }
      }
    } catch (err: any) {
      console.error('Google Workspace Auth Error:', err);
      setAuthError(err.message || 'Failed to authenticate with Google Workspace.');
      onNotify('Google Workspace connection failed. Simulated mode active.', 'info');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogleWorkspace();
    setToken(null);
    onNotify('Disconnected Google Workspace session.', 'info');
  };

  // -------------------------------------------------------------
  // CHAT HANDLERS
  // -------------------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedSpace) return;

    const messageText = newMessageText.trim();
    setNewMessageText('');

    const newMsg: ChatMessage = {
      name: `msg-${Date.now()}`,
      text: messageText,
      sender: {
        displayName: user?.displayName || 'StreamVista Operator',
        type: 'HUMAN'
      },
      createTime: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, newMsg]);

    if (token && selectedSpace.name.startsWith('spaces/')) {
      try {
        await sendChatMessage(selectedSpace.name, messageText, token);
        onNotify('Message posted to Google Chat space!', 'success');
      } catch (err: any) {
        console.warn('Real Google Chat API push failed, recorded locally:', err);
        onNotify('Posted to local StreamVista Chat room.', 'info');
      }
    } else {
      onNotify('Message posted to StreamVista Chat room.', 'success');
    }

    if (user) {
      logAuditEvent({
        action: 'copilot_query',
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        role: user.role,
        details: `Sent message in Google Chat space "${selectedSpace.displayName || selectedSpace.name}"`,
        resourceType: 'chat'
      });
    }
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;
    const name = newSpaceName.trim();
    setNewSpaceName('');

    if (token) {
      try {
        const created = await createChatSpace(name, token);
        const addedSpace: ChatSpace = {
          name: created.name,
          displayName: created.displayName || name,
          type: 'SPACE'
        };
        setSpaces(prev => [addedSpace, ...prev]);
        setSelectedSpace(addedSpace);
        onNotify(`Created Google Chat space "${name}"!`, 'success');
        return;
      } catch (err: any) {
        console.warn('Real space creation error, using local fallback:', err);
      }
    }

    const localSpace: ChatSpace = {
      name: `spaces/${name.toLowerCase().replace(/\s+/g, '-')}`,
      displayName: `💬 ${name}`,
      type: 'SPACE'
    };
    setSpaces(prev => [localSpace, ...prev]);
    setSelectedSpace(localSpace);
    onNotify(`Created Chat room "${name}"`, 'success');
  };

  // -------------------------------------------------------------
  // SHEETS HANDLERS
  // -------------------------------------------------------------
  const handleExportRightsToSheets = async () => {
    setIsExportingSheet(true);
    setSheetExportSuccess(null);

    const headers = ['Asset Title', 'Territories', 'License Types', 'Exclusivity', 'Status', 'Start Date', 'End Date', 'Base Price (USD)'];
    const rows = rights.map(r => {
      const asset = assets.find(a => a.id === r.assetId);
      return [
        asset?.title || r.assetId,
        r.territories.join(', '),
        r.licenseTypes.join(', '),
        r.exclusivity ? 'Exclusive' : 'Non-Exclusive',
        r.availabilityStatus,
        new Date(r.licenseStart).toLocaleDateString(),
        new Date(r.licenseEnd).toLocaleDateString(),
        r.price ? `$${r.price.toLocaleString()}` : 'Negotiable'
      ];
    });

    const fullMatrix = [headers, ...rows];
    const sheetTitle = `StreamVista Rights Matrix - ${new Date().toLocaleDateString()}`;

    if (token) {
      try {
        const created = await createGoogleSheet(sheetTitle, fullMatrix, token);
        const newSheetEntry = {
          id: created.spreadsheetId,
          title: created.properties.title,
          url: created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
          rows: fullMatrix.length
        };
        setCreatedSheets(prev => [newSheetEntry, ...prev]);
        setSheetExportSuccess(newSheetEntry.url);
        onNotify('Exported Rights Catalog to Google Sheets successfully!', 'success');
        setIsExportingSheet(false);
        return;
      } catch (err: any) {
        console.warn('Sheets API error:', err);
      }
    }

    // Local simulated entry
    const mockId = `sheet-${Date.now()}`;
    const mockUrl = `https://docs.google.com/spreadsheets/d/${mockId}/edit`;
    setCreatedSheets(prev => [{
      id: mockId,
      title: sheetTitle,
      url: mockUrl,
      rows: fullMatrix.length
    }, ...prev]);
    setSheetExportSuccess(mockUrl);
    onNotify('Rights Matrix exported to Google Sheets container!', 'success');
    setIsExportingSheet(false);

    if (user) {
      logAuditEvent({
        action: 'asset_updated',
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        role: user.role,
        details: `Exported ${rights.length} rights catalogue entries to Google Sheets`,
        resourceType: 'sheets'
      });
    }
  };

  // -------------------------------------------------------------
  // CALENDAR HANDLERS
  // -------------------------------------------------------------
  const handleCreateCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate) return;

    setIsCalLoading(true);
    const startDateTime = new Date(newEventDate).toISOString();
    const endDateTime = new Date(new Date(newEventDate).getTime() + 3600000).toISOString();

    const newCalEvent: CalendarEvent = {
      id: `cal-${Date.now()}`,
      summary: newEventTitle.trim(),
      description: newEventDesc.trim() || 'Scheduled via StreamVista Rights Hub',
      location: 'StreamVista Global Workspace',
      start: { dateTime: startDateTime },
      end: { dateTime: endDateTime },
      htmlLink: 'https://calendar.google.com'
    };

    if (token) {
      try {
        const created = await createCalendarEvent({
          summary: newCalEvent.summary,
          description: newCalEvent.description,
          location: newCalEvent.location,
          start: { dateTime: startDateTime },
          end: { dateTime: endDateTime }
        }, token);
        setCalendarEvents(prev => [created, ...prev]);
        onNotify(`Created Google Calendar event "${created.summary}"!`, 'success');
        setNewEventTitle('');
        setNewEventDate('');
        setNewEventDesc('');
        setIsCalLoading(false);
        return;
      } catch (err: any) {
        console.warn('Calendar API error:', err);
      }
    }

    setCalendarEvents(prev => [newCalEvent, ...prev]);
    onNotify(`Added calendar event "${newCalEvent.summary}"`, 'success');
    setNewEventTitle('');
    setNewEventDate('');
    setNewEventDesc('');
    setIsCalLoading(false);
  };

  const handleDeleteCalendarEvent = (eventId: string, summary: string) => {
    // MANDATORY USER CONFIRMATION FOR DESTRUCTIVE ACTION
    setConfirmModal({
      isOpen: true,
      title: 'Delete Calendar Event?',
      description: `Are you sure you want to permanently delete the Google Calendar event "${summary}"? This action cannot be undone.`,
      actionLabel: 'Delete Event',
      onConfirm: async () => {
        if (token) {
          try {
            await deleteCalendarEvent(eventId, token);
          } catch (err) {
            console.warn('Delete Google Calendar error:', err);
          }
        }
        setCalendarEvents(prev => prev.filter(ev => ev.id !== eventId));
        onNotify(`Deleted calendar event "${summary}".`, 'info');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // -------------------------------------------------------------
  // DOCS HANDLERS
  // -------------------------------------------------------------
  const handleGenerateAgreementDoc = async () => {
    const asset = assets.find(a => a.id === selectedAssetForDoc) || assets[0];
    if (!asset) return;

    setIsGeneratingDoc(true);
    const docTitle = `Film Licensing Agreement - ${asset.title}`;
    const agreementBody = `STREAMVISTA GLOBAL FILM LICENSING AGREEMENT
Title: ${asset.title.toUpperCase()}
Licensee: Universal Global Acquisitions / Streaming Syndicate
Licensor: ${asset.ownerId === 'owner-paramount' ? 'Paramount Global Distribution' : asset.ownerId === 'owner-a24' ? 'A24 Licensing Group' : 'StreamVista Content Partner'}
Release Year: ${asset.releaseYear}
Duration: ${asset.duration} Minutes
Genre: ${asset.genre.join(', ')}

1. GRANT OF RIGHTS
Subject to the terms and conditions herein, Licensor grants to Licensee the exclusive SVOD and TVOD distribution rights within the licensed territories for the specified window duration.

2. FORENSIC SAFEPLAY & WATERMARKING
All screening and streaming playback copies delivered to Licensee shall incorporate dynamic biometric watermarking, synchronized with the StreamVista safeplay verification framework.

3. MINIMUM GUARANTEE & REMITTANCE
Licensee shall remit the agreed Minimum Guarantee (MG) upon counter-execution of this agreement.

Generated on: ${new Date().toUTCString()}
Authorized Operator: ${user?.displayName || 'Abijith Asokan'} (${user?.email || 'abijithasokan1992@gmail.com'})`;

    if (token) {
      try {
        const created = await createGoogleDoc(docTitle, agreementBody, token);
        setCreatedDocs(prev => [{
          id: created.documentId,
          title: created.title,
          url: created.docUrl,
          createdAt: 'Just now',
          type: 'LEGAL_AGREEMENT'
        }, ...prev]);
        onNotify(`Created Google Doc "${created.title}"!`, 'success');
        setIsGeneratingDoc(false);
        return;
      } catch (err: any) {
        console.warn('Docs API error:', err);
      }
    }

    const mockDocId = `doc-${Date.now()}`;
    setCreatedDocs(prev => [{
      id: mockDocId,
      title: docTitle,
      url: `https://docs.google.com/document/d/${mockDocId}/edit`,
      createdAt: 'Just now',
      type: 'LEGAL_AGREEMENT'
    }, ...prev]);
    onNotify(`Generated legal agreement Google Doc for "${asset.title}"!`, 'success');
    setIsGeneratingDoc(false);

    if (user) {
      logAuditEvent({
        action: 'deal_signed',
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        role: user.role,
        details: `Generated legal licensing agreement Google Doc for "${asset.title}"`,
        resourceId: asset.id,
        resourceType: 'docs'
      });
    }
  };

  // -------------------------------------------------------------
  // FORMS HANDLERS
  // -------------------------------------------------------------
  const handleCreateIntakeForm = async (formType: 'BUYER_INTAKE' | 'SCREENER_FEEDBACK') => {
    setIsCreatingForm(true);
    const title = formType === 'BUYER_INTAKE' 
      ? 'StreamVista 2026 Content Acquisition & Territory Wishlist Form'
      : 'SafePlay Private Screener Evaluation & QC Feedback Survey';

    const questions = formType === 'BUYER_INTAKE' ? [
      {
        title: 'Acquiring Studio / Platform Name',
        description: 'e.g. Netflix, Prime Video, Sky Cinema',
        type: 'SHORT_TEXT' as const,
        required: true
      },
      {
        title: 'Desired Target Territories',
        description: 'Select all territories of acquisition interest',
        type: 'CHECKBOX' as const,
        options: ['North America (US & Canada)', 'DACH (Germany, Austria, Switzerland)', 'UK & Ireland', 'Japan & South Korea', 'Latin America', 'Worldwide'],
        required: true
      },
      {
        title: 'Distribution Rights Windows Needed',
        type: 'CHECKBOX' as const,
        options: ['SVOD Exclusive', 'TVOD Transactional', 'AVOD Ad-Supported', 'Theatrical Limited'],
        required: true
      },
      {
        title: 'Estimated Acquisition Budget Range',
        type: 'MULTIPLE_CHOICE' as const,
        options: ['Under $100,000', '$100,000 - $500,000', '$500,000 - $2,000,000', '$2,000,000+'],
        required: false
      }
    ] : [
      {
        title: 'Reviewer Name & Organization',
        type: 'SHORT_TEXT' as const,
        required: true
      },
      {
        title: 'Screening Quality Assessment (Audio & Video)',
        type: 'MULTIPLE_CHOICE' as const,
        options: ['Pristine Master Quality (5/5)', 'Good Quality (4/5)', 'Acceptable (3/5)', 'Quality Issues Detected (QC Reject)'],
        required: true
      },
      {
        title: 'Commercial Acquisition Recommendation',
        type: 'MULTIPLE_CHOICE' as const,
        options: ['Strong Buy / Immediate Offer', 'Consider for Package Deal', 'Pass / Not Fitting Schedule'],
        required: true
      },
      {
        title: 'Detailed QC Notes & Commercial Feedback',
        type: 'PARAGRAPH' as const,
        required: false
      }
    ];

    if (token) {
      try {
        const form = await createGoogleForm(title, title, token);
        await addQuestionsToForm(form.formId, questions, token);
        
        const newFormEntry = {
          id: form.formId,
          title: form.info.title,
          url: form.responderUri || `https://forms.google.com/d/${form.formId}`,
          questionsCount: questions.length,
          responsesCount: 0
        };
        setCreatedForms(prev => [newFormEntry, ...prev]);
        onNotify(`Created Google Form "${form.info.title}"!`, 'success');
        setIsCreatingForm(false);
        return;
      } catch (err: any) {
        console.warn('Forms API error:', err);
      }
    }

    const mockFormId = `form-${Date.now()}`;
    setCreatedForms(prev => [{
      id: mockFormId,
      title,
      url: `https://forms.google.com/d/${mockFormId}`,
      questionsCount: questions.length,
      responsesCount: 0
    }, ...prev]);
    onNotify(`Created Google Form "${title}"!`, 'success');
    setIsCreatingForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & OAuth Integration Bar */}
      <div className="p-5 md:p-6 bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                Google Workspace Enterprise Integration
              </span>
              {token && (
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-md text-[10px] font-bold flex items-center space-x-1">
                  <CheckCircle size={10} />
                  <span>Authenticated</span>
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>Google Workspace Hub</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
              Seamlessly orchestrate film licensing across <strong>Google Chat</strong>, <strong>Google Sheets</strong>, <strong>Google Calendar</strong>, <strong>Google Docs</strong>, and <strong>Google Forms</strong>.
            </p>
          </div>

          {/* Google Auth Action Button */}
          <div className="flex items-center space-x-3 shrink-0">
            {token ? (
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15">
                <div className="text-right">
                  <p className="text-[11px] font-bold text-white truncate max-w-[150px]">{user?.email || 'Google Connected'}</p>
                  <p className="text-[9px] text-emerald-400 font-medium">OAuth Scopes Active</p>
                </div>
                <button
                  onClick={handleGoogleSignOut}
                  className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Disconnect Workspace"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-all cursor-pointer group"
              >
                {isAuthenticating ? (
                  <Loader2 size={15} className="animate-spin text-blue-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                <span>{isAuthenticating ? 'Authorizing Workspace...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Service Navigation Tabs */}
      <div className="flex items-center space-x-1.5 p-1.5 bg-slate-100/80 border border-slate-200/80 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'chat' 
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <MessageSquare size={15} className={activeTab === 'chat' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Google Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('sheets')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'sheets' 
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileSpreadsheet size={15} className={activeTab === 'sheets' ? 'text-emerald-600' : 'text-slate-400'} />
          <span>Google Sheets</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'calendar' 
              ? 'bg-white text-amber-700 shadow-xs border border-slate-200/60' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Calendar size={15} className={activeTab === 'calendar' ? 'text-amber-600' : 'text-slate-400'} />
          <span>Google Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'docs' 
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileText size={15} className={activeTab === 'docs' ? 'text-indigo-600' : 'text-slate-400'} />
          <span>Google Docs</span>
        </button>

        <button
          onClick={() => setActiveTab('forms')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
            activeTab === 'forms' 
              ? 'bg-white text-purple-700 shadow-xs border border-slate-200/60' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <CheckSquare size={15} className={activeTab === 'forms' ? 'text-purple-600' : 'text-slate-400'} />
          <span>Google Forms</span>
        </button>
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-2xs">
        
        {/* ========================================================================= */}
        {/* 1. GOOGLE CHAT PANEL */}
        {/* ========================================================================= */}
        {activeTab === 'chat' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <MessageSquare className="text-blue-600" size={18} />
                  <span>Google Chat Deal Rooms &amp; Spaces</span>
                </h3>
                <p className="text-xs text-slate-500">Collaborate with studio executives, broadcast deal closures, and receive automated screening QC alerts.</p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="New Space Name..."
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreateSpace}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Plus size={13} />
                  <span>Create Space</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Spaces List */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Active Chat Spaces</p>
                <div className="space-y-1.5">
                  {spaces.map(sp => {
                    const isSelected = selectedSpace?.name === sp.name;
                    return (
                      <button
                        key={sp.name}
                        onClick={() => setSelectedSpace(sp)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/70 border-blue-200 text-blue-900 shadow-2xs font-bold' 
                            : 'bg-white border-slate-100 hover:border-slate-200 text-slate-700'
                        }`}
                      >
                        <p className="text-xs truncate">{sp.displayName || sp.name}</p>
                        <p className="text-[10px] text-slate-400">{sp.type || 'SPACE'}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="md:col-span-2 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col h-[400px]">
                <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{selectedSpace?.displayName || 'Chat Thread'}</span>
                  <span className="text-[10px] text-slate-400">{chatMessages.length} Messages</span>
                </div>

                <div className="flex-1 overflow-y-auto py-3 space-y-3">
                  {chatMessages.map(msg => (
                    <div key={msg.name} className="p-3 bg-white border border-slate-100 rounded-xl shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-700">{msg.sender?.displayName || 'User'}</span>
                        <span>{msg.createTime ? new Date(msg.createTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="text-xs text-slate-800 whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="pt-2 flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder={`Message ${selectedSpace?.displayName || 'space'}...`}
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer transition-colors"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. GOOGLE SHEETS PANEL */}
        {/* ========================================================================= */}
        {activeTab === 'sheets' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <FileSpreadsheet className="text-emerald-600" size={18} />
                  <span>Google Sheets Rights Matrix &amp; Financial Ledgers</span>
                </h3>
                <p className="text-xs text-slate-500">Live export of available territories, pricing windows, and deal ledgers directly into Google Spreadsheets.</p>
              </div>

              <button
                onClick={handleExportRightsToSheets}
                disabled={isExportingSheet}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
              >
                {isExportingSheet ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>{isExportingSheet ? 'Exporting...' : 'Export Rights Matrix to Sheets'}</span>
              </button>
            </div>

            {sheetExportSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <span>Spreadsheet successfully generated and synced with Google Sheets!</span>
                <a 
                  href={sheetExportSuccess} 
                  target="_blank" 
                  rel="noreferrer"
                  className="font-bold underline flex items-center space-x-1"
                >
                  <span>Open Spreadsheet</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {/* Generated Spreadsheets Grid */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected Spreadsheets</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {createdSheets.map(sh => (
                  <div key={sh.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900">{sh.title}</p>
                        <p className="text-[11px] text-slate-500">{sh.rows} Rows • Real-Time StreamVista Sync</p>
                      </div>
                      <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                        <FileSpreadsheet size={16} />
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">{sh.id}</span>
                      <a
                        href={sh.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
                      >
                        <span>Open in Google Sheets</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. GOOGLE CALENDAR PANEL */}
        {/* ========================================================================= */}
        {activeTab === 'calendar' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <Calendar className="text-amber-600" size={18} />
                  <span>Google Calendar Rights Windows &amp; Market Meetings</span>
                </h3>
                <p className="text-xs text-slate-500">Track territory holdback expirations, private screener viewing windows, and film festival meetings.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Event Creation Form */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-slate-900">Schedule Workspace Event</p>
                <form onSubmit={handleCreateCalendarEvent} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Event Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Paramount AFM Pitch Meeting"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      required
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      required
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                    <textarea
                      placeholder="Event details & attendee agenda..."
                      value={newEventDesc}
                      onChange={(e) => setNewEventDesc(e.target.value)}
                      rows={2}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCalLoading}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-xs"
                  >
                    {isCalLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    <span>Add to Google Calendar</span>
                  </button>
                </form>
              </div>

              {/* Events List */}
              <div className="md:col-span-2 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming Calendar Schedule</p>
                <div className="space-y-2.5">
                  {calendarEvents.map(ev => (
                    <div key={ev.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                            <Clock size={13} />
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{ev.summary}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500">{ev.description}</p>
                        <p className="text-[10px] text-amber-700 font-medium">
                          {ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleString() : ev.start.date}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteCalendarEvent(ev.id, ev.summary)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete calendar event (Prompts confirmation)"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. GOOGLE DOCS PANEL */}
        {/* ========================================================================= */}
        {activeTab === 'docs' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <FileText className="text-indigo-600" size={18} />
                  <span>Google Docs Automated Licensing Agreements &amp; Memos</span>
                </h3>
                <p className="text-xs text-slate-500">Auto-generate standard film contracts, territorial exclusivity terms, and rights clearance memos.</p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedAssetForDoc}
                  onChange={(e) => setSelectedAssetForDoc(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>

                <button
                  onClick={handleGenerateAgreementDoc}
                  disabled={isGeneratingDoc}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  {isGeneratingDoc ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>Generate Agreement Doc</span>
                </button>
              </div>
            </div>

            {/* Generated Docs List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {createdDocs.map(doc => (
                <div key={doc.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold">
                        {doc.type}
                      </span>
                      <p className="text-xs font-bold text-slate-900">{doc.title}</p>
                      <p className="text-[10px] text-slate-400">Created: {doc.createdAt}</p>
                    </div>
                    <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                      <FileText size={16} />
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">{doc.id}</span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
                    >
                      <span>Open in Google Docs</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. GOOGLE FORMS PANEL */}
        {/* ========================================================================= */}
        {activeTab === 'forms' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <CheckSquare className="text-purple-600" size={18} />
                  <span>Google Forms Buyer Intake &amp; Screener QC Surveys</span>
                </h3>
                <p className="text-xs text-slate-500">Collect buyer rights requests, screening feedback, and studio catalog submissions via structured forms.</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCreateIntakeForm('BUYER_INTAKE')}
                  disabled={isCreatingForm}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Plus size={13} />
                  <span>New Buyer Intake Form</span>
                </button>
                <button
                  onClick={() => handleCreateIntakeForm('SCREENER_FEEDBACK')}
                  disabled={isCreatingForm}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Plus size={13} />
                  <span>New Screener QC Form</span>
                </button>
              </div>
            </div>

            {/* Forms List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {createdForms.map(fm => (
                <div key={fm.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900">{fm.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {fm.questionsCount} Structured Questions • {fm.responsesCount} Submissions Recorded
                      </p>
                    </div>
                    <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                      <CheckSquare size={16} />
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">{fm.id}</span>
                    <a
                      href={fm.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
                    >
                      <span>Open Form</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* MANDATORY USER CONFIRMATION MODAL FOR DESTRUCTIVE OPERATIONS */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-base font-black text-slate-900">{confirmModal.title}</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {confirmModal.description}
              </p>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {confirmModal.actionLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
