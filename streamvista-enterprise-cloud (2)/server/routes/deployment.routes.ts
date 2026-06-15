import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware';
import {
  createDeployment,
  getDeployment,
  listDeployments,
  updateDeploymentStatus,
  addDeploymentLog,
  getDeploymentConfig,
  saveDeploymentConfig,
  rollbackDeployment,
  getDeploymentMetrics,
  simulateDeployment
} from '../services/deployment.service';
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

/**
 * POST /api/deployments - Create a new deployment
 */
router.post('/', verifyAppContext, async (req, res) => {
  try {
    const { version, environment, branch, commitHash, containerImage, replicas } = req.body;
    const { appId, userId } = req;

    if (!version || !environment || !branch || !commitHash || !containerImage) {
      return res.status(400).json({ 
        error: 'Missing required fields: version, environment, branch, commitHash, containerImage' 
      });
    }

    if (!['development', 'staging', 'production'].includes(environment)) {
      return res.status(400).json({ error: 'Invalid environment' });
    }

    const deployment = await createDeployment({
      appId,
      version,
      environment,
      branch,
      commitHash,
      containerImage,
      replicas,
      createdBy: userId
    });

    await logEvent(userId, 'DEPLOYMENT_CREATED', `${version} to ${environment}`, req.ip || '');

    res.status(201).json(deployment);
  } catch (err) {
    console.error('Error creating deployment:', err);
    res.status(500).json({ error: 'Failed to create deployment' });
  }
});

/**
 * GET /api/deployments/:id - Get deployment details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    const deployment = await getDeployment(id);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    await logEvent(userId, 'DEPLOYMENT_VIEWED', id, req.ip || '');

    res.json(deployment);
  } catch (err) {
    console.error('Error retrieving deployment:', err);
    res.status(500).json({ error: 'Failed to retrieve deployment' });
  }
});

/**
 * GET /api/deployments - List deployments
 */
router.get('/', verifyAppContext, async (req, res) => {
  try {
    const { appId, userId } = req;
    const { environment, skip = 0, take = 50 } = req.query;

    const deployments = await listDeployments(
      appId,
      environment as any,
      parseInt(skip as string),
      parseInt(take as string)
    );

    await logEvent(userId, 'DEPLOYMENTS_LISTED', `Retrieved ${deployments.length}`, req.ip || '');

    res.json(deployments);
  } catch (err) {
    console.error('Error listing deployments:', err);
    res.status(500).json({ error: 'Failed to list deployments' });
  }
});

/**
 * POST /api/deployments/:id/start - Start a deployment
 */
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    const deployment = await getDeployment(id);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    await updateDeploymentStatus(id, 'building');
    await addDeploymentLog(id, 'Deployment started');

    // Simulate deployment (in production, trigger actual CI/CD)
    simulateDeployment(id).catch(err => console.error('Deployment simulation error:', err));

    await logEvent(userId, 'DEPLOYMENT_STARTED', deployment.version, req.ip || '');

    res.json({ message: 'Deployment started', status: 'building' });
  } catch (err) {
    console.error('Error starting deployment:', err);
    res.status(500).json({ error: 'Failed to start deployment' });
  }
});

/**
 * POST /api/deployments/:id/status - Update deployment status
 */
router.post('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, errorMessage } = req.body;
    const { userId } = req;

    if (!['pending', 'building', 'deploying', 'success', 'failed', 'rolled_back'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await updateDeploymentStatus(id, status, errorMessage);

    if (errorMessage) {
      await addDeploymentLog(id, `Error: ${errorMessage}`);
    }

    await logEvent(userId, 'DEPLOYMENT_STATUS_UPDATED', status, req.ip || '');

    res.json({ message: 'Status updated', status });
  } catch (err) {
    console.error('Error updating deployment status:', err);
    res.status(500).json({ error: 'Failed to update deployment status' });
  }
});

/**
 * POST /api/deployments/:id/logs - Add log entry
 */
router.post('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const { userId } = req;

    if (!message) {
      return res.status(400).json({ error: 'Missing required field: message' });
    }

    await addDeploymentLog(id, message);

    await logEvent(userId, 'DEPLOYMENT_LOG_ADDED', id, req.ip || '');

    res.status(201).json({ message: 'Log entry added' });
  } catch (err) {
    console.error('Error adding deployment log:', err);
    res.status(500).json({ error: 'Failed to add log entry' });
  }
});

/**
 * GET /api/deployments/:id/logs - Get deployment logs
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    const deployment = await getDeployment(id);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    await logEvent(userId, 'DEPLOYMENT_LOGS_VIEWED', id, req.ip || '');

    res.json({ logs: deployment.logs });
  } catch (err) {
    console.error('Error retrieving deployment logs:', err);
    res.status(500).json({ error: 'Failed to retrieve deployment logs' });
  }
});

/**
 * POST /api/deployments/:id/rollback - Rollback deployment
 */
router.post('/:id/rollback', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    const deployment = await getDeployment(id);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    const rollback = await rollbackDeployment(deployment.appId, deployment.environment);

    if (!rollback) {
      return res.status(400).json({ error: 'No previous successful deployment to rollback to' });
    }

    await addDeploymentLog(id, `Rolled back from ${deployment.version}`);
    await logEvent(userId, 'DEPLOYMENT_ROLLED_BACK', deployment.version, req.ip || '');

    res.json(rollback);
  } catch (err) {
    console.error('Error rolling back deployment:', err);
    res.status(500).json({ error: 'Failed to rollback deployment' });
  }
});

/**
 * GET /api/deployments/config/:environment - Get deployment config
 */
router.get('/config/:environment', verifyAppContext, async (req, res) => {
  try {
    const { appId, userId } = req;
    const { environment } = req.params;

    if (!['development', 'staging', 'production'].includes(environment)) {
      return res.status(400).json({ error: 'Invalid environment' });
    }

    const config = await getDeploymentConfig(appId, environment as any);

    if (!config) {
      return res.status(404).json({ error: 'Deployment configuration not found' });
    }

    await logEvent(userId, 'DEPLOYMENT_CONFIG_VIEWED', environment, req.ip || '');

    res.json(config);
  } catch (err) {
    console.error('Error retrieving deployment config:', err);
    res.status(500).json({ error: 'Failed to retrieve deployment configuration' });
  }
});

/**
 * POST /api/deployments/config - Save deployment config
 */
router.post('/config', verifyAppContext, async (req, res) => {
  try {
    const { appId, userId } = req;
    const { environment, dockerfile, buildCommand, deployCommand, healthCheckUrl, replicas, resources, env } = req.body;

    if (!environment || !dockerfile || !buildCommand || !deployCommand) {
      return res.status(400).json({ 
        error: 'Missing required fields: environment, dockerfile, buildCommand, deployCommand' 
      });
    }

    const config = await saveDeploymentConfig({
      appId,
      environment,
      dockerfile,
      buildCommand,
      deployCommand,
      healthCheckUrl: healthCheckUrl || 'http://localhost:3000/health',
      replicas: replicas || 3,
      resources: resources || { cpuLimit: '500m', memoryLimit: '512Mi' },
      env: env || {}
    });

    await logEvent(userId, 'DEPLOYMENT_CONFIG_SAVED', environment, req.ip || '');

    res.status(201).json(config);
  } catch (err) {
    console.error('Error saving deployment config:', err);
    res.status(500).json({ error: 'Failed to save deployment configuration' });
  }
});

/**
 * GET /api/deployments/metrics/:environment - Get deployment metrics
 */
router.get('/metrics/:environment', verifyAppContext, async (req, res) => {
  try {
    const { appId, userId } = req;
    const { environment } = req.params;

    if (!['development', 'staging', 'production'].includes(environment)) {
      return res.status(400).json({ error: 'Invalid environment' });
    }

    const metrics = await getDeploymentMetrics(appId, environment as any);

    await logEvent(userId, 'DEPLOYMENT_METRICS_VIEWED', environment, req.ip || '');

    res.json(metrics);
  } catch (err) {
    console.error('Error retrieving deployment metrics:', err);
    res.status(500).json({ error: 'Failed to retrieve deployment metrics' });
  }
});

export default router;
