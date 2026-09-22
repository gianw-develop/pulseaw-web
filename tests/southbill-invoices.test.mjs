import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {Ledger} from '../server/southbill/ledger.ts';
import {InvoiceLedger} from '../server/southbill/invoice-ledger.ts';
import {processInvoiceNext} from '../server/southbill/invoice-worker.ts';
import {processNext} from '../server/southbill/worker.ts';
import {catalogVersion,SouthbillError} from '../server/southbill/domain.ts';
import {InvoiceClient} from '../server/southbill/invoice-client.ts';
let db,ledger,store;
const account={accountKey:'pulseaw',livemode:true};
const payment=()=>({id:'cs_invoice',object:'payment',livemode:true,status:'succeeded',amount:490000,currency:'usd',customer_name:'Synthetic Buyer',customer_email:'buyer@example.invalid',reference:'order_invoice',source:'checkout'});
const agreement=()=>({...account,reference:'order_invoice',expectedPaymentId:'cs_invoice',approvedServiceIds:['acquisition'],catalogVersion,amountCents:490000,currency:'usd',customerName:'Synthetic Buyer',customerEmail:'buyer@example.invalid',scopeReference:'contract_synthetic',consentReference:'consent_synthetic',verifiedBy:'operator_synthetic',invoiceReviewReference:'review_no_existing_invoice_synthetic',taxReviewed:true,taxRateBps:0,termsAccepted:true,workApproved:true});
const event={id:'evt_invoice',object:'event',type:'checkout.session.completed',created:1800000000,livemode:true,data:{object:{id:'cs_invoice'}}};
before(async()=>{db=new PGlite();for(const f of ['schema.sql','invoice-schema.sql'])await db.exec(await readFile(new URL('../server/southbill/'+f,import.meta.url),'utf8'));});
after(async()=>db.close());
beforeEach(async()=>{
 await db.exec('TRUNCATE pulseaw_southbill.invoice_jobs,pulseaw_southbill.invoice_plans,pulseaw_southbill.payment_records,pulseaw_southbill.events,pulseaw_southbill.agreements');
 ledger=new Ledger({query:(sql,args)=>db.query(sql,args),transaction:work=>db.transaction(tx=>work({query:(sql,args)=>tx.query(sql,args)}))},account);store=new InvoiceLedger(ledger);
});
async function seed(doc=agreement()){
 await ledger.registerAgreement(doc);await ledger.enqueue(event);
 await processNext(ledger,{get:async kind=>kind==='events'?event:payment()});
}
const job=async()=>(await db.query('SELECT * FROM pulseaw_southbill.invoice_jobs')).rows[0];
const due=()=>db.query("UPDATE pulseaw_southbill.invoice_jobs SET next_attempt_at=now()-interval '1 second'");
function provider(){
 const state={invoices:[],creates:0,marks:0,loseCreate:false,loseMark:false,keys:[],getTransform:x=>x};
 return {state,api:{
 find:async key=>({matches:state.invoices.filter(x=>x.metadata.reconciliation_key===key),next:null}),
 get:async id=>state.getTransform(structuredClone(state.invoices.find(x=>x.id===id))),
 create:async(payload,key)=>{
  state.creates++;state.keys.push(key);assert.equal(payload.auto_send,false);
  const subtotal=payload.line_items.reduce((sum,x)=>sum+x.unit_amount*x.quantity,0);
  const inv={id:'inv_synthetic',object:'invoice',livemode:true,status:'draft',currency:'usd',subtotal,tax:0,total:subtotal,customer_email:payload.customer_email,metadata:payload.metadata,lines:{data:payload.line_items.map((x,i)=>({...x,id:'li_'+i,amount:x.unit_amount*x.quantity}))},amount_paid:0,amount_due:subtotal,paid_at:null};
  state.invoices.push(inv);
  if(state.loseCreate){state.loseCreate=false;throw new SouthbillError('INVOICE_NETWORK_ERROR');}
  return structuredClone(inv);
 },
 markPaid:async(id,key)=>{state.marks++;state.keys.push(key);const inv=state.invoices.find(x=>x.id===id);inv.status='paid';inv.amount_paid=inv.total;inv.amount_due=0;inv.paid_at=1800000000;inv.hosted_invoice_url='https://payments.southbill.com/i/Abc123xyz';if(state.loseMark){state.loseMark=false;throw new SouthbillError('INVOICE_NETWORK_ERROR');}return structuredClone(inv);}
 }};
}
const readPayment={get:async()=>payment()};
test('verified prior payment produces one paid invoice and never invokes send or charge',async()=>{
 await seed();const p=provider();assert.equal(await processInvoiceNext(store,readPayment,p.api),true);
 assert.equal((await job()).status,'paid');assert.equal((await job()).outcome_code,'PRIOR_PAYMENT_RECORDED_MANUALLY');
 assert.equal((await job()).paid_document_url,'https://payments.southbill.com/i/Abc123xyz');
 assert.equal(await processInvoiceNext(store,readPayment,p.api),false);assert.equal(p.state.creates,1);assert.equal(p.state.marks,1);
 await ledger.enqueue({...event,id:'evt_second'});await processNext(ledger,{get:async kind=>kind==='events'?{...event,id:'evt_second'}:payment()});
 assert.equal(await processInvoiceNext(store,readPayment,p.api),false);assert.equal(p.state.creates,1);
});
test('lost create response is reconciled to the same invoice before marking paid',async()=>{
 await seed();const p=provider();p.state.loseCreate=true;
 await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).status,'retry');assert.equal((await job()).invoice_id,null);
 await due();await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).status,'paid');assert.equal(p.state.creates,1);assert.equal(p.state.marks,1);
});
test('lost mark-paid response reads paid state on retry and does not mark a second time',async()=>{
 await seed();const p=provider();p.state.loseMark=true;
 await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).status,'retry');
 await due();await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).status,'paid');assert.equal(p.state.creates,1);assert.equal(p.state.marks,1);
});
test('uncertain creation after idempotency expiry never creates a fresh invoice',async()=>{
 await seed();await store.enqueue();await db.query("UPDATE pulseaw_southbill.invoice_jobs SET create_started_at=now()-interval '25 hours'");const p=provider();
 await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).outcome_code,'INVOICE_CREATE_RESULT_UNCERTAIN');assert.equal(p.state.creates,0);
});
test('unpaid, refunded, mismatched and already-invoiced source payments cannot issue invoices',async()=>{
 await seed();const p=provider();
 await processInvoiceNext(store,{get:async()=>({...payment(),status:'pending'})},p.api);assert.equal((await job()).status,'review');assert.equal(p.state.creates,0);
 await db.query("UPDATE pulseaw_southbill.invoice_jobs SET status='queued',attempts=0");
 await processInvoiceNext(store,{get:async()=>({...payment(),source:'invoice'})},p.api);assert.equal((await job()).outcome_code,'PAYMENT_SOURCE_REQUIRES_REVIEW');assert.equal(p.state.creates,0);
});
test('a missing duplicate-invoice review stops before any provider write',async()=>{
 const doc=agreement();delete doc.invoiceReviewReference;await seed(doc);const p=provider();
 await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).outcome_code,'EXISTING_INVOICE_REVIEW_REQUIRED');assert.equal(p.state.creates,0);
});
test('paid label without settled totals is never reported as a completed invoice',async()=>{
 await seed();const p=provider();p.state.getTransform=x=>({...x,amount_due:1});
 await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).outcome_code,'INVOICE_PAID_TOTAL_UNVERIFIED');assert.equal((await job()).paid_document_url,null);
});
test('wrong invoice line or customer is rejected before mark_paid',async()=>{
 await seed();const p=provider();const create=p.api.create;p.api.create=async(...args)=>({...await create(...args),customer_email:'wrong@example.invalid'});
 await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).outcome_code,'INVOICE_CUSTOMER_MISMATCH');assert.equal(p.state.marks,0);assert.equal((await job()).invoice_id,'inv_synthetic');
});
test('invoice lease is exclusive and a stale worker cannot write after recovery',async()=>{
 await seed();await store.enqueue();const first=await store.claim();assert.ok(first);assert.equal(await store.claim(),null);
 await db.query("UPDATE pulseaw_southbill.invoice_jobs SET lease_until=now()-interval '1 second'");const second=await store.claim();assert.notEqual(first.token,second.token);
 await assert.rejects(()=>store.update(first,{status:'paid'}),/INVOICE_LEASE_LOST/);await assert.rejects(()=>store.assertWritable(first),/INVOICE_WRITE_BLOCKED/);
});
test('refund review blocks a previously prepared invoice job',async()=>{
 await seed();await store.enqueue();await db.query('UPDATE pulseaw_southbill.payment_records SET manual_review=true');const p=provider();
 await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).outcome_code,'INVOICE_WRITE_BLOCKED');assert.equal(p.state.creates,0);
});
test('restricted invoice client blocks traversal and auto-send, and redacts provider error bodies',async()=>{
 let calls=0;const key='sk_live_synthetic_test';const c=new InvoiceClient(key,async(url,options)=>{calls++;assert.equal(options.redirect,'error');assert.ok(!String(url).endsWith('/send'));return new Response(JSON.stringify({secret:key}),{status:403});});
 await assert.rejects(async()=>c.markPaid('../x','key'),/INVALID_INVOICE_ID/);
 await assert.rejects(async()=>c.create({auto_send:true},'key'),/UNSENT/);assert.equal(calls,0);
 await assert.rejects(()=>c.markPaid('inv_1','key'),e=>e.message==='INVOICE_HTTP_403');
});

test('a provider rejection of draft mark_paid is surfaced; no send fallback opens collection',async()=>{
 await seed();const p=provider();p.api.markPaid=async()=>{throw new SouthbillError('INVOICE_HTTP_400');};
 await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).status,'review');assert.equal((await job()).outcome_code,'INVOICE_HTTP_400');assert.equal((await job()).paid_document_url,null);assert.equal(p.state.creates,1);
});
test('refund after invoice completion requires accounting review and never issues another invoice',async()=>{
 await seed();const p=provider();await processInvoiceNext(store,readPayment,p.api);
 await db.query('UPDATE pulseaw_southbill.payment_records SET manual_review=true');
 await processInvoiceNext(store,readPayment,p.api);assert.equal((await job()).status,'review');assert.equal((await job()).outcome_code,'ORIGINAL_PAYMENT_REVERSED_REVIEW_REQUIRED');assert.equal(p.state.creates,1);
});
test('malformed pagination cannot be mistaken for proof that no invoice exists',async()=>{
 const client=new InvoiceClient('sk_live_synthetic_test',async()=>new Response(JSON.stringify({object:'list',has_more:true,data:[]})));
 await assert.rejects(()=>client.find('reconciliation_key'),/INVOICE_PAGINATION_INVALID/);
});
