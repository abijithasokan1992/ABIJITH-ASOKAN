import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware';
import { getPresignedUrl, deleteObject } from '../services/object-storage.service';
import { createFileMetadata } from '../services/file.service';
import { checkQuota, updateUsage } from '../services/storage.service';
import { logEvent } from '../services/audit.service';

export const router = Router();

router.post('/upload', verifyAuth, async (req, res) => {
  const { folderId, name, size, orgId, userId } = req.body;
  if (!(await checkQuota(orgId, size))) return res.status(403).json({ error: 'Quota exceeded' });
  const url = await getPresignedUrl(name, 'PUT');
  await createFileMetadata({ folderId, name, path: name, size });
  await updateUsage(orgId, size);
  await logEvent(userId, 'UPLOAD_FILE', name, req.ip || '');
  res.status(200).json({ url });
});

router.get('/download/:id', verifyAuth, async (req, res) => {
  const { id } = req.params;
  // Fetch path by id, then get URL
  const url = await getPresignedUrl(id, 'GET');
  await logEvent(req.body.userId, 'DOWNLOAD_FILE', id, req.ip || '');
  res.status(200).json({ url });
});

router.delete('/:id', verifyAuth, async (req, res) => {
  const { id } = req.params;
  await deleteObject(id);
  await logEvent(req.body.userId, 'DELETE_FILE', id, req.ip || '');
  res.status(204).send();
});
