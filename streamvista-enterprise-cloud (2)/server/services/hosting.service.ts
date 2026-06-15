import { getConnection } from '../db';
import { v4 as uuidv4 } from 'uuid';

export type HostingProvider = 'oracle-cloud' | 'aws' | 'gcp' | 'azure' | 'kubernetes';
export type InstanceStatus = 'running' | 'stopped' | 'pending' | 'error';

interface HostingInstance {
  id: string;
  appId: string;
  provider: HostingProvider;
  instanceType: string;
  region: string;
  status: InstanceStatus;
  publicIp?: string;
  privateIp?: string;
  cpu: number;
  memory: number;
  storage: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

interface Domain {
  id: string;
  appId: string;
  domain: string;
  provider: string;
  ssl: boolean;
  sslCertificate?: string;
  sslExpiry?: Date;
  verified: boolean;
  verifiedAt?: Date;
  dnsRecords: DNSRecord[];
  createdAt: Date;
  updatedAt: Date;
}

interface DNSRecord {
  type: 'A' | 'CNAME' | 'MX' | 'TXT' | 'NS';
  name: string;
  value: string;
  ttl: number;
}

/**
 * Create a hosting instance
 */
export const createHostingInstance = async (instance: {
  appId: string;
  provider: HostingProvider;
  instanceType: string;
  region: string;
  cpu: number;
  memory: number;
  storage: number;
  metadata?: Record<string, any>;
}): Promise<HostingInstance> => {
  const conn = await getConnection();
  try {
    const id = uuidv4();
    const now = new Date();

    await conn.execute(
      `INSERT INTO hosting_instances (
        id, app_id, provider, instance_type, region, status, cpu, memory, storage, metadata, created_at, updated_at
      ) VALUES (
        :id, :appId, :provider, :instanceType, :region, :status, :cpu, :memory, :storage, :metadata, :createdAt, :updatedAt
      )`,
      {
        id,
        appId: instance.appId,
        provider: instance.provider,
        instanceType: instance.instanceType,
        region: instance.region,
        status: 'pending',
        cpu: instance.cpu,
        memory: instance.memory,
        storage: instance.storage,
        metadata: instance.metadata ? JSON.stringify(instance.metadata) : null,
        createdAt: now,
        updatedAt: now
      },
      { autoCommit: true }
    );

    return {
      id,
      appId: instance.appId,
      provider: instance.provider,
      instanceType: instance.instanceType,
      region: instance.region,
      status: 'pending',
      cpu: instance.cpu,
      memory: instance.memory,
      storage: instance.storage,
      metadata: instance.metadata,
      createdAt: now,
      updatedAt: now
    };
  } finally {
    await conn.close();
  }
};

/**
 * Get hosting instance
 */
export const getHostingInstance = async (instanceId: string): Promise<HostingInstance | null> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM hosting_instances WHERE id = :id`,
      { id: instanceId }
    );

    const row = result.rows?.[0] as any;
    if (!row) return null;

    return {
      id: row.ID,
      appId: row.APP_ID,
      provider: row.PROVIDER,
      instanceType: row.INSTANCE_TYPE,
      region: row.REGION,
      status: row.STATUS,
      publicIp: row.PUBLIC_IP,
      privateIp: row.PRIVATE_IP,
      cpu: row.CPU,
      memory: row.MEMORY,
      storage: row.STORAGE,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT),
      metadata: row.METADATA ? JSON.parse(row.METADATA) : undefined
    };
  } finally {
    await conn.close();
  }
};

/**
 * List hosting instances for an app
 */
export const listHostingInstances = async (appId: string, skip = 0, take = 50) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM hosting_instances 
       WHERE app_id = :appId
       ORDER BY created_at DESC
       OFFSET :skip ROWS FETCH NEXT :take ROWS ONLY`,
      { appId, skip: skip * take, take }
    );

    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      appId: row.APP_ID,
      provider: row.PROVIDER,
      instanceType: row.INSTANCE_TYPE,
      region: row.REGION,
      status: row.STATUS,
      publicIp: row.PUBLIC_IP,
      privateIp: row.PRIVATE_IP,
      cpu: row.CPU,
      memory: row.MEMORY,
      storage: row.STORAGE,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT)
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Update instance status
 */
export const updateInstanceStatus = async (
  instanceId: string,
  status: InstanceStatus,
  publicIp?: string,
  privateIp?: string
): Promise<void> => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE hosting_instances 
       SET status = :status, public_ip = :publicIp, private_ip = :privateIp, updated_at = SYSDATE
       WHERE id = :id`,
      {
        id: instanceId,
        status,
        publicIp: publicIp || null,
        privateIp: privateIp || null
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/**
 * Add domain to app
 */
export const addDomain = async (domain: {
  appId: string;
  domain: string;
  provider: string;
  ssl: boolean;
  dnsRecords: DNSRecord[];
}): Promise<Domain> => {
  const conn = await getConnection();
  try {
    const id = uuidv4();
    const now = new Date();

    await conn.execute(
      `INSERT INTO domains (
        id, app_id, domain, provider, ssl, dns_records, created_at, updated_at
      ) VALUES (
        :id, :appId, :domain, :provider, :ssl, :dnsRecords, :createdAt, :updatedAt
      )`,
      {
        id,
        appId: domain.appId,
        domain: domain.domain,
        provider: domain.provider,
        ssl: domain.ssl ? 1 : 0,
        dnsRecords: JSON.stringify(domain.dnsRecords),
        createdAt: now,
        updatedAt: now
      },
      { autoCommit: true }
    );

    return {
      id,
      appId: domain.appId,
      domain: domain.domain,
      provider: domain.provider,
      ssl: domain.ssl,
      dnsRecords: domain.dnsRecords,
      verified: false,
      createdAt: now,
      updatedAt: now
    };
  } finally {
    await conn.close();
  }
};

/**
 * Get domain
 */
export const getDomain = async (domainId: string): Promise<Domain | null> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM domains WHERE id = :id`,
      { id: domainId }
    );

    const row = result.rows?.[0] as any;
    if (!row) return null;

    const dnsRecords = row.DNS_RECORDS ? JSON.parse(row.DNS_RECORDS) : [];

    return {
      id: row.ID,
      appId: row.APP_ID,
      domain: row.DOMAIN,
      provider: row.PROVIDER,
      ssl: row.SSL === 1,
      sslCertificate: row.SSL_CERTIFICATE,
      sslExpiry: row.SSL_EXPIRY ? new Date(row.SSL_EXPIRY) : undefined,
      verified: row.VERIFIED === 1,
      verifiedAt: row.VERIFIED_AT ? new Date(row.VERIFIED_AT) : undefined,
      dnsRecords,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT)
    };
  } finally {
    await conn.close();
  }
};

/**
 * List domains for an app
 */
export const listDomains = async (appId: string, skip = 0, take = 50) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT * FROM domains 
       WHERE app_id = :appId
       ORDER BY created_at DESC
       OFFSET :skip ROWS FETCH NEXT :take ROWS ONLY`,
      { appId, skip: skip * take, take }
    );

    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      appId: row.APP_ID,
      domain: row.DOMAIN,
      provider: row.PROVIDER,
      ssl: row.SSL === 1,
      verified: row.VERIFIED === 1,
      verifiedAt: row.VERIFIED_AT ? new Date(row.VERIFIED_AT) : undefined,
      sslExpiry: row.SSL_EXPIRY ? new Date(row.SSL_EXPIRY) : undefined,
      createdAt: new Date(row.CREATED_AT),
      updatedAt: new Date(row.UPDATED_AT)
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Verify domain ownership
 */
export const verifyDomain = async (domainId: string): Promise<boolean> => {
  const conn = await getConnection();
  try {
    const now = new Date();
    const result = await conn.execute(
      `UPDATE domains 
       SET verified = 1, verified_at = :verifiedAt
       WHERE id = :id AND verified = 0`,
      {
        id: domainId,
        verifiedAt: now
      },
      { autoCommit: true }
    );

    return (result.rowsAffected || 0) > 0;
  } finally {
    await conn.close();
  }
};

/**
 * Update SSL certificate
 */
export const updateSSLCertificate = async (
  domainId: string,
  certificate: string,
  expiry: Date
): Promise<void> => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE domains 
       SET ssl_certificate = :certificate, ssl_expiry = :expiry, ssl = 1, updated_at = SYSDATE
       WHERE id = :id`,
      {
        id: domainId,
        certificate,
        expiry
      },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};

/**
 * Delete domain
 */
export const deleteDomain = async (domainId: string): Promise<boolean> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM domains WHERE id = :id`,
      { id: domainId },
      { autoCommit: true }
    );

    return (result.rowsAffected || 0) > 0;
  } finally {
    await conn.close();
  }
};

/**
 * Get infrastructure metrics
 */
export const getInfrastructureMetrics = async (appId: string) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
         COUNT(*) as total_instances,
         SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
         SUM(cpu) as total_cpu,
         SUM(memory) as total_memory,
         SUM(storage) as total_storage
       FROM hosting_instances
       WHERE app_id = :appId`,
      { appId }
    );

    const row = result.rows?.[0] as any;

    return {
      totalInstances: row?.TOTAL_INSTANCES || 0,
      running: row?.RUNNING || 0,
      totalCPU: row?.TOTAL_CPU || 0,
      totalMemory: row?.TOTAL_MEMORY || 0,
      totalStorage: row?.TOTAL_STORAGE || 0,
      domainsConfigured: (
        await conn.execute(
          `SELECT COUNT(*) as cnt FROM domains WHERE app_id = :appId`,
          { appId }
        )
      ).rows?.[0]?.CNT || 0,
      domainsVerified: (
        await conn.execute(
          `SELECT COUNT(*) as cnt FROM domains WHERE app_id = :appId AND verified = 1`,
          { appId }
        )
      ).rows?.[0]?.CNT || 0
    };
  } finally {
    await conn.close();
  }
};

/**
 * Scale instances for an app
 */
export const scaleInstances = async (appId: string, newCount: number): Promise<number> => {
  const conn = await getConnection();
  try {
    // Get current instances
    const current = await listHostingInstances(appId, 0, 1000);
    const currentCount = current.length;
    const diff = newCount - currentCount;

    if (diff > 0) {
      // Create new instances
      const template = current[0];
      for (let i = 0; i < diff; i++) {
        await createHostingInstance({
          appId,
          provider: template.provider,
          instanceType: template.instanceType,
          region: template.region,
          cpu: template.cpu,
          memory: template.memory,
          storage: template.storage
        });
      }
    } else if (diff < 0) {
      // Delete instances
      const toDelete = current.slice(0, Math.abs(diff));
      for (const instance of toDelete) {
        await conn.execute(
          `DELETE FROM hosting_instances WHERE id = :id`,
          { id: instance.id },
          { autoCommit: true }
        );
      }
    }

    return newCount;
  } finally {
    await conn.close();
  }
};
