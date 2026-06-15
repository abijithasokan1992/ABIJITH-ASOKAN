import { getConnection } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';

export type DeploymentStatus = 'pending' | 'building' | 'deploying' | 'success' | 'failed' | 'rolled_back';
export type Environment = 'development' | 'staging' | 'production';

interface Deployment {
  id: string;
  appId: string;
  version: string;
  environment: Environment;
  status: DeploymentStatus;
  branch: string;
  commitHash: string;
  containerImage: string;
  replicas: number;
  logs: string[];
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

interface DeploymentConfig {
  id: string;
  appId: string;
  environment: Environment;
  dockerfile: string;
  buildCommand: string;
  deployCommand: string;
  healthCheckUrl: string;
  replicas: number;
  resources: {
    cpuLimit: string;
    memoryLimit: string;
  };
  env: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new deployment
 */
export const createDeployment = async (deployment: {
  appId: string;
  version: string;
  environment: Environment;
  branch: string;
  commitHash: string;
  containerImage: string;
  replicas?: number;
  createdBy: string;
}): Promise<Deployment> => {
  const conn = await getConnection();
  try {
    const id = uuidv4();
    const now = new Date();

    await conn.execute(
      `INSERT INTO deployments (
        id, app_id, version, environment, status, branch, commit_hash, 
        container_image, replicas, created_by, created_at
      ) VALUES (
        :id, :appId, :version, :environment, :status, :branch, :commitHash,
        :containerImage, :replicas, :createdBy, :createdAt
      )`,
      {
        id,
        appId: deployment.appId,
        version: deployment.version,
        environment: deployment.environment,
        status: 'pending',
        branch: deployment.branch,
        commitHash: deployment.commitHash,
        containerImage: deployment.containerImage,
        replicas: deployment.replicas || 3,
        createdBy: deployment.createdBy,
        createdAt: now
      },
      { autoCommit: true }
    );

    return {
      id,
      appId: deployment.appId,
      version: deployment.version,
      environment: deployment.environment,
      status: 'pending',
      branch: deployment.branch,
      commitHash: deployment.commitHash,
      containerImage: deployment.containerImage,
      replicas: deployment.replicas || 3,
      logs: [],
      createdBy: deployment.createdBy,
      createdAt: now
    };
  } finally {
    await conn.close();
  }
};

/**
 * Get deployment details
 */
export const getDeployment = async (deploymentId: string): Promise<Deployment | null> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM deployments WHERE id = :id`,
      { id: deploymentId }
    );

    const row = result.rows?.[0] as any;
    if (!row) return null;

    const logs = row.LOGS ? JSON.parse(row.LOGS) : [];

    return {
      id: row.ID,
      appId: row.APP_ID,
      version: row.VERSION,
      environment: row.ENVIRONMENT,
      status: row.STATUS,
      branch: row.BRANCH,
      commitHash: row.COMMIT_HASH,
      containerImage: row.CONTAINER_IMAGE,
      replicas: row.REPLICAS,
      logs,
      createdBy: row.CREATED_BY,
      createdAt: new Date(row.CREATED_AT),
      startedAt: row.STARTED_AT ? new Date(row.STARTED_AT) : undefined,
      completedAt: row.COMPLETED_AT ? new Date(row.COMPLETED_AT) : undefined,
      errorMessage: row.ERROR_MESSAGE
    };
  } finally {
    await conn.close();
  }
};

/**
 * List deployments for an app
 */
export const listDeployments = async (
  appId: string,
  environment?: Environment,
  skip = 0,
  take = 50
) => {
  const conn = await getConnection();
  try {
    let query = `SELECT * FROM deployments WHERE app_id = :appId`;
    const params: any = { appId, skip: skip * take, take };

    if (environment) {
      query += ` AND environment = :environment`;
      params.environment = environment;
    }

    query += ` ORDER BY created_at DESC OFFSET :skip ROWS FETCH NEXT :take ROWS ONLY`;

    const result = await conn.execute(query, params);

    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      appId: row.APP_ID,
      version: row.VERSION,
      environment: row.ENVIRONMENT,
      status: row.STATUS,
      branch: row.BRANCH,
      commitHash: row.COMMIT_HASH,
      containerImage: row.CONTAINER_IMAGE,
      replicas: row.REPLICAS,
      createdBy: row.CREATED_BY,
      createdAt: new Date(row.CREATED_AT),
      startedAt: row.STARTED_AT ? new Date(row.STARTED_AT) : undefined,
      completedAt: row.COMPLETED_AT ? new Date(row.COMPLETED_AT) : undefined,
      status: row.STATUS,
      errorMessage: row.ERROR_MESSAGE
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Update deployment status
 */
export const updateDeploymentStatus = async (
  deploymentId: string,
  status: DeploymentStatus,
  errorMessage?: string
): Promise<void> => {
  const conn = await getConnection();
  try {
    const now = new Date();
    const completedAt = ['success', 'failed', 'rolled_back'].includes(status) ? now : null;

    await conn.execute(
      `UPDATE deployments 
       SET status = :status, completed_at = :completedAt, 
           error_message = :errorMessage, updated_at = :updatedAt
       WHERE id = :id`,
      {
        id: deploymentId,
        status,
        completedAt,
        errorMessage: errorMessage || null,
        updatedAt: now
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/**
 * Add log entry to deployment
 */
export const addDeploymentLog = async (deploymentId: string, logEntry: string): Promise<void> => {
  const conn = await getConnection();
  try {
    const deployment = await getDeployment(deploymentId);
    if (!deployment) return;

    const logs = [...deployment.logs, `[${new Date().toISOString()}] ${logEntry}`];

    await conn.execute(
      `UPDATE deployments SET logs = :logs WHERE id = :id`,
      {
        id: deploymentId,
        logs: JSON.stringify(logs)
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/**
 * Get deployment config
 */
export const getDeploymentConfig = async (appId: string, environment: Environment): Promise<DeploymentConfig | null> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM deployment_configs WHERE app_id = :appId AND environment = :environment`,
      { appId, environment }
    );

    const row = result.rows?.[0] as any;
    if (!row) return null;

    return {
      id: row.ID,
      appId: row.APP_ID,
      environment: row.ENVIRONMENT,
      dockerfile: row.DOCKERFILE,
      buildCommand: row.BUILD_COMMAND,
      deployCommand: row.DEPLOY_COMMAND,
      healthCheckUrl: row.HEALTH_CHECK_URL,
      replicas: row.REPLICAS,
      resources: row.RESOURCES ? JSON.parse(row.RESOURCES) : { cpuLimit: '500m', memoryLimit: '512Mi' },
      env: row.ENV ? JSON.parse(row.ENV) : {},
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT)
    };
  } finally {
    await conn.close();
  }
};

/**
 * Save deployment config
 */
export const saveDeploymentConfig = async (config: {
  appId: string;
  environment: Environment;
  dockerfile: string;
  buildCommand: string;
  deployCommand: string;
  healthCheckUrl: string;
  replicas: number;
  resources: { cpuLimit: string; memoryLimit: string };
  env: Record<string, string>;
}): Promise<DeploymentConfig> => {
  const conn = await getConnection();
  try {
    const id = uuidv4();
    const now = new Date();

    // Check if config exists
    const existing = await getDeploymentConfig(config.appId, config.environment);

    if (existing) {
      await conn.execute(
        `UPDATE deployment_configs 
         SET dockerfile = :dockerfile, build_command = :buildCommand,
             deploy_command = :deployCommand, health_check_url = :healthCheckUrl,
             replicas = :replicas, resources = :resources, env = :env,
             updated_at = :updatedAt
         WHERE app_id = :appId AND environment = :environment`,
        {
          appId: config.appId,
          environment: config.environment,
          dockerfile: config.dockerfile,
          buildCommand: config.buildCommand,
          deployCommand: config.deployCommand,
          healthCheckUrl: config.healthCheckUrl,
          replicas: config.replicas,
          resources: JSON.stringify(config.resources),
          env: JSON.stringify(config.env),
          updatedAt: now
        },
        { autoCommit: true }
      );
    } else {
      await conn.execute(
        `INSERT INTO deployment_configs (
          id, app_id, environment, dockerfile, build_command, deploy_command,
          health_check_url, replicas, resources, env, created_at, updated_at
        ) VALUES (
          :id, :appId, :environment, :dockerfile, :buildCommand, :deployCommand,
          :healthCheckUrl, :replicas, :resources, :env, :createdAt, :updatedAt
        )`,
        {
          id,
          appId: config.appId,
          environment: config.environment,
          dockerfile: config.dockerfile,
          buildCommand: config.buildCommand,
          deployCommand: config.deployCommand,
          healthCheckUrl: config.healthCheckUrl,
          replicas: config.replicas,
          resources: JSON.stringify(config.resources),
          env: JSON.stringify(config.env),
          createdAt: now,
          updatedAt: now
        },
        { autoCommit: true }
      );
    }

    return getDeploymentConfig(config.appId, config.environment) as Promise<DeploymentConfig>;
  } finally {
    await conn.close();
  }
};

/**
 * Rollback to previous deployment
 */
export const rollbackDeployment = async (appId: string, environment: Environment): Promise<Deployment | null> => {
  const conn = await getConnection();
  try {
    // Get latest successful deployment
    const result = await conn.execute(
      `SELECT * FROM deployments 
       WHERE app_id = :appId AND environment = :environment AND status = 'success'
       ORDER BY created_at DESC
       FETCH FIRST 2 ROWS ONLY`,
      { appId, environment }
    );

    if (!result.rows || result.rows.length < 2) {
      return null; // No previous successful deployment
    }

    const previousDeployment = result.rows[1] as any;

    // Create rollback deployment
    const rollbackDeploy = await createDeployment({
      appId,
      version: previousDeployment.VERSION,
      environment,
      branch: previousDeployment.BRANCH,
      commitHash: previousDeployment.COMMIT_HASH,
      containerImage: previousDeployment.CONTAINER_IMAGE,
      replicas: previousDeployment.REPLICAS,
      createdBy: 'system'
    });

    await updateDeploymentStatus(rollbackDeploy.id, 'rolled_back');

    return rollbackDeploy;
  } finally {
    await conn.close();
  }
};

/**
 * Get deployment history for metrics
 */
export const getDeploymentMetrics = async (appId: string, environment: Environment) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
         COUNT(*) as total_deployments,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
         AVG(CASE WHEN status = 'success' THEN 
           (COMPLETED_AT - CREATED_AT) * 24 * 60 ELSE NULL END) as avg_duration_minutes
       FROM deployments
       WHERE app_id = :appId AND environment = :environment
       AND created_at >= SYSDATE - 30`,
      { appId, environment }
    );

    const row = result.rows?.[0] as any;
    return {
      totalDeployments: row?.TOTAL_DEPLOYMENTS || 0,
      successful: row?.SUCCESSFUL || 0,
      failed: row?.FAILED || 0,
      successRate: row?.TOTAL_DEPLOYMENTS 
        ? ((row.SUCCESSFUL / row.TOTAL_DEPLOYMENTS) * 100).toFixed(2)
        : 0,
      avgDurationMinutes: row?.AVG_DURATION_MINUTES?.toFixed(2) || 0
    };
  } finally {
    await conn.close();
  }
};

/**
 * Simulate deployment process
 */
export const simulateDeployment = async (deploymentId: string): Promise<void> => {
  const steps = [
    'Building Docker image...',
    'Docker image built successfully',
    'Pushing to registry...',
    'Image pushed to registry',
    'Pulling latest image on servers...',
    'Starting health checks...',
    'Health check passed',
    'Rolling out new version...',
    'Deployment completed successfully'
  ];

  for (const step of steps) {
    await addDeploymentLog(deploymentId, step);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  await updateDeploymentStatus(deploymentId, 'success');
};
