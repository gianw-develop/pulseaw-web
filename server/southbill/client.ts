import { isId, isRecord, requireCondition, SouthbillError } from './domain.ts';
const API = 'https://api.southbill.com/v1';
/** Merchant API only; no Stripe SDK, redirects, API override or implicit retries. */
export class SouthbillClient {
  private readonly key: string;
  private readonly fetcher: typeof fetch;
  constructor(key: string, fetcher: typeof fetch = fetch) {
    requireCondition(/^sk_live_[a-zA-Z0-9_-]+$/.test(key), 'MERCHANT_LIVE_KEY_REQUIRED');
    this.key = key; this.fetcher = fetcher;
  }
  async get(resource: 'events' | 'payments' | 'invoices' | 'products', id: string): Promise<Record<string, unknown>> {
    requireCondition(['events','payments','invoices','products'].includes(resource) && isId(id), 'INVALID_RESOURCE_ID');
    let response: Response;
    try {
      response = await this.fetcher(API + '/' + resource + '/' + encodeURIComponent(id), {
        headers: { Authorization: 'Bearer ' + this.key, Accept: 'application/json' },
        redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000),
      });
    } catch { throw new SouthbillError('PROVIDER_NETWORK_ERROR'); }
    if (!response.ok) throw new SouthbillError('PROVIDER_HTTP_' + response.status);
    let body: unknown;
    try { body = await response.json(); } catch { throw new SouthbillError('PROVIDER_INVALID_JSON'); }
    requireCondition(isRecord(body), 'PROVIDER_INVALID_OBJECT');
    return body as Record<string, unknown>;
  }
}
