import crypto from 'crypto';
import { getConnection } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from './email.service';
import { getOrganizationAdmins } from './user.service';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const VAULT_ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

interface VaultItem {
  id: string;
  orgId: string;
  name: string;
  type: 'secret' | 'certificate' | 'credential' | 'document';
  value: string; // Encrypted
  iv: string; // Initialization vector
  authTag: string; // Authentication tag for GCM
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  accessLevel: 'private' | 'shared' | 'public';
}

/**
 * Encrypt a vault item value using AES-256-GCM
 */
export const encryptVaultItem = (plaintext: string): { encrypted: string; iv: string; authTag: string } => {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(VAULT_ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag
  };
};

/**
 * Decrypt a vault item value
 */
export const decryptVaultItem = (encrypted: string, iv: string, authTag: string): string => {
  const key = Buffer.from(VAULT_ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, Buffer.from(iv, 'hex'));
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Create a new vault item
 */
export const createVaultItem = async (item: {
  orgId: string;
  name: string;
  type: 'secret' | 'certificate' | 'credential' | 'document';
  value: string;
  metadata?: Record<string, any>;
  createdBy: string;
  accessLevel: 'private' | 'shared' | 'public';
  expiresAt?: Date;
}): Promise<VaultItem> => {
  const conn = await getConnection();
  try {
    const id = uuidv4();
    const { encrypted, iv, authTag } = encryptVaultItem(item.value);
    const now = new Date();
    
    const metadata = item.metadata ? JSON.stringify(item.metadata) : null;
    
    await conn.execute(
      `INSERT INTO vault_items (
        id, org_id, name, type, encrypted_value, iv, auth_tag, metadata, 
        created_by, created_at, updated_at, expires_at, access_level
      ) VALUES (
        :id, :orgId, :name, :type, :encrypted, :iv, :authTag, :metadata,
        :createdBy, :createdAt, :updatedAt, :expiresAt, :accessLevel
      )`,
      {
        id,
        orgId: item.orgId,
        name: item.name,
        type: item.type,
        encrypted,
        iv,
        authTag,
        metadata,
        createdBy: item.createdBy,
        createdAt: now,
        updatedAt: now,
        expiresAt: item.expiresAt || null,
        accessLevel: item.accessLevel
      },
      { autoCommit: true }
    );

    return {
      id,
      orgId: item.orgId,
      name: item.name,
      type: item.type,
      value: item.value,
      iv,
      authTag,
      metadata: item.metadata,
      createdBy: item.createdBy,
      createdAt: now,
      updatedAt: now,
      expiresAt: item.expiresAt,
      accessLevel: item.accessLevel
    };
  } finally {
    await conn.close();
  }
};

/**
 * Retrieve a vault item with decryption
 */
export const getVaultItem = async (itemId: string, orgId: string): Promise<VaultItem | null> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM vault_items WHERE id = :id AND org_id = :orgId`,
      { id: itemId, orgId }
    );
    
    const row = result.rows?.[0] as any;
    if (!row) return null;

    const decrypted = decryptVaultItem(row.ENCRYPTED_VALUE, row.IV, row.AUTH_TAG);
    const metadata = row.METADATA ? JSON.parse(row.METADATA) : undefined;

    return {
      id: row.ID,
      orgId: row.ORG_ID,
      name: row.NAME,
      type: row.TYPE,
      value: decrypted,
      iv: row.IV,
      authTag: row.AUTH_TAG,
      metadata,
      createdBy: row.CREATED_BY,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT),
      expiresAt: row.EXPIRES_AT ? new Date(row.EXPIRES_AT) : undefined,
      accessLevel: row.ACCESS_LEVEL
    };
  } finally {
    await conn.close();
  }
};

/**
 * List vault items for an organization
 */
export const listVaultItems = async (orgId: string, type?: string, skip = 0, take = 50) => {
  const conn = await getConnection();
  try {
    let query = `SELECT id, name, type, created_by, created_at, updated_at, expires_at, access_level 
                 FROM vault_items WHERE org_id = :orgId`;
    const params: any = { orgId, skip: skip * take, take };

    if (type) {
      query += ` AND type = :type`;
      params.type = type;
    }

    query += ` ORDER BY created_at DESC OFFSET :skip ROWS FETCH NEXT :take ROWS ONLY`;

    const result = await conn.execute(query, params);
    
    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      name: row.NAME,
      type: row.TYPE,
      createdBy: row.CREATED_BY,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT),
      expiresAt: row.EXPIRES_AT ? new Date(row.EXPIRES_AT) : undefined,
      accessLevel: row.ACCESS_LEVEL
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Update a vault item
 */
export const updateVaultItem = async (
  itemId: string,
  orgId: string,
  updates: {
    name?: string;
    value?: string;
    metadata?: Record<string, any>;
    accessLevel?: 'private' | 'shared' | 'public';
    expiresAt?: Date;
  }
): Promise<VaultItem | null> => {
  const conn = await getConnection();
  try {
    const item = await getVaultItem(itemId, orgId);
    if (!item) return null;

    const updateParts: string[] = ['updated_at = :updatedAt'];
    const params: any = { 
      id: itemId, 
      orgId,
      updatedAt: new Date()
    };

    if (updates.name) {
      updateParts.push('name = :name');
      params.name = updates.name;
    }

    if (updates.value) {
      const { encrypted, iv, authTag } = encryptVaultItem(updates.value);
      updateParts.push('encrypted_value = :encrypted, iv = :iv, auth_tag = :authTag');
      params.encrypted = encrypted;
      params.iv = iv;
      params.authTag = authTag;
    }

    if (updates.metadata) {
      updateParts.push('metadata = :metadata');
      params.metadata = JSON.stringify(updates.metadata);
    }

    if (updates.accessLevel) {
      updateParts.push('access_level = :accessLevel');
      params.accessLevel = updates.accessLevel;
    }

    if (updates.expiresAt) {
      updateParts.push('expires_at = :expiresAt');
      params.expiresAt = updates.expiresAt;
    }

    await conn.execute(
      `UPDATE vault_items SET ${updateParts.join(', ')} WHERE id = :id AND org_id = :orgId`,
      params,
      { autoCommit: true }
    );

    return getVaultItem(itemId, orgId);
  } finally {
    await conn.close();
  }
};

/**
 * Delete a vault item
 */
export const deleteVaultItem = async (itemId: string, orgId: string): Promise<boolean> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM vault_items WHERE id = :id AND org_id = :orgId`,
      { id: itemId, orgId },
      { autoCommit: true }
    );
    
    return (result.rowsAffected || 0) > 0;
  } finally {
    await conn.close();
  }
};

/**
 * Rotate encryption keys for all vault items (security best practice)
 */
export const rotateVaultEncryptionKeys = async (orgId: string, newKey: string): Promise<number> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT id, encrypted_value, iv, auth_tag FROM vault_items WHERE org_id = :orgId`,
      { orgId }
    );

    let rotated = 0;
    const oldKey = VAULT_ENCRYPTION_KEY;

    for (const row of result.rows || []) {
      try {
        // Decrypt with old key
        const oldDecipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, Buffer.from(oldKey, 'hex'), Buffer.from((row as any).IV, 'hex'));
        oldDecipher.setAuthTag(Buffer.from((row as any).AUTH_TAG, 'hex'));
        let plaintext = oldDecipher.update((row as any).ENCRYPTED_VALUE, 'hex', 'utf8');
        plaintext += oldDecipher.final('utf8');

        // Encrypt with new key
        const iv = crypto.randomBytes(16);
        const newCipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(newKey, 'hex'), iv);
        let encrypted = newCipher.update(plaintext, 'utf8', 'hex');
        encrypted += newCipher.final('hex');
        const authTag = newCipher.getAuthTag().toString('hex');

        // Update in database
        await conn.execute(
          `UPDATE vault_items SET encrypted_value = :encrypted, iv = :iv, auth_tag = :authTag 
           WHERE id = :id`,
          {
            encrypted,
            iv: iv.toString('hex'),
            authTag,
            id: (row as any).ID
          },
          { autoCommit: true }
        );
        rotated++;
      } catch (e) {
        console.error('Error rotating key for item', (row as any).ID, e);
      }
    }

    return rotated;
  } finally {
    await conn.close();
  }
};
