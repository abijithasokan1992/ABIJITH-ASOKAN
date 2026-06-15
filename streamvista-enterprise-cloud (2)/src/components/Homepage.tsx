/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, ChevronRight, UserCheck, Briefcase, Film, HelpCircle, Laptop, ArrowRight, Check, AlertCircle, HardDrive, DollarSign, FileText, Send, Lock, Link, Copy, Eye, EyeOff } from 'lucide-react';
import { UserRole, DemoInvitation, BridgeRegistration } from '../types';
import FAQSection from './FAQSection';

interface HomepageProps {
  onSelectRole: (mockEmail: string) => void;
  onRegisterBridge: (data: {
    role: 'CREATOR' | 'BUYER';
    companyName: string;
    contactName: string;
    email: string;
    website: string;
    catalogSize: string;
  }) => void;
  registeredList?: BridgeRegistration[];
  currentDomain: 'PRODUCTION' | 'DEMO';
  onAddLead: (lead: { contactName: string; companyName: string; email: string; useCase: string }) => void;
  demoInvitations: DemoInvitation[];
  demoAccounts: any[];
}

export default function Homepage({
  onSelectRole,
  onRegisterBridge,
  registeredList = [],
  currentDomain,
  onAddLead,
  demoInvitations = [],
  demoAccounts = []
}: HomepageProps) {
  const [activeTab, setActiveTab] = useState<'HOME' | 'FEATURES' | 'PRICING' | 'POLICIES' | 'LOGIN' | 'CREATE_CREATOR_ACCOUNT' | 'ONBOARD_PARTNER' | 'SUPPORT'>('HOME');
  const [registerRole, setRegisterRole] = useState<'CREATOR' | 'BUYER'>('CREATOR');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Support Ticketing form state
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  // Lead Request Modal state
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadContact, setLeadContact] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadUseCase, setLeadUseCase] = useState('');
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Manual Interactive Invitation code check
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleRegisterSubmit = (role: 'CREATOR' | 'BUYER', e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!companyName || !contactName || !email) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    onRegisterBridge({
      role,
      companyName,
      contactName,
      email,
      website: 'https://' + companyName.toLowerCase().replace(/\s+/g, '') + '.com',
      catalogSize: '5-20 films'
    });

    setRegisterSuccess(true);
    setCompanyName('');
    setContactName('');
    setEmail('');
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName || !supportEmail || !supportMsg) return;
    setSupportSuccess(true);
    setSupportName('');
    setSupportEmail('');
    setSupportSubject('');
    setSupportMsg('');
    setTimeout(() => setSupportSuccess(false), 5000);
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadContact || !leadCompany || !leadEmail || !leadUseCase) return;
    onAddLead({
      contactName: leadContact,
      companyName: leadCompany,
      email: leadEmail,
      useCase: leadUseCase
    });
    setLeadSuccess(true);
    setTimeout(() => {
      setLeadSuccess(false);
      setLeadModalOpen(false);
      setLeadContact('');
      setLeadCompany('');
      setLeadEmail('');
      setLeadUseCase('');
    }, 4000);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Check predefined production / system emails
    if (loginEmail === 'admin@streamvista.com' || loginEmail === 'admin') {
      onSelectRole('admin@streamvista.com');
      return;
    }
    if (loginEmail === 'partner@crayond.com') {
      onSelectRole('partner@crayond.com');
      return;
    }
    if (loginEmail === 'buyer@streamvista.com') {
      onSelectRole('buyer@streamvista.com');
      return;
    }

    // Try finding in demoAccounts registry (Created dynamically by Admin)
    const matchedAccount = demoAccounts.find(a => a.email.toLowerCase() === loginEmail.toLowerCase());
    if (matchedAccount) {
      if (matchedAccount.status === 'DISABLED') {
        setLoginError('This Demo Account has been disabled by safe platform administrators.');
        return;
      }
      onSelectRole(matchedAccount.email);
      return;
    }

    // Fallback if user types an email of an approved partner
    const matchedReg = registeredList.find(r => r.email.toLowerCase() === loginEmail.toLowerCase() && r.status === 'APPROVED');
    if (matchedReg) {
      onSelectRole(matchedReg.email);
      return;
    }

    setLoginError('Invalid credentials. Check active registrations or verify with demo invitation codes.');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans flex flex-col justify-between" id="homepage-root">
      
      {/* Sandbox Navigation & Admin Onboarding Utility Bar */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-700 py-2.5 px-4 md:px-8 text-xs text-zinc-300 font-medium font-sans flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md" id="sandbox-onboarding-banner">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-zinc-200 font-sans text-[11px]">
            <strong>StreamVista Sandbox Environment</strong> — Need quick Admin workspace access? Use the direct onboarding controls.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?invite=ADM777`;
              navigator.clipboard.writeText(url);
              alert(`Copied Admin Onboarding Link to clipboard:\n${url}`);
            }}
            className="bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700 font-mono text-[10px] font-bold px-2.5 py-1 rounded transition-all flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
            title="Copy dedicated Admin invitation URL to share or open"
          >
            <Copy className="h-3 w-3 text-amber-400" />
            Copy Admin Link
          </button>
          <button
            onClick={() => {
              onSelectRole('admin@streamvista.com');
            }}
            className="bg-amber-500 hover:bg-amber-600 text-neutral-900 font-black font-sans px-3.5 py-1 rounded transition-all flex items-center gap-1 uppercase tracking-wider text-[10px] cursor-pointer"
            title="Instantly bypass public screen and log in as Sandbox Platform Admin"
          >
            <Lock className="h-3 w-3" />
            Auto-Onboard Admin
          </button>
        </div>
      </div>

      {/* Dynamic Environment Warning Banner */}
      {currentDomain === 'DEMO' && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200 py-3 px-4 md:px-8 text-center text-xs text-amber-800 font-medium font-sans flex items-center justify-center gap-2" id="demo-domain-banner">
          <Shield className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>StreamVista Evaluation Environment</strong> — Provided for demonstration and evaluation purposes. No production content, payments, contracts, or licensing transactions are processed.
          </span>
        </div>
      )}

      {/* Header bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-900 text-white p-1.5 rounded-lg flex items-center justify-center">
              <Film className="h-5 w-5" />
            </div>
            <span className="font-sans font-bold tracking-tight text-zinc-900 text-base">STREAMVISTA</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            <button
              onClick={() => setActiveTab('HOME')}
              className={`py-2 transition-colors ${activeTab === 'HOME' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'hover:text-zinc-900'}`}
              id="nav-home"
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('FEATURES')}
              className={`py-2 transition-colors ${activeTab === 'FEATURES' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'hover:text-zinc-900'}`}
              id="nav-features"
            >
              Features
            </button>
            <button
              onClick={() => setActiveTab('PRICING')}
              className={`py-2 transition-colors ${activeTab === 'PRICING' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'hover:text-zinc-900'}`}
              id="nav-pricing"
            >
              Pricing
            </button>
            <button
              onClick={() => setActiveTab('POLICIES')}
              className={`py-2 transition-colors ${activeTab === 'POLICIES' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'hover:text-zinc-900'}`}
              id="nav-policies"
            >
              Policies
            </button>
            <button
              onClick={() => setActiveTab('LOGIN')}
              className={`py-2 transition-colors ${activeTab === 'LOGIN' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'hover:text-zinc-900'}`}
              id="nav-login"
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab('CREATE_CREATOR_ACCOUNT')}
              className={`py-2 transition-colors ${activeTab === 'CREATE_CREATOR_ACCOUNT' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'hover:text-zinc-900'}`}
              id="nav-create-account"
            >
              Join as Creator
            </button>
            <button
              onClick={() => setActiveTab('ONBOARD_PARTNER')}
              className={`py-2 transition-colors ${activeTab === 'ONBOARD_PARTNER' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'hover:text-zinc-900'}`}
              id="nav-onboard-partner"
            >
              Join as Partner
            </button>
            <button
              onClick={() => setActiveTab('SUPPORT')}
              className={`py-2 transition-colors ${activeTab === 'SUPPORT' ? 'text-zinc-900 border-b-2 border-zinc-900' : 'hover:text-zinc-900'}`}
              id="nav-support"
            >
              Support
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('LOGIN')}
              className="bg-zinc-900 text-white text-[11px] font-bold tracking-wider px-3.5 py-2 rounded-lg hover:bg-zinc-800 transition-colors uppercase border border-zinc-900"
              id="header-btn-sandbox"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-grow w-full">
        
        {/* TAB 1: HOME */}
        {activeTab === 'HOME' && (
          <div className="space-y-12 animate-fade-in" id="home-tab-view">
            <div className="text-center max-w-2xl mx-auto space-y-4 py-8">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase border border-zinc-200 px-3 py-1 rounded-full bg-zinc-50">Enterprise Content Orchestration</span>
              <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tight">
                STREAMVISTA
              </h1>
              <p className="text-sm md:text-lg text-zinc-650 font-medium">
                Sovereign Cloud Operations for Premium B2B Media Licensing & Global Distribution.
              </p>
              
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <button
                  onClick={() => setActiveTab('CREATE_CREATOR_ACCOUNT')}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-6 py-3 rounded-lg transition-all shadow-sm"
                >
                  Join as Creator
                </button>
                <button
                  onClick={() => setActiveTab('ONBOARD_PARTNER')}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-6 py-3 rounded-lg transition-all shadow-sm"
                >
                  Join as Partner
                </button>
                <button
                  onClick={() => setLeadModalOpen(true)}
                  className="bg-white text-zinc-800 hover:bg-zinc-50 text-xs font-bold px-6 py-3 rounded-lg border border-zinc-200 transition-all shadow-xm"
                  id="request-demo-cta"
                >
                  Request Demo Environment
                </button>
              </div>
            </div>

            {/* Highlights Section */}
            <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
              <div className="bg-white border border-zinc-200 p-5 rounded-xl text-center space-y-2">
                <div className="mx-auto w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-900">
                  <HardDrive className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-zinc-900">Secure Vault Storage</h3>
              </div>

              <div className="bg-white border border-zinc-200 p-5 rounded-xl text-center space-y-2">
                <div className="mx-auto w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-900">
                  <Laptop className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-zinc-900">Watermarked Screeners</h3>
              </div>

              <div className="bg-white border border-zinc-200 p-5 rounded-xl text-center space-y-2">
                <div className="mx-auto w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-900">
                  <DollarSign className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-zinc-900">Isolated Licensing</h3>
              </div>

              <div className="bg-white border border-zinc-200 p-5 rounded-xl text-center space-y-2">
                <div className="mx-auto w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-900">
                  <Briefcase className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-bold text-zinc-900">Ledger Contracts</h3>
              </div>
            </div>

            <div className="text-center pt-8">
              <button
                onClick={() => setActiveTab('FEATURES')}
                className="text-zinc-500 hover:text-zinc-950 text-xs font-bold inline-flex items-center gap-1"
              >
                Learn more about our platform features
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: FEATURES */}
        {activeTab === 'FEATURES' && (
          <div className="space-y-8 animate-fade-in" id="features-tab-view">
            <div className="max-w-xl text-center mx-auto space-y-2">
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Platform Features</h2>
              <p className="text-xs text-zinc-500">
                Secure distribution tools designed specifically for professional media licensing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="border border-zinc-200 bg-white p-5 rounded-xl space-y-2">
                <h4 className="font-bold text-xs text-zinc-900">Organization Onboarding Queue</h4>
                <p className="text-xs text-zinc-655 leading-relaxed">
                  Registers and qualifies prospective content partners under active administrative approval workflows.
                </p>
              </div>

              <div className="border border-zinc-200 bg-white p-5 rounded-xl space-y-2">
                <h4 className="font-bold text-xs text-zinc-900">Watermarked Screening Player</h4>
                <p className="text-xs text-zinc-655 leading-relaxed">
                  Stamps buyer identification details clearly across display playback views to secure creative content.
                </p>
              </div>

              <div className="border border-zinc-200 bg-white p-5 rounded-xl space-y-2">
                <h4 className="font-bold text-xs text-zinc-900">Licensing Negotiations</h4>
                <p className="text-xs text-zinc-655 leading-relaxed">
                  Facilitates rate proposals, counters, territory filters, and clear terms without external friction.
                </p>
              </div>

              <div className="border border-zinc-200 bg-white p-5 rounded-xl space-y-2">
                <h4 className="font-bold text-xs text-zinc-900">Secure Activity Tracking</h4>
                <p className="text-xs text-zinc-655 leading-relaxed">
                  Logs key business milestones, uploaded file transfers, and agreement actions transparently.
                </p>
              </div>
            </div>

            <FAQSection />
          </div>
        )}

        {/* TAB 3: PRICING */}
        {activeTab === 'PRICING' && (
          <div className="space-y-10 animate-fade-in" id="pricing-tab-view">
            <div className="max-w-xl text-center mx-auto space-y-2">
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">StreamVista Commercial Tiers</h2>
              <p className="text-xs text-zinc-500 font-sans">
                Comprehensive distribution and storage packages designed for professional media workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto pt-4">
              {/* Creator Free */}
              <div className="border border-zinc-200 bg-white p-6 rounded-xl flex flex-col justify-between space-y-5 transition-all hover:border-zinc-300">
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">PLAN 1</span>
                    <h3 className="font-bold text-sm text-zinc-900">Creator Free</h3>
                  </div>
                  <div className="text-2xl font-black text-zinc-900 tracking-tight">₹0/month</div>
                  <ul className="text-xs text-zinc-655 space-y-2 pt-2 border-t border-zinc-100">
                    <li className="flex items-center gap-2">✓ Account Creation</li>
                    <li className="flex items-center gap-2">✓ Metadata Management</li>
                    <li className="flex items-center gap-2">✓ Film Catalog Drafts</li>
                    <li className="flex items-center gap-2">✓ Rights Information</li>
                  </ul>
                </div>
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setActiveTab('CREATE_ACCOUNT')}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-zinc-900"
                  >
                    Onboard Now
                  </button>
                </div>
              </div>

              {/* Creator Pro */}
              <div className="border-2 border-zinc-900 bg-white p-6 rounded-xl flex flex-col justify-between space-y-5 relative shadow-md transition-all">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-zinc-900 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">PLAN 2</span>
                    <h3 className="font-bold text-sm text-zinc-900">Creator Pro</h3>
                  </div>
                  <div className="text-2xl font-black text-zinc-900 tracking-tight">₹2,999/month <span className="text-xs font-normal text-zinc-500">+ GST</span></div>
                  <ul className="text-xs text-zinc-655 space-y-2 pt-2 border-t border-zinc-100">
                    <li className="flex items-center gap-2">✓ Marketplace Access</li>
                    <li className="flex items-center gap-2">✓ Licensing Workflows</li>
                    <li className="flex items-center gap-2">✓ Secure Screeners</li>
                    <li className="flex items-center gap-2">✓ Contract Center</li>
                  </ul>
                </div>
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setActiveTab('CREATE_ACCOUNT')}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-zinc-900"
                  >
                    Get Creator Pro
                  </button>
                </div>
              </div>

              {/* Digital Vault */}
              <div className="border border-zinc-200 bg-white p-6 rounded-xl flex flex-col justify-between space-y-5 transition-all hover:border-zinc-300">
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">PLAN 3</span>
                    <h3 className="font-bold text-sm text-zinc-900">Digital Vault</h3>
                  </div>
                  <div className="text-2xl font-black text-zinc-900 tracking-tight font-sans">₹650/month <span className="text-xs font-normal text-zinc-500">per TB + GST</span></div>
                  <ul className="text-xs text-zinc-655 space-y-2 pt-2 border-t border-zinc-100">
                    <li className="flex items-center gap-2">✓ Cloud Storage Vault</li>
                    <li className="flex items-center gap-2">✓ Asset Management</li>
                    <li className="flex items-center gap-2">✓ Audit Logging Trail</li>
                  </ul>
                </div>
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setActiveTab('CREATE_ACCOUNT')}
                    className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold py-2 rounded-lg transition-colors border border-zinc-200"
                  >
                    Configure Store Only
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Lead generation Call to Action */}
            <div className="max-w-4xl mx-auto mt-12 bg-zinc-900 text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Interested in evaluating the StreamVista ecosystems?</h3>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Submit a corporate evaluation request. Our administrators will verify your use case and generate isolated trial environments securely.
                </p>
              </div>
              <button
                onClick={() => setLeadModalOpen(true)}
                className="bg-white text-zinc-950 px-5 py-3 rounded-lg font-bold text-xs shrink-0 hover:bg-zinc-100 transition-colors"
                id="btn-lead-pricing"
              >
                Request Demo Opportunity
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: POLICIES */}
        {activeTab === 'POLICIES' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in" id="billing-tab-view">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-150 border border-zinc-250 rounded-full text-zinc-700">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider">Official Policy</span>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Storage & Billing Policy</h2>
              <p className="text-xs text-zinc-500">
                Standard corporate guidelines governing calculations, tax rates, and transaction agreements.
              </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 text-xs text-zinc-750 font-sans leading-relaxed shadow-xs">
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-zinc-900">1. Tax & GST Policy</h3>
                <p>
                  An 18% Goods and Services Tax (GST) is uniformly assessed on all recurring platform subscription fees and storage overage bills.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm text-zinc-900">2. Billing Formulas & Storage Arithmetic</h3>
                <p>
                  Plans include a generous base quota if referenced. Any stored master film media, backing files, and structural artwork assets count against your allocated threshold.
                </p>
                <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-lg space-y-4 font-mono text-[11px] text-zinc-800">
                  <p className="font-bold font-sans text-xs text-zinc-900">Monthly Billing Equations:</p>
                  <div>
                    <span className="block text-zinc-500">// Creator Pro Bill Formula:</span>
                    <span>Total Bill = Base Fee (₹2,999) + GST @ 18% (₹539.82) = ₹3,538.82 / month</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500">// Digital Vault Bill Formula (Storage Only base):</span>
                    <span>Total Bill = Base Storage Base (₹650 per TB) + GST @ 18% (₹117.00) = ₹767.00 / month per TB</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm text-zinc-900">3. Transaction Success Fees</h3>
                <p>
                  Upon final mutual execution of a licensing contract, the system registers and reports the successful transaction. Standard Creator Pro success rate applies: 10% of final Contract pricing values.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LOGIN */}
        {activeTab === 'LOGIN' && (
          <div className="max-w-md mx-auto space-y-8 animate-fade-in" id="login-tab-view">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-sans">StreamVista Sign In</h2>
              <p className="text-xs text-zinc-500">
                Log into your isolated, secure corporate licensing repository.
              </p>
            </div>

            <form onSubmit={handleManualLogin} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4 font-sans" id="form-login">
              {loginError && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-800 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">Account Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. partner@crayond.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50"
                  id="login-field-email"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">Security Passphrase</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full text-xs p-2.5 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50 font-mono text-zinc-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-3 rounded-lg transition-colors border border-zinc-900 uppercase tracking-wider"
              >
                Unlock Workspace
              </button>

              {/* Demo Assist Box (Always displayed in Sandbox environments) */}
              {(currentDomain === 'DEMO' || true) && (
                <div className="border border-amber-200 bg-amber-50/50 p-4 rounded-xl space-y-3 mt-4 text-xs text-zinc-700">
                  <div className="flex gap-1 items-center font-bold text-amber-800">
                    <Lock className="h-3.5 w-3.5 text-amber-700" />
                    <span>Evaluation Access Assistants</span>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    To evaluate the platform, click an authorized evaluation profile below:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[10px] uppercase font-mono tracking-wider font-bold">
                    <button
                      type="button"
                      onClick={() => onSelectRole('partner@crayond.com')}
                      className="bg-white border border-zinc-200 hover:bg-zinc-50 p-1.5 rounded text-center"
                    >
                      Creator
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectRole('buyer@streamvista.com')}
                      className="bg-white border border-zinc-200 hover:bg-zinc-50 p-1.5 rounded text-center"
                    >
                      Buyer
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectRole('admin@streamvista.com')}
                      className="bg-white border border-zinc-200 hover:bg-zinc-50 p-1.5 rounded text-center text-amber-800 font-extrabold border-amber-200"
                    >
                      Admin
                    </button>
                  </div>

                  {demoAccounts.length > 0 && (
                    <div className="pt-2 border-t border-amber-100 text-[10px] space-y-1.5">
                      <p className="font-semibold text-zinc-500 uppercase">Created Demo Accounts:</p>
                      <div className="max-h-24 overflow-y-auto space-y-1 font-mono">
                        {demoAccounts.map(a => (
                          <button
                            key={a.email}
                            type="button"
                            onClick={() => {
                              if (a.status === 'DISABLED') {
                                setLoginError('That Demo User is disabled');
                                return;
                              }
                              onSelectRole(a.email);
                            }}
                            className={`w-full text-left bg-white border p-1 rounded hover:bg-zinc-50 flex justify-between ${a.status === 'DISABLED' ? 'opacity-50 text-zinc-400' : ''}`}
                          >
                            <span>{a.email}</span>
                            <span className="text-zinc-400">({a.role})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-amber-100 space-y-2 text-[11px]">
                    <div className="bg-white p-2 border border-amber-100 rounded text-[10.5px] space-y-1">
                      <div className="flex justify-between items-center font-bold text-amber-900">
                        <span>ADMIN ONBOARDING LINK:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?invite=ADM777`;
                            navigator.clipboard.writeText(url);
                            alert(`Copied Admin Onboarding Link to clipboard:\n${url}`);
                          }}
                          className="hover:underline text-xs flex items-center gap-1 font-mono text-amber-700 cursor-pointer"
                        >
                          <Copy className="h-2.5 w-2.5" />
                          COPY
                        </button>
                      </div>
                      <p className="font-mono text-zinc-500 break-all select-all text-[9.5px]">
                        {typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}${window.location.pathname}?invite=ADM777` : 'https://demo.crayonspictures.in?invite=ADM777'}
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Need a custom invitation link? Use the sales </span>
                      <button type="button" onClick={() => setLeadModalOpen(true)} className="underline hover:text-zinc-950 font-bold">Request Demo</button> Match!
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 6: CREATE ACCOUNT */}
        {activeTab === 'CREATE_CREATOR_ACCOUNT' && (
          <div className="max-w-md mx-auto space-y-8 animate-fade-in" id="register-creator-tab-view">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-sans">Create Creator Account</h2>
              <p className="text-xs text-zinc-500">
                Register your studio credentials to request platform clearance.
              </p>
            </div>

            {registerSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4" id="register-success-block">
                <div className="mx-auto h-10 w-10 bg-emerald-100 text-emerald-850 rounded-full flex items-center justify-center border border-emerald-200">
                  <Check className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">Request Staged</h3>
                <p className="text-xs text-zinc-600 max-w-sm mx-auto leading-relaxed">
                  Your onboarding request has been submitted and is awaiting administrative approval.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setRegisterSuccess(false);
                      setActiveTab('HOME');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    Return Home
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleRegisterSubmit('CREATOR', e)} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4 font-sans" id="form-bridge-register-creator">
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-xs text-red-800 flex gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-650 block">Company / Studio Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Zenith Film Studios"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-655 block">Contact Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alistair Ross"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-655 block">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. contact@zenith.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-2.5 rounded-lg transition-colors border border-zinc-900"
                  >
                    Submit Creator Application
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'ONBOARD_PARTNER' && (
          <div className="max-w-md mx-auto space-y-8 animate-fade-in" id="register-partner-tab-view">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-sans">Onboard Partner Account</h2>
              <p className="text-xs text-zinc-500">
                Register platform credentials to request buyer clearance.
              </p>
            </div>

            {registerSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4" id="register-success-block">
                <div className="mx-auto h-10 w-10 bg-emerald-100 text-emerald-850 rounded-full flex items-center justify-center border border-emerald-200">
                  <Check className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">Request Staged</h3>
                <p className="text-xs text-zinc-600 max-w-sm mx-auto leading-relaxed">
                  Your onboarding request has been submitted and is awaiting administrative approval.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setRegisterSuccess(false);
                      setActiveTab('HOME');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    Return Home
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleRegisterSubmit('BUYER', e)} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4 font-sans" id="form-bridge-register-partner">
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-xs text-red-800 flex gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-650 block">Company / Platform Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Global OTT Platforms"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-655 block">Contact Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Doe"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-655 block">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. contact@globalott.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-2.5 rounded-lg transition-colors border border-zinc-900"
                  >
                    Submit Partner Application
                  </button>
                </div>
              </form>
            )}

            {/* Simulated list representing other active applicants on the ledger */}
            {registeredList.length > 0 && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">Active Onboarding Ledger Status</h4>
                <div className="space-y-1.5 max-h-28 overflow-y-auto font-sans text-xs text-zinc-600 bg-white p-2.5 rounded border border-zinc-250">
                  {registeredList.map((reg) => (
                    <div key={reg.id} className="flex justify-between py-1 border-b border-zinc-100 last:border-b-0 items-center">
                      <span className="truncate max-w-[140px] font-medium text-zinc-800">{reg.companyName}</span>
                      <span className="text-zinc-500 text-[10px] uppercase font-mono">{reg.role}</span>
                      <span className={`font-bold text-[10px] ${
                        reg.status === 'APPROVED' ? 'text-emerald-600' : reg.status === 'REJECTED' ? 'text-red-500' : 'text-amber-600'
                      }`}>{reg.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: SUPPORT */}
        {activeTab === 'SUPPORT' && (
          <div className="max-w-md mx-auto space-y-8 animate-fade-in" id="support-tab-view">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-sans">StreamVista Support</h2>
              <p className="text-xs text-zinc-500">
                Log a ticket with our sovereign operations and infrastructure team.
              </p>
            </div>

            {supportSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4">
                <div className="mx-auto h-10 w-10 bg-emerald-100 text-emerald-850 rounded-full flex items-center justify-center border border-emerald-200">
                  <Check className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">Support Case Logged</h3>
                <p className="text-xs text-zinc-600 max-w-sm mx-auto leading-relaxed">
                  Clearance ID generated. StreamVista NOC Operations have cached your issue. We will respond back with telemetry updates within 4 hours.
                </p>
                <button
                  onClick={() => setSupportSuccess(false)}
                  className="bg-white border border-zinc-200 text-zinc-700 text-xs px-4 py-2 rounded-lg font-bold"
                >
                  Create New Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4 font-sans" id="form-support font-sans">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-650 block">Your Contact Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Vance"
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-655 block">Work Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. jordan@distribution.com"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-655 block">Issue Category</label>
                    <select
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50"
                    >
                      <option>Secure Screeners Playback Issue</option>
                      <option>Oracle Cloud Storage Ingestion Errors</option>
                      <option>Contract Signature Hash Incongruence</option>
                      <option>Billing, Taxes & GST Claims</option>
                      <option>Other Operational Inquiry</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-655 block">Diagnostic Message / Details</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Describe the issue with specific storage buckets, film IDs, or signing hashes..."
                      value={supportMsg}
                      onChange={(e) => setSupportMsg(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50 resize-none font-sans"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-2.5 rounded-lg transition-colors border border-zinc-900 flex items-center justify-center gap-2"
                >
                  <Send className="h-3 w-3" />
                  Dispatch Ticket
                </button>
              </form>
            )}
          </div>
        )}

      </main>

      {/* Footer containing optional pricing CTA and references */}
      <footer className="bg-white border-t border-zinc-200 mt-20 py-8 text-xs text-zinc-550">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-zinc-900 text-white p-1 rounded">
                <Film className="h-4 w-4" />
              </div>
              <span className="font-bold tracking-tight text-zinc-800">STREAMVISTA PLATFORM</span>
            </div>

            <nav className="flex flex-wrap gap-4 text-zinc-500 font-semibold">
              <button onClick={() => setActiveTab('HOME')} className="hover:text-zinc-900">Home</button>
              <button onClick={() => setActiveTab('FEATURES')} className="hover:text-zinc-900">Features</button>
              <button onClick={() => setActiveTab('PRICING')} className="hover:text-zinc-900">Pricing</button>
              <button onClick={() => setActiveTab('POLICIES')} className="hover:text-zinc-900">Policies</button>
              <button onClick={() => setLeadModalOpen(true)} className="hover:text-zinc-900 font-bold text-amber-700">Request Demo</button>
            </nav>
          </div>

          <div className="border-t border-zinc-150 pt-4 flex flex-col md:flex-row justify-between items-center gap-3">
            <span className="font-sans">
              &copy; 2026 StreamVista Tech Inc. All rights reserved. Sovereign Cloud licensing distribution ledger.
            </span>

            <div className="flex items-center gap-4 text-zinc-500 text-[10px] font-mono">
              <span>PROD_HOST: app.crayonspictures.in</span>
              <span>DEMO_HOST: demo.crayonspictures.in</span>
            </div>
          </div>
        </div>
      </footer>

      {/* LEAD GENERATION FORM MODAL (Sales opportunity tracking) */}
      {leadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="lead-form-modal">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-start pb-2 border-b border-zinc-150">
              <div>
                <span className="text-[9px] font-bold text-amber-700 font-mono uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Corporate Evaluation Staging</span>
                <h3 className="text-base font-extrabold text-zinc-900 mt-1">Request Demo Environment</h3>
              </div>
              <button
                onClick={() => setLeadModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-950 font-bold border border-transparent hover:bg-zinc-100 h-6 w-6 rounded-md flex items-center justify-center transition-colors"
              >
                &times;
              </button>
            </div>

            {leadSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto h-12 w-12 bg-emerald-100 text-emerald-850 rounded-full flex items-center justify-center border border-emerald-200">
                  <Check className="h-5 w-5 animate-bounce" />
                </div>
                <h4 className="font-bold text-zinc-900 text-sm">Lead Form Successfully Submitted</h4>
                <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">
                  Lead received! StreamVista administrators are notified and generating a sales opportunity in the Demo Center. An invitation link is pending email dispatch.
                </p>
                <div className="font-mono text-[9px] text-zinc-400">ID: OPPORTUNITY_STAGED_{Math.random().toString(16).substring(2, 6).toUpperCase()}</div>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-3 font-sans">
                <p className="text-xs text-zinc-500 leading-normal">
                  Our team isolates separate cloud instances for evaluation. Provide corporate parameters to start qualification. No credentials are automatically exposed.
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Charles Montgomery"
                    value={leadContact}
                    onChange={(e) => setLeadContact(e.target.value)}
                    className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Corporate Organization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Montgomery Broadcasters Ltd"
                    value={leadCompany}
                    onChange={(e) => setLeadCompany(e.target.value)}
                    className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Work Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. contact@montgomery.co"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Intended Workflows / Use Case</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe intended evaluation parameters, e.g., rights tracking, secure OCI streaming players, or billing equations..."
                    value={leadUseCase}
                    onChange={(e) => setLeadUseCase(e.target.value)}
                    className="w-full text-xs p-2 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900 bg-zinc-50 resize-none font-sans"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-2.5 rounded-lg border border-zinc-900 uppercase tracking-wider"
                  >
                    Generate Lead Opportunity
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
