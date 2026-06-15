import { getConnection } from '../db';
import { sendEmail } from './email.service';
import { getOrganizationAdmins } from './user.service';

interface StorageQuota {
  orgId: string;
  purchasedGB: number;
  usedGB: number;
  availableGB: number;
  warningThreshold: number;
  errorThreshold: number;
  status: 'healthy' | 'warning' | 'critical' | 'exceeded';
}

/**
 * Get current quota status for an organization
 */
export const getQuotaStatus = async (orgId: string): Promise<StorageQuota> => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT purchased_gb, used_gb, warning_threshold, error_threshold 
       FROM storage_allocations WHERE org_id = :orgId`,
      { orgId }
    );

    const row = result.rows?.[0] as any;
    if (!row) {
      return {
        orgId,
        purchasedGB: 0,
        usedGB: 0,
        availableGB: 0,
        warningThreshold: 80,
        errorThreshold: 95,
        status: 'healthy'
      };
    }

    const purchased = row.PURCHASED_GB;
    const used = row.USED_GB;
    const available = Math.max(0, purchased - used);
    const warningThreshold = row.WARNING_THRESHOLD || 80;
    const errorThreshold = row.ERROR_THRESHOLD || 95;
    const utilization = purchased > 0 ? (used / purchased) * 100 : 0;

    let status: 'healthy' | 'warning' | 'critical' | 'exceeded';
    if (utilization > 100) {
      status = 'exceeded';
    } else if (utilization >= errorThreshold) {
      status = 'critical';
    } else if (utilization >= warningThreshold) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    return {
      orgId,
      purchasedGB: purchased,
      usedGB: used,
      availableGB: available,
      warningThreshold,
      errorThreshold,
      status
    };
  } finally {
    await conn.close();
  }
};

/**
 * Check if organization can upload a file of given size
 */
export const canUploadFile = async (orgId: string, fileSizeBytes: number): Promise<boolean> => {
  const quota = await getQuotaStatus(orgId);
  const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);
  return quota.availableGB >= fileSizeGB && quota.status !== 'exceeded';
};

/**
 * Update quota thresholds
 */
export const updateQuotaThresholds = async (
  orgId: string,
  warningThreshold?: number,
  errorThreshold?: number
): Promise<void> => {
  const conn = await getConnection();
  try {
    const parts: string[] = [];
    const params: any = { orgId };

    if (warningThreshold !== undefined) {
      parts.push('warning_threshold = :warningThreshold');
      params.warningThreshold = warningThreshold;
    }

    if (errorThreshold !== undefined) {
      parts.push('error_threshold = :errorThreshold');
      params.errorThreshold = errorThreshold;
    }

    if (parts.length > 0) {
      await conn.execute(
        `UPDATE storage_allocations SET ${parts.join(', ')} WHERE org_id = :orgId`,
        params,
        { autoCommit: true }
      );
    }
  } finally {
    await conn.close();
  }
};

/**
 * Check quota and send notifications if threshold exceeded
 */
export const checkAndNotifyQuota = async (orgId: string): Promise<void> => {
  const quota = await getQuotaStatus(orgId);
  const admins = await getOrganizationAdmins(orgId);

  if (quota.status === 'exceeded') {
    for (const admin of admins) {
      await sendEmail(admin, 'QUOTA_EXCEEDED', {
        usedGB: quota.usedGB.toFixed(2),
        allocatedGB: quota.purchasedGB.toFixed(2)
      });
    }
  } else if (quota.status === 'critical') {
    for (const admin of admins) {
      await sendEmail(admin, 'QUOTA_CRITICAL', {
        percentage: ((quota.usedGB / quota.purchasedGB) * 100).toFixed(2),
        usedGB: quota.usedGB.toFixed(2),
        allocatedGB: quota.purchasedGB.toFixed(2)
      });
    }
  } else if (quota.status === 'warning') {
    for (const admin of admins) {
      await sendEmail(admin, 'QUOTA_WARNING', {
        percentage: ((quota.usedGB / quota.purchasedGB) * 100).toFixed(2),
        usedGB: quota.usedGB.toFixed(2),
        allocatedGB: quota.purchasedGB.toFixed(2)
      });
    }
  }
};

/**
 * Get quota for multiple organizations
 */
export const getQuotasBatch = async (orgIds: string[]): Promise<Record<string, StorageQuota>> => {
  const quotas: Record<string, StorageQuota> = {};

  for (const orgId of orgIds) {
    quotas[orgId] = await getQuotaStatus(orgId);
  }

  return quotas;
};

/**
 * Get organizations exceeding quota
 */
export const getOrgsExceedingQuota = async (skip = 0, take = 50) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
         o.id, o.name, sa.purchased_gb, sa.used_gb,
         ROUND((sa.used_gb / sa.purchased_gb) * 100, 2) as utilization_percent
       FROM organizations o
       JOIN storage_allocations sa ON o.id = sa.org_id
       WHERE sa.used_gb > sa.purchased_gb
       ORDER BY (sa.used_gb / sa.purchased_gb) DESC
       OFFSET :skip ROWS FETCH NEXT :take ROWS ONLY`,
      { skip: skip * take, take }
    );

    return (result.rows || []).map((row: any) => ({
      orgId: row.ID,
      orgName: row.NAME,
      purchasedGB: row.PURCHASED_GB,
      usedGB: row.USED_GB,
      utilizationPercent: row.UTILIZATION_PERCENT,
      status: 'exceeded' as const
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Forecast when quota will be exceeded
 */
export const forecastQuotaExceedance = async (orgId: string): Promise<{ daysUntilFull: number | null; rate: number }> => {
  const conn = await getConnection();
  try {
    // Get average daily usage over last 30 days
    const result = await conn.execute(
      `SELECT 
         AVG(used_gb) as avg_used,
         MAX(generated_at) as last_report,
         MIN(generated_at) as first_report
       FROM storage_reports
       WHERE org_id = :orgId
       AND generated_at >= SYSDATE - 30`,
      { orgId }
    );

    const row = result.rows?.[0] as any;
    if (!row) {
      return { daysUntilFull: null, rate: 0 };
    }

    const quota = await getQuotaStatus(orgId);
    const timeSpan = (new Date(row.LAST_REPORT).getTime() - new Date(row.FIRST_REPORT).getTime()) / (1000 * 60 * 60 * 24);
    const dailyGrowth = (row.AVG_USED - quota.usedGB) / timeSpan;

    if (dailyGrowth <= 0) {
      return { daysUntilFull: null, rate: 0 };
    }

    const remainingGB = quota.purchasedGB - quota.usedGB;
    const daysUntilFull = Math.ceil(remainingGB / dailyGrowth);

    return {
      daysUntilFull: daysUntilFull > 0 ? daysUntilFull : null,
      rate: parseFloat(dailyGrowth.toFixed(4))
    };
  } finally {
    await conn.close();
  }
};

/**
 * Get low quota organizations for bulk actions
 */
export const getOrgsNeedingQuotaIncrease = async (minAvailableGB = 1, skip = 0, take = 50) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
         o.id, o.name, sa.purchased_gb, sa.used_gb,
         (sa.purchased_gb - sa.used_gb) as available_gb
       FROM organizations o
       JOIN storage_allocations sa ON o.id = sa.org_id
       WHERE (sa.purchased_gb - sa.used_gb) < :minAvailableGB
       ORDER BY available_gb ASC
       OFFSET :skip ROWS FETCH NEXT :take ROWS ONLY`,
      { minAvailableGB, skip: skip * take, take }
    );

    return (result.rows || []).map((row: any) => ({
      orgId: row.ID,
      orgName: row.NAME,
      purchasedGB: row.PURCHASED_GB,
      usedGB: row.USED_GB,
      availableGB: row.AVAILABLE_GB,
      utilizationPercent: ((row.USED_GB / row.PURCHASED_GB) * 100).toFixed(2)
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Reset storage usage (admin operation, for testing/maintenance)
 */
export const resetStorageUsage = async (orgId: string): Promise<void> => {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE storage_allocations SET used_gb = 0 WHERE org_id = :orgId`,
      { orgId },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
};
