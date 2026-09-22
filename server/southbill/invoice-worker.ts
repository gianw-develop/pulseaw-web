import { digest, isId, isRecord, planInvoice, requireCondition, verifyProviderMerchant, SouthbillError } from './domain.ts';
import type { Agreement } from './domain.ts';
import { InvoiceLedger } from './invoice-ledger.ts';
import type { InvoiceJob } from './invoice-ledger.ts';
import { InvoiceClient } from './invoice-client.ts';
import { SouthbillClient } from './client.ts';
import { parsePayment } from './worker.ts';

type Provider = Pick<InvoiceClient,'find'|'get'|'create'|'markPaid'>;
const invoiceCreateKey=(paymentId:string)=>{
 const direct='inv-'+paymentId;
 return direct.length<=160?direct:'inv-'+digest(paymentId);
};
function verifyInvoice(invoice:Record<string,unknown>,job:InvoiceJob,agreement:Agreement,paid=false) {
 requireCondition(isId(invoice.id) && invoice.object==='invoice' && invoice.livemode===agreement.livemode,'INVOICE_IDENTITY_MISMATCH');
 requireCondition(!job.invoiceId || invoice.id===job.invoiceId,'INVOICE_IDENTITY_MISMATCH');
 requireCondition(typeof invoice.number==='string' && invoice.number.trim().length>0,'INVOICE_NUMBER_UNVERIFIED');
 verifyProviderMerchant(invoice.merchant_id,agreement,'INVOICE_ACCOUNT_MISMATCH');
 requireCondition(invoice.currency==='usd' && invoice.total===job.plan.amountCents && invoice.subtotal===job.plan.amountCents && invoice.tax===0,'INVOICE_TOTAL_MISMATCH');
 requireCondition(typeof invoice.customer_name==='string' && invoice.customer_name.trim()===agreement.customerName.trim() && typeof invoice.customer_email==='string' && invoice.customer_email.trim().toLowerCase()===agreement.customerEmail.trim().toLowerCase(),'INVOICE_CUSTOMER_MISMATCH');
 const sourcePayment=String(job.plan.draftPayload.metadata.source_payment??job.paymentId);
 requireCondition(isRecord(invoice.metadata) && invoice.metadata.source_payment===sourcePayment && invoice.metadata.payment_record===job.paymentId && invoice.metadata.reconciliation_ref===job.key,'INVOICE_PAYMENT_REFERENCE_MISMATCH');
 requireCondition(isRecord(invoice.lines) && Array.isArray(invoice.lines.data),'INVOICE_LINES_UNVERIFIED');
 const lines=(invoice.lines as {data:Record<string,unknown>[]}).data;
 const expected=job.plan.draftPayload.line_items;
 requireCondition(lines.length===expected.length && expected.every(want=>lines.filter(line=>line.description===want.description && line.quantity===1 && line.unit_amount===want.unit_amount && line.amount===want.unit_amount && (line.tax_rate===0 || line.tax_rate===undefined)).length===1),'INVOICE_LINES_MISMATCH');
 if(paid) requireCondition(invoice.status==='paid' && invoice.amount_paid===job.plan.amountCents && invoice.amount_due===0 && !!invoice.paid_at,'INVOICE_PAID_TOTAL_UNVERIFIED');
}
function documentUrl(invoice:Record<string,unknown>):string|null {
 if(typeof invoice.hosted_invoice_url!=='string')return null;
 try {const u=new URL(invoice.hosted_invoice_url);return u.protocol==='https:' && u.hostname==='payments.southbill.com' && /^\/i\/[a-zA-Z0-9]+$/.test(u.pathname) && !u.username && !u.password && !u.search && !u.hash ? u.href:null;}catch{return null;}
}
/** Records a verified prior payment as manual invoice settlement, never as another charge. */
export async function processInvoiceNext(store:InvoiceLedger,payments:Pick<SouthbillClient,'get'>,provider:Provider):Promise<boolean> {
 await store.enqueue(); const job=await store.claim();if(!job)return false;
 try {
   await store.assertWritable(job);
   const agreement=await store.ledger.agreement(job.paymentId);
   requireCondition(agreement,'VERIFIED_SCOPE_MISSING');
   // An operator must confirm no invoice already represents this payment before a new one is created.
   requireCondition(typeof agreement!.invoiceReviewReference==='string' && agreement!.invoiceReviewReference.trim().length>=3,'EXISTING_INVOICE_REVIEW_REQUIRED');
   const raw=await payments.get('payments',job.paymentId);
   requireCondition(['checkout','payment_link'].includes(String(raw.source)) && !raw.invoice && !raw.invoice_id,'PAYMENT_SOURCE_REQUIRES_REVIEW');
   const payment=parsePayment(raw,store.ledger);
   requireCondition(digest(planInvoice(payment,agreement!))===job.planHash,'INVOICE_PLAN_CHANGED');
   const sourcePayment=String(job.plan.draftPayload.metadata.source_payment??payment.payment_intent??payment.id);
   let invoice:Record<string,unknown>;
   if(job.invoiceId) invoice=await provider.get(job.invoiceId);
   else {
     const found=await provider.find(sourcePayment,job.key,job.cursor??undefined);
     requireCondition(found.matches.length<=1,'MULTIPLE_INVOICES_FOUND');
     if(found.matches.length){
       requireCondition(isId(found.matches[0].id),'INVALID_INVOICE_ID');
       job.invoiceId=String(found.matches[0].id);await store.update(job,{invoice_id:job.invoiceId,search_cursor:null});
       invoice=await provider.get(job.invoiceId);
     } else if(found.next){
       requireCondition(isId(found.next) && found.next!==job.cursor,'INVOICE_PAGINATION_INVALID');
       await store.update(job,{search_cursor:String(found.next),status:job.attempts<8?'queued':'review',outcome_code:job.attempts<8?'INVOICE_RECONCILING':'INVOICE_SCAN_LIMIT_REACHED'});return true;
     } else {
       // SouthBill retains idempotency responses for 24h. Never recreate blindly after that window.
       requireCondition(!job.createStartedAt || Date.now()-job.createStartedAt.getTime()<23*60*60*1000,'INVOICE_CREATE_RESULT_UNCERTAIN');
       if(!job.createStartedAt)await store.update(job,{create_started_at:new Date()});
       await store.assertWritable(job);
       invoice=await provider.create({...job.plan.draftPayload,
         memo:'Payment already received via SouthBill. No additional payment is due.',
         notes:'Manual invoice settlement records the prior SouthBill payment '+job.paymentId+'. This is bookkeeping, not a new payment or a native payment attachment.',
         metadata:{...job.plan.draftPayload.metadata,source_payment:sourcePayment,payment_record:job.paymentId,reconciliation_ref:job.key,settlement_method:'prior_southbill_payment_recorded_manually'}},invoiceCreateKey(job.paymentId));
       requireCondition(isId(invoice.id),'INVALID_INVOICE_ID');
       job.invoiceId=String(invoice.id);await store.update(job,{invoice_id:job.invoiceId,search_cursor:null});
     }
   }
   verifyInvoice(invoice,job,agreement!);
   if(invoice.status!=='paid'){
     requireCondition(invoice.status==='draft','INVOICE_STATUS_REQUIRES_REVIEW');
     await store.assertWritable(job);
     // SouthBill explicitly supports mark_paid on an unsent draft; never call /send.
     await provider.markPaid(job.invoiceId!,job.key+'_paid');
   }
   const verified=await provider.get(job.invoiceId!);
   verifyInvoice(verified,job,agreement!,true);
   const paidDocument=documentUrl(verified);
   requireCondition(paidDocument,'PAID_DOCUMENT_URL_UNVERIFIED');
   await store.assertWritable(job);
   await store.update(job,{status:'paid',outcome_code:'PRIOR_PAYMENT_RECORDED_MANUALLY',paid_document_url:paidDocument});
 }catch(error){
   const code=error instanceof SouthbillError?error.code:'INVOICE_PROCESSING_ERROR';
   if(code==='INVOICE_LEASE_LOST')return true;
   const transient=code==='INVOICE_NETWORK_ERROR' || code==='PROVIDER_NETWORK_ERROR' || /^(INVOICE|PROVIDER)_HTTP_(429|409|5[0-9]{2})$/.test(code);
   await store.update(job,{status:transient && job.attempts<8?'retry':'review',outcome_code:code});
 }
 return true;
}
