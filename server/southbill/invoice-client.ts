import { isId, isRecord, requireCondition, SouthbillError } from './domain.ts';
const API = 'https://api.southbill.com/v1';
/** Restricted to invoice bookkeeping; deliberately no send or charge method. */
export class InvoiceClient {
  private readonly key: string;
  private readonly fetcher: typeof fetch;
  constructor(key: string, fetcher: typeof fetch = fetch) {
    requireCondition(/^sk_live_[a-zA-Z0-9_-]+$/.test(key), 'MERCHANT_LIVE_KEY_REQUIRED');
    this.key=key; this.fetcher=fetcher;
  }
  private async request(path: string, body?: unknown, idempotencyKey?: string): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await this.fetcher(API + path, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error', cache: 'no-store',
        headers: { Authorization: 'Bearer ' + this.key, Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey! }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(8000),
      });
    } catch { throw new SouthbillError('INVOICE_NETWORK_ERROR'); }
    if (!response.ok) throw new SouthbillError('INVOICE_HTTP_' + response.status);
    let result: unknown;
    try { result = await response.json(); } catch { throw new SouthbillError('INVOICE_INVALID_JSON'); }
    requireCondition(isRecord(result), 'INVOICE_INVALID_OBJECT');
    return result as Record<string, unknown>;
  }
  async find(sourcePayment: string, reconciliationReference: string, after?: string) {
    requireCondition(isId(sourcePayment) && isId(reconciliationReference) && (!after || isId(after)), 'INVALID_INVOICE_REFERENCE');
    const result = await this.request('/invoices?limit=100' + (after ? '&starting_after=' + encodeURIComponent(after) : ''));
    requireCondition(Array.isArray(result.data) && typeof result.has_more === 'boolean', 'INVOICE_LIST_SHAPE_UNVERIFIED');
    const rows = result.data as Record<string, unknown>[];
    requireCondition(rows.every(row=>isRecord(row) && isId(row.id)), 'INVOICE_LIST_SHAPE_UNVERIFIED');
    requireCondition(!result.has_more || (isId(rows.at(-1)?.id) && rows.at(-1)?.id!==after), 'INVOICE_PAGINATION_INVALID');
    return { matches: rows.filter(row => isRecord(row.metadata) &&
        (row.metadata.source_payment === sourcePayment || row.metadata.reconciliation_ref === reconciliationReference)),
      next: result.has_more ? rows.at(-1)?.id : null };
  }
  get(id: string) {
    requireCondition(isId(id), 'INVALID_INVOICE_ID');
    return this.request('/invoices/' + encodeURIComponent(id));
  }
  create(payload: Record<string, unknown>, key: string) {
    requireCondition(payload.auto_send === false && isId(key), 'UNSENT_IDEMPOTENT_INVOICE_REQUIRED');
    return this.request('/invoices', payload, key);
  }
  markPaid(id: string, key: string) {
    requireCondition(isId(id) && isId(key), 'INVALID_INVOICE_ID');
    return this.request('/invoices/' + encodeURIComponent(id) + '/mark_paid', {}, key);
  }
}
