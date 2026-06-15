import { getConnection } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface StorageMetrics {
  orgId: string;
  totalStorageGB: number;
  usedStorageGB: number;
  availableStorageGB: number;
  utilizationPercentage: number;
  fileCount: number;
  vaultItemCount: number;
  lastUpdated: Date;
}

interface StorageReport {
  id: string;
  orgId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  metrics: StorageMetrics;
  generatedAt: Date;
}

/**
 * Get current storage metrics for an organization
 */
export const getStorageMetrics = async (orgId: string): Promise<StorageMetrics> => {
  const conn = await getConnection();
  try {
    // Get storage allocation info
    const allocResult = await conn.execute(
      `SELECT purchased_gb, used_gb FROM storage_allocations WHERE org_id = :orgId`,
      { orgId }
    );

    const allocRow = allocResult.rows?.[0] as any;
    const purchasedGB = allocRow?.PURCHASED_GB || 0;
    const usedGB = allocRow?.USED_GB || 0;
    const availableGB = Math.max(0, purchasedGB - usedGB);
    const utilization = purchasedGB > 0 ? (usedGB / purchasedGB) * 100 : 0;

    // Count files
    const fileResult = await conn.execute(
      `SELECT COUNT(*) as cnt FROM file_metadata 
       WHERE folder_id IN (
         SELECT id FROM folders WHERE org_id = :orgId
       )`,
      { orgId }
    );
    const fileCount = (fileResult.rows?.[0] as any)?.CNT || 0;

    // Count vault items
    const vaultResult = await conn.execute(
      `SELECT COUNT(*) as cnt FROM vault_items WHERE org_id = :orgId`,
      { orgId }
    );
    const vaultItemCount = (vaultResult.rows?.[0] as any)?.CNT || 0;

    return {
      orgId,
      totalStorageGB: purchasedGB,
      usedStorageGB: usedGB,
      availableStorageGB: availableGB,
      utilizationPercentage: parseFloat(utilization.toFixed(2)),
      fileCount,
      vaultItemCount,
      lastUpdated: new Date()
    };
  } finally {
    await conn.close();
  }
};

/**
 * Get storage usage breakdown by type
 */
export const getStorageBreakdown = async (orgId: string) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
         'files' as type, 
         SUM(f.size) / (1024 * 1024 * 1024) as size_gb,
         COUNT(f.id) as count
       FROM file_metadata f
       JOIN folders d ON f.folder_id = d.id
       WHERE d.org_id = :orgId
       UNION ALL
       SELECT 
         'vault' as type,
         0 as size_gb,
         COUNT(v.id) as count
       FROM vault_items v
       WHERE v.org_id = :orgId`,
      { orgId }
    );

    return (result.rows || []).map((row: any) => ({
      type: row.TYPE,
      sizeGB: row.SIZE_GB || 0,
      count: row.COUNT || 0
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Create a storage report
 */
export const generateStorageReport = async (
  orgId: string,
  period: 'daily' | 'weekly' | 'monthly'
): Promise<StorageReport> => {
  const conn = await getConnection();
  try {
    const id = uuidv4();
    const generatedAt = new Date();
    const startDate = new Date();
    const endDate = new Date();

    // Calculate period dates
    if (period === 'daily') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get metrics
    const metrics = await getStorageMetrics(orgId);

    // Store report
    await conn.execute(
      `INSERT INTO storage_reports (
        id, org_id, period, start_date, end_date, 
        total_storage_gb, used_storage_gb, file_count, vault_count, generated_at
      ) VALUES (
        :id, :orgId, :period, :startDate, :endDate,
        :totalStorageGB, :usedStorageGB, :fileCount, :vaultCount, :generatedAt
      )`,
      {
        id,
        orgId,
        period,
        startDate,
        endDate,
        totalStorageGB: metrics.totalStorageGB,
        usedStorageGB: metrics.usedStorageGB,
        fileCount: metrics.fileCount,
        vaultCount: metrics.vaultItemCount,
        generatedAt
      },
      { autoCommit: true }
    );

    return {
      id,
      orgId,
      period,
      startDate,
      endDate,
      metrics,
      generatedAt
    };
  } finally {
    await conn.close();
  }
};

/**
 * Get storage reports for an organization
 */
export const getStorageReports = async (
  orgId: string,
  period?: 'daily' | 'weekly' | 'monthly',
  skip = 0,
  take = 50
) => {
  const conn = await getConnection();
  try {
    let query = `SELECT * FROM storage_reports WHERE org_id = :orgId`;
    const params: any = { orgId, skip: skip * take, take };

    if (period) {
      query += ` AND period = :period`;
      params.period = period;
    }

    query += ` ORDER BY generated_at DESC OFFSET :skip ROWS FETCH NEXT :take ROWS ONLY`;

    const result = await conn.execute(query, params);

    return (result.rows || []).map((row: any) => ({
      id: row.ID,
      orgId: row.ORG_ID,
      period: row.PERIOD,
      startDate: new Date(row.START_DATE),
      endDate: new Date(row.END_DATE),
      totalStorageGB: row.TOTAL_STORAGE_GB,
      usedStorageGB: row.USED_STORAGE_GB,
      utilizationPercentage: row.TOTAL_STORAGE_GB > 0 
        ? parseFloat(((row.USED_STORAGE_GB / row.TOTAL_STORAGE_GB) * 100).toFixed(2))
        : 0,
      fileCount: row.FILE_COUNT,
      vaultCount: row.VAULT_COUNT,
      generatedAt: new Date(row.GENERATED_AT)
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Get storage trend over time
 */
export const getStorageTrend = async (orgId: string, days = 30) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
         TRUNC(generated_at) as date,
         AVG(used_storage_gb) as avg_used_gb,
         MAX(used_storage_gb) as max_used_gb,
         MIN(used_storage_gb) as min_used_gb,
         SUM(file_count) as total_files
       FROM storage_reports
       WHERE org_id = :orgId 
       AND generated_at >= TRUNC(SYSDATE - :days)
       GROUP BY TRUNC(generated_at)
       ORDER BY date DESC`,
      { orgId, days }
    );

    return (result.rows || []).map((row: any) => ({
      date: new Date(row.DATE),
      avgUsedGB: parseFloat((row.AVG_USED_GB || 0).toFixed(2)),
      maxUsedGB: parseFloat((row.MAX_USED_GB || 0).toFixed(2)),
      minUsedGB: parseFloat((row.MIN_USED_GB || 0).toFixed(2)),
      totalFiles: row.TOTAL_FILES || 0
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Get storage comparison across organizations (admin only)
 */
export const getStorageComparison = async (skip = 0, take = 50) => {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT 
         o.id, o.name,
         sa.purchased_gb, sa.used_gb,
         (SELECT COUNT(*) FROM file_metadata fm 
          JOIN folders f ON fm.folder_id = f.id 
          WHERE f.org_id = o.id) as file_count,
         (SELECT COUNT(*) FROM vault_items vi WHERE vi.org_id = o.id) as vault_count
       FROM organizations o
       LEFT JOIN storage_allocations sa ON o.id = sa.org_id
       ORDER BY sa.used_gb DESC
       OFFSET :skip ROWS FETCH NEXT :take ROWS ONLY`,
      { skip: skip * take, take }
    );

    return (result.rows || []).map((row: any) => ({
      orgId: row.ID,
      orgName: row.NAME,
      totalStorageGB: row.PURCHASED_GB || 0,
      usedStorageGB: row.USED_GB || 0,
      utilizationPercentage: (row.PURCHASED_GB || 0) > 0
        ? parseFloat(((row.USED_GB || 0) / (row.PURCHASED_GB || 0) * 100).toFixed(2))
        : 0,
      fileCount: row.FILE_COUNT || 0,
      vaultCount: row.VAULT_COUNT || 0
    }));
  } finally {
    await conn.close();
  }
};

/**
 * Export storage data to CSV
 */
export const exportStorageData = async (orgId: string, format: 'csv' | 'json' = 'csv'): Promise<string> => {
  const metrics = await getStorageMetrics(orgId);
  const reports = await getStorageReports(orgId, undefined, 0, 100);

  if (format === 'json') {
    return JSON.stringify({ metrics, reports }, null, 2);
  }

  // CSV format
  const csv = [
    'Storage Metrics Report',
    '',
    'Current Metrics',
    `Total Storage (GB),${metrics.totalStorageGB}`,
    `Used Storage (GB),${metrics.usedStorageGB}`,
    `Available Storage (GB),${metrics.availableStorageGB}`,
    `Utilization (%),${metrics.utilizationPercentage}`,
    `File Count,${metrics.fileCount}`,
    `Vault Items,${metrics.vaultItemCount}`,
    '',
    'Historical Reports',
    'Period,Start Date,End Date,Used GB,Total GB,Utilization %,Files,Vault Items',
    ...reports.map(r => 
      `${r.period},${r.startDate.toISOString()},${r.endDate.toISOString()},${r.usedStorageGB},${r.totalStorageGB},${r.utilizationPercentage},${r.fileCount},${r.vaultCount}`
    )
  ].join('\n');

  return csv;
};
