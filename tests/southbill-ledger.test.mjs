import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { Ledger } from '../server/southbill/ledger.ts';
import { receiveWebhook } from '../server/southbill/receiver.ts';
import { processNext } from '../server/southbill/worker.ts';
import { catalogVersion, SouthbillError } from '../server/southbill/domain.ts';

let database, directory, db;
const account={accountKey:'pulseaw',merchantId:'merchant_pulseaw',livemode:true};
const secret='whsec_only_for_synthetic_tests';
const schema=await readFile(new URL('../server/southbill/schema.sql',import.meta.url),'utf8');
const wrap=pg=>({
  query:(sql,params=[])=>pg.query(sql,params),
  transaction:work=>pg.transaction(tx=>work({query:(sql,params=[])=>tx.query(sql,params)})),
});
before(async()=>{
  directory=await mkdtemp(path.join(tmpdir(),'pulseaw-southbill-test-'));
  database=await PGlite.create(directory);db=wrap(database);await database.exec(schema);
});
after(async()=>{await database.close();await rm(directory,{recursive:true,force:true});});
beforeEach(async()=>{await database.exec('TRUNCATE pulseaw_southbill.events,pulseaw_southbill.agreements,pulseaw_southbill.invoice_plans,pulseaw_southbill.payment_records');});
const event=(id='evt_1',type='checkout.session.completed')=>({
  id,object:'event',type,created:Math.floor(Date.now()/1000),livemode:true,
  data:{object:{id:'cs_1',object:'checkout.session',amount:490000,currency:'usd',status:'complete'}},
});
const payment=(extra={})=>({
  id:'cs_1',object:'payment',livemode:true,status:'succeeded',amount:490000,currency:'usd',
  customer_name:'Synthetic Customer',customer_email:'buyer@example.invalid',reference:'order_1',payment_intent:'pi_1',
  ...extra,
});
const agreement=()=>({
  ...account,reference:'order_1',expectedPaymentId:'cs_1',approvedServiceIds:['acquisition'],
  catalogVersion,amountCents:490000,currency:'usd',customerName:'Synthetic Customer',
  customerEmail:'buyer@example.invalid',scopeReference:'contract_synthetic',consentReference:'consent_synthetic',
  verifiedBy:'operator_synthetic',taxReviewed:true,taxRateBps:0,termsAccepted:true,workApproved:true,
});
const request=(payload,signatureSecret=secret)=>{
  const raw=JSON.stringify(payload),time=Math.floor(Date.now()/1000);
  const signature=createHmac('sha256',signatureSecret).update(time+'.'+raw).digest('hex');
  return new Request('https://pulseaw.example.invalid/api/webhooks/southbill',{
    method:'POST',headers:{'Content-Type':'application/json','Southbill-Signature':'t='+time+',v1='+signature},body:raw,
  });
};
const client=(events,pay=payment())=>({get:async(resource,id)=>{
  if(resource==='events') return events.find(e=>e.id===id);
  if(resource==='payments') return pay;
  throw Error('No write or invoice request is allowed in this gated flow');
}});
const rows=async table=>(await database.query('SELECT * FROM pulseaw_southbill.'+table)).rows;

test('signed webhook commits before 200; duplicates converge; event ID collision is rejected',async()=>{
  const ledger=new Ledger(db,account),payload=event();
  assert.equal((await receiveWebhook(request(payload),ledger,[secret])).status,200);
  const again=await receiveWebhook(request(payload),ledger,[secret]);
  assert.equal((await again.json()).duplicate,true);
  assert.equal((await rows('events')).length,1);
  assert.equal((await receiveWebhook(request({...payload,type:'invoice.paid'}),ledger,[secret])).status,409);
});
test('invalid signatures, wrong account/mode and oversized bodies never reach ledger',async()=>{
  const ledger=new Ledger(db,account);
  for(const payload of [{...event(),livemode:false},{...event(),merchant_id:'another_merchant'}])
    assert.equal((await receiveWebhook(request(payload),ledger,[secret])).status,400);
  assert.equal((await receiveWebhook(request(event(),'whsec_wrong_synthetic'),ledger,[secret])).status,400);
  const large=new Request('https://local.invalid',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(262145)});
  assert.equal((await receiveWebhook(large,ledger,[secret])).status,413);
  assert.equal((await rows('events')).length,0);
});
test('persistence failure returns 503 so SouthBill retries',async()=>{
  const ledger=new Ledger({query:async()=>{throw Error('private DB details');},transaction:async()=>{throw Error('private DB details');}},account);
  const response=await receiveWebhook(request(event()),ledger,[secret]);
  assert.equal(response.status,503);
  assert.deepEqual(await response.json(),{error:'PERSISTENCE_UNAVAILABLE'});
});
test('lease is exclusive, expired leases recover, stale workers cannot commit',async()=>{
  const ledger=new Ledger(db,account);await ledger.enqueue(event());
  const first=await ledger.claim();assert.ok(first);
  assert.equal(await new Ledger(db,account).claim(),null);
  await database.query("UPDATE pulseaw_southbill.events SET lease_until=now()-interval '1 second'");
  const second=await new Ledger(db,account).claim();assert.notEqual(second.token,first.token);
  await assert.rejects(()=>ledger.finish(first,'observed','OLD_WORKER'),/LEASE_LOST/);
  await ledger.finish(second,'observed','RECOVERED');
  assert.equal((await rows('events'))[0].outcome_code,'RECOVERED');
});
test('same event ID in another account has independent storage and cannot access agreements',async()=>{
  const one=new Ledger(db,account),two=new Ledger(db,{accountKey:'other_company',merchantId:'merchant_other',livemode:true});
  await one.enqueue(event());await two.enqueue(event());
  await one.registerAgreement(agreement());
  assert.equal(await two.agreement('cs_1'),null);
  assert.equal((await rows('events')).length,2);
});
test('captured payment creates one frozen local plan across distinct duplicate events, never another charge',async()=>{
  const ledger=new Ledger(db,account),first=event(),second=event('evt_2','payment_intent.succeeded');
  second.data.object.id='pi_1';
  await ledger.registerAgreement(agreement());
  await ledger.enqueue(first);await ledger.enqueue(second);
  const provider=client([first,second]);
  assert.equal(await processNext(ledger,provider),true);assert.equal(await processNext(ledger,provider),true);
  const plans=await rows('invoice_plans');assert.equal(plans.length,1);
  assert.equal(plans[0].plan.draftPayload.auto_send,false);
  assert.equal(plans[0].plan.amountCents,490000);
  assert.equal(plans[0].status,'ready_for_prior_payment_recording');
  assert.ok((await rows('events')).every(e=>e.status==='observed'&&e.outcome_code==='PAYMENT_CAPTURED_INVOICE_QUEUED'));
});
test('missing scope or a changed customer never creates an invoice plan',async()=>{
  const ledger=new Ledger(db,account),payload=event();
  await ledger.enqueue(payload);await processNext(ledger,client([payload]));
  assert.equal((await rows('events'))[0].outcome_code,'VERIFIED_SCOPE_MISSING');
  assert.equal((await rows('invoice_plans')).length,0);
  await ledger.registerAgreement(agreement());await ledger.requeue(payload.id);
  await processNext(ledger,client([payload],payment({customer_email:'other@example.invalid'})));
  assert.equal((await rows('events'))[0].outcome_code,'PAYMENT_CUSTOMER_MISMATCH');
  assert.equal((await rows('invoice_plans')).length,0);
});
test('canonical API mismatch and network failure are retryable without financial writes',async()=>{
  const ledger=new Ledger(db,account),payload=event();
  await ledger.enqueue(payload);
  await processNext(ledger,{get:async()=>{throw new SouthbillError('PROVIDER_NETWORK_ERROR');}});
  assert.equal((await rows('events'))[0].status,'retry');
  assert.equal((await rows('invoice_plans')).length,0);
  await ledger.requeue(payload.id);
  await processNext(ledger,{get:async()=>({...payload,id:'evt_wrong'})});
  assert.equal((await rows('events'))[0].outcome_code,'EVENT_CANONICAL_MISMATCH');
});
test('out-of-order refund and success events keep one plan under manual review',async()=>{
  const ledger=new Ledger(db,account),paid=event(),refund=event('evt_refund','checkout.session.refunded'),late=event('evt_late');
  await ledger.registerAgreement(agreement());await ledger.enqueue(paid);await processNext(ledger,client([paid]));
  await ledger.enqueue(refund);await processNext(ledger,client([refund],payment({status:'partially_refunded'})));
  assert.equal((await rows('invoice_plans'))[0].status,'review');
  await ledger.enqueue(late);await processNext(ledger,client([late]));
  assert.equal((await rows('invoice_plans')).length,1);
  assert.equal((await rows('invoice_plans'))[0].status,'review');
  assert.equal((await rows('payment_records'))[0].manual_review,true);
});
test('immutable agreement refuses reassignment or changed scope after registration',async()=>{
  const ledger=new Ledger(db,account);await ledger.registerAgreement(agreement());
  await ledger.registerAgreement(agreement());
  await assert.rejects(()=>ledger.registerAgreement({...agreement(),scopeReference:'different_contract'}),/IMMUTABLE/);
  await assert.rejects(()=>ledger.registerAgreement({...agreement(),reference:'order_2'}),/IMMUTABLE/);
});
test('signed ping tests delivery only and does not access payment APIs',async()=>{
  const ledger=new Ledger(db,account),payload=event('evt_ping','ping.test');
  await ledger.enqueue(payload);await processNext(ledger,{get:async()=>{throw Error('must not be called');}});
  assert.equal((await rows('events'))[0].outcome_code,'SIGNED_PING_RECEIVED');
});
test('committed event survives database close and reopen, then reconciles once',async()=>{
  let ledger=new Ledger(db,account);const payload=event();
  await ledger.registerAgreement(agreement());await ledger.enqueue(payload);
  await database.close();database=await PGlite.create(directory);db=wrap(database);ledger=new Ledger(db,account);
  assert.equal((await rows('events')).length,1);
  await processNext(ledger,client([payload]));
  assert.equal((await rows('invoice_plans')).length,1);
  assert.equal(await processNext(ledger,client([payload])),false);
});

test('reordered JSON is the same event and stored envelopes omit customer and checkout secrets',async()=>{
  const ledger=new Ledger(db,account),payload=event();
  payload.data.object.client_secret='cs_synthetic_secret_value';
  payload.data.object.customer_email='private@example.invalid';
  await ledger.enqueue(payload);
  const reordered={data:payload.data,livemode:true,created:payload.created,type:payload.type,object:'event',id:payload.id};
  assert.equal(await ledger.enqueue(reordered),'duplicate');
  const saved=(await rows('events'))[0];
  assert.equal(saved.payload.data.object.client_secret,undefined);
  assert.equal(saved.payload.data.object.customer_email,undefined);
});
test('a missing-scope event can resume after a verified agreement is registered',async()=>{
  const ledger=new Ledger(db,account),payload=event();
  await ledger.enqueue(payload);await processNext(ledger,client([payload]));
  await ledger.registerAgreement(agreement());await ledger.requeue(payload.id);
  await processNext(ledger,client([payload]));
  assert.equal((await rows('invoice_plans')).length,1);
});
test('a crash on the last allowed attempt goes to review instead of getting stuck',async()=>{
  const ledger=new Ledger(db,account);await ledger.enqueue(event());await ledger.claim();
  await database.query("UPDATE pulseaw_southbill.events SET attempts=8,lease_until=now()-interval '1 second'");
  assert.equal(await ledger.claim(),null);
  assert.equal((await rows('events'))[0].outcome_code,'RETRY_LIMIT_REACHED');
});
test('charge refund lookup uses the documented charge identifier',async()=>{
  const ledger=new Ledger(db,account),payload=event('evt_charge_refund','charge.refunded');
  payload.data.object={id:'ch_1',object:'charge'};
  await ledger.enqueue(payload);await processNext(ledger,client([payload],payment({status:'refunded',charge:'ch_1'})));
  assert.equal((await rows('events'))[0].outcome_code,'REFUND_OR_DISPUTE_RECONCILIATION_REQUIRED');
});
test('an invoice.paid event without a payment relationship is never treated as proof of capture',async()=>{
  const ledger=new Ledger(db,account),payload=event('evt_invoice','invoice.paid');
  payload.data.object={id:'inv_1',object:'invoice',status:'paid'};
  await ledger.enqueue(payload);await processNext(ledger,client([payload]));
  assert.equal((await rows('events'))[0].outcome_code,'PAYMENT_RELATIONSHIP_UNVERIFIED');
  assert.equal((await rows('invoice_plans')).length,0);
});
test('provider amount mismatch cannot update a frozen payment record',async()=>{
  const ledger=new Ledger(db,account),first=event(),second=event('evt_changed');
  await ledger.registerAgreement(agreement());await ledger.enqueue(first);await processNext(ledger,client([first]));
  await ledger.enqueue(second);await processNext(ledger,client([second],payment({amount:500000})));
  assert.equal((await rows('payment_records'))[0].amount_cents,490000);
  assert.equal((await rows('invoice_plans')).length,1);
  assert.equal((await rows('events')).find(x=>x.event_id==='evt_changed').outcome_code,'PAYMENT_IMMUTABLE_TOTAL_MISMATCH');
});

test('signed documented ping is durable without provider ID; local namespace is never provider identity',async()=>{
  const local=new Ledger(db,{accountKey:'pulseaw',livemode:true});
  const payload=event('evt_ping','ping.test');
  assert.equal((await receiveWebhook(request(payload),local,[secret])).status,200);
  await processNext(local,{get:async()=>{throw Error('A ping must not access payment APIs');}});
  assert.equal((await rows('events'))[0].outcome_code,'SIGNED_PING_RECEIVED');
  const forged={...event('evt_forged'),merchant_id:'pulseaw'};
  const rejected=await receiveWebhook(request(forged),local,[secret]);
  assert.equal(rejected.status,400);
  assert.deepEqual(await rejected.json(),{error:'PROVIDER_MERCHANT_ID_UNVERIFIED'});
  assert.equal((await rows('events')).length,1);
});

test('canonical payment with unexpected provider identity cannot be reconciled',async()=>{
  const localAccount={accountKey:'pulseaw',livemode:true};
  const local=new Ledger(db,localAccount),payload=event('evt_explicit_provider');
  const document=agreement();delete document.merchantId;
  await local.registerAgreement(document);
  await local.enqueue(payload);
  await processNext(local,client([payload],payment({merchant_id:'merchant_unverified'})));
  assert.equal((await rows('events'))[0].outcome_code,'PROVIDER_MERCHANT_ID_UNVERIFIED');
  assert.equal((await rows('payment_records')).length,0);
  assert.equal((await rows('invoice_plans')).length,0);
});

test('an optional verified provider ID does not strand an already received ping',async()=>{
  const local=new Ledger(db,{accountKey:'pulseaw',livemode:true});
  await local.enqueue(event('evt_before_binding','ping.test'));
  const bound=new Ledger(db,account);
  await processNext(bound,{get:async()=>{throw Error('No API needed for ping');}});
  assert.equal((await rows('events'))[0].outcome_code,'SIGNED_PING_RECEIVED');
});

test('two buyers on one permanent link retain distinct immutable orders and invoice plans',async()=>{
 const ledger=new Ledger(db,account);
 for(const suffix of ['one','two']){
  const doc={...agreement(),reference:'order_'+suffix,expectedPaymentId:'cs_'+suffix,sourceReference:'shared_link_reference',customerEmail:suffix+'@example.invalid'};
  await ledger.registerAgreement(doc);
  const evt={...event('evt_'+suffix),data:{object:{id:'cs_'+suffix,object:'checkout.session'}}};
  await ledger.enqueue(evt);
  await processNext(ledger,{get:async kind=>kind==='events'?evt:payment({id:'cs_'+suffix,reference:'shared_link_reference',customer_email:doc.customerEmail})});
 }
 const plans=(await db.query('SELECT payment_id,plan FROM pulseaw_southbill.invoice_plans ORDER BY payment_id')).rows;
 assert.equal(plans.length,2);
 assert.deepEqual(plans.map(x=>x.plan.draftPayload.metadata.order_reference),['order_one','order_two']);
 assert.deepEqual(plans.map(x=>x.payment_id),['cs_one','cs_two']);
});
