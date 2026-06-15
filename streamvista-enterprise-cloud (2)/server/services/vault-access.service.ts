import { getConnection } from '../db';
import { v4 as uuidv4 } from 'uuid';

export type AccessRole = 'owner' | 'editor' | 'viewer' | 'none';

interface VaultAccess {
  id: string;
  vaultItemId: string;
  userId: string;
  role: AccessRole;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

/**
 * Grant access to a vault item to a user
 */
export const grantVaultAccess = async (
  vaultItemId: string,
  userId: string,
  role: AccessRole,
  grantedBy: string,
  expiresAt?: Date
): Promise<VaultAccess> => {
  const conn = await getConnection();
  try {
    const id = uuidv4();
    const grantedAt = new Date();

    await conn.execute(
      `INSERT INTO vault_access (
        id, vault_item_id, user_id, role, granted_by, granted_at, expires_at
      ) VALUES (
        :id, :vaultItemId, :userId, :role, :grantedBy, :grantedAt, :expiresAt
      )`,
      {
        id,
        vaultItemId,
        userId,
        role,
        grantedBy,
        grantedAt,
        expiresAt: expiresAt || null
      },
      { autoCommit: true }
    );

    return {
      id,
      vaultItemId,
      userId,
      role,
      grantedBy,
      grantedAt,
      expiresAt
    };
  } finally {
    await conn.close();
  }
};

/**
 * Check if a user has access to a vault item
 */
export const checkVaultAccess = async (
  vaultItemId: string,
  userId: string
): Promise<AccessRole> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT role, expires_at FROM vault_access 
       WHERE vault_item_id = :vaultItemId AND user_id = :userId
       AND (expires_at IS NULL OR expires_at > SYSDATE)
       ORDER BY 
         CASE role 
           WHEN 'owner' THEN 1
           WHEN 'editor' THEN 2
           WHEN 'viewer' THEN 3
           ELSE 4
         END
       FETCH FIRST 1 ROWS ONLY`,
      { vaultItemId, userId }
    );

    const row = result.rows?.[0] as any;
    return row?.ROLE || 'none';
  } finally {
    await conn.close();
  }
};

/**
 * Get all access records for a vault item
 */
export const getVaultItemAccess = async (vaultItemId: string): Promise<VaultAccess[]> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM vault_access 
       WHERE vault_item_id = :vaultItemId
       ORDER BY granted_at DESC`,
      { vaultItemId }
    );

    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      vaultItemId: row.VAULT_ITEM_ID,
      userId: row.USER_ID,
      role: row.ROLE,
      grantedBy: row.GRANTED_BY,
      grantedAt: new Date(row.GRANTED_AT),
      expiresAt: row.EXPIRES_AT ? new Date(row.EXPIRES_AT) : undefined
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Update user access to a vault item
 */
export const updateVaultAccess = async (
  vaultItemId: string,
  userId: string,
  newRole: AccessRole
): Promise<boolean> => {
  const conn = await getConnection();
  try {
    if (newRole === 'none') {
      // Delete access
      const result = await conn.execute(
        `DELETE FROM vault_access 
         WHERE vault_item_id = :vaultItemId AND user_id = :userId`,
        { vaultItemId, userId },
        { autoCommit: true }
      );
      return (result.rowsAffected || 0) > 0;
    } else {
      // Update role
      const result = await conn.execute(
        `UPDATE vault_access SET role = :newRole 
         WHERE vault_item_id = :vaultItemId AND user_id = :userId`,
        { newRole, vaultItemId, userId },
        { autoCommit: true }
      );
      return (result.rowsAffected || 0) > 0;
    }
  } finally {
    await conn.close();
  }
};

/**
 * Revoke all access to a vault item
 */
export const revokeAllVaultAccess = async (vaultItemId: string): Promise<number> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM vault_access WHERE vault_item_id = :vaultItemId`,
      { vaultItemId },
      { autoCommit: true }
    );
    return result.rowsAffected || 0;
  } finally {
    await conn.close();
  }
};

/**
 * Get all vault items accessible to a user
 */
export const getUserVaultAccess = async (userId: string, skip = 0, take = 50) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT va.*, vi.name, vi.type, vi.org_id 
       FROM vault_access va
       JOIN vault_items vi ON va.vault_item_id = vi.id
       WHERE va.user_id = :userId 
       AND (va.expires_at IS NULL OR va.expires_at > SYSDATE)
       ORDER BY va.granted_at DESC
       OFFSET :skip ROWS FETCH NEXT :take ROWS ONLY`,
      { userId, skip: skip * take, take }
    );

    return (result.rows || []).map((row: any) => ({
      accessId: row.ID,
      vaultItemId: row.VAULT_ITEM_ID,
      name: row.NAME,
      type: row.TYPE,
      orgId: row.ORG_ID,
      role: row.ROLE,
      grantedAt: new Date(row.GRANTED_AT),
      expiresAt: row.EXPIRES_AT ? new Date(row.EXPIRES_AT) : undefined
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Check if user can perform action on vault item
 */
export const canUserPerformAction = async (
  vaultItemId: string,
  userId: string,
  action: 'read' | 'write' | 'delete' | 'share'
): Promise<boolean> => {
  const role = await checkVaultAccess(vaultItemId, userId);

  const permissions: Record<AccessRole, string[]> = {
    owner: ['read', 'write', 'delete', 'share'],
    editor: ['read', 'write'],
    viewer: ['read'],
    none: []
  };

  return permissions[role]?.includes(action) || false;
};

/**
 * Clean up expired access records
 */
export const cleanupExpiredAccess = async (): Promise<number> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM vault_access 
       WHERE expires_at IS NOT NULL AND expires_at < SYSDATE`,
      {},
      { autoCommit: true }
    );
    return result.rowsAffected || 0;
  } finally {
    await conn.close();
  }
};
