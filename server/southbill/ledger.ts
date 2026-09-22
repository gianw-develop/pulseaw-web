import { randomUUID } from 'node:crypto';
import { assertAccount, digest, requireCondition, validateAgreement } from './domain.ts';
import type { Account, Agreement, Payment, planInvoice } from './domain.ts';
export interface Query {
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
export interface Database extends Query {
  transaction<T>(work: (db: Query) => Promise<T>): Promise<T>;
}
export type Event = {
  id: string; object: 'event'; type: string; created: number; livemode: boolean;
  merchant_id?: string; data: { object: Record<string, unknown> };
};
export type Job = { id: string; token: string; attempts: number; event: Event };
export type Outcome = 'ignored' | 'review' | 'blocked' | 'observed';
export type InvoicePlan = ReturnType<typeof planInvoice>;
export class Ledger {
  readonly db: Database;
  readonly account: Account;
  constructor(db: Database, account: Account) { assertAccount(account); this.db = db; this.account = account; }
  // Keep the installed SQL column name; its value is the internal account namespace.
  private params() { return [this.account.accountKey, this.account.livemode]; }
  async enqueue(event: Event): Promise<'accepted' | 'duplicate'> {
    const hash = digest(event);
    const safeObject = Object.fromEntries(['id','object','payment_intent','checkout_session','charge'].filter(key => typeof event.data.object[key] === 'string').map(key => [key,event.data.object[key]]));
    const storedEvent = {id:event.id,object:event.object,type:event.type,created:event.created,livemode:event.livemode, ...(event.merchant_id ? {merchant_id:event.merchant_id} : {}),data:{object:safeObject}};
    return this.db.transaction(async db => {
      const inserted = await db.query(
        'INSERT INTO pulseaw_southbill.events (merchant_id,livemode,event_id,event_type,resource_id,payload,payload_hash) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING event_id',
        [...this.params(), event.id, event.type, event.data.object.id ?? null, JSON.stringify(storedEvent), hash]);
      if (inserted.rows.length) return 'accepted';
      const existing = await db.query('SELECT payload_hash FROM pulseaw_southbill.events WHERE merchant_id=$1 AND livemode=$2 AND event_id=$3', [...this.params(), event.id]);
      requireCondition(existing.rows[0]?.payload_hash === hash, 'EVENT_ID_COLLISION');
      return 'duplicate';
    });
  }
  async claim(): Promise<Job | null> {
    await this.db.query("UPDATE pulseaw_southbill.events SET status='review',outcome_code='RETRY_LIMIT_REACHED',lease_token=NULL,lease_until=NULL WHERE merchant_id=$1 AND livemode=$2 AND status='processing' AND attempts>=8 AND lease_until<now()", this.params());
    const token = randomUUID();
    const result = await this.db.query(
      `WITH next AS (
        SELECT event_id FROM pulseaw_southbill.events
        WHERE merchant_id=$1 AND livemode=$2 AND attempts < 8 AND
          ((status IN ('queued','retry') AND next_attempt_at<=now()) OR (status='processing' AND lease_until<now()))
        ORDER BY received_at FOR UPDATE SKIP LOCKED LIMIT 1
      ) UPDATE pulseaw_southbill.events e SET status='processing',lease_token=$3,
          lease_until=now()+interval '120 seconds',attempts=attempts+1,updated_at=now()
        FROM next WHERE e.merchant_id=$1 AND e.livemode=$2 AND e.event_id=next.event_id
        RETURNING e.event_id,e.payload,e.attempts`, [...this.params(), token]);
    const row = result.rows[0];
    return row ? { id: String(row.event_id), token, attempts: Number(row.attempts), event: row.payload as Event } : null;
  }
  async registerAgreement(agreement: Agreement): Promise<void> {
    validateAgreement(agreement);
    requireCondition(agreement.accountKey === this.account.accountKey &&
      agreement.merchantId === this.account.merchantId && agreement.livemode === this.account.livemode, 'AGREEMENT_ACCOUNT_MISMATCH');
    await this.db.transaction(async db => {
      await db.query('INSERT INTO pulseaw_southbill.agreements (merchant_id,livemode,reference,payment_id,document,document_hash) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
        [...this.params(), agreement.reference, agreement.expectedPaymentId, JSON.stringify(agreement), digest(agreement)]);
      const stored = await db.query('SELECT document_hash FROM pulseaw_southbill.agreements WHERE merchant_id=$1 AND livemode=$2 AND reference=$3', [...this.params(), agreement.reference]);
      requireCondition(stored.rows[0]?.document_hash === digest(agreement), 'AGREEMENT_IMMUTABLE_OR_PAYMENT_ALREADY_BOUND');
    });
  }
  async agreement(paymentId: string): Promise<Agreement | null> {
    const result = await this.db.query('SELECT document FROM pulseaw_southbill.agreements WHERE merchant_id=$1 AND livemode=$2 AND payment_id=$3', [...this.params(), paymentId]);
    return (result.rows[0]?.document as Agreement) ?? null;
  }
  async finish(job: Job, status: Outcome, code: string, payment?: Payment, plan?: InvoicePlan): Promise<void> {
    await this.db.transaction(async db => {
      const active = await db.query('SELECT event_id FROM pulseaw_southbill.events WHERE merchant_id=$1 AND livemode=$2 AND event_id=$3 AND lease_token=$4 AND status=\'processing\' AND lease_until>now() FOR UPDATE', [...this.params(), job.id, job.token]);
      requireCondition(active.rows.length === 1, 'LEASE_LOST');
      if (payment) {
        const needsReview = code === 'REFUND_OR_DISPUTE_RECONCILIATION_REQUIRED' || ['refunded','partially_refunded','disputed'].includes(payment.status);
        const records = await db.query(
          `INSERT INTO pulseaw_southbill.payment_records (merchant_id,livemode,payment_id,amount_cents,currency,provider_status,manual_review,snapshot)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (merchant_id,livemode,payment_id) DO UPDATE SET
              provider_status=EXCLUDED.provider_status,manual_review=pulseaw_southbill.payment_records.manual_review OR EXCLUDED.manual_review,
              snapshot=EXCLUDED.snapshot,updated_at=now()
            WHERE pulseaw_southbill.payment_records.amount_cents=EXCLUDED.amount_cents AND pulseaw_southbill.payment_records.currency=EXCLUDED.currency
            RETURNING manual_review`,
          [...this.params(), payment.id, payment.amount, payment.currency.toLowerCase(), payment.status, needsReview, JSON.stringify(payment)]);
        requireCondition(records.rows.length === 1, 'PAYMENT_IMMUTABLE_TOTAL_MISMATCH');
        if (records.rows[0].manual_review) {
          await db.query('UPDATE pulseaw_southbill.invoice_plans SET status=\'review\' WHERE merchant_id=$1 AND livemode=$2 AND payment_id=$3', [...this.params(), payment.id]);
          status = 'review';
          code = needsReview ? code : 'PAYMENT_ALREADY_FLAGGED_FOR_REVIEW';
        } else if (plan) {
          await db.query('INSERT INTO pulseaw_southbill.invoice_plans (merchant_id,livemode,payment_id,plan,plan_hash,status) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
            [...this.params(), payment.id, JSON.stringify(plan), digest(plan), plan.status]);
          const stored = await db.query('SELECT plan_hash FROM pulseaw_southbill.invoice_plans WHERE merchant_id=$1 AND livemode=$2 AND payment_id=$3', [...this.params(), payment.id]);
          requireCondition(stored.rows[0]?.plan_hash === digest(plan), 'INVOICE_PLAN_IMMUTABLE');
        }
      }
      await db.query('UPDATE pulseaw_southbill.events SET status=$5,outcome_code=$6,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE merchant_id=$1 AND livemode=$2 AND event_id=$3 AND lease_token=$4',
        [...this.params(), job.id, job.token, status, code]);
    });
  }
  async retry(job: Job, code: string): Promise<void> {
    const delay = Math.min(3600, 30 * 2 ** job.attempts);
    await this.db.query(`UPDATE pulseaw_southbill.events SET status=$5,outcome_code=$6,
      next_attempt_at=now()+($7::integer * interval '1 second'),lease_token=NULL,lease_until=NULL,updated_at=now()
      WHERE merchant_id=$1 AND livemode=$2 AND event_id=$3 AND lease_token=$4 AND status='processing'`,
      [...this.params(), job.id, job.token, job.attempts >= 8 ? 'review' : 'retry', code, delay]);
  }
  async requeue(eventId: string): Promise<void> {
    // Explicit operator retry only; catalog allocation and existing plans remain immutable.
    await this.db.query(`UPDATE pulseaw_southbill.events SET status='queued',attempts=0,next_attempt_at=now(),outcome_code=NULL
      WHERE merchant_id=$1 AND livemode=$2 AND event_id=$3 AND status IN ('review','blocked','retry')`, [...this.params(), eventId]);
  }
  async summary(): Promise<Record<string, unknown>[]> {
    return (await this.db.query('SELECT status,count(*)::integer AS count FROM pulseaw_southbill.events WHERE merchant_id=$1 AND livemode=$2 GROUP BY status ORDER BY status', this.params())).rows;
  }
}
