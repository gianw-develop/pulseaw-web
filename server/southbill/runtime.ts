import { timingSafeEqual, createHash } from 'node:crypto';
import { requireCondition } from './domain.ts';
import { pulseawAccount } from './account.ts';
import { connectDatabase } from './database.ts';
import { Ledger } from './ledger.ts';
import { SouthbillClient } from './client.ts';
let cached: ReturnType<typeof build> | undefined;
function build() {
  const account = pulseawAccount(process.env);
  const secrets = [process.env.SOUTHBILL_WEBHOOK_SECRET, process.env.SOUTHBILL_WEBHOOK_SECRET_PREVIOUS].filter((x): x is string => !!x);
  requireCondition(secrets.length > 0 && secrets.every(x => /^whsec_[a-zA-Z0-9_-]{8,}$/.test(x)), 'SIGNING_SECRET_REQUIRED');
  const url = process.env.SOUTHBILL_DATABASE_URL ?? '';
  requireCondition(!!url, 'DATABASE_CONFIGURATION_REQUIRED');
  const client = new SouthbillClient(process.env.SOUTHBILL_API_KEY ?? '');
  const database = connectDatabase(url);
  return { ledger: new Ledger(database, account), client, secrets };
}
export function runtime() {
  if (process.env.SOUTHBILL_ENABLED !== 'true') return null;
  cached ??= build();
  return cached;
}
export function workerAuthorized(header: string | null): boolean {
  const expected = process.env.SOUTHBILL_WORKER_TOKEN ?? '';
  if (expected.length < 32 || !header?.startsWith('Bearer ') || header.length > 1024) return false;
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(header.slice(7)), hash(expected));
}
