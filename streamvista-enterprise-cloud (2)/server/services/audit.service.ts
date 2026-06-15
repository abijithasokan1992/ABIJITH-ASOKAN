import { getConnection } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const logEvent = async (userId: string, action: string, targetId: string, ip: string) => {
    const connection = await getConnection();
    try {
        await connection.execute(
            `INSERT INTO audit_logs (id, user_id, action, target_id, ip_address) VALUES (:id, :userId, :action, :targetId, :ip)`,
            { id: uuidv4(), userId, action, targetId, ip },
            { autoCommit: true }
        );
    } finally {
        await connection.close();
    }
};
