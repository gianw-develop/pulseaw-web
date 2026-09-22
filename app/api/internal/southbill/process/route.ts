import { runtime as getRuntime, workerAuthorized } from '../../../../../server/southbill/runtime.ts';
import { processNext } from '../../../../../server/southbill/worker.ts';
import { processInvoiceNext } from '../../../../../server/southbill/invoice-worker.ts';
import { validRecoverySignature } from '../../../../../server/southbill/worker-signature.ts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!workerAuthorized(request.headers.get('authorization')) &&
      !validRecoverySignature(request.headers.get('pulseaw-worker-signature'), process.env.SOUTHBILL_WORKER_TOKEN ?? ''))
    return Response.json({error:'UNAUTHORIZED'}, {status:401});
  try {
    const service = getRuntime();
    if (!service) return Response.json({error:'SOUTHBILL_DISABLED'}, {status:503});
    // One bounded job per invocation; external scheduling is configured explicitly for PulseAW.
    const processed = await processNext(service.ledger, service.client);
    const invoiceProcessed=!processed && service.invoices ? await processInvoiceNext(service.invoices.store,service.client,service.invoices.client):false;
    return Response.json({processed, invoiceProcessed, queue:await service.ledger.summary()}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({error:'PROCESSING_UNAVAILABLE'}, {status:503});
  }
}
