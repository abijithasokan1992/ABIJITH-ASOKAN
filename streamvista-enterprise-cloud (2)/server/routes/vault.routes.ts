import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware';
import { 
  createVaultItem, 
  getVaultItem, 
  listVaultItems, 
  updateVaultItem, 
  deleteVaultItem,
  rotateVaultEncryptionKeys
} from '../services/vault.service';
import {
  grantVaultAccess,
  checkVaultAccess,
  getVaultItemAccess,
  updateVaultAccess,
  revokeAllVaultAccess,
  getUserVaultAccess,
  canUserPerformAction
} from '../services/vault-access.service';
import { logEvent } from '../services/audit.service';

export const router = Router();

// Middleware to verify organization context
const verifyOrgContext = (req: any, res: any, next: any) => {
  const { orgId } = req.body || req.query || req.params;
  if (!orgId) {
    return res.status(400).json({ error: 'Organization context required (orgId)' });
  }
  req.orgId = orgId;
  next();
};

router.use(verifyAuth);
router.use(verifyOrgContext);

/**
 * POST /api/vault/items - Create a new vault item
 */
router.post('/items', async (req, res) => {
  try {
    const { name, type, value, metadata, accessLevel, expiresAt } = req.body;
    const { orgId, userId } = req;

    if (!name || !type || !value) {
      return res.status(400).json({ error: 'Missing required fields: name, type, value' });
    }

    if (!['secret', 'certificate', 'credential', 'document'].includes(type)) {
      return res.status(400).json({ error: 'Invalid vault item type' });
    }

    const item = await createVaultItem({
      orgId,
      name,
      type,
      value,
      metadata,
      createdBy: userId,
      accessLevel: accessLevel || 'private',
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    await logEvent(userId, 'VAULT_ITEM_CREATED', `${name} (${type})`, req.ip || '');

    res.status(201).json({
      id: item.id,
      name: item.name,
      type: item.type,
      createdAt: item.createdAt,
      accessLevel: item.accessLevel,
      expiresAt: item.expiresAt
    });
  } catch (err) {
    console.error('Error creating vault item:', err);
    res.status(500).json({ error: 'Failed to create vault item' });
  }
});

/**
 * GET /api/vault/items/:id - Get a vault item
 */
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId, userId } = req;

    const item = await getVaultItem(id, orgId);
    if (!item) {
      return res.status(404).json({ error: 'Vault item not found' });
    }

    // Check access
    const canRead = await canUserPerformAction(id, userId, 'read');
    if (!canRead) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await logEvent(userId, 'VAULT_ITEM_READ', item.name, req.ip || '');

    res.json({
      id: item.id,
      name: item.name,
      type: item.type,
      value: item.value,
      metadata: item.metadata,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      accessLevel: item.accessLevel,
      expiresAt: item.expiresAt
    });
  } catch (err) {
    console.error('Error retrieving vault item:', err);
    res.status(500).json({ error: 'Failed to retrieve vault item' });
  }
});

/**
 * GET /api/vault/items - List vault items
 */
router.get('/items', async (req, res) => {
  try {
    const { orgId, userId } = req;
    const { type, skip = 0, take = 50 } = req.query;

    const items = await listVaultItems(
      orgId,
      type as string | undefined,
      parseInt(skip as string),
      parseInt(take as string)
    );

    await logEvent(userId, 'VAULT_ITEMS_LISTED', `Retrieved ${items.length} items`, req.ip || '');

    res.json(items);
  } catch (err) {
    console.error('Error listing vault items:', err);
    res.status(500).json({ error: 'Failed to list vault items' });
  }
});

/**
 * PUT /api/vault/items/:id - Update a vault item
 */
router.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, metadata, accessLevel, expiresAt } = req.body;
    const { orgId, userId } = req;

    // Check access
    const canWrite = await canUserPerformAction(id, userId, 'write');
    if (!canWrite) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await updateVaultItem(id, orgId, {
      name,
      value,
      metadata,
      accessLevel,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    if (!updated) {
      return res.status(404).json({ error: 'Vault item not found' });
    }

    await logEvent(userId, 'VAULT_ITEM_UPDATED', updated.name, req.ip || '');

    res.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      accessLevel: updated.accessLevel
    });
  } catch (err) {
    console.error('Error updating vault item:', err);
    res.status(500).json({ error: 'Failed to update vault item' });
  }
});

/**
 * DELETE /api/vault/items/:id - Delete a vault item
 */
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId, userId } = req;

    // Check access
    const canDelete = await canUserPerformAction(id, userId, 'delete');
    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const item = await getVaultItem(id, orgId);
    const deleted = await deleteVaultItem(id, orgId);

    if (!deleted) {
      return res.status(404).json({ error: 'Vault item not found' });
    }

    // Revoke all access when deleting
    await revokeAllVaultAccess(id);

    await logEvent(userId, 'VAULT_ITEM_DELETED', item?.name || id, req.ip || '');

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting vault item:', err);
    res.status(500).json({ error: 'Failed to delete vault item' });
  }
});

/**
 * POST /api/vault/items/:id/access - Grant access to vault item
 */
router.post('/items/:id/access', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: targetUserId, role, expiresAt } = req.body;
    const { orgId, userId } = req;

    if (!targetUserId || !role) {
      return res.status(400).json({ error: 'Missing required fields: userId, role' });
    }

    if (!['owner', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if requester is owner
    const canShare = await canUserPerformAction(id, userId, 'share');
    if (!canShare) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const access = await grantVaultAccess(
      id,
      targetUserId,
      role,
      userId,
      expiresAt ? new Date(expiresAt) : undefined
    );

    await logEvent(userId, 'VAULT_ACCESS_GRANTED', `${targetUserId} - ${role}`, req.ip || '');

    res.status(201).json(access);
  } catch (err) {
    console.error('Error granting vault access:', err);
    res.status(500).json({ error: 'Failed to grant access' });
  }
});

/**
 * GET /api/vault/items/:id/access - Get access list for vault item
 */
router.get('/items/:id/access', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    const canShare = await canUserPerformAction(id, userId, 'share');
    if (!canShare) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const access = await getVaultItemAccess(id);
    res.json(access);
  } catch (err) {
    console.error('Error retrieving vault access:', err);
    res.status(500).json({ error: 'Failed to retrieve access list' });
  }
});

/**
 * PUT /api/vault/items/:id/access/:userId - Update user access
 */
router.put('/items/:id/access/:targetUserId', async (req, res) => {
  try {
    const { id, targetUserId } = req.params;
    const { role } = req.body;
    const { userId } = req;

    if (!role) {
      return res.status(400).json({ error: 'Missing required field: role' });
    }

    const canShare = await canUserPerformAction(id, userId, 'share');
    if (!canShare) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await updateVaultAccess(id, targetUserId, role);

    if (!updated) {
      return res.status(404).json({ error: 'Access record not found' });
    }

    await logEvent(userId, 'VAULT_ACCESS_UPDATED', `${targetUserId} - ${role}`, req.ip || '');

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating vault access:', err);
    res.status(500).json({ error: 'Failed to update access' });
  }
});

/**
 * GET /api/vault/access - Get all vault items accessible to current user
 */
router.get('/access', async (req, res) => {
  try {
    const { userId } = req;
    const { skip = 0, take = 50 } = req.query;

    const items = await getUserVaultAccess(userId, parseInt(skip as string), parseInt(take as string));

    res.json(items);
  } catch (err) {
    console.error('Error retrieving user vault access:', err);
    res.status(500).json({ error: 'Failed to retrieve accessible items' });
  }
});

/**
 * POST /api/vault/rotate-keys - Rotate vault encryption keys (admin only)
 */
router.post('/rotate-keys', async (req, res) => {
  try {
    const { orgId, userId } = req;
    const { newEncryptionKey } = req.body;

    if (!newEncryptionKey) {
      return res.status(400).json({ error: 'Missing required field: newEncryptionKey' });
    }

    const rotated = await rotateVaultEncryptionKeys(orgId, newEncryptionKey);

    await logEvent(userId, 'VAULT_KEYS_ROTATED', `${rotated} items`, req.ip || '');

    res.json({ rotated, message: `Successfully rotated encryption keys for ${rotated} items` });
  } catch (err) {
    console.error('Error rotating vault keys:', err);
    res.status(500).json({ error: 'Failed to rotate encryption keys' });
  }
});

export default router;
