import { SouthbillError } from '@/server/southbill/invariants.ts';
import { requireSameOrigin, SouthbillCheckoutClient, validateCheckoutInput } from '@/server/southbill/checkout.ts';

export const runtime = 'nodejs';

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (process.env.SOUTHBILL_ENABLED !== 'true') return json({ error: 'CHECKOUT_UNAVAILABLE' }, 503);
    const text = await request.text();
    if (text.length > 2048) return json({ error: 'REQUEST_TOO_LARGE' }, 413);
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      return json({ error: 'INVALID_JSON' }, 400);
    }
    const input = validateCheckoutInput(value);
    const client = new SouthbillCheckoutClient(process.env.SOUTHBILL_API_KEY ?? '');
    const checkoutUrl = await client.create(input);
    return json({ checkoutUrl }, 201);
  } catch (error) {
    const code = error instanceof SouthbillError ? error.code : 'CHECKOUT_ERROR';
    if (['INVALID_CHECKOUT_INPUT', 'CUSTOMER_NAME_REQUIRED', 'CUSTOMER_EMAIL_REQUIRED', 'WHOLE_USD_AMOUNT_REQUIRED', 'INVALID_REQUEST_ID', 'JSON_REQUIRED'].includes(code))
      return json({ error: code }, 400);
    if (code === 'REQUEST_TOO_LARGE') return json({ error: code }, 413);
    if (code === 'ORIGIN_MISMATCH') return json({ error: code }, 403);
    return json({ error: 'CHECKOUT_UNAVAILABLE' }, 502);
  }
}