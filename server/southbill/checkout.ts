import { isRecord, requireCondition, SouthbillError } from './invariants.ts';

const API = 'https://api.southbill.com/v1/checkout/sessions';

export type CheckoutInput = Readonly<{
  name: string;
  email: string;
  amount: number;
  requestId: string;
  website?: string;
}>;

export type ValidatedCheckout = Readonly<{
  customerName: string;
  customerEmail: string;
  amountCents: number;
  requestId: string;
}>;

export function validateCheckoutInput(value: unknown): ValidatedCheckout {
  requireCondition(isRecord(value), 'INVALID_CHECKOUT_INPUT');
  const input = value as Record<string, unknown>;
  requireCondition(input.website === undefined || input.website === '', 'INVALID_CHECKOUT_INPUT');
  const rawName = input.name;
  requireCondition(typeof rawName === 'string', 'CUSTOMER_NAME_REQUIRED');
  const customerName = (rawName as string).trim().replace(/\s+/g, ' ');
  requireCondition(customerName.length >= 2 && customerName.length <= 120, 'CUSTOMER_NAME_REQUIRED');
  const rawEmail = input.email;
  requireCondition(typeof rawEmail === 'string', 'CUSTOMER_EMAIL_REQUIRED');
  const customerEmail = (rawEmail as string).trim().toLowerCase();
  requireCondition(customerEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail), 'CUSTOMER_EMAIL_REQUIRED');
  requireCondition(Number.isSafeInteger(input.amount) && Number(input.amount) >= 6 && Number(input.amount) <= 200, 'WHOLE_USD_AMOUNT_REQUIRED');
  const rawRequestId = input.requestId;
  requireCondition(typeof rawRequestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawRequestId), 'INVALID_REQUEST_ID');
  return { customerName, customerEmail, amountCents: Number(input.amount) * 100, requestId: rawRequestId as string };
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const expected = new URL(request.url).origin;
  requireCondition(origin === expected, 'ORIGIN_MISMATCH');
  const fetchSite = request.headers.get('sec-fetch-site');
  requireCondition(!fetchSite || fetchSite === 'same-origin', 'ORIGIN_MISMATCH');
  requireCondition((request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json'), 'JSON_REQUIRED');
  const contentLength = request.headers.get('content-length');
  requireCondition(!contentLength || (Number.isSafeInteger(Number(contentLength)) && Number(contentLength) <= 2048), 'REQUEST_TOO_LARGE');
}

export class SouthbillCheckoutClient {
  private readonly key: string;
  private readonly fetcher: typeof fetch;

  constructor(key: string, fetcher: typeof fetch = fetch) {
    requireCondition(/^sk_live_[a-zA-Z0-9_-]+$/.test(key), 'MERCHANT_LIVE_KEY_REQUIRED');
    this.key = key;
    this.fetcher = fetcher;
  }

  async create(input: ValidatedCheckout): Promise<string> {
    const amount = input.amountCents;
    const reference = 'paw_' + input.requestId.replaceAll('-', '');
    let response: Response;
    try {
      response = await this.fetcher(API, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + this.key,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Idempotency-Key': 'pulseaw_checkout_' + input.requestId,
        },
        body: JSON.stringify({
          amount,
          currency: 'usd',
          customer_name: input.customerName,
          customer_email: input.customerEmail,
          reference,
          description: 'PulseAW agreed marketing services',
          line_items: [{ name: 'PulseAW agreed marketing services', quantity: 1, amount }],
          success_url: 'https://www.pulseaw.com/pay/success',
          cancel_url: 'https://www.pulseaw.com/pay',
          metadata: { source: 'pulseaw_streamlined_checkout', whole_dollar: 'true' },
        }),
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      throw new SouthbillError('PROVIDER_NETWORK_ERROR');
    }
    if (!response.ok) throw new SouthbillError('PROVIDER_HTTP_' + response.status);
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new SouthbillError('PROVIDER_INVALID_JSON');
    }
    requireCondition(isRecord(body), 'PROVIDER_INVALID_OBJECT');
    const session = body as Record<string, unknown>;
    requireCondition(typeof session.id === 'string' && /^cs_[a-zA-Z0-9_-]+$/.test(session.id), 'PROVIDER_SESSION_UNVERIFIED');
    requireCondition(session.object === 'checkout.session' && session.livemode === true && session.status === 'open', 'PROVIDER_SESSION_UNVERIFIED');
    requireCondition(session.amount === amount && typeof session.currency === 'string' && session.currency.toLowerCase() === 'usd', 'PROVIDER_SESSION_UNVERIFIED');
    requireCondition(typeof session.checkout_url === 'string', 'PROVIDER_CHECKOUT_URL_UNVERIFIED');
    let checkoutUrl: URL;
    try {
      checkoutUrl = new URL(session.checkout_url as string);
    } catch {
      throw new SouthbillError('PROVIDER_CHECKOUT_URL_UNVERIFIED');
    }
    requireCondition(checkoutUrl.protocol === 'https:' && checkoutUrl.hostname === 'payments.southbill.com' && checkoutUrl.pathname.startsWith('/c/') && checkoutUrl.searchParams.has('cs'), 'PROVIDER_CHECKOUT_URL_UNVERIFIED');
    return checkoutUrl.toString();
  }
}