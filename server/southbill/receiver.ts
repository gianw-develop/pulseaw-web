import { verifySignature } from './signature.ts';
import { SouthbillError } from './domain.ts';
import { validateEvent } from './worker.ts';
import type { Ledger } from './ledger.ts';
const MAX_BYTES = 256 * 1024;
async function readBody(request: Request): Promise<Buffer> {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BYTES) throw new SouthbillError('BODY_TOO_LARGE');
  if (!request.body) throw new SouthbillError('INVALID_EVENT');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new SouthbillError('BODY_TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function receiveWebhook(request: Request, ledger: Ledger, secrets: readonly string[]): Promise<Response> {
  const headers = { 'Cache-Control':'no-store' };
  try {
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      return Response.json({error:'JSON_REQUIRED'}, {status:415, headers});
    const raw = await readBody(request);
    verifySignature(raw, request.headers.get('southbill-signature'), secrets);
    let body: unknown;
    try { body = JSON.parse(raw.toString('utf8')); } catch { throw new SouthbillError('INVALID_EVENT'); }
    const event = validateEvent(body, ledger);
    const result = await ledger.enqueue(event);
    // Acknowledge only after durable commit. A database failure must trigger a provider retry.
    return Response.json({received:true, duplicate:result === 'duplicate'}, {status:200, headers});
  } catch (error) {
    const code = error instanceof SouthbillError ? error.code : 'PERSISTENCE_UNAVAILABLE';
    const status = code === 'BODY_TOO_LARGE' ? 413 : code === 'PERSISTENCE_UNAVAILABLE' ? 503 : code === 'EVENT_ID_COLLISION' ? 409 : 400;
    return Response.json({error:code}, {status, headers});
  }
}
