/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

// Ensure oracledb uses object arrays for query results
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

export const oracleConfig = {
  user: process.env.ORACLE_DB_USER || '',
  password: process.env.ORACLE_DB_PASSWORD || '',
  connectString: process.env.ORACLE_DB_CONNECTION_STRING || '',
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1,
  poolTimeout: 60,
  queueRequests: true,
  queueTimeout: 3000
};

/**
 * Validates database environment variables are set and conform to standards.
 */
export function validateOracleEnvironment() {
  const missing = [];
  if (!process.env.ORACLE_DB_USER) missing.push('ORACLE_DB_USER');
  if (!process.env.ORACLE_DB_PASSWORD) missing.push('ORACLE_DB_PASSWORD');
  if (!process.env.ORACLE_DB_CONNECTION_STRING) missing.push('ORACLE_DB_CONNECTION_STRING');

  if (missing.length > 0) {
    throw new Error(
      `CRITICAL_STARTUP_FAILURE: Missing Oracle Database Environment Variables: [${missing.join(', ')}]. Please configure these fields in your service parameters.`
    );
  }
}

/**
 * Validates connection capability of autonomous nodes.
 */
export async function verifyOracleConnection(): Promise<boolean> {
  let conn;
  try {
    // node-oracledb runs in pure-JS Thin mode by default (perfect for Docker)
    conn = await oracledb.getConnection({
      user: oracleConfig.user,
      password: oracleConfig.password,
      connectString: oracleConfig.connectString
    });
    
    // Simple verification query suitable for Oracle DB (SELECT 1 FROM DUAL)
    const result = await conn.execute(`SELECT SYSTIMESTAMP AS current_time FROM DUAL`);
    console.log(`[ORACLE] Node linked successfully. Remote ATP clock timestamp:`, (result.rows as any)[0].CURRENT_TIME);
    return true;
  } catch (err: any) {
    console.error(`[ORACLE_CONN_FAIL] Could not authenticate with connection string: ${oracleConfig.connectString}. Error:`, err.message);
    return false;
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (closeErr) {
        // Silently capture close trace
      }
    }
  }
}

export default oracledb;
