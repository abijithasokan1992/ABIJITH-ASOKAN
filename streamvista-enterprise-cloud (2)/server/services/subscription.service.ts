import { getConnection } from '../db';
import oracledb from 'oracledb';

export const getSubscription = async (orgId: string) => {
    const conn = await getConnection();
    try {
        const result = await conn.execute(
            `SELECT * FROM subscriptions WHERE org_id = :orgId`,
            { orgId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows?.[0] || null;
    } finally {
        await conn.close();
    }
};

export const updateSubscription = async (orgId: string, status: string, plan_id?: string, current_period_end?: Date) => {
    const conn = await getConnection();
    try {
        // Handle Grace Period logic: if PAST_DUE -> GRACE_PERIOD
        let finalStatus = status;
        if (status === 'PAST_DUE') {
           // Simple logic: set to GRACE_PERIOD, update to EXPIRED later
           finalStatus = 'GRACE_PERIOD';
        }
        
        await conn.execute(
            `UPDATE subscriptions SET status = :status, plan_id = :plan_id, current_period_end = :current_period_end WHERE org_id = :orgId`,
            { status: finalStatus, plan_id, current_period_end, orgId },
            { autoCommit: true }
        );
    } finally {
        await conn.close();
    }
};

export const checkGracePeriods = async () => {
    const conn = await getConnection();
    try {
        await conn.execute(
            `UPDATE subscriptions SET status = 'EXPIRED' WHERE status = 'GRACE_PERIOD' AND current_period_end < CURRENT_TIMESTAMP`,
            {},
            { autoCommit: true }
        );
    } finally {
        await conn.close();
    }
};
