/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'CREATOR' | 'BUYER' | 'PUBLIC';

export interface BridgeRegistration {
  id: string;
  role: 'CREATOR' | 'BUYER';
  companyName: string;
  contactName: string;
  email: string;
  website: string;
  catalogSize: string; // e.g., "1-5 films", "5-20 films", "20+ titles"
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: string;
  note?: string;
}

export interface Workspace {
  id: string;
  name: string;
  role: 'CREATOR' | 'BUYER' | 'ADMIN';
  email: string;
}

export interface FilmAsset {
  name: string;
  size: string;
  type: string; // 'video' | 'audio' | 'subtitle' | 'metadata' | 'artwork'
  status: 'UPLOADING' | 'COMPLETED' | 'VERIFIED' | 'FAILED';
  hash?: string;
  uploadedAt?: string;
}

export interface Film {
  id: string;
  title: string;
  genre: string;
  synopsis: string;
  year: number;
  duration: string;
  languages: string[];
  subtitles: string[];
  rights: string[]; // SVOD, TVOD, AVOD, Theatrical, PayTV
  territories: string[]; // North America, Europe, Asia Pacific, Latin America, Worldwide
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  assets: FilmAsset[];
  oracleBucket: string;
  uploadedBy: string; // email
  createdAt: string;
  reviewNotes?: string;
}

export interface NegotiatingDeal {
  id: string;
  filmId: string;
  filmTitle: string;
  creatorEmail: string;
  buyerEmail: string;
  buyerCompany: string;
  rightsType: string;
  territories: string[];
  exclusivity: boolean;
  durationYears: number;
  price: number;
  status: 'PROFFERED' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED' | 'EXECUTED';
  auditTrail: Array<{
    sender: string; // 'BUYER' | 'CREATOR' | 'SYSTEM'
    senderName: string;
    action: string; // 'OFFER_CREATED' | 'COUNTER_PROPOSED' | 'OFFER_ACCEPTED' | 'CONTRACT_SIGNED'
    price: number;
    timestamp: string;
    note?: string;
  }>;
  oracleContractId?: string;
  buyerSignature?: string;
  creatorSignature?: string;
  signedAt?: string;
}

export interface ScreenerRequest {
  id: string;
  filmId: string;
  filmTitle: string;
  buyerEmail: string;
  buyerCompany: string;
  status: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'REJECTED';
  requestedAt: string;
  approvedAt?: string;
  expiresAt?: string;
  views: number;
  watermarkText: string;
  clicks: Array<{
    timestamp: string;
    action: string; // 'CLICKED_PLAY', 'PAUSED', 'COMPLETED', 'EXPIRED_CHECK', 'WATERMARK_VERIFIED'
    ipAddress: string;
    durationSeconds?: number;
  }>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
  oracleHash: string; // SHA-256 styled ledger state hash
}

export interface OracleHealthState {
  dbStatus: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
  storageStatus: 'HEALTHY' | 'DISCONNECTED' | 'MAINTENANCE';
  readWriteLatency: number; // in ms
  connectionString: string;
  dbVersion: string;
  bucketSizeGB: number;
  lastChecked: string;
  username: string;
}

export interface VaultAsset {
  id: string;
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  type: 'video' | 'audio' | 'image' | 'doc' | 'subtitle';
  status: 'COMPLETED' | 'UPLOADING' | 'FAILED' | 'QUEUED' | 'PROCESSING';
  uploadedBy: string; // uploader email, e.g., partner@crayond.com
  uploadedAt: string;
  folderPath: string; // e.g., "vault/videos/crayond-partner/"
  oraclePath: string; // e.g., "os://us-ashburn-1/vault/videos/crayond-partner/...mp4"
  mappedFilmId?: string; // if mapped to a Film ID
  ingestionStatus?: 'STAGED' | 'INGESTING' | 'INGESTAL_COMPLETE' | 'DELIVERED';
  deliveredTo?: string; // company delivered to

  // Detailed status flow values
  detailedStatus?: 'QUEUED' | 'UPLOADING' | 'UPLOADED' | 'VERIFYING' | 'OBJECT_URL_CREATED' | 'DATABASE_SAVING' | 'DATABASE_SAVED' | 'PROCESSING' | 'TRANSCODING' | 'THUMBNAIL_GENERATING' | 'PREVIEW_GENERATING' | 'INDEXING' | 'READY' | 'FAILED' | 'CANCELLED';
  progress?: number;
  currentStep?: string;
  statusMessage?: string;
  processingHistory?: Array<{ status: string; timestamp: string }>;
}

export interface DemoInvitation {
  id: string;
  code: string; // e.g. "ABC123"
  inviteUrl: string; // e.g. "demo.crayonspictures.in/invite/ABC123"
  expiryDate: string;
  maxUsers: number;
  currentUsers: number;
  organizationName: string;
  demoRole: 'CREATOR' | 'BUYER' | 'ADMIN' | 'FULL_PLATFORM';
  demoDuration: string; // e.g. "7 Days", "30 Days"
  featureRestrictions: string[]; // List of restrictions
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  createdAt: string;
}

export interface LeadRequest {
  id: string;
  contactName: string;
  companyName: string;
  email: string;
  useCase: string;
  timestamp: string;
  status: 'PENDING' | 'REVIEWED' | 'INVITATION_SENT' | 'CONVERTED';
  generatedInvitationCode?: string;
}


