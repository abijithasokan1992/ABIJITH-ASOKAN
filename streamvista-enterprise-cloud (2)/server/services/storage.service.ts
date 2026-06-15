import { getConnection } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from './email.service';
import { getOrganizationAdmins } from './user.service';

export const provisionStorage = async (orgId: string, gb: number) => {
    const conn = await getConnection();
    try {
        await conn.execute(
            `INSERT INTO storage_allocations (id, org_id, purchased_gb) VALUES (:id, :orgId, :gb)`,
            { id: uuidv4(), orgId, gb },
            { autoCommit: true }
        );
    } finally {
        await conn.close();
    }
};

export const updateStorage = async (orgId: string, gb: number) => {
    const conn = await getConnection();
    try {
        await conn.execute(
            `UPDATE storage_allocations SET purchased_gb = purchased_gb + :gb WHERE org_id = :orgId`,
            { gb, orgId },
            { autoCommit: true }
        );
    } finally {
        await conn.close();
    }
};

export const checkQuota = async (orgId: string, sizeInBytes: number): Promise<boolean> => {
    const conn = await getConnection();
    try {
        const result = await conn.execute(
            `SELECT purchased_gb, used_gb FROM storage_allocations WHERE org_id = :orgId`,
            { orgId }
        );
        const row = result.rows?.[0] as any;
        if (!row) return false;
        
        const sizeInGb = sizeInBytes / (1024 * 1024 * 1024);
        return (row.PURCHASED_GB - row.USED_GB) >= sizeInGb;
    } finally {
        await conn.close();
    }
};

export const updateUsage = async (orgId: string, sizeInBytes: number) => {
    const conn = await getConnection();
    try {
        const sizeInGb = sizeInBytes / (1024 * 1024 * 1024);
        await conn.execute(
            `UPDATE storage_allocations SET used_gb = used_gb + :sizeInGb WHERE org_id = :orgId`,
            { sizeInGb, orgId },
            { autoCommit: true }
        );

        const result = await conn.execute(
            `SELECT purchased_gb, used_gb FROM storage_allocations WHERE org_id = :orgId`,
            { orgId }
        );
        const row = result.rows?.[0] as any;
        if (row) {
            const purchased = row.PURCHASED_GB;
            const used = row.USED_GB;
            const percentage = (used / purchased) * 100;
            if (percentage >= 80) {
                const admins = await getOrganizationAdmins(orgId);
                for (const admin of admins) {
                    await sendEmail(admin, 'QUOTA_WARNING', { percentage: percentage.toFixed(2), usedGB: used.toFixed(2), allocatedGB: purchased.toFixed(2) });
                }
            }
        }
    } finally {
        await conn.close();
    }
};
