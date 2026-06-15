export interface User {
  id: string; // VARCHAR2(36)
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string; // VARCHAR2(36)
  name: string;
  createdAt: Date;
}

export interface FileMetadata {
  id: string;
  folderId: string;
  name: string;
  path: string; // Object Storage path
  size: number;
  createdAt: Date;
}

export interface VaultItem {
  id: string;
  orgId: string;
  name: string;
  type: 'secret' | 'certificate' | 'credential' | 'document';
  value: string; // Encrypted in DB, decrypted on retrieval
  iv: string; // Initialization vector for AES-256-GCM
  authTag: string; // Authentication tag for GCM
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  accessLevel: 'private' | 'shared' | 'public';
}

export interface VaultAccess {
  id: string;
  vaultItemId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer' | 'none';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface StorageMetrics {
  orgId: string;
  totalStorageGB: number;
  usedStorageGB: number;
  availableStorageGB: number;
  utilizationPercentage: number;
  fileCount: number;
  vaultItemCount: number;
  lastUpdated: Date;
}

export interface StorageReport {
  id: string;
  orgId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalStorageGB: number;
  usedStorageGB: number;
  fileCount: number;
  vaultCount: number;
  generatedAt: Date;
}

export interface StorageQuota {
  orgId: string;
  purchasedGB: number;
  usedGB: number;
  availableGB: number;
  warningThreshold: number;
  errorThreshold: number;
  status: 'healthy' | 'warning' | 'critical' | 'exceeded';
}
