import pg from 'pg';
import type { Database, Query } from './ledger.ts';
import { requireCondition } from './domain.ts';
const { Pool } = pg;
export function connectDatabase(url: string): Database & { close(): Promise<void> } {
  const parsed = new URL(url);
  requireCondition(['postgres:','postgresql:'].includes(parsed.protocol), 'POSTGRES_URL_REQUIRED');
  const pool = new Pool({
    connectionString: url, max: 3, connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 10000, statement_timeout: 15000,
    // TLS follows the explicit connection URL; never disable certificate validation.
  });
  return {
    async query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
      return pool.query<T>(sql, params);
    },
    async transaction<T>(work: (db: Query) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work({ query: (sql, params = []) => client.query(sql, params) });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    async close() { await pool.end(); },
  };
}
