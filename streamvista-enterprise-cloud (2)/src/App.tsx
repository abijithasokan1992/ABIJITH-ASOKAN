/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { UserRole, Film, BridgeRegistration, NegotiatingDeal, ScreenerRequest, AuditLog, VaultAsset, DemoInvitation, LeadRequest, Workspace } from './types';
import { INITIAL_FILMS, INITIAL_REGISTRATIONS, INITIAL_DEALS, INITIAL_SCREENERS, INITIAL_AUDIT_LOGS, INITIAL_VAULT_ASSETS } from './data';
import Homepage from './components/Homepage';
import AdminDashboard from './components/AdminDashboard';
import CreatorDashboard from './components/CreatorDashboard';
import BuyerDashboard from './components/BuyerDashboard';
import WorkspaceSelector from './components/WorkspaceSelector';

export default function App() {
  // 1. ENVIRONMENT DETECTION
  // Check if page URL contains "demo" or if testing with a query parameter "?env=demo"
  const currentDomain: 'PRODUCTION' | 'DEMO' = (
    typeof window !== 'undefined' && 
    (window.location.hostname.includes('demo') || window.location.search.includes('env=demo') || window.location.search.includes('invite='))
  ) ? 'DEMO' : 'PRODUCTION';

  // State representing current user login context
  const [role, setRole] = useState<UserRole>('PUBLIC');
  const [activeEmail, setActiveEmail] = useState('');
  const [activeCompany, setActiveCompany] = useState('');
  
  // New state for workspace selection
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([]);

  // Prefix used to partition databases inside local storage
  const dbPrefix = currentDomain === 'DEMO' ? 'demo_' : 'prod_';

  // 2. CORE PERSISTED DATABASES (Partially Isolated based on active environment prefix)
  const [films, setFilms] = useState<Film[]>(() => {
    const local = localStorage.getItem(`${dbPrefix}sv_films`);
    return local ? JSON.parse(local) : INITIAL_FILMS;
  });

  const [registrations, setRegistrations] = useState<BridgeRegistration[]>(() => {
    const local = localStorage.getItem(`${dbPrefix}sv_registrations`);
    return local ? JSON.parse(local) : INITIAL_REGISTRATIONS;
  });

  const [deals, setDeals] = useState<NegotiatingDeal[]>(() => {
    const local = localStorage.getItem(`${dbPrefix}sv_deals`);
    return local ? JSON.parse(local) : INITIAL_DEALS;
  });

  const [screeners, setScreeners] = useState<ScreenerRequest[]>(() => {
    const local = localStorage.getItem(`${dbPrefix}sv_screeners`);
    return local ? JSON.parse(local) : INITIAL_SCREENERS;
  });

  const [logs, setLogs] = useState<AuditLog[]>(() => {
    const local = localStorage.getItem(`${dbPrefix}sv_logs`);
    return local ? JSON.parse(local) : INITIAL_AUDIT_LOGS;
  });

  const [vaultAssets, setVaultAssets] = useState<VaultAsset[]>(() => {
    const local = localStorage.getItem(`${dbPrefix}sv_vault_assets`);
    return local ? JSON.parse(local) : INITIAL_VAULT_ASSETS;
  });

  // 3. DEMO EXCLUSIVE STATE STORAGE (Always persisted globally or synced into Admin Workspace)
  const [demoInvitations, setDemoInvitations] = useState<DemoInvitation[]>(() => {
    const local = localStorage.getItem('sv_demo_invitations');
    if (local) return JSON.parse(local);
    // Initial mock invitations
    return [
      {
        id: 'invite-admin',
        code: 'ADM777',
        inviteUrl: typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}${window.location.pathname}?invite=ADM777` : 'https://demo.crayonspictures.in?invite=ADM777',
        expiryDate: '2030-12-31',
        maxUsers: 100,
        currentUsers: 0,
        organizationName: 'StreamVista Operations Authority',
        demoRole: 'ADMIN',
        demoDuration: '365 Days',
        featureRestrictions: ['Full Administrative Privileges'],
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      },
      {
        id: 'invite-1',
        code: 'ABC123',
        inviteUrl: 'https://demo.crayonspictures.in?invite=ABC123',
        expiryDate: '2026-12-31',
        maxUsers: 5,
        currentUsers: 2,
        organizationName: "Crayon's Pictures Evaluation",
        demoRole: 'FULL_PLATFORM',
        demoDuration: '30 Days',
        featureRestrictions: ['Demo Isolated DB', 'Zero Real Payments'],
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      },
      {
        id: 'invite-2',
        code: 'XYZ456',
        inviteUrl: 'https://demo.crayonspictures.in?invite=XYZ456',
        expiryDate: '2026-08-15',
        maxUsers: 10,
        currentUsers: 4,
        organizationName: 'Paramount Global Trial',
        demoRole: 'CREATOR',
        demoDuration: '14 Days',
        featureRestrictions: ['Limited Storage (10 GB)'],
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [leadRequests, setLeadRequests] = useState<LeadRequest[]>(() => {
    const local = localStorage.getItem('sv_lead_requests');
    if (local) return JSON.parse(local);
    // Initial lead opportunities
    return [
      {
        id: 'lead-1',
        contactName: 'Charles Montgomery',
        companyName: 'Montgomery Broadcasters Ltd',
        email: 'charles@montgomery.co.in',
        useCase: 'Evaluating rights management, territory filters, and smart watermarked screeners.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING'
      },
      {
        id: 'lead-2',
        contactName: 'Arati Sen',
        companyName: 'Ganga Independent Films',
        email: 'arati@gangafilms.com',
        useCase: 'Looking for a secure sovereign vault to share rough-cuts with international film festival buyers.',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'INVITATION_SENT',
        generatedInvitationCode: 'INV_LEAD_R7B8'
      }
    ];
  });

  const [demoAccounts, setDemoAccounts] = useState<any[]>(() => {
    const local = localStorage.getItem('sv_demo_accounts');
    if (local) return JSON.parse(local);
    // Initial evaluation credentials
    return [
      { id: 'demouser-1', email: 'partner@crayond.com', role: 'CREATOR', company: 'Crayond Content Partner', status: 'ACTIVE', createdAt: new Date().toISOString() },
      { id: 'demouser-2', email: 'buyer@streamvista.com', role: 'BUYER', company: 'StreamVista Marketplace Partner', status: 'ACTIVE', createdAt: new Date().toISOString() },
      { id: 'demouser-3', email: 'admin@streamvista.com', role: 'ADMIN', company: 'StreamVista Operations', status: 'ACTIVE', createdAt: new Date().toISOString() }
    ];
  });

  // Synchronize dynamic databases with client localStorage
  useEffect(() => {
    localStorage.setItem(`${dbPrefix}sv_films`, JSON.stringify(films));
  }, [films, dbPrefix]);

  useEffect(() => {
    localStorage.setItem(`${dbPrefix}sv_registrations`, JSON.stringify(registrations));
  }, [registrations, dbPrefix]);

  useEffect(() => {
    localStorage.setItem(`${dbPrefix}sv_deals`, JSON.stringify(deals));
  }, [deals, dbPrefix]);

  useEffect(() => {
    localStorage.setItem(`${dbPrefix}sv_screeners`, JSON.stringify(screeners));
  }, [screeners, dbPrefix]);

  useEffect(() => {
    localStorage.setItem(`${dbPrefix}sv_logs`, JSON.stringify(logs));
  }, [logs, dbPrefix]);

  useEffect(() => {
    localStorage.setItem(`${dbPrefix}sv_vault_assets`, JSON.stringify(vaultAssets));
  }, [vaultAssets, dbPrefix]);

  // Synchronize admin demo tables
  useEffect(() => {
    localStorage.setItem('sv_demo_invitations', JSON.stringify(demoInvitations));
  }, [demoInvitations]);

  useEffect(() => {
    localStorage.setItem('sv_lead_requests', JSON.stringify(leadRequests));
  }, [leadRequests]);

  useEffect(() => {
    localStorage.setItem('sv_demo_accounts', JSON.stringify(demoAccounts));
  }, [demoAccounts]);

  // 4. INVITATION LINK REDIRECT ROUTING & INCOMING PROSPECT welcome
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite') || params.get('code');
    
    if (inviteCode) {
      // Find the corresponding invitation inside the active registry
      let invitation = demoInvitations.find(inv => inv.code.toUpperCase() === inviteCode.toUpperCase());
      
      // Resilient fallback for direct ADM777 onboarding link usage
      if (!invitation && inviteCode.toUpperCase() === 'ADM777') {
        invitation = {
          id: 'invite-admin',
          code: 'ADM777',
          inviteUrl: `${window.location.protocol}//${window.location.host}${window.location.pathname}?invite=ADM777`,
          expiryDate: '2030-12-31',
          maxUsers: 100,
          currentUsers: 0,
          organizationName: 'StreamVista Operations Authority',
          demoRole: 'ADMIN',
          demoDuration: '365 Days',
          featureRestrictions: ['Full Administrative Privileges'],
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        };
        setDemoInvitations(prev => {
          if (prev.some(inv => inv.code === 'ADM777')) return prev;
          return [...prev, invitation!];
        });
      }

      if (invitation) {
        if (invitation.status !== 'ACTIVE') {
          alert(`This StreamVista demo invitation link (${inviteCode}) is currently ${invitation.status}. Please request a new invitation through our sales inquiry.`);
          return;
        }

        // Check expiration
        const today = new Date().toISOString().split('T')[0];
        if (invitation.expiryDate < today) {
          alert(`This trial invitation has expired (Expiry: ${invitation.expiryDate}). Requesting renewal from platform admins.`);
          return;
        }

        // Increment current active users and notify system logs
        setDemoInvitations(prev => prev.map(inv => inv.id === invitation.id ? { ...inv, currentUsers: Math.min(inv.maxUsers, inv.currentUsers + 1) } : inv));
        
        let targetRole: UserRole = 'PUBLIC';
        let mockEmail = '';

        if (invitation.demoRole === 'CREATOR') {
          targetRole = 'CREATOR';
          mockEmail = 'partner@crayond.com';
        } else if (invitation.demoRole === 'BUYER') {
          targetRole = 'BUYER';
          mockEmail = 'buyer@streamvista.com';
        } else if (invitation.demoRole === 'ADMIN') {
          targetRole = 'ADMIN';
          mockEmail = 'admin@streamvista.com';
        } else {
          // Full platform gives standard access to buyer dashboard as start
          targetRole = 'BUYER';
          mockEmail = 'buyer@streamvista.com';
        }

        // Switch role context and notify through system logs
        setRole(targetRole);
        setActiveEmail(mockEmail);
        setActiveCompany(invitation.organizationName);

        // Append custom audit log
        const newLog: AuditLog = {
          id: `log-invite-${Math.floor(Math.random() * 900) + 100}`,
          timestamp: new Date().toISOString(),
          user: mockEmail,
          role: targetRole,
          action: 'DEMO_INVITATION_REDEEM',
          details: `Prospect Redeemed Trial invite code ${invitation.code} for Organization: "${invitation.organizationName}". Applied restrictions: ${invitation.featureRestrictions.join(', ')}`,
          oracleHash: `tx_ora_invite_${Math.random().toString(16).substring(2, 6)}80`
        };
        setLogs(prev => [newLog, ...prev]);

        alert(`Welcome to StreamVista's Isolated Evaluation Environment!
        
• Organization: ${invitation.organizationName}
• Scope allocated: ${invitation.demoRole}
• trial terms: ${invitation.demoDuration}

Safe workspace initialized. Sandbox parameters active.`);
      } else {
        alert(`Invitation code "${inviteCode}" not found on the secure staging tables. Contact your sales representative.`);
      }
    }
  }, []);

  // Background steps configuration for vault uploader simulation
  const VIDEO_STEPS = [
    { detailedStatus: 'QUEUED', progress: 5, currentStep: 'Waiting for upload to start', statusMessage: 'Queue position #1 - starting soon' },
    { detailedStatus: 'UPLOADING', progress: 15, currentStep: 'Uploading file to cloud storage', statusMessage: 'Uploading chunks to isolated space (1.4 GB)...' },
    { detailedStatus: 'UPLOADING', progress: 28, currentStep: 'Uploading file to cloud storage', statusMessage: 'Uploading segments - 42% complete...' },
    { detailedStatus: 'UPLOADED', progress: 38, currentStep: 'File successfully uploaded', statusMessage: '✔ Object Storage upload complete' },
    { detailedStatus: 'VERIFYING', progress: 45, currentStep: 'Verifying file integrity', statusMessage: '⌛ Validating ProRes frame integrity checksums...' },
    { detailedStatus: 'OBJECT_URL_CREATED', progress: 50, currentStep: 'Storage link generated', statusMessage: '✔ Secure OCI endpoint created' },
    { detailedStatus: 'DATABASE_SAVING', progress: 55, currentStep: 'Saving metadata', statusMessage: '⌛ Registering columns on Autonomous Database instance...' },
    { detailedStatus: 'DATABASE_SAVED', progress: 60, currentStep: 'Metadata saved', statusMessage: '✔ Database table indices committed' },
    { detailedStatus: 'PROCESSING', progress: 65, currentStep: 'Video processing started', statusMessage: 'Spawning media transcoder cores...' },
    { detailedStatus: 'TRANSCODING', progress: 75, currentStep: 'Creating streaming versions', statusMessage: '⌛ Transcoding Video (35%) - Estimated time remaining: 6 minutes' },
    { detailedStatus: 'TRANSCODING', progress: 82, currentStep: 'Creating streaming versions', statusMessage: '⌛ Transcoding Video (72%) - Estimated time remaining: 2 minutes' },
    { detailedStatus: 'THUMBNAIL_GENERATING', progress: 88, currentStep: 'Creating thumbnails', statusMessage: '⌛ Extracting reference keyframes' },
    { detailedStatus: 'PREVIEW_GENERATING', progress: 93, currentStep: 'Creating preview clips', statusMessage: '⌛ Extracting preview trailer hooks' },
    { detailedStatus: 'INDEXING', progress: 98, currentStep: 'Preparing search metadata', statusMessage: '⌛ Compiling search markers and OCR logs' },
    { detailedStatus: 'READY', progress: 100, currentStep: 'Completed', statusMessage: 'OOCI CDN delivery active and locked' }
  ];

  const GENERAL_STEPS = [
    { detailedStatus: 'QUEUED', progress: 5, currentStep: 'Waiting for upload to start', statusMessage: 'Ready in buffer' },
    { detailedStatus: 'UPLOADING', progress: 25, currentStep: 'Uploading file chunks', statusMessage: 'Uploading to private OCI partition...' },
    { detailedStatus: 'UPLOADED', progress: 45, currentStep: 'File successfully uploaded', statusMessage: '✔ Saved in OCI Object bucket' },
    { detailedStatus: 'VERIFYING', progress: 60, currentStep: 'Verifying file integrity', statusMessage: 'Scanning compliance checks and headers...' },
    { detailedStatus: 'OBJECT_URL_CREATED', progress: 70, currentStep: 'Storage link generated', statusMessage: '✔ Registered secure OCI path' },
    { detailedStatus: 'DATABASE_SAVING', progress: 80, currentStep: 'Saving metadata', statusMessage: 'Writing records to database ledger...' },
    { detailedStatus: 'DATABASE_SAVED', progress: 90, currentStep: 'Metadata saved', statusMessage: '✔ Schema matches perfect index' },
    { detailedStatus: 'INDEXING', progress: 95, currentStep: 'Preparing search metadata', statusMessage: 'Running vector index routines' },
    { detailedStatus: 'READY', progress: 100, currentStep: 'Completed', statusMessage: 'Available for use' }
  ];

  // Periodic visual background processing simulator progress tick
  useEffect(() => {
    const transitionalAssets = vaultAssets.filter(
      a => a.detailedStatus && a.detailedStatus !== 'READY' && a.detailedStatus !== 'FAILED' && a.detailedStatus !== 'CANCELLED'
    );

    if (transitionalAssets.length === 0) return;

    const interval = setInterval(() => {
      setVaultAssets(prevAssets => {
        let underwentChange = false;
        const modified = prevAssets.map(asset => {
          if (!asset.detailedStatus || asset.detailedStatus === 'READY' || asset.detailedStatus === 'FAILED' || asset.detailedStatus === 'CANCELLED') {
            return asset;
          }

          underwentChange = true;
          const steps = asset.type === 'video' ? VIDEO_STEPS : GENERAL_STEPS;
          
          let currentIndex = steps.findIndex(
            s => s.detailedStatus === asset.detailedStatus && (asset.progress === undefined || s.progress > (asset.progress || 0))
          );
          
          if (currentIndex === -1) {
            currentIndex = steps.findIndex(s => s.detailedStatus === asset.detailedStatus);
          }

          const nextIndex = currentIndex !== -1 ? currentIndex + 1 : 0;
          if (nextIndex < steps.length) {
            const nextStep = steps[nextIndex];
            const history = asset.processingHistory || [];
            const updatedHistory = [...history];
            
            if (history.length === 0 || history[history.length - 1].status !== nextStep.detailedStatus) {
              updatedHistory.push({
                status: nextStep.detailedStatus,
                timestamp: new Date().toISOString()
              });
            }

            return {
              ...asset,
              detailedStatus: nextStep.detailedStatus as any,
              progress: nextStep.progress,
              currentStep: nextStep.currentStep,
              statusMessage: nextStep.statusMessage,
              status: nextStep.detailedStatus === 'READY' ? 'COMPLETED' : 'PROCESSING',
              processingHistory: updatedHistory
            };
          } else {
            return {
              ...asset,
              detailedStatus: 'READY',
              status: 'COMPLETED',
              progress: 100,
              currentStep: 'Completed',
              statusMessage: 'Available for viewing'
            };
          }
        });

        return underwentChange ? modified : prevAssets;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [vaultAssets]);

  // Block Hashing Emulator
  const generateMockHash = (actionType: string): string => {
    const salt = `${actionType}-${Date.now()}-${Math.random()}`;
    let hash = 0;
    for (let i = 0; i < salt.length; i++) {
      hash = (hash << 5) - hash + salt.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex}4a83e0c03da8b789efcfcc59fbc410298de3e40fd828ce${Math.abs(hash * 3).toString(16).substring(0, 8)}`;
  };

  const addLog = (action: string, details: string) => {
    const pathUser = activeEmail || 'guest@anonymous.node';
    const pathRole = role || 'PUBLIC';
    const newLog: AuditLog = {
      id: `log-${Math.floor(Math.random() * 900) + 600}`,
      timestamp: new Date().toISOString(),
      user: pathUser,
      role: pathRole,
      action,
      details,
      oracleHash: generateMockHash(action)
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Authentication flow sets active partner company context
  const handleSelectRole = (mockEmail: string) => {
    // 1. Find all approved workspaces for this email
    const approvedWorkspaces: Workspace[] = registrations
      .filter(r => r.email.toLowerCase() === mockEmail.toLowerCase() && r.status === 'APPROVED')
      .map(r => ({
        id: r.id,
        name: r.companyName,
        role: r.role,
        email: r.email,
      }));

    // Add demo accounts check
    const demoAccount = demoAccounts.find(a => a.email.toLowerCase() === mockEmail.toLowerCase());
    if (demoAccount && demoAccount.status === 'ACTIVE') {
      approvedWorkspaces.push({
        id: demoAccount.id,
        name: demoAccount.company,
        role: demoAccount.role,
        email: demoAccount.email,
      });
    }

    if (approvedWorkspaces.length === 0) {
      alert('No approved workspaces found for this account.');
      return;
    }

    if (approvedWorkspaces.length === 1) {
      handleFinalLogin(approvedWorkspaces[0]);
    } else {
      setAvailableWorkspaces(approvedWorkspaces);
      setShowWorkspaceSelector(true);
      setActiveEmail(mockEmail);
    }
  };

  const handleFinalLogin = (workspace: Workspace) => {
    setRole(workspace.role);
    setActiveEmail(workspace.email);
    setActiveCompany(workspace.name);
    setShowWorkspaceSelector(false);
    
    addLog('USER_LOGIN', `Workspace selection: ${workspace.name} as ${workspace.role}`);
  };

  const handleRegisterBridge = (data: {
    role: 'CREATOR' | 'BUYER';
    companyName: string;
    contactName: string;
    email: string;
    website: string;
    catalogSize: string;
  }) => {
    const newReg: BridgeRegistration = {
      id: `r-${Math.floor(Math.random() * 900) + 300}`,
      role: data.role,
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      website: data.website,
      catalogSize: data.catalogSize,
      status: 'PENDING',
      date: new Date().toISOString()
    };
    setRegistrations(prev => [newReg, ...prev]);
    
    const hash = generateMockHash('BRIDGE_REGISTRATION_SUBMIT');
    const newLog: AuditLog = {
      id: `log-${Math.floor(Math.random() * 900) + 600}`,
      timestamp: new Date().toISOString(),
      user: data.email,
      role: data.role,
      action: 'BRIDGE_REGISTRATION_SUBMIT',
      details: `Creator Bridge Application received for ${data.companyName} (${data.contactName}). Saved payload to Admin staging tables. website: ${data.website}`,
      oracleHash: hash
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleApproveRegistration = (id: string) => {
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    const target = registrations.find(r => r.id === id);
    if (target) {
      addLog('BRIDGE_APPROVAL', `Approved Bridge registration context for B2B Partner: "${target.companyName}". Issued clearance permissions.`);
    }
  };

  const handleRejectRegistration = (id: string) => {
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
    const target = registrations.find(r => r.id === id);
    if (target) {
      addLog('BRIDGE_REJECTION', `Rejected Bridge onboarding payload for: "${target.companyName}". Dossier placed in quarantine columns.`);
    }
  };

  const handleAddFilm = (newFilm: Film) => {
    setFilms(prev => [...prev, newFilm]);
    addLog('FILM_PUBLISH_BROADCAST', `Committed metadata registry logs and staged directory assets for film title: "${newFilm.title}"`);
  };

  const handleAddVaultAsset = (asset: VaultAsset) => {
    setVaultAssets(prev => [asset, ...prev]);
    addLog('VAULT_ASSET_UPLOAD', `Sovereign vault file uploaded: "${asset.name}" (${asset.sizeFormatted}) mapped to directory "${asset.folderPath}"`);
  };

  const handleUpdateVaultAsset = (id: string, updated: Partial<VaultAsset>) => {
    setVaultAssets(prev => prev.map(a => a.id === id ? { ...a, ...updated } as VaultAsset : a));
    const oldAsset = vaultAssets.find(a => a.id === id);
    if (oldAsset) {
      if (updated.uploadedBy) {
        addLog('VAULT_ASSET_TRANSFER', `Transferred possession of vault file "${oldAsset.name}" to context ${updated.uploadedBy}`);
      } else if (updated.mappedFilmId) {
        const matchingFilm = films.find(f => f.id === updated.mappedFilmId);
        addLog('VAULT_ASSET_MAP', `Ingested & mapped vault asset "${oldAsset.name}" to content catalog "${matchingFilm ? matchingFilm.title : updated.mappedFilmId}"`);
      } else if (updated.deliveredTo) {
        addLog('VAULT_ASSET_DELIVERY', `Dispatched OOCI package stream for "${oldAsset.name}" to B2B Buyer "${updated.deliveredTo}"`);
      } else if (updated.name) {
        addLog('VAULT_ASSET_EDIT', `Refactored metadata headers for vault item. New title: "${updated.name}"`);
      }
    }
  };

  const handleDeleteVaultAsset = (id: string) => {
    const target = vaultAssets.find(a => a.id === id);
    setVaultAssets(prev => prev.filter(a => a.id !== id));
    if (target) {
      addLog('VAULT_ASSET_DELETE', `Purged archive directory pointer and deleted object: "${target.name}" from uploader context: ${target.uploadedBy}`);
    }
  };

  const handleUpdateFilm = (id: string, updated: Partial<Film>) => {
    setFilms(prev => prev.map(f => f.id === id ? { ...f, ...updated } as Film : f));
  };

  const handleDeleteFilm = (id: string) => {
    const target = films.find(f => f.id === id);
    setFilms(prev => prev.filter(f => f.id !== id));
    if (target) {
      addLog('FILM_DELETE', `Purged film metadata records from Autonomous ATP: "${target.title}"`);
    }
  };

  const handleApproveFilm = (id: string, notes?: string) => {
    setFilms(prev => prev.map(f => f.id === id ? { ...f, status: 'APPROVED', reviewNotes: notes } : f));
    const target = films.find(f => f.id === id);
    if (target) {
      addLog('ASSET_DECISION_APPROVED', `Cleared content validation loops for film title: "${target.title}". Moving package to main index.`);
    }
  };

  const handleRejectFilm = (id: string, notes?: string) => {
    setFilms(prev => prev.map(f => f.id === id ? { ...f, status: 'REJECTED', reviewNotes: notes } : f));
    const target = films.find(f => f.id === id);
    if (target) {
      addLog('ASSET_DECISION_REJECTED', `Quarantined film compilation for: "${target.title}" due to administrative correction requirements.`);
    }
  };

  const handleAddDeal = (deal: NegotiatingDeal) => {
    setDeals(prev => [deal, ...prev]);
  };

  const handleUpdateDeal = (id: string, updated: Partial<NegotiatingDeal>) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, ...updated } as NegotiatingDeal : d));
  };

  const handleSignDeal = (dealId: string, signatureStr: string) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      
      const payload: Partial<NegotiatingDeal> = {};
      if (role === 'CREATOR') {
        payload.creatorSignature = signatureStr;
      } else if (role === 'BUYER') {
        payload.buyerSignature = signatureStr;
      }

      const merged = { ...d, ...payload };

      if (merged.creatorSignature && merged.buyerSignature) {
        merged.status = 'EXECUTED';
        merged.oracleContractId = `tx_ora_${Math.random().toString(16).substring(2, 12)}de80892a`;
        merged.signedAt = new Date().toISOString();
        
        merged.auditTrail = [
          ...merged.auditTrail,
          {
            sender: 'SYSTEM',
            senderName: 'StreamVista Sovereign Ledger',
            price: merged.price,
            timestamp: new Date().toISOString(),
            action: 'CONTRACT_SIGNED',
            note: `Mutual signature authentication complete. Sealed ledger blocks saved to Oracle ATP. Contract Reference ID: ${merged.oracleContractId}`
          }
        ];
      }

      return merged as NegotiatingDeal;
    }));

    addLog('LEGISLATION_SIGN', `Registered signature validation hash under name ${signatureStr} for transaction ledger: ${dealId}`);
  };

  const handleRequestScreener = (filmId: string, filmTitle: string) => {
    const newReq: ScreenerRequest = {
      id: `scr-${Math.floor(Math.random() * 900) + 500}`,
      filmId,
      filmTitle,
      buyerEmail: activeEmail,
      buyerCompany: activeCompany,
      status: 'APPROVED',
      requestedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      views: 1,
      watermarkText: `CONFIDENTIAL SCREENER - INTELLECTUAL PROPERTY LOCK • LICENSED TO ${activeCompany.toUpperCase()} • AUTH EMAIL: ${activeEmail.toUpperCase()}`,
      clicks: [
        { timestamp: new Date().toISOString(), action: 'CLICKED_PLAY', ipAddress: '194.22.45.101' }
      ]
    };
    setScreeners(prev => [newReq, ...prev]);
    addLog('SCREENER_REQUEST_VERIFICATION', `Approved secure evaluator code assignment for film title: "${filmTitle}" to B2B Buyer: ${activeCompany}`);
  };

  const handleSignOut = () => {
    handleSelectRole('PUBLIC');
  };

  // 5. SALES WORKFLOWS METHOD ACTIONS
  const handleAddNewLead = (lead: { contactName: string; companyName: string; email: string; useCase: string }) => {
    const newLead: LeadRequest = {
      id: `lead-id-${Math.floor(Math.random() * 9000) + 1000}`,
      contactName: lead.contactName,
      companyName: lead.companyName,
      email: lead.email,
      useCase: lead.useCase,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };
    setLeadRequests(prev => [newLead, ...prev]);

    // System Alert Log notifying administrators
    const newLog: AuditLog = {
      id: `log-lead-${Math.floor(Math.random() * 900) + 100}`,
      timestamp: new Date().toISOString(),
      user: lead.email,
      role: 'PUBLIC',
      action: 'SALES_LEAD_SUBMISSION',
      details: `Staged new corporate evaluation interest from "${lead.companyName}" (${lead.contactName}). Stated needs: "${lead.useCase}"`,
      oracleHash: generateMockHash('SALES_LEAD_SUBMISSION')
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleCreateDemoInvitation = (invite: Omit<DemoInvitation, 'id' | 'createdAt' | 'currentUsers'>) => {
    const newInvite: DemoInvitation = {
      ...invite,
      id: `invite-${Math.floor(Math.random() * 90000) + 10000}`,
      inviteUrl: `https://demo.crayonspictures.in?invite=${invite.code}`,
      currentUsers: 0,
      createdAt: new Date().toISOString()
    };
    setDemoInvitations(prev => [newInvite, ...prev]);
  };

  const handleExpireInvitation = (id: string) => {
    setDemoInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'EXPIRED' } : inv));
  };

  const handleDisableInvitation = (id: string) => {
    setDemoInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'DISABLED' } : inv));
  };

  const handleCreateDemoAccount = (account: any) => {
    setDemoAccounts(prev => {
      const idx = prev.findIndex(a => a.id === account.id || a.email.toLowerCase() === account.email.toLowerCase());
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...account };
        return copy;
      }
      return [account, ...prev];
    });
  };

  const handleConvertLeadOpportunity = (leadId: string, actionStr: string) => {
    setLeadRequests(prev => prev.map(l => {
      if (l.id !== leadId) return l;
      if (actionStr === 'CONVERT') {
        return { ...l, status: 'CONVERTED' };
      }
      return { ...l, status: 'INVITATION_SENT', generatedInvitationCode: actionStr };
    }));
  };

  const handleDeleteLeadOpportunity = (leadId: string) => {
    setLeadRequests(prev => prev.filter(l => l.id !== leadId));
  };

  // Super master purge to default state
  const handleResetStagedEnvironment = () => {
    // Purges localStorage demo keys specifically
    localStorage.removeItem(`${dbPrefix}sv_films`);
    localStorage.removeItem(`${dbPrefix}sv_registrations`);
    localStorage.removeItem(`${dbPrefix}sv_deals`);
    localStorage.removeItem(`${dbPrefix}sv_screeners`);
    localStorage.removeItem(`${dbPrefix}sv_logs`);
    localStorage.removeItem(`${dbPrefix}sv_vault_assets`);

    setFilms(INITIAL_FILMS);
    setRegistrations(INITIAL_REGISTRATIONS);
    setDeals(INITIAL_DEALS);
    setScreeners(INITIAL_SCREENERS);
    setVaultAssets(INITIAL_VAULT_ASSETS);
    setLogs(INITIAL_AUDIT_LOGS);
    setRole('PUBLIC');
    setActiveCompany('');
    setActiveEmail('');
  };

  return (
    <div className="bg-[#fafafa] min-h-screen">
      {showWorkspaceSelector ? (
        <WorkspaceSelector workspaces={availableWorkspaces} onSelectWorkspace={handleFinalLogin} />
      ) : (
        <>
          {role === 'PUBLIC' && (
            <Homepage
              onSelectRole={handleSelectRole}
              onRegisterBridge={handleRegisterBridge}
              registeredList={registrations}
              currentDomain={currentDomain}
              onAddLead={handleAddNewLead}
              demoInvitations={demoInvitations}
              demoAccounts={demoAccounts}
            />
          )}

          {role === 'ADMIN' && (
            <AdminDashboard
              films={films}
              registrations={registrations}
              deals={deals}
              onApproveRegistration={handleApproveRegistration}
              onRejectRegistration={handleRejectRegistration}
              onApproveFilm={handleApproveFilm}
              onRejectFilm={handleRejectFilm}
              logs={logs}
              onAddLog={addLog}
              onSignOut={handleSignOut}
              vaultAssets={vaultAssets}
              onDeleteVaultAsset={handleDeleteVaultAsset}
              onUpdateVaultAsset={handleUpdateVaultAsset}

              // Demo props delegation
              currentDomain={currentDomain}
              demoInvitations={demoInvitations}
              leadRequests={leadRequests}
              demoAccounts={demoAccounts}
              onCreateDemoInvitation={handleCreateDemoInvitation}
              onExpireInvitation={handleExpireInvitation}
              onDisableInvitation={handleDisableInvitation}
              onCreateDemoAccount={handleCreateDemoAccount}
              onResetDemoEnvironment={handleResetStagedEnvironment}
              onConvertLead={handleConvertLeadOpportunity}
              onDeleteLead={handleDeleteLeadOpportunity}
            />
          )}

          {role === 'CREATOR' && (
            <CreatorDashboard
              email={activeEmail}
              films={films}
              deals={deals}
              onAddFilm={handleAddFilm}
              onUpdateFilm={handleUpdateFilm}
              onDeleteFilm={handleDeleteFilm}
              onSignDeal={handleSignDeal}
              logs={logs}
              onAddLog={addLog}
              onSignOut={handleSignOut}
              vaultAssets={vaultAssets}
              onAddVaultAsset={handleAddVaultAsset}
              onUpdateVaultAsset={handleUpdateVaultAsset}
            />
          )}

          {role === 'BUYER' && (
            <BuyerDashboard
              email={activeEmail}
              companyName={activeCompany}
              films={films}
              deals={deals}
              screeners={screeners}
              onAddDeal={handleAddDeal}
              onUpdateDeal={handleUpdateDeal}
              onRequestScreener={handleRequestScreener}
              onSignDeal={handleSignDeal}
              onAddLog={addLog}
              onSignOut={handleSignOut}
            />
          )}
        </>
      )}
    </div>
  );
}
