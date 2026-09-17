import { after } from 'next/server';
import { runtime as getRuntime } from '../../../../server/southbill/runtime.ts';
import { receiveWebhook } from '../../../../server/southbill/receiver.ts';
import { processNext } from '../../../../server/southbill/worker.ts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const service = getRuntime();
    if (!service) return Response.json({error:'SOUTHBILL_DISABLED'}, {status:503});
    const response = await receiveWebhook(request, service.ledger, service.secrets);
    if (response.ok) after(async () => {
      try { await processNext(service.ledger, service.client); }
      catch { /* Durable queue + authenticated worker retry; no payload/secrets in logs. */ }
    });
    return response;
  } catch {
    return Response.json({error:'SOUTHBILL_NOT_CONFIGURED'}, {status:503});
  }
}
