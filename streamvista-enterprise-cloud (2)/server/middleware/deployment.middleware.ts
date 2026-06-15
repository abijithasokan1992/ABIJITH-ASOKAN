import { Request, Response, NextFunction } from 'express';

/**
 * Validate deployment request body
 */
export const validateDeploymentRequest = (req: Request, res: Response, next: NextFunction) => {
  const { version, environment, branch, commitHash, containerImage } = req.body;

  const errors: Record<string, string> = {};

  if (!version || typeof version !== 'string' || version.trim().length === 0) {
    errors.version = 'Version is required and must be a non-empty string';
  }

  if (!environment || !['development', 'staging', 'production'].includes(environment)) {
    errors.environment = 'Environment must be one of: development, staging, production';
  }

  if (!branch || typeof branch !== 'string' || branch.trim().length === 0) {
    errors.branch = 'Branch is required and must be a non-empty string';
  }

  if (!commitHash || typeof commitHash !== 'string' || commitHash.trim().length === 0) {
    errors.commitHash = 'Commit hash is required and must be a non-empty string';
  }

  if (!containerImage || typeof containerImage !== 'string' || containerImage.trim().length === 0) {
    errors.containerImage = 'Container image is required and must be a non-empty string';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  next();
};

/**
 * Validate deployment config request body
 */
export const validateDeploymentConfig = (req: Request, res: Response, next: NextFunction) => {
  const { environment, dockerfile, buildCommand, deployCommand } = req.body;

  const errors: Record<string, string> = {};

  if (!environment || !['development', 'staging', 'production'].includes(environment)) {
    errors.environment = 'Environment must be one of: development, staging, production';
  }

  if (!dockerfile || typeof dockerfile !== 'string' || dockerfile.trim().length === 0) {
    errors.dockerfile = 'Dockerfile is required and must be a non-empty string';
  }

  if (!buildCommand || typeof buildCommand !== 'string' || buildCommand.trim().length === 0) {
    errors.buildCommand = 'Build command is required and must be a non-empty string';
  }

  if (!deployCommand || typeof deployCommand !== 'string' || deployCommand.trim().length === 0) {
    errors.deployCommand = 'Deploy command is required and must be a non-empty string';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  next();
};

/**
 * Validate hosting instance request body
 */
export const validateHostingInstanceRequest = (req: Request, res: Response, next: NextFunction) => {
  const { provider, instanceType, region, cpu, memory, storage } = req.body;

  const errors: Record<string, string> = {};

  const validProviders = ['oracle-cloud', 'aws', 'gcp', 'azure', 'kubernetes'];
  if (!provider || !validProviders.includes(provider)) {
    errors.provider = `Provider must be one of: ${validProviders.join(', ')}`;
  }

  if (!instanceType || typeof instanceType !== 'string' || instanceType.trim().length === 0) {
    errors.instanceType = 'Instance type is required and must be a non-empty string';
  }

  if (!region || typeof region !== 'string' || region.trim().length === 0) {
    errors.region = 'Region is required and must be a non-empty string';
  }

  if (typeof cpu !== 'number' || cpu < 0.5 || cpu > 256) {
    errors.cpu = 'CPU must be a number between 0.5 and 256';
  }

  if (typeof memory !== 'number' || memory < 128 || memory > 16384) {
    errors.memory = 'Memory must be a number between 128 and 16384 MB';
  }

  if (typeof storage !== 'number' || storage < 10 || storage > 16384) {
    errors.storage = 'Storage must be a number between 10 and 16384 GB';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  next();
};

/**
 * Validate domain request body
 */
export const validateDomainRequest = (req: Request, res: Response, next: NextFunction) => {
  const { domain, provider } = req.body;

  const errors: Record<string, string> = {};

  if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
    errors.domain = 'Domain is required and must be a non-empty string';
  } else if (!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(domain)) {
    errors.domain = 'Invalid domain format';
  }

  if (!provider || typeof provider !== 'string' || provider.trim().length === 0) {
    errors.provider = 'Provider is required and must be a non-empty string';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  next();
};

/**
 * Validate SSL certificate request body
 */
export const validateSSLCertificateRequest = (req: Request, res: Response, next: NextFunction) => {
  const { certificate, expiry } = req.body;

  const errors: Record<string, string> = {};

  if (!certificate || typeof certificate !== 'string' || certificate.trim().length === 0) {
    errors.certificate = 'Certificate is required and must be a non-empty string';
  }

  if (!expiry || isNaN(new Date(expiry).getTime())) {
    errors.expiry = 'Expiry must be a valid date';
  } else if (new Date(expiry) <= new Date()) {
    errors.expiry = 'Expiry date must be in the future';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  next();
};

/**
 * Check deployment authorization
 */
export const authorizeDeployment = (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).userRole || 'user';
  
  // Only allow deployment from admin or developer roles
  if (!['admin', 'developer'].includes(userRole)) {
    return res.status(403).json({ 
      error: 'Insufficient permissions to create deployments' 
    });
  }

  next();
};

/**
 * Check infrastructure authorization
 */
export const authorizeInfrastructure = (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).userRole || 'user';
  
  // Only allow infrastructure management from admin role
  if (userRole !== 'admin') {
    return res.status(403).json({ 
      error: 'Insufficient permissions to manage infrastructure' 
    });
  }

  next();
};

/**
 * Rate limit deployments
 */
const deploymentTimestamps: Record<string, number[]> = {};

export const rateLimitDeployments = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxDeployments = 5; // Max 5 deployments per minute

  if (!deploymentTimestamps[userId]) {
    deploymentTimestamps[userId] = [];
  }

  // Clean up old timestamps
  deploymentTimestamps[userId] = deploymentTimestamps[userId].filter(ts => now - ts < windowMs);

  if (deploymentTimestamps[userId].length >= maxDeployments) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Maximum ${maxDeployments} deployments per minute allowed`,
      retryAfter: Math.ceil((deploymentTimestamps[userId][0] + windowMs - now) / 1000)
    });
  }

  deploymentTimestamps[userId].push(now);
  next();
};

/**
 * Validate replica count for scaling
 */
export const validateReplicaCount = (req: Request, res: Response, next: NextFunction) => {
  const { newCount } = req.body;

  if (typeof newCount !== 'number' || !Number.isInteger(newCount)) {
    return res.status(400).json({
      error: 'Invalid replica count',
      message: 'newCount must be an integer'
    });
  }

  if (newCount < 1 || newCount > 100) {
    return res.status(400).json({
      error: 'Invalid replica count',
      message: 'Replica count must be between 1 and 100'
    });
  }

  next();
};
