import { isId, isRecord, planInvoice, requireCondition, verifyProviderMerchant, SouthbillError } from './domain.ts';
import type { Payment } from './domain.ts';
import { Ledger } from './ledger.ts';
import type { Event } from './ledger.ts';
import { SouthbillClient } from './client.ts';

export function validateEvent(value: unknown, ledger: Ledger): Event {
  requireCondition(isRecord(value), 'INVALID_EVENT');
  const event = value as Record<string, unknown>;
  requireCondition(isId(event.id) && event.object === 'event' && typeof event.type === 'string' &&
    /^[a-z_]+(?:\.[a-z_]+)+$/.test(event.type) && Number.isSafeInteger(event.created) &&
    typeof event.livemode === 'boolean' && isRecord(event.data) && isRecord(event.data.object), 'INVALID_EVENT');
  requireCondition(event.livemode === ledger.account.livemode, 'EVENT_MODE_MISMATCH');
  verifyProviderMerchant(event.merchant_id, ledger.account, 'EVENT_ACCOUNT_MISMATCH');
  return event as Event;
}
const supported = new Set([
  'checkout.session.completed', 'checkout.session.refunded', 'checkout.session.async_payment_pending',
  'checkout.session.async_payment_failed', 'checkout.session.canceled', 'checkout.session.expired',
  'checkout.session.dispute.created','checkout.session.dispute.closed',
  'payment_intent.succeeded','payment_intent.payment_failed','payment_intent.canceled',
  'charge.refunded','refund.created','refund.updated','refund.failed',
  'charge.dispute.created','charge.dispute.updated','charge.dispute.closed',
  'charge.dispute.funds_withdrawn','charge.dispute.funds_reinstated',
  'invoice.paid','invoice.payment_succeeded','invoice.voided','invoice.payment_failed',
]);
function paymentLookup(event: Event): string | null {
  const object = event.data.object;
  if (event.type.startsWith('checkout.session.') || event.type.startsWith('payment_intent.'))
    return isId(object.id) ? object.id : null;
  for (const key of ['payment_intent','checkout_session','charge'])
    if (isId(object[key])) return object[key];
  if (event.type === 'charge.refunded' && isId(object.id)) return object.id;
  return null;
}
export function parsePayment(object: Record<string, unknown>, ledger: Ledger): Payment {
  requireCondition(isId(object.id) && object.object === 'payment' && typeof object.status === 'string' &&
    Number.isSafeInteger(object.amount) && Number(object.amount) > 0 && typeof object.currency === 'string' &&
    /^[A-Za-z]{3}$/.test(object.currency), 'PAYMENT_SHAPE_UNVERIFIED');
  requireCondition(object.livemode === ledger.account.livemode, 'PAYMENT_MODE_MISMATCH');
  verifyProviderMerchant(object.merchant_id, ledger.account, 'PAYMENT_ACCOUNT_MISMATCH');
  // Persist only fields required for reconciliation; no client secrets or payment instrument data.
  return {
    id: String(object.id), livemode: Boolean(object.livemode), status: String(object.status),
    amount: Number(object.amount), currency: String(object.currency),
    customer_name: typeof object.customer_name === 'string' ? object.customer_name : '',
    customer_email: typeof object.customer_email === 'string' ? object.customer_email : '',
    reference: typeof object.reference === 'string' ? object.reference : '',
    ...(isId(object.payment_intent) ? {payment_intent:object.payment_intent} : {}),
    ...(isId(object.checkout_session) ? {checkout_session:object.checkout_session} : {}),
    ...(isId(object.charge) ? {charge:object.charge} : {}),
    ...(isId(object.merchant_id) ? {merchant_id:object.merchant_id} : {}),
  };
}
export async function processNext(ledger: Ledger, client: Pick<SouthbillClient,'get'>): Promise<boolean> {
  const job = await ledger.claim();
  if (!job) return false;
  try {
    const event = validateEvent(job.event, ledger);
    if (event.type === 'ping.test' || !supported.has(event.type)) {
      await ledger.finish(job, 'ignored', event.type === 'ping.test' ? 'SIGNED_PING_RECEIVED' : 'UNRELATED_EVENT'); return true;
    }
    // Signed delivery alone is insufficient: retrieve the event with this merchant's own API key.
    const authoritative = validateEvent(await client.get('events', event.id), ledger);
    requireCondition(authoritative.id === event.id && authoritative.type === event.type &&
      authoritative.data.object.id === event.data.object.id, 'EVENT_CANONICAL_MISMATCH');
    const lookup = paymentLookup(authoritative);
    if (!lookup) {
      await ledger.finish(job, 'review', 'PAYMENT_RELATIONSHIP_UNVERIFIED'); return true;
    }
    const payment = parsePayment(await client.get('payments', lookup), ledger);
    requireCondition([payment.id, payment.payment_intent, payment.checkout_session, payment.charge].includes(lookup), 'PAYMENT_LOOKUP_MISMATCH');
    if (authoritative.type.startsWith('invoice.')) {
      await ledger.finish(job, 'review', 'INVOICE_SETTLEMENT_RELATIONSHIP_UNVERIFIED', payment); return true;
    }
    if (authoritative.type.includes('dispute') || authoritative.type.includes('refund') ||
      ['refunded','partially_refunded','disputed'].includes(payment.status)) {
      await ledger.finish(job, 'review', 'REFUND_OR_DISPUTE_RECONCILIATION_REQUIRED', payment); return true;
    }
    if (payment.status !== 'succeeded') {
      await ledger.finish(job, 'observed', 'PAYMENT_NOT_CAPTURED', payment); return true;
    }
    const agreement = await ledger.agreement(payment.id);
    if (!agreement) { await ledger.finish(job, 'review', 'VERIFIED_SCOPE_MISSING', payment); return true; }
    let plan;
    try { plan = planInvoice(payment, agreement); }
    catch (error) {
      if (!(error instanceof SouthbillError)) throw error;
      await ledger.finish(job, 'review', error.code, payment); return true;
    }
    // The observer freezes the plan. The separately enabled invoice worker records the captured payment without sending the draft.
    if(plan.status==='ready_for_prior_payment_recording')
      await ledger.finish(job, 'observed', 'PAYMENT_CAPTURED_INVOICE_QUEUED', payment, plan);
    else
      await ledger.finish(job, 'blocked', 'ORIGINAL_PAYMENT_ATTACHMENT_UNVERIFIED', payment, plan);
  } catch (error) {
    const code = error instanceof SouthbillError ? error.code : 'PROCESSING_ERROR';
    if (code !== 'LEASE_LOST') await ledger.retry(job, code);
  }
  return true;
}
