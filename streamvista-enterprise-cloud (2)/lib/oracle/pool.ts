/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import oracledb, { oracleConfig, validateOracleEnvironment } from './client';

let pool: oracledb.Pool | null = null;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;

/**
 * Sleeps for specified milliseconds
 */
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Starts and initializes the Oracle Autonomous DB Connection Pool.
 * Performs environment checks and self-healing retries upon failures.
 */
export async function initializeOraclePool(): Promise<oracledb.Pool> {
  validateOracleEnvironment();
  
  if (pool) {
    return pool;
  }

  console.log('[ORACLE_POOL_INIT] Registering ATP connection cluster in client workspace...');
  let attempt = 0;
  
  while (attempt < MAX_RETRY_ATTEMPTS) {
    try {
      attempt++;
      pool = await oracledb.createPool({
        user: oracleConfig.user,
        password: oracleConfig.password,
        connectString: oracleConfig.connectString,
        poolMin: oracleConfig.poolMin,
        poolMax: oracleConfig.poolMax,
        poolIncrement: oracleConfig.poolIncrement,
        poolTimeout: oracleConfig.poolTimeout,
        queueRequests: oracleConfig.queueRequests,
        queueTimeout: oracleConfig.queueTimeout
      });
      
      console.log(`[ORACLE_POOL_SUCCESS] Successfully provisioned multi-channel connection pool (Min: ${oracleConfig.poolMin}, Max: ${oracleConfig.poolMax})`);
      return pool;
    } catch (err: any) {
      console.error(`[ORACLE_POOL_ATTEMPT_${attempt}_FAIL] Connection failed. Reason: ${err.message}`);
      if (attempt >= MAX_RETRY_ATTEMPTS) {
        throw new Error(`CRITICAL_POOL_FAILURE: Failed to initialize Oracle Connection Pool after ${MAX_RETRY_ATTEMPTS} attempts.`);
      }
      console.log(`[ORACLE_POOL_RETRY] Waiting ${RETRY_DELAY_MS / 1000} seconds before re-attempting connection...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  
  throw new Error('CRITICAL_POOL_FAILURE: Unknown pool initialization error.');
}

/**
 * Gets a clean, active connection from the pool.
 */
export async function getConnection(): Promise<oracledb.Connection> {
  if (!pool) {
    // Attempt dynamic self-healing initialization if user requests connection prior to pool start
    await initializeOraclePool();
  }
  
  if (!pool) {
    throw new Error('ORACLE_POOL_UNAVAILABLE: Connection pool has not been initialized.');
  }

  try {
    const conn = await pool.getConnection();
    return conn;
  } catch (err: any) {
    console.error('[ORACLE_POOL_GET_CONN_ERR] Pool was unable to yield connection context. Error:', err.message);
    throw err;
  }
}

/**
 * Closes the active database connection pool gracefully during shutdown.
 */
export async function shutdownOraclePool(): Promise<void> {
  if (pool) {
    console.log('[ORACLE_SHUTDOWN] Demolishing ATP connection pool tunnels...');
    try {
      await pool.close(10); // Wait up to 10 seconds for active connections to finish
      pool = null;
      console.log('[ORACLE_SHUTDOWN_SUCCESS] Connection pool disestablished safely.');
    } catch (err: any) {
      console.error('[ORACLE_SHUTDOWN_ERR] Error during connection pool closure:', err.message);
    }
  }
}

/**
 * Runs a transactional sequence in the connection, automatically rolling back on error.
 */
export async function executeInTransaction<T>(
  callback: (connection: oracledb.Connection) => Promise<T>
): Promise<T> {
  const conn = await getConnection();
  try {
    // Disable autocommit for single scope transactions
    const originalAutoCommit = conn.action;
    
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
      console.log('[ORACLE_TX_ROLLBACK] Successfully rolled back transactional scope changes.');
    } catch (rollbackErr: any) {
      console.error('[ORACLE_TX_ROLLBACK_FAIL] Failed to execute query rollback statement:', rollbackErr.message);
    }
    throw err;
  } finally {
    try {
      await conn.close();
    } catch (closeErr) {
      // Ignore close error on rollback/commit exit
    }
  }
}

/**
 * Performs a rigorous diagnostic ping on the ATP cluster.
 */
export async function pingOracleDatabase(): Promise<{
  healthy: boolean;
  timestamp: string;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT 1 FROM DUAL`);
    const latencyMs = Date.now() - startTime;
    return {
      healthy: true,
      timestamp: new Date().toISOString(),
      latencyMs
    };
  } catch (err: any) {
    return {
      healthy: false,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      error: err.message
    };
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        // Silently capture
      }
    }
  }
}
