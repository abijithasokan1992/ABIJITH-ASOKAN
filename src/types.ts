/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'CONTENT_OWNER' | 'BUYER';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  companyName?: string;
  emailVerified?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  companyName?: string;
  preferences?: {
    genres?: string[];
    languages?: string[];
    territories?: string[];
    budgetRange?: { min: number; max: number };
  };
  createdAt: number;
}

export type AssetStatus = 'DRAFT' | 'SUBMITTED' | 'LEGAL_REVIEW' | 'QC_REVIEW' | 'APPROVED' | 'LIVE' | 'REJECTED';

export interface MediaAsset {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  genre: string[];
  language: string[];
  duration: number; // in minutes
  releaseYear: number;
  thumbnailUrl: string;
  videoUrl: string; // Master asset URL
  status: AssetStatus;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface RightsCatalogueEntry {
  id: string;
  assetId: string;
  ownerId: string;
  territories: string[];
  licenseTypes: ('SVOD' | 'TVOD' | 'AVOD' | 'PAY_TV' | 'FREE_TV' | 'THEATRICAL')[];
  exclusivity: boolean;
  availabilityStatus: 'AVAILABLE' | 'ON_HOLD' | 'LICENSED';
  licenseStart: number;
  licenseEnd: number;
  price?: number;
}

export interface DealRequest {
  id: string;
  buyerId: string;
  assetId: string;
  ownerId: string;
  rightsId: string;
  status: 'REQUESTED' | 'OWNER_REVIEW' | 'ADMIN_REVIEW' | 'APPROVED' | 'REJECTED';
  proposedPrice?: number;
  message?: string;
  createdAt: number;
}

export interface PrivateScreener {
  id: string;
  assetId: string;
  buyerId: string;
  ownerId: string;
  screenerUrl: string;
  expiryDate: number;
  watermarkText: string;
  viewCount: number;
  lastViewedAt?: number;
  createdAt: number;
}

export interface Contract {
  id: string;
  dealId: string;
  assetId: string;
  buyerId: string;
  ownerId: string;
  fileUrl: string;
  status: 'PENDING' | 'SIGNED' | 'EXPIRED';
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ASSET_SUBMITTED' | 'LICENSE_REQUEST' | 'APPROVAL_REQUIRED' | 'CONTRACT_SIGNED' | 'PAYMENT_RECEIVED' | 'SYSTEM';
  read: boolean;
  createdAt: number;
}

export type AuditAction = 
  | 'RLS_VIOLATION'
  | 'deal_signed' 
  | 'screener_viewed' 
  | 'role_switched' 
  | 'deal_proposed' 
  | 'deal_approved' 
  | 'deal_rejected' 
  | 'screener_created' 
  | 'asset_updated'
  | 'asset_created'
  | 'asset_deleted'
  | 'user_login' 
  | 'user_logout'
  | 'copilot_query'
  | 'ai_generation';

export interface AuditLog {
  id: string;
  action: AuditAction;
  userId: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  details: string;
  resourceId?: string;
  resourceType?: 'deal' | 'contract' | 'screener' | 'asset' | 'rights' | 'auth' | 'ai_tool' | string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  timestamp: number;
}

export interface RealUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_superuser: number;
  is_staff: number;
  is_active: number;
  date_joined: string;
  last_login?: string;
  profile_picture?: string;
  company?: string;
  company_name?: string;
  bio?: string;
  business_type?: string;
  country?: string;
  user_type?: string;
  user_subcategory?: string;
  rights_confirmation?: number;
  terms_accepted?: number;
  website?: string;
}

export interface RealFilm {
  id: number;
  title: string;
  description: string;
  content_type: string;
  director: string;
  producer: string;
  cast: string;
  duration: number;
  language: string;
  country: string;
  video_file: string;
  poster: string;
  trailer: string;
  status: string;
  created_at: string;
  updated_at: string;
  views_count: number;
  budget?: number | null;
  rights_available: number;
  distribution_territories: string;
  uploaded_by_id: number;
  uuid: string;
  upload_approved: number;
  upload_requested: number;
  release_date?: string | null;
}

export interface FilmBuyerMapping {
  id: number;
  mapped_at: string;
  notes: string;
  is_active: number;
  buyer_id: number;
  film_id: number;
  mapped_by_id: number;
  allow_download: number;
  download_requested: number;
}

export interface FilmDraft {
  id: string;
  title: string;
  description: string;
  content_type: string;
  director: string;
  producer: string;
  cast: string;
  duration?: number | null;
  release_date?: string | null;
  language: string;
  country: string;
  distribution_territories: string;
  budget?: number | null;
  rights_available: number;
  licensing_terms: string;
  created_at: string;
  updated_at: string;
  uploaded_by_id: number;
  completed_tabs?: string[];
}

export interface RazorpayPayment {
  id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | string;
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  receipt: string;
  notes: {
    user_id?: number;
    user_email?: string;
    user_name?: string;
  };
  created_at: string;
  updated_at: string;
  user_id: number;
}

export interface VideoUpload {
  id: number;
  file_name: string;
  s3_key: string;
  status: string;
  created_at: string;
  updated_at: string;
  film_id: number;
  file_type: string;
}

export interface LoginToken {
  id: number;
  created_at: string;
  expires_at: string;
  used: number;
  user_id: number;
  id_hash: string;
}

export interface ViewHistoryRecord {
  id: number;
  watched_at: string;
  watch_duration: number;
  film_id: number;
  user_id: number;
}


