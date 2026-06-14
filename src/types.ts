/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'CONTENT_OWNER' | 'BUYER';

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
