import mysql from 'mysql2/promise';
import env from './env.js';
import logger from '../utils/logger.js';

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  charset: 'utf8mb4',
  decimalNumbers: true,
  namedPlaceholders: false,
  dateStrings: false,
  timezone: 'Z',
});

pool.on('connection', () => logger.info('MySQL connection acquired'));
pool.on('error', (err) => logger.error('MySQL pool error: %s', err.message));

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

export async function transaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export default pool;
