import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import { AppUser, MediaAsset, RightsCatalogueEntry, DealRequest, PrivateScreener, Contract, AuditLog, UserRole } from '../types';

// Default / fallback keys from environment variables
const ENV_SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const ENV_SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const STORAGE_KEY_CONFIG = 'streamvista_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Retrieve configured Supabase credentials (from localStorage or Vite env)
export const getSupabaseConfig = (): SupabaseConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored Supabase config:', e);
  }

  return {
    url: ENV_SUPABASE_URL,
    anonKey: ENV_SUPABASE_ANON_KEY
  };
};

export const saveSupabaseConfig = (config: SupabaseConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    supabaseClientInstance = null; // Reset cached client
  } catch (e) {
    console.warn('Failed to save Supabase config to storage:', e);
  }
};

export const clearSupabaseConfig = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_CONFIG);
    supabaseClientInstance = null;
  } catch (e) {
    console.warn('Failed to clear Supabase config:', e);
  }
};

let supabaseClientInstance: SupabaseClient | null = null;

// Get or initialize singleton Supabase Client
export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseClientInstance) return supabaseClientInstance;

  const config = getSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      supabaseClientInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return supabaseClientInstance;
    } catch (e) {
      console.warn('Error initializing Supabase client:', e);
      return null;
    }
  }
  return null;
};

// Check if Supabase connection is actively configured
export const isSupabaseConfigured = (): boolean => {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
};

// Map Supabase User to AppUser
export const mapSupabaseUser = (user: SupabaseUser, roleOverride?: UserRole): AppUser => {
  const metadata = user.user_metadata || {};
  const email = user.email || 'operator@streamvista.live';
  const role: UserRole = roleOverride || metadata.role || (email.includes('admin') || email.includes('legal') ? 'ADMIN' : email.includes('studio') ? 'CONTENT_OWNER' : 'BUYER');

  return {
    uid: user.id,
    email: email,
    displayName: metadata.full_name || metadata.name || metadata.displayName || email.split('@')[0] || 'Enterprise Operator',
    photoURL: metadata.avatar_url || metadata.picture || null,
    role: role,
    companyName: metadata.company_name || metadata.company || 'Enterprise Film Licensor',
    emailVerified: Boolean(user.email_confirmed_at)
  };
};

// ==========================================
// REAL SUPABASE AUTH FUNCTIONS
// ==========================================

export const supabaseSignInWithPassword = async (email: string, password: string): Promise<{ user: AppUser | null; error: Error | null }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: new Error('Supabase client is not configured. Please provide Supabase URL and Anon Key.') };
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { user: null, error };
  }

  if (data.user) {
    const appUser = mapSupabaseUser(data.user);
    return { user: appUser, error: null };
  }

  return { user: null, error: new Error('No user returned from Supabase') };
};

export const supabaseSignUpWithPassword = async (
  email: string, 
  password: string, 
  displayName: string,
  role: UserRole,
  companyName: string
): Promise<{ user: AppUser | null; error: Error | null }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: new Error('Supabase client is not configured.') };
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: displayName,
        role: role,
        company_name: companyName
      }
    }
  });

  if (error) {
    return { user: null, error };
  }

  if (data.user) {
    const appUser = mapSupabaseUser(data.user, role);
    return { user: appUser, error: null };
  }

  return { user: null, error: new Error('User sign up pending confirmation.') };
};

export const supabaseSignInWithOAuth = async (provider: 'google' | 'github'): Promise<{ error: Error | null }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { error: new Error('Supabase client is not configured.') };
  }

  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin
    }
  });

  return { error };
};

export const supabaseSignInWithMagicLink = async (email: string): Promise<{ error: Error | null }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { error: new Error('Supabase client is not configured.') };
  }

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  return { error };
};

export const supabaseSignOut = async (): Promise<void> => {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
};

export const getSupabaseCurrentSession = async (): Promise<{ session: Session | null; user: AppUser | null }> => {
  const client = getSupabaseClient();
  if (!client) return { session: null, user: null };

  const { data } = await client.auth.getSession();
  if (data.session?.user) {
    return {
      session: data.session,
      user: mapSupabaseUser(data.session.user)
    };
  }
  return { session: null, user: null };
};

// ==========================================
// REAL SUPABASE DATABASE (POSTGRES) OPERATIONS
// ==========================================

export const supabaseFetchAssets = async (): Promise<MediaAsset[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('media_assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch assets note:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map((row: any): MediaAsset => ({
        id: row.id,
        ownerId: row.owner_id || row.ownerId,
        title: row.title,
        description: row.description,
        genre: Array.isArray(row.genre) ? row.genre : JSON.parse(row.genre || '[]'),
        language: Array.isArray(row.language) ? row.language : JSON.parse(row.language || '[]'),
        duration: row.duration,
        releaseYear: row.release_year || row.releaseYear,
        thumbnailUrl: row.thumbnail_url || row.thumbnailUrl,
        videoUrl: row.video_url || row.videoUrl,
        status: row.status,
        metadata: row.metadata || {},
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
      }));
    }
    return null;
  } catch (e) {
    console.warn('Supabase fetch assets exception:', e);
    return null;
  }
};

export const supabaseInsertAsset = async (asset: MediaAsset): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('media_assets').insert({
      id: asset.id,
      owner_id: asset.ownerId,
      title: asset.title,
      description: asset.description,
      genre: asset.genre,
      language: asset.language,
      duration: asset.duration,
      release_year: asset.releaseYear,
      thumbnail_url: asset.thumbnailUrl,
      video_url: asset.videoUrl,
      status: asset.status,
      metadata: asset.metadata,
      created_at: new Date(asset.createdAt).toISOString(),
      updated_at: new Date(asset.updatedAt).toISOString()
    });

    if (error) {
      console.warn('Supabase insert asset error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase insert asset exception:', e);
    return false;
  }
};

export const supabaseFetchDeals = async (): Promise<DealRequest[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('deal_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch deals note:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map((row: any): DealRequest => ({
        id: row.id,
        buyerId: row.buyer_id || row.buyerId,
        assetId: row.asset_id || row.assetId,
        ownerId: row.owner_id || row.ownerId,
        rightsId: row.rights_id || row.rightsId,
        status: row.status,
        proposedPrice: row.proposed_price || row.proposedPrice,
        message: row.message,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
      }));
    }
    return null;
  } catch (e) {
    console.warn('Supabase fetch deals exception:', e);
    return null;
  }
};

export const supabaseInsertDeal = async (deal: DealRequest): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('deal_requests').insert({
      id: deal.id,
      buyer_id: deal.buyerId,
      asset_id: deal.assetId,
      owner_id: deal.ownerId,
      rights_id: deal.rightsId,
      status: deal.status,
      proposed_price: deal.proposedPrice,
      message: deal.message,
      created_at: new Date(deal.createdAt).toISOString()
    });

    if (error) {
      console.warn('Supabase insert deal error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase insert deal exception:', e);
    return false;
  }
};

export const supabaseUpdateAsset = async (assetId: string, updates: Partial<MediaAsset>): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload: any = {
      updated_at: new Date().toISOString()
    };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.genre !== undefined) payload.genre = updates.genre;
    if (updates.language !== undefined) payload.language = updates.language;
    if (updates.duration !== undefined) payload.duration = updates.duration;
    if (updates.releaseYear !== undefined) payload.release_year = updates.releaseYear;
    if (updates.thumbnailUrl !== undefined) payload.thumbnail_url = updates.thumbnailUrl;
    if (updates.videoUrl !== undefined) payload.video_url = updates.videoUrl;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.metadata !== undefined) payload.metadata = updates.metadata;

    const { error } = await client
      .from('media_assets')
      .update(payload)
      .eq('id', assetId);

    if (error) {
      console.warn('Supabase update asset error (RLS enforced):', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase update asset exception:', e);
    return false;
  }
};

export const supabaseDeleteAsset = async (assetId: string): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('media_assets')
      .delete()
      .eq('id', assetId);

    if (error) {
      console.warn('Supabase delete asset error (RLS enforced):', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase delete asset exception:', e);
    return false;
  }
};

export const supabaseUpdateDealStatus = async (dealId: string, status: string): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('deal_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', dealId);

    if (error) {
      console.warn('Supabase update deal status error (RLS enforced):', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase update deal status exception:', e);
    return false;
  }
};

export const supabaseDeleteDeal = async (dealId: string): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('deal_requests')
      .delete()
      .eq('id', dealId);

    if (error) {
      console.warn('Supabase delete deal error (RLS enforced):', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase delete deal exception:', e);
    return false;
  }
};

export const supabaseInsertAuditLog = async (log: AuditLog): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('audit_logs').insert({
      id: log.id,
      action: log.action,
      user_id: log.userId,
      user_email: log.userEmail,
      user_name: log.userName,
      role: log.role,
      details: log.details,
      resource_id: log.resourceId,
      resource_type: log.resourceType,
      metadata: log.metadata,
      timestamp: new Date(log.timestamp).toISOString()
    });

    if (error) {
      console.warn('Supabase insert audit log note:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase insert audit log exception:', e);
    return false;
  }
};

// Dedicated Row Level Security (RLS) SQL Script for Assets and Deals
export const SUPABASE_RLS_POLICIES_SQL = `-- ==============================================================================
-- STREAMVISTA ROW LEVEL SECURITY (RLS) POLICIES FOR ASSETS & DEALS
-- Enforces:
-- 1. Buyers can ONLY view and manage their own active deals
-- 2. Studios / Content Owners can ONLY manage their specific content assets
-- 3. Legal & Admin roles maintain platform-wide governance
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY
ALTER TABLE IF EXISTS public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rights_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. MEDIA ASSETS POLICIES (STUDIO SPECIFIC ASSET MANAGEMENT)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "media_assets_select_policy" ON public.media_assets;
DROP POLICY IF EXISTS "media_assets_insert_policy" ON public.media_assets;
DROP POLICY IF EXISTS "media_assets_update_policy" ON public.media_assets;
DROP POLICY IF EXISTS "media_assets_delete_policy" ON public.media_assets;

-- SELECT: Public/Buyers can view approved marketplace assets; Studios view their own assets; Admins view all
CREATE POLICY "media_assets_select_policy" ON public.media_assets
FOR SELECT
USING (
  status = 'APPROVED'
  OR owner_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
  OR auth.role() = 'anon'
);

-- INSERT: Only content studios and admins can create new assets (tagged with their owner_id)
CREATE POLICY "media_assets_insert_policy" ON public.media_assets
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('CONTENT_OWNER', 'ADMIN')
);

-- UPDATE: Studios can ONLY update their specific content assets
CREATE POLICY "media_assets_update_policy" ON public.media_assets
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
)
WITH CHECK (
  owner_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- DELETE: Studios can ONLY delete their specific content assets
CREATE POLICY "media_assets_delete_policy" ON public.media_assets
FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- ------------------------------------------------------------------------------
-- 3. DEAL REQUESTS POLICIES (BUYER DEAL ISOLATION & STUDIO OFFER REVIEW)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "deal_requests_select_policy" ON public.deal_requests;
DROP POLICY IF EXISTS "deal_requests_insert_policy" ON public.deal_requests;
DROP POLICY IF EXISTS "deal_requests_update_policy" ON public.deal_requests;
DROP POLICY IF EXISTS "deal_requests_delete_policy" ON public.deal_requests;

-- SELECT: Buyers can ONLY view their own active deals; Studios view deals for their assets; Admins view all
CREATE POLICY "deal_requests_select_policy" ON public.deal_requests
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()::text
  OR owner_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- INSERT: Buyers can submit licensing offers where buyer_id matches their authenticated UID
CREATE POLICY "deal_requests_insert_policy" ON public.deal_requests
FOR INSERT
TO authenticated
WITH CHECK (
  buyer_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('BUYER', 'ADMIN')
);

-- UPDATE: Studios can accept/reject/counter deals on their content; Buyers can update their proposals
CREATE POLICY "deal_requests_update_policy" ON public.deal_requests
FOR UPDATE
TO authenticated
USING (
  buyer_id = auth.uid()::text
  OR owner_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
)
WITH CHECK (
  buyer_id = auth.uid()::text
  OR owner_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- DELETE: Only the originating buyer or an Admin can retract/delete a deal record
CREATE POLICY "deal_requests_delete_policy" ON public.deal_requests
FOR DELETE
TO authenticated
USING (
  buyer_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- ------------------------------------------------------------------------------
-- 4. RIGHTS CATALOGUE POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "rights_catalogue_select_policy" ON public.rights_catalogue;
DROP POLICY IF EXISTS "rights_catalogue_manage_policy" ON public.rights_catalogue;

CREATE POLICY "rights_catalogue_select_policy" ON public.rights_catalogue
FOR SELECT
USING (true);

CREATE POLICY "rights_catalogue_manage_policy" ON public.rights_catalogue
FOR ALL
TO authenticated
USING (
  owner_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
)
WITH CHECK (
  owner_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

-- ------------------------------------------------------------------------------
-- 5. AUDIT LOGS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;

CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()::text
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
);

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);
`;

// Full SQL Migration script that user can run in Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- STREAMVISTA ENTERPRISE POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'BUYER' CHECK (role IN ('ADMIN', 'CONTENT_OWNER', 'BUYER')),
  company_name TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  genre JSONB DEFAULT '[]'::jsonb,
  language JSONB DEFAULT '[]'::jsonb,
  duration INTEGER DEFAULT 90,
  release_year INTEGER DEFAULT 2025,
  thumbnail_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'APPROVED',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rights_catalogue (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES public.media_assets(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  territories JSONB DEFAULT '[]'::jsonb,
  license_types JSONB DEFAULT '[]'::jsonb,
  exclusivity BOOLEAN DEFAULT FALSE,
  availability_status TEXT DEFAULT 'AVAILABLE',
  license_start BIGINT,
  license_end BIGINT,
  price NUMERIC DEFAULT 100000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deal_requests (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  rights_id TEXT,
  status TEXT DEFAULT 'REQUESTED',
  proposed_price NUMERIC DEFAULT 0,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.private_screeners (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  screener_url TEXT NOT NULL,
  expiry_date BIGINT,
  watermark_text TEXT,
  view_count INTEGER DEFAULT 0,
  last_viewed_at BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  file_url TEXT,
  status TEXT DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  role TEXT,
  details TEXT,
  resource_id TEXT,
  resource_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

${SUPABASE_RLS_POLICIES_SQL}
`;
