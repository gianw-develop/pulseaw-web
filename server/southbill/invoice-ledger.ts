import { randomUUID } from 'node:crypto';
import { digest, requireCondition } from './domain.ts';
import { Ledger } from './ledger.ts';
import type { InvoicePlan } from './ledger.ts';
export type InvoiceJob = { paymentId: string; token: string; attempts: number; key: string;
 invoiceId: string | null; cursor: string | null; createStartedAt: Date | null; plan: InvoicePlan; planHash: string };
export class InvoiceLedger {
 readonly ledger: Ledger;
 constructor(ledger: Ledger) {this.ledger=ledger;}
 private account() { return [this.ledger.account.accountKey, this.ledger.account.livemode]; }
 async enqueue() {
   await this.ledger.db.query("UPDATE pulseaw_southbill.invoice_jobs j SET status='review',outcome_code='ORIGINAL_PAYMENT_REVERSED_REVIEW_REQUIRED',updated_at=now() FROM pulseaw_southbill.payment_records r WHERE j.merchant_id=$1 AND j.livemode=$2 AND j.status='paid' AND r.merchant_id=j.merchant_id AND r.livemode=j.livemode AND r.payment_id=j.payment_id AND r.manual_review=true",this.account());
   const plans = await this.ledger.db.query(
     "SELECT p.payment_id,p.plan_hash FROM pulseaw_southbill.invoice_plans p JOIN pulseaw_southbill.payment_records r USING(merchant_id,livemode,payment_id) WHERE p.merchant_id=$1 AND p.livemode=$2 AND p.status='awaiting_provider_contract' AND r.manual_review=false AND r.provider_status='succeeded' AND NOT EXISTS(SELECT 1 FROM pulseaw_southbill.invoice_jobs j WHERE j.merchant_id=p.merchant_id AND j.livemode=p.livemode AND j.payment_id=p.payment_id) LIMIT 50", this.account());
   for (const row of plans.rows) await this.ledger.db.query(
     'INSERT INTO pulseaw_southbill.invoice_jobs(merchant_id,livemode,payment_id,plan_hash,reconciliation_key) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
     [...this.account(),row.payment_id,row.plan_hash,'paw_inv_'+digest([...this.account(),row.payment_id]).slice(0,40)]);
 }
 async claim(): Promise<InvoiceJob | null> {
   await this.ledger.db.query("UPDATE pulseaw_southbill.invoice_jobs SET status='review',outcome_code='INVOICE_RETRY_LIMIT',lease_token=NULL,lease_until=NULL WHERE merchant_id=$1 AND livemode=$2 AND status='processing' AND attempts>=8 AND lease_until<now()",this.account());
   const token=randomUUID();
   const result=await this.ledger.db.query(
     `WITH next AS (SELECT payment_id FROM pulseaw_southbill.invoice_jobs WHERE merchant_id=$1 AND livemode=$2 AND attempts<8 AND ((status IN ('queued','retry') AND next_attempt_at<=now()) OR (status='processing' AND lease_until<now())) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
      UPDATE pulseaw_southbill.invoice_jobs j SET status='processing',lease_token=$3,lease_until=now()+interval '120 seconds',attempts=attempts+1,updated_at=now() FROM next WHERE j.merchant_id=$1 AND j.livemode=$2 AND j.payment_id=next.payment_id RETURNING j.*`,[...this.account(),token]);
   const row=result.rows[0];if(!row)return null;
   const plan=(await this.ledger.db.query('SELECT plan,plan_hash FROM pulseaw_southbill.invoice_plans WHERE merchant_id=$1 AND livemode=$2 AND payment_id=$3',[...this.account(),row.payment_id])).rows[0];
   requireCondition(plan?.plan_hash===row.plan_hash,'INVOICE_PLAN_CHANGED');
   return {paymentId:String(row.payment_id),token,attempts:Number(row.attempts),key:String(row.reconciliation_key),invoiceId:row.invoice_id as string|null,cursor:row.search_cursor as string|null,createStartedAt:row.create_started_at ? new Date(String(row.create_started_at)):null,plan:plan.plan as InvoicePlan,planHash:String(row.plan_hash)};
 }
 async update(job: InvoiceJob, fields: {invoice_id?: string; search_cursor?: string|null; create_started_at?: Date; status?: 'queued'|'retry'|'paid'|'review'; outcome_code?: string; paid_document_url?: string|null}) {
   const entries=Object.entries(fields);
   const permitted=new Set(['invoice_id','search_cursor','create_started_at','status','outcome_code','paid_document_url']);
   requireCondition(entries.length>0 && entries.every(([key])=>permitted.has(key)),'INVALID_INVOICE_UPDATE');
   const values:unknown[]=[...this.account(),job.paymentId,job.token,...entries.map(([,value])=>value)];
   const sets=entries.map(([key],i)=>key+'=$'+(i+5));
   if(fields.status){sets.push('lease_token=NULL','lease_until=NULL');
     if(fields.status==='paid') sets.push('completed_at=now()');
     if(fields.status==='retry') {values.push(Math.min(3600,30*2**job.attempts));sets.push('next_attempt_at=now()+($'+values.length+"::integer * interval '1 second')");}
   }
   const result=await this.ledger.db.query('UPDATE pulseaw_southbill.invoice_jobs SET '+sets.join(',')+",updated_at=now() WHERE merchant_id=$1 AND livemode=$2 AND payment_id=$3 AND lease_token=$4 AND status='processing' AND lease_until>now() RETURNING payment_id",values);
   requireCondition(result.rows.length===1,'INVOICE_LEASE_LOST');
 }
 async assertWritable(job:InvoiceJob){
   const row=(await this.ledger.db.query(
     "SELECT j.payment_id FROM pulseaw_southbill.invoice_jobs j JOIN pulseaw_southbill.payment_records r USING(merchant_id,livemode,payment_id) JOIN pulseaw_southbill.invoice_plans p USING(merchant_id,livemode,payment_id) WHERE j.merchant_id=$1 AND j.livemode=$2 AND j.payment_id=$3 AND j.lease_token=$4 AND j.status='processing' AND j.lease_until>now() AND r.manual_review=false AND r.provider_status='succeeded' AND p.status<>'review'",[...this.account(),job.paymentId,job.token])).rows[0];
   requireCondition(row,'INVOICE_WRITE_BLOCKED');
 }
}
