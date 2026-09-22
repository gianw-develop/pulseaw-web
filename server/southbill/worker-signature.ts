import { createHmac, timingSafeEqual } from 'node:crypto';

/** Short-lived, path-bound credential for Supabase recovery; never queues the master token. */
export function validRecoverySignature(header: string | null, secret: string, now = Date.now() / 1000): boolean {
  if (!header || header.length > 256 || secret.length < 32 || !Number.isFinite(now)) return false;
  const match = /^t=([0-9]+),n=([a-f0-9-]{36}),v1=([a-f0-9]{64})$/.exec(header);
  if (!match || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(match[2])) return false;
  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 60) return false;
  const message = match[1] + '.' + match[2] + '.POST./api/internal/southbill/process';
  const expected = createHmac('sha256', secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(match[3], 'hex'));
}
