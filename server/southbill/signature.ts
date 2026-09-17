import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireCondition } from './domain.ts';

/** Verify Southbill-Signature against exact raw bytes, before JSON parsing. */
export function verifySignature(raw: Buffer, header: string | null, secrets: readonly string[], nowSeconds = Date.now() / 1000): void {
  requireCondition(Buffer.isBuffer(raw) && typeof header === 'string' && header.length <= 4096 && Number.isFinite(nowSeconds), 'INVALID_SIGNATURE');
  requireCondition(secrets.length > 0 && secrets.every(secret => typeof secret === 'string' && secret.startsWith('whsec_') && secret.length > 12), 'SIGNING_SECRET_REQUIRED');
  const fields = header!.split(',').map(part => part.trim().split('='));
  requireCondition(fields.every(parts => parts.length === 2), 'INVALID_SIGNATURE');
  const timestamps = fields.filter(([key]) => key === 't');
  const signatures = fields.filter(([key]) => key === 'v1').map(([, value]) => value);
  requireCondition(timestamps.length === 1 && /^\d+$/.test(timestamps[0][1]), 'INVALID_SIGNATURE');
  const timestamp = Number(timestamps[0][1]);
  requireCondition(Number.isSafeInteger(timestamp) && Math.abs(nowSeconds - timestamp) <= 300, 'EXPIRED_SIGNATURE');
  requireCondition(signatures.length > 0 && signatures.every(value => /^[a-fA-F0-9]{64}$/.test(value)), 'INVALID_SIGNATURE');
  let valid = false;
  for (const secret of secrets) {
    const expected = createHmac('sha256', secret).update(timestamps[0][1] + '.').update(raw).digest();
    for (const signature of signatures) valid = timingSafeEqual(expected, Buffer.from(signature, 'hex')) || valid;
  }
  requireCondition(valid, 'INVALID_SIGNATURE');
}
