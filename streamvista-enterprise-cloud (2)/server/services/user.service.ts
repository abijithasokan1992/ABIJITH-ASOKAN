import { getConnection } from '../db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export async function createUser(email: string, passwordHash: string) {
  const connection = await getConnection();
  const id = uuidv4();
  try {
    await connection.execute(
      `INSERT INTO users (id, email, password_hash) VALUES (:id, :email, :password_hash)`,
      { id, email, password_hash: passwordHash },
      { autoCommit: true }
    );
    return id;
  } finally {
    await connection.close();
  }
}

export async function findUserByEmail(email: string) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `SELECT id, email, password_hash FROM users WHERE email = :email`,
      { email }
    );
    if (!result.rows || result.rows.length === 0) return null;
    const row = result.rows[0] as any[];
    return { id: row[0], email: row[1], passwordHash: row[2] };
  } finally {
    await connection.close();
  }
}

export async function updatePassword(email: string, passwordHash: string) {
  const connection = await getConnection();
  try {
    await connection.execute(
      `UPDATE users SET password_hash = :password_hash WHERE email = :email`,
      { password_hash: passwordHash, email },
      { autoCommit: true }
    );
  } finally {
    await connection.close();
  }
}

export async function getOrganizationAdmins(orgId: string): Promise<string[]> {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT u.email FROM users u 
       JOIN organization_members om ON u.id = om.user_id 
       WHERE om.org_id = :orgId AND om.role = 'ADMIN'`,
      { orgId },
      { outFormat: 4002 /* oracledb.OUT_FORMAT_OBJECT */ }
    );
    return (result.rows as any[]).map(row => row.EMAIL);
  } finally {
    await conn.close();
  }
}

export async function verifyEmail(email: string) {
  const connection = await getConnection();
  try {
    await connection.execute(
      `UPDATE users SET verified = 1 WHERE email = :email`,
      { email },
      { autoCommit: true }
    );
  } finally {
    await connection.close();
  }
}
