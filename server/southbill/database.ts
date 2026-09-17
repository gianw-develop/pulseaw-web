import pg from 'pg';
import type { Database, Query } from './ledger.ts';
import { requireCondition } from './domain.ts';
const { Pool } = pg;
/** Explicit TLS configuration prevents connection-string options from weakening verification. */
export function databaseOptions(url: string, ca = process.env.SOUTHBILL_DATABASE_CA): pg.PoolConfig {
  const parsed = new URL(url);
  requireCondition(['postgres:','postgresql:'].includes(parsed.protocol), 'POSTGRES_URL_REQUIRED');
  const mode = parsed.searchParams.get('sslmode');
  requireCondition(mode === null || mode === 'verify-full', 'DATABASE_TLS_VERIFICATION_REQUIRED');
  for (const key of parsed.searchParams.keys())
    requireCondition(key === 'sslmode' || (!key.toLowerCase().startsWith('ssl') && key.toLowerCase() !== 'uselibpqcompat'), 'DATABASE_TLS_OPTIONS_CONFLICT');
  parsed.searchParams.delete('sslmode');
  return {
    connectionString: parsed.toString(), max: 1, connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 10000, statement_timeout: 15000,
    ssl: { rejectUnauthorized: true, ...(ca ? { ca: ca.replaceAll('\\n','\n') } : {}) },
  };
}
export function connectDatabase(url: string): Database & { close(): Promise<void> } {
  const pool = new Pool(databaseOptions(url));
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
