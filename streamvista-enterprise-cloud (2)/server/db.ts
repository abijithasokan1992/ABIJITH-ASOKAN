// import oracledb from 'oracledb';

// Initialize connection pool
export async function initializeDatabase() {
  const oracledb = await import('oracledb');
  try {
    await oracledb.default.createPool({
      user: process.env.ORACLE_DB_USER,
      password: process.env.ORACLE_DB_PASSWORD,
      connectString: process.env.ORACLE_DB_CONNECTION_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    });
    console.log('Oracle Database pool initialized');
  } catch (err) {
    console.error('Error initializing database pool:', err);
  }
}

export async function getConnection() {
  const oracledb = await import('oracledb');
  return await oracledb.default.getConnection();
}
