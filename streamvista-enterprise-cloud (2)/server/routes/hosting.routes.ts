import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware';
import {
  createHostingInstance,
  getHostingInstance,
  listHostingInstances,
  updateInstanceStatus,
  addDomain,
  getDomain,
  listDomains,
  verifyDomain,
  updateSSLCertificate,
  deleteDomain,
  getInfrastructureMetrics,
  scaleInstances
} from '../services/hosting.service';
import { logEvent } from '../services/audit.service';

export const router = Router();

router.use(verifyAuth);

const verifyAppContext = (req: any, res: any, next: any) => {
  const { appId } = req.body || req.query || req.params;
  if (!appId) {
    return res.status(400).json({ error: 'Application context required (appId)' });
  }
  req.appId = appId;
  next();
};

// ====== HOSTING INSTANCES ======

/**
 * POST /api/hosting/instances - Create a hosting instance
 */
router.post('/instances', verifyAppContext, async (req, res) => {
  try {
    const { provider, instanceType, region, cpu, memory, storage, metadata } = req.body;
    const { appId, userId } = req;

    if (!provider || !instanceType || !region || !cpu || !memory || !storage) {
      return res.status(400).json({ 
        error: 'Missing required fields: provider, instanceType, region, cpu, memory, storage' 
      });
    }

    if (!['oracle-cloud', 'aws', 'gcp', 'azure', 'kubernetes'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid hosting provider' });
    }

    const instance = await createHostingInstance({
      appId,
      provider,
      instanceType,
      region,
      cpu,
      memory,
      storage,
      metadata
    });

    await logEvent(userId, 'HOSTING_INSTANCE_CREATED', `${instanceType} in ${region}`, req.ip || '');

    res.status(201).json(instance);
  } catch (err) {
    console.error('Error creating hosting instance:', err);
    res.status(500).json({ error: 'Failed to create hosting instance' });
  }
});

/**
 * GET /api/hosting/instances/:id - Get hosting instance
 */
router.get('/instances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    const instance = await getHostingInstance(id);
    if (!instance) {
      return res.status(404).json({ error: 'Hosting instance not found' });
    }

    await logEvent(userId, 'HOSTING_INSTANCE_VIEWED', id, req.ip || '');

    res.json(instance);
  } catch (err) {
    console.error('Error retrieving hosting instance:', err);
    res.status(500).json({ error: 'Failed to retrieve hosting instance' });
  }
});

/**
 * GET /api/hosting/instances - List hosting instances
 */
router.get('/instances', verifyAppContext, async (req, res) => {
  try {
    const { appId, userId } = req;
    const { skip = 0, take = 50 } = req.query;

    const instances = await listHostingInstances(appId, parseInt(skip as string), parseInt(take as string));

    await logEvent(userId, 'HOSTING_INSTANCES_LISTED', `Retrieved ${instances.length}`, req.ip || '');

    res.json(instances);
  } catch (err) {
    console.error('Error listing hosting instances:', err);
    res.status(500).json({ error: 'Failed to list hosting instances' });
  }
});

/**
 * PUT /api/hosting/instances/:id/status - Update instance status
 */
router.put('/instances/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, publicIp, privateIp } = req.body;
    const { userId } = req;

    if (!['running', 'stopped', 'pending', 'error'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await updateInstanceStatus(id, status, publicIp, privateIp);

    await logEvent(userId, 'HOSTING_INSTANCE_STATUS_UPDATED', `${id}: ${status}`, req.ip || '');

    res.json({ message: 'Instance status updated', status });
  } catch (err) {
    console.error('Error updating instance status:', err);
    res.status(500).json({ error: 'Failed to update instance status' });
  }
});

/**
 * POST /api/hosting/instances/scale - Scale instances
 */
router.post('/instances/scale', verifyAppContext, async (req, res) => {
  try {
    const { appId, userId } = req;
    const { newCount } = req.body;

    if (typeof newCount !== 'number' || newCount < 1 || newCount > 100) {
      return res.status(400).json({ error: 'Invalid replica count (1-100)' });
    }

    const result = await scaleInstances(appId, newCount);

    await logEvent(userId, 'HOSTING_INSTANCES_SCALED', `Scaled to ${newCount} replicas`, req.ip || '');

    res.json({ message: 'Instances scaled', newCount: result });
  } catch (err) {
    console.error('Error scaling instances:', err);
    res.status(500).json({ error: 'Failed to scale instances' });
  }
});

// ====== DOMAINS ======

/**
 * POST /api/hosting/domains - Add domain
 */
router.post('/domains', verifyAppContext, async (req, res) => {
  try {
    const { domain, provider, ssl, dnsRecords } = req.body;
    const { appId, userId } = req;

    if (!domain || !provider) {
      return res.status(400).json({ error: 'Missing required fields: domain, provider' });
    }

    const newDomain = await addDomain({
      appId,
      domain,
      provider,
      ssl: ssl || false,
      dnsRecords: dnsRecords || []
    });

    await logEvent(userId, 'DOMAIN_ADDED', domain, req.ip || '');

    res.status(201).json(newDomain);
  } catch (err) {
    console.error('Error adding domain:', err);
    res.status(500).json({ error: 'Failed to add domain' });
  }
});

/**
 * GET /api/hosting/domains/:id - Get domain
 */
router.get('/domains/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    const domain = await getDomain(id);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    await logEvent(userId, 'DOMAIN_VIEWED', domain.domain, req.ip || '');

    res.json(domain);
  } catch (err) {
    console.error('Error retrieving domain:', err);
    res.status(500).json({ error: 'Failed to retrieve domain' });
  }
});

/**
 * GET /api/hosting/domains - List domains
 */
router.get('/domains', verifyAppContext, async (req, res) => {
  try {
    const { appId, userId } = req;
    const { skip = 0, take = 50 } = req.query;

    const domains = await listDomains(appId, parseInt(skip as string), parseInt(take as string));

    await logEvent(userId, 'DOMAINS_LISTED', `Retrieved ${domains.length}`, req.ip || '');

    res.json(domains);
  } catch (err) {
    console.error('Error listing domains:', err);
    res.status(500).json({ error: 'Failed to list domains' });
  }
});

/**
 * POST /api/hosting/domains/:id/verify - Verify domain ownership
 */
router.post('/domains/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    const domain = await getDomain(id);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const verified = await verifyDomain(id);

    if (!verified) {
      return res.status(400).json({ error: 'Domain already verified or verification failed' });
    }

    await logEvent(userId, 'DOMAIN_VERIFIED', domain.domain, req.ip || '');

    res.json({ message: 'Domain verified', domain: domain.domain });
  } catch (err) {
    console.error('Error verifying domain:', err);
    res.status(500).json({ error: 'Failed to verify domain' });
  }
});

/**
 * PUT /api/hosting/domains/:id/ssl - Update SSL certificate
 */
router.put('/domains/:id/ssl', async (req, res) => {
  try {
    const { id } = req.params;
    const { certificate, expiry } = req.body;
    const { userId } = req;

    if (!certificate || !expiry) {
      return res.status(400).json({ error: 'Missing required fields: certificate, expiry' });
    }

    const domain = await getDomain(id);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    await updateSSLCertificate(id, certificate, new Date(expiry));

    await logEvent(userId, 'SSL_CERTIFICATE_UPDATED', domain.domain, req.ip || '');

    res.json({ message: 'SSL certificate updated', expiresAt: expiry });
  } catch (err) {
    console.error('Error updating SSL certificate:', err);
    res.status(500).json({ error: 'Failed to update SSL certificate' });
  }
});

/**
 * DELETE /api/hosting/domains/:id - Delete domain
 */
router.delete('/domains/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    const domain = await getDomain(id);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const deleted = await deleteDomain(id);

    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete domain' });
    }

    await logEvent(userId, 'DOMAIN_DELETED', domain.domain, req.ip || '');

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting domain:', err);
    res.status(500).json({ error: 'Failed to delete domain' });
  }
});

// ====== METRICS & MONITORING ======

/**
 * GET /api/hosting/metrics - Get infrastructure metrics
 */
router.get('/metrics', verifyAppContext, async (req, res) => {
  try {
    const { appId, userId } = req;

    const metrics = await getInfrastructureMetrics(appId);

    await logEvent(userId, 'INFRASTRUCTURE_METRICS_VIEWED', appId, req.ip || '');

    res.json(metrics);
  } catch (err) {
    console.error('Error retrieving infrastructure metrics:', err);
    res.status(500).json({ error: 'Failed to retrieve infrastructure metrics' });
  }
});

export default router;
