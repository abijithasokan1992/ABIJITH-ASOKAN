import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware';
import { getConnection } from '../db';
import { getSubscription } from '../services/subscription.service';
import { calculateBilling } from '../services/billing.service';

export const router = Router();

router.get('/', verifyAuth, async (req, res) => {
  const connection = await getConnection();
  const orgId = req.query.orgId as string;
  try {
    const [result, files, sub] = await Promise.all([
        connection.execute(`SELECT used_gb, purchased_gb FROM storage_allocations WHERE org_id = :orgId`, { orgId }),
        connection.execute(`SELECT COUNT(*) as count FROM files WHERE folder_id IN (SELECT id FROM folders WHERE org_id = :orgId)`, { orgId }),
        getSubscription(orgId)
    ]);
    
    const billing = sub ? calculateBilling(sub.PLAN_ID || 'Basic') : null;
    
    res.status(200).json({ 
        metrics: result.rows?.[0], 
        fileCount: (files.rows?.[0] as any[])?.[0],
        subscription: sub ? { 
            plan: sub.PLAN_ID, 
            status: sub.STATUS, 
            renewalDate: sub.CURRENT_PERIOD_END,
            ...billing
        } : null
    });
  } finally {
    await connection.close();
  }
});
