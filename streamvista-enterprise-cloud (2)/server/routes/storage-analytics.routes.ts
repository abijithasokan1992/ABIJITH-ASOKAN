import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware';
import {
  getStorageMetrics,
  getStorageBreakdown,
  generateStorageReport,
  getStorageReports,
  getStorageTrend,
  getStorageComparison,
  exportStorageData
} from '../services/storage-analytics.service';
import {
  getQuotaStatus,
  checkAndNotifyQuota,
  getOrgsExceedingQuota,
  forecastQuotaExceedance,
  getOrgsNeedingQuotaIncrease,
  updateQuotaThresholds
} from '../services/storage-quota.service';
import { logEvent } from '../services/audit.service';

export const router = Router();

router.use(verifyAuth);

const verifyOrgContext = (req: any, res: any, next: any) => {
  const { orgId } = req.body || req.query || req.params;
  if (!orgId) {
    return res.status(400).json({ error: 'Organization context required (orgId)' });
  }
  req.orgId = orgId;
  next();
};

/**
 * GET /api/storage/metrics - Get current storage metrics
 */
router.get('/metrics', verifyOrgContext, async (req, res) => {
  try {
    const { orgId, userId } = req;

    const metrics = await getStorageMetrics(orgId);

    await logEvent(userId, 'STORAGE_METRICS_VIEWED', orgId, req.ip || '');

    res.json(metrics);
  } catch (err) {
    console.error('Error retrieving storage metrics:', err);
    res.status(500).json({ error: 'Failed to retrieve storage metrics' });
  }
});

/**
 * GET /api/storage/breakdown - Get storage breakdown by type
 */
router.get('/breakdown', verifyOrgContext, async (req, res) => {
  try {
    const { orgId, userId } = req;

    const breakdown = await getStorageBreakdown(orgId);

    await logEvent(userId, 'STORAGE_BREAKDOWN_VIEWED', orgId, req.ip || '');

    res.json(breakdown);
  } catch (err) {
    console.error('Error retrieving storage breakdown:', err);
    res.status(500).json({ error: 'Failed to retrieve storage breakdown' });
  }
});

/**
 * POST /api/storage/reports - Generate a storage report
 */
router.post('/reports', verifyOrgContext, async (req, res) => {
  try {
    const { orgId, userId } = req;
    const { period = 'monthly' } = req.body;

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Use: daily, weekly, or monthly' });
    }

    const report = await generateStorageReport(orgId, period);

    await logEvent(userId, 'STORAGE_REPORT_GENERATED', period, req.ip || '');

    res.status(201).json(report);
  } catch (err) {
    console.error('Error generating storage report:', err);
    res.status(500).json({ error: 'Failed to generate storage report' });
  }
});

/**
 * GET /api/storage/reports - Get storage reports
 */
router.get('/reports', verifyOrgContext, async (req, res) => {
  try {
    const { orgId, userId } = req;
    const { period, skip = 0, take = 50 } = req.query;

    const reports = await getStorageReports(
      orgId,
      period as any,
      parseInt(skip as string),
      parseInt(take as string)
    );

    await logEvent(userId, 'STORAGE_REPORTS_LISTED', `${reports.length} reports`, req.ip || '');

    res.json(reports);
  } catch (err) {
    console.error('Error retrieving storage reports:', err);
    res.status(500).json({ error: 'Failed to retrieve storage reports' });
  }
});

/**
 * GET /api/storage/trend - Get storage usage trend
 */
router.get('/trend', verifyOrgContext, async (req, res) => {
  try {
    const { orgId, userId } = req;
    const { days = 30 } = req.query;

    const trend = await getStorageTrend(orgId, parseInt(days as string));

    await logEvent(userId, 'STORAGE_TREND_VIEWED', `${days} days`, req.ip || '');

    res.json(trend);
  } catch (err) {
    console.error('Error retrieving storage trend:', err);
    res.status(500).json({ error: 'Failed to retrieve storage trend' });
  }
});

/**
 * GET /api/storage/export - Export storage data
 */
router.get('/export', verifyOrgContext, async (req, res) => {
  try {
    const { orgId, userId } = req;
    const { format = 'csv' } = req.query;

    if (!['csv', 'json'].includes(format as string)) {
      return res.status(400).json({ error: 'Invalid format. Use: csv or json' });
    }

    const data = await exportStorageData(orgId, format as 'csv' | 'json');

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `storage-report-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'json'}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await logEvent(userId, 'STORAGE_DATA_EXPORTED', format as string, req.ip || '');

    res.send(data);
  } catch (err) {
    console.error('Error exporting storage data:', err);
    res.status(500).json({ error: 'Failed to export storage data' });
  }
});

/**
 * GET /api/storage/quota - Get current quota status
 */
router.get('/quota', verifyOrgContext, async (req, res) => {
  try {
    const { orgId, userId } = req;

    const quota = await getQuotaStatus(orgId);

    await logEvent(userId, 'QUOTA_STATUS_VIEWED', orgId, req.ip || '');

    res.json(quota);
  } catch (err) {
    console.error('Error retrieving quota status:', err);
    res.status(500).json({ error: 'Failed to retrieve quota status' });
  }
});

/**
 * PUT /api/storage/quota - Update quota thresholds
 */
router.put('/quota', verifyOrgContext, async (req, res) => {
  try {
    const { orgId, userId } = req;
    const { warningThreshold, errorThreshold } = req.body;

    if (warningThreshold && (warningThreshold < 0 || warningThreshold > 100)) {
      return res.status(400).json({ error: 'Warning threshold must be between 0 and 100' });
    }

    if (errorThreshold && (errorThreshold < 0 || errorThreshold > 100)) {
      return res.status(400).json({ error: 'Error threshold must be between 0 and 100' });
    }

    await updateQuotaThresholds(orgId, warningThreshold, errorThreshold);

    const updated = await getQuotaStatus(orgId);

    await logEvent(userId, 'QUOTA_THRESHOLDS_UPDATED', `Warning: ${warningThreshold}%, Error: ${errorThreshold}%`, req.ip || '');

    res.json(updated);
  } catch (err) {
    console.error('Error updating quota thresholds:', err);
    res.status(500).json({ error: 'Failed to update quota thresholds' });
  }
});

/**
 * POST /api/storage/quota/notify - Check and notify quota status
 */
router.post('/quota/notify', verifyOrgContext, async (req, res) => {
  try {
    const { orgId, userId } = req;

    await checkAndNotifyQuota(orgId);

    await logEvent(userId, 'QUOTA_CHECK_TRIGGERED', orgId, req.ip || '');

    res.json({ message: 'Quota check completed and notifications sent if necessary' });
  } catch (err) {
    console.error('Error checking quota:', err);
    res.status(500).json({ error: 'Failed to check quota' });
  }
});

/**
 * GET /api/storage/quota/forecast - Forecast when quota will be exceeded
 */
router.get('/quota/forecast', verifyOrgContext, async (req, res) => {
  try {
    const { orgId, userId } = req;

    const forecast = await forecastQuotaExceedance(orgId);

    await logEvent(userId, 'QUOTA_FORECAST_VIEWED', orgId, req.ip || '');

    res.json(forecast);
  } catch (err) {
    console.error('Error forecasting quota exceedance:', err);
    res.status(500).json({ error: 'Failed to forecast quota exceedance' });
  }
});

/**
 * GET /api/storage/admin/comparison - Compare storage across organizations (admin)
 */
router.get('/admin/comparison', async (req, res) => {
  try {
    const { userId } = req;
    const { skip = 0, take = 50 } = req.query;

    const comparison = await getStorageComparison(parseInt(skip as string), parseInt(take as string));

    await logEvent(userId, 'STORAGE_COMPARISON_VIEWED', 'Admin view', req.ip || '');

    res.json(comparison);
  } catch (err) {
    console.error('Error retrieving storage comparison:', err);
    res.status(500).json({ error: 'Failed to retrieve storage comparison' });
  }
});

/**
 * GET /api/storage/admin/exceeded - Get organizations exceeding quota (admin)
 */
router.get('/admin/exceeded', async (req, res) => {
  try {
    const { userId } = req;
    const { skip = 0, take = 50 } = req.query;

    const orgs = await getOrgsExceedingQuota(parseInt(skip as string), parseInt(take as string));

    await logEvent(userId, 'EXCEEDED_QUOTA_ORGS_VIEWED', `${orgs.length} orgs`, req.ip || '');

    res.json(orgs);
  } catch (err) {
    console.error('Error retrieving organizations exceeding quota:', err);
    res.status(500).json({ error: 'Failed to retrieve organizations exceeding quota' });
  }
});

/**
 * GET /api/storage/admin/low-quota - Get organizations needing quota increase (admin)
 */
router.get('/admin/low-quota', async (req, res) => {
  try {
    const { userId } = req;
    const { minAvailableGB = 1, skip = 0, take = 50 } = req.query;

    const orgs = await getOrgsNeedingQuotaIncrease(
      parseInt(minAvailableGB as string),
      parseInt(skip as string),
      parseInt(take as string)
    );

    await logEvent(userId, 'LOW_QUOTA_ORGS_VIEWED', `${orgs.length} orgs`, req.ip || '');

    res.json(orgs);
  } catch (err) {
    console.error('Error retrieving organizations needing quota increase:', err);
    res.status(500).json({ error: 'Failed to retrieve organizations needing quota increase' });
  }
});

export default router;
