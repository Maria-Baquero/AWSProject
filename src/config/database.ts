import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';
import { ServiceUnavailableError } from '../errors';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'false' ? false : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle database client:', err.message);
});

/**
 * Executes a parameterized SQL query against the database pool.
 * Throws ServiceUnavailableError (HTTP 503) if the connection times out or fails.
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(text, params);
  } catch (error: any) {
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.message?.includes('timeout') ||
      error.message?.includes('Connection terminated')
    ) {
      throw new ServiceUnavailableError();
    }
    throw error;
  }
}

/**
 * Gets a client from the pool for transaction support.
 * Throws ServiceUnavailableError (HTTP 503) if the connection times out or fails.
 */
export async function getClient(): Promise<PoolClient> {
  try {
    return await pool.connect();
  } catch (error: any) {
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.message?.includes('timeout') ||
      error.message?.includes('Connection terminated')
    ) {
      throw new ServiceUnavailableError();
    }
    throw error;
  }
}

export { pool };
