import { getConnection } from '../db';
import oracledb from 'oracledb';
import { v4 as uuidv4 } from 'uuid';

export const getBillingHistory = async (orgId: string) => {
    const conn = await getConnection();
    try {
        const result = await conn.execute(
            `SELECT * FROM payments WHERE org_id = :orgId ORDER BY created_at DESC`,
            { orgId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return result.rows;
    } finally {
        await conn.close();
    }
};

export const insertPayment = async (orgId: string, baseAmount: number, gstAmount: number, totalAmount: number, status: string) => {
    const conn = await getConnection();
    try {
        await conn.execute(
            `INSERT INTO payments (id, org_id, base_amount, gst_amount, total_amount, status, created_at) VALUES (:id, :orgId, :baseAmount, :gstAmount, :totalAmount, :status, CURRENT_TIMESTAMP)`,
            { id: uuidv4(), orgId, baseAmount, gstAmount, totalAmount, status },
            { autoCommit: true }
        );
    } finally {
        await conn.close();
    }
};

export const calculateBilling = (plan: string) => {
    const baseAmount = plan === 'Premium' ? 1200 : 650;
    const gstRate = 0.18;
    const gstAmount = baseAmount * gstRate;
    const totalAmount = baseAmount + gstAmount;
    return { baseAmount, gstRate, gstAmount, totalAmount };
};
