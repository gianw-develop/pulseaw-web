import { createHash } from 'node:crypto';
import { engagements } from '../../app/engagements.ts';

// accountKey is our ledger namespace; merchantId is an optional, verified provider ID.
export type Account = Readonly<{ accountKey: string; livemode: boolean; merchantId?: string }>;
export type Service = Readonly<{
  serviceId: string; name: string; description: string; currency: 'usd';
  unitAmountCents: number; productId: string; priceId: string;
}>;
export type Line = Service & { quantity: 1 };
// IDs verified in PulseAW's SouthBill account; never copied from the legacy Stripe integration.
const providerIds: Record<string, readonly [string, string]> = {
  market: ['prod_VGWpFkk2NBBYGB', 'price_1UFzlgKZ1AwW6yFknrSfCNEq'],
  conversion: ['prod_VGWphvMvzOjNNH', 'price_1UFzljKZ1AwW6yFk385U1DU8'],
  automation: ['prod_VGWpJArhcQgNHq', 'price_1UFzlmKZ1AwW6yFkYw98hrKi'],
  acquisition: ['prod_VGWp7bSDHYp9co', 'price_1UFzloKZ1AwW6yFkldSXMFtG'],
  launch: ['prod_VGWpER8X3SxYbI', 'price_1UFzlqKZ1AwW6yFkZbeJ2alF'],
  founder: ['prod_VGWpKXP9avVKGf', 'price_1UFzltKZ1AwW6yFkTEYvA9Cu'],
};
export const catalog: readonly Service[] = Object.freeze(engagements.map(item => Object.freeze({
  serviceId: item.id, name: item.name, description: item.detail, currency: 'usd' as const,
  unitAmountCents: item.price * 100, productId: providerIds[item.id][0], priceId: providerIds[item.id][1],
})));
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([key,item]) => [key,canonical(item)]));
  return value;
}
export const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const catalogVersion = 'pulseaw-six-' + digest(catalog).slice(0,16);
export class SouthbillError extends Error {
  code: string;
  constructor(code: string) { super(code); this.name = 'SouthbillError'; this.code = code; }
}
export const requireCondition = (condition: unknown, code: string): void => {
  if (!condition) throw new SouthbillError(code);
};
export const isId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function assertAccount(account: Account): void {
  requireCondition(isId(account.accountKey) && typeof account.livemode === 'boolean' &&
    (account.merchantId === undefined || isId(account.merchantId)), 'ACCOUNT_CONFIGURATION_REQUIRED');
}
export function verifyProviderMerchant(value: unknown, account: Account, mismatchCode: string): void {
  // Documented sample merchant envelopes omit this field. Never confuse an explicit ID
  // with our local namespace or accept it without a verified provider binding.
  if (value === undefined) return;
  requireCondition(isId(value), mismatchCode);
  requireCondition(account.merchantId !== undefined, 'PROVIDER_MERCHANT_ID_UNVERIFIED');
  requireCondition(value === account.merchantId, mismatchCode);
}
export function eligibleCatalog(ids: readonly string[]): readonly Service[] {
  requireCondition(Array.isArray(ids) && ids.length > 0 && ids.length <= catalog.length, 'APPROVED_SCOPE_REQUIRED');
  requireCondition(new Set(ids).size === ids.length, 'DUPLICATE_SCOPE_SERVICE');
  requireCondition(ids.every(id => catalog.some(item => item.serviceId === id)), 'UNKNOWN_SERVICE');
  return catalog.filter(item => ids.includes(item.serviceId));
}
/** Exact subsets of genuine, approved services only. No padding or repeated projects. */
export function allocate(amountCents: number, approvedServiceIds: readonly string[]): Line[] | null {
  requireCondition(Number.isSafeInteger(amountCents) && amountCents > 0 && amountCents % 100 === 0, 'WHOLE_USD_AMOUNT_REQUIRED');
  const services = eligibleCatalog(approvedServiceIds);
  const matches: Line[][] = [];
  for (let mask = 1; mask < 2 ** services.length; mask++) {
    const selected = services.filter((_, index) => mask & (1 << index));
    if (selected.reduce((sum, item) => sum + item.unitAmountCents, 0) === amountCents)
      matches.push(selected.map(item => ({ ...item, quantity: 1 })));
  }
  matches.sort((a, b) => a.length - b.length ||
    a.map(x => x.serviceId).join('|').localeCompare(b.map(x => x.serviceId).join('|')));
  return matches[0] ?? null;
}
export function supportedAmounts(approvedServiceIds: readonly string[]): number[] {
  const services = eligibleCatalog(approvedServiceIds);
  const amounts = new Set<number>();
  for (let mask = 1; mask < 2 ** services.length; mask++)
    amounts.add(services.filter((_, i) => mask & (1 << i)).reduce((sum, item) => sum + item.unitAmountCents, 0));
  return [...amounts].sort((a, b) => a - b);
}
export type Agreement = Account & {
  reference: string; expectedPaymentId: string; approvedServiceIds: string[];
  catalogVersion: string; amountCents: number; currency: 'usd';
  customerName: string; customerEmail: string;
  scopeReference: string; consentReference: string; verifiedBy: string;
  /** Operator evidence that no existing invoice already accounts for this captured payment. */
  invoiceReviewReference?: string;
  taxReviewed: true; taxRateBps: 0; termsAccepted: true; workApproved: true;
};
export function validateAgreement(agreement: Agreement): void {
  assertAccount(agreement);
  requireCondition(isId(agreement.reference) && isId(agreement.expectedPaymentId), 'PAYMENT_BINDING_REQUIRED');
  requireCondition(agreement.catalogVersion === catalogVersion, 'CATALOG_VERSION_MISMATCH');
  requireCondition(agreement.currency === 'usd', 'USD_REQUIRED');
  for (const value of [agreement.scopeReference, agreement.consentReference, agreement.verifiedBy])
    requireCondition(typeof value === 'string' && value.trim().length >= 3 && value.length <= 500, 'VERIFIED_EVIDENCE_REQUIRED');
  requireCondition(agreement.termsAccepted === true && agreement.workApproved === true, 'CONSENT_REQUIRED');
  requireCondition(agreement.taxReviewed === true && agreement.taxRateBps === 0, 'TAX_REVIEW_REQUIRED');
  requireCondition(typeof agreement.customerName === 'string' && agreement.customerName.trim().length >= 2 && agreement.customerName.length <= 120, 'CUSTOMER_NAME_REQUIRED');
  requireCondition(typeof agreement.customerEmail === 'string' && agreement.customerEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agreement.customerEmail), 'CUSTOMER_EMAIL_REQUIRED');
  requireCondition(allocate(agreement.amountCents, agreement.approvedServiceIds), 'AMOUNT_NOT_SUPPORTED_BY_SCOPE');
}
export type Payment = {
  id: string; livemode: boolean; status: string; amount: number; currency: string;
  customer_name: string; customer_email: string; reference: string;
  payment_intent?: string; checkout_session?: string; charge?: string; merchant_id?: string;
};
/** Local invoice plan only; never a second payable invoice for an already-paid order. */
export function planInvoice(payment: Payment, agreement: Agreement) {
  validateAgreement(agreement);
  requireCondition(payment.id === agreement.expectedPaymentId && payment.reference === agreement.reference, 'PAYMENT_BINDING_MISMATCH');
  requireCondition(payment.livemode === agreement.livemode, 'PAYMENT_MODE_MISMATCH');
  verifyProviderMerchant(payment.merchant_id, agreement, 'PAYMENT_ACCOUNT_MISMATCH');
  requireCondition(payment.status === 'succeeded', 'PAYMENT_NOT_CAPTURED');
  requireCondition(payment.amount === agreement.amountCents && payment.currency.toLowerCase() === 'usd', 'PAYMENT_TOTAL_MISMATCH');
  requireCondition(payment.customer_email?.trim().toLowerCase() === agreement.customerEmail.trim().toLowerCase(), 'PAYMENT_CUSTOMER_MISMATCH');
  const lines = allocate(payment.amount, agreement.approvedServiceIds)!;
  return {
    catalogVersion, paymentId: payment.id, amountCents: payment.amount, currency: 'usd', lines,
    draftPayload: {
      currency: 'usd', customer_email: agreement.customerEmail, customer_name: agreement.customerName,
      auto_send: false,
      metadata: { order_reference: agreement.reference, original_payment_id: payment.id, catalog_version: catalogVersion },
      line_items: lines.map(item => ({ description: item.name + '\n' + item.description, quantity: 1, unit_amount: item.unitAmountCents, tax_rate: 0 })),
    },
    status: 'awaiting_provider_contract',
    blockers: ['ORIGINAL_PAYMENT_ATTACHMENT_UNVERIFIED', 'SINGLE_INVOICE_POLICY_UNVERIFIED', 'PAID_DOCUMENT_DELIVERY_UNVERIFIED'],
  };
}
export function attachPreviouslyCapturedPayment(): never {
  // Metadata or mark_paid does not associate a real captured payment.
  throw new SouthbillError('ORIGINAL_PAYMENT_ATTACHMENT_UNVERIFIED');
}
