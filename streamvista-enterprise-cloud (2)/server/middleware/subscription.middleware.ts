declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { getSubscription } from '../services/subscription.service';
import { logEvent } from '../services/audit.service';

export const enforceSubscription = async (req: Request, res: Response, next: NextFunction) => {
    const orgId = req.query.orgId as string;
    if (!orgId) return next();

    const sub = await getSubscription(orgId);
    
    if (sub && sub.STATUS === 'EXPIRED') {
        const restrictedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
        if (restrictedMethods.includes(req.method)) {
            await logEvent(req.user?.id || 'system', 'ACCESS_BLOCKED_EXPIRED', orgId, req.ip || '');
            return res.status(403).json({ error: 'Subscription expired. Please renew.' });
        }
    }
    
    next();
};
