import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { catalog, legacyCatalog, legacyCatalogVersion, individualCatalog, catalogVersion, allocate, supportedAmounts, planInvoice, validateAgreement, attachPreviouslyCapturedPayment } from '../server/southbill/domain.ts';
import { verifySignature } from '../server/southbill/signature.ts';
import { SouthbillClient } from '../server/southbill/client.ts';

const all = legacyCatalog.map(x=>x.serviceId);
const agreement = () => ({
  accountKey:'pulseaw',merchantId:'merchant_pulseaw',livemode:true,reference:'order_1',expectedPaymentId:'cs_1',
  approvedServiceIds:['acquisition'],catalogVersion,amountCents:490000,currency:'usd',
  customerName:'Synthetic Customer',customerEmail:'buyer@example.invalid',
  scopeReference:'contract_demo_1',consentReference:'consent_demo_1',verifiedBy:'operator_demo',
  taxReviewed:true,taxRateBps:0,termsAccepted:true,workApproved:true,
});
const payment = () => ({
  id:'cs_1',livemode:true,status:'succeeded',amount:490000,currency:'USD',
  customer_name:'Synthetic Customer',customer_email:'buyer@example.invalid',reference:'order_1',
});
test('catalog preserves six packages and adds the twelve approved individual services',()=>{
  assert.deepEqual(legacyCatalog.map(x=>x.unitAmountCents),[150000,280000,390000,490000,650000,800000]);
  assert.deepEqual(individualCatalog.map(x=>x.unitAmountCents),[500,1000,1500,2000,2500,3500,5000,7500,10000,12500,15000,20000]);
  assert.equal(catalog.length,18);assert.equal(new Set(catalog.map(x=>x.productId)).size,18);
  assert.equal(new Set(catalog.map(x=>x.priceId)).size,18);
});
test('every exact subset conserves cents and uses each real eligible service at most once',()=>{
  for(let mask=1;mask<64;mask++){
    const eligible=legacyCatalog.filter((_,i)=>mask&(1<<i));
    const amount=eligible.reduce((s,x)=>s+x.unitAmountCents,0);
    const items=allocate(amount,eligible.map(x=>x.serviceId));
    assert.equal(items.reduce((s,x)=>s+x.unitAmountCents*x.quantity,0),amount);
    assert.equal(new Set(items.map(x=>x.serviceId)).size,items.length);
    assert.ok(items.every(x=>x.quantity===1 && eligible.some(y=>y.serviceId===x.serviceId)));
  }
});
test('unsupported open amounts and cents cannot acquire invented invoice lines',()=>{
  assert.equal(allocate(400000,all),null);
  assert.equal(allocate(2619000,all),null);
  assert.throws(()=>allocate(490001,all),/WHOLE_USD/);
  for(const invalid of [NaN,Infinity,-100,0,490000.1]) assert.throws(()=>allocate(invalid,all));
  assert.throws(()=>allocate(490000,['invented']),/UNKNOWN_SERVICE/);
  assert.throws(()=>allocate(490000,['acquisition','acquisition']),/DUPLICATE/);
});
test('scope controls allocation and deterministic choice does not rotate service names',()=>{
  assert.deepEqual(allocate(800000,all).map(x=>x.serviceId),['founder']);
  assert.deepEqual(allocate(800000,['market','launch']).map(x=>x.serviceId),['market','launch']);
  assert.equal(allocate(800000,['acquisition']),null);
  assert.equal(supportedAmounts(all).at(-1),2760000);
});
test('invoice plan freezes real lines, total and an unsent draft but remains blocked',()=>{
  const plan=planInvoice(payment(),agreement());
  assert.equal(plan.amountCents,490000);
  assert.equal(plan.draftPayload.auto_send,false);
  assert.equal(plan.draftPayload.line_items[0].unit_amount,490000);
  assert.equal(plan.status,'awaiting_provider_contract');
  assert.throws(attachPreviouslyCapturedPayment,/ORIGINAL_PAYMENT_ATTACHMENT_UNVERIFIED/);
});
test('customer, merchant, environment, payment, contract and tax mismatches cannot plan invoices',()=>{
  for(const change of [{id:'cs_other'},{amount:490001},{currency:'eur'},{status:'pending'},
    {livemode:false},{merchant_id:'other'},{customer_email:'other@example.invalid'},{reference:'other'}])
    assert.throws(()=>planInvoice({...payment(),...change},agreement()));
  for(const change of [{consentReference:''},{scopeReference:''},{verifiedBy:''},{taxReviewed:false},
    {taxRateBps:2000},{termsAccepted:false},{workApproved:false},{catalogVersion:'old'},{catalogVersion:undefined}])
    assert.throws(()=>validateAgreement({...agreement(),...change}));
});
test('signature verifier supports rotation and rejects tampering, malformed and stale deliveries',()=>{
  const raw=Buffer.from('{"id":"evt_test"}'),now=1800000000,secret='whsec_local_synthetic_secret';
  const hash=createHmac('sha256',secret).update(now+'.').update(raw).digest('hex');
  const header='t='+now+',v1='+hash;
  verifySignature(raw,header,['whsec_previous_synthetic',secret],now);
  verifySignature(raw,'t='+now+',v1='+('a'.repeat(64))+',v1='+hash,[secret],now);
  assert.throws(()=>verifySignature(Buffer.from('{}'),header,[secret],now));
  assert.throws(()=>verifySignature(raw,header,[secret],now+301));
  assert.throws(()=>verifySignature(raw,header,[secret],now-301));
  for(const invalid of [null,'','t=abc,v1='+hash,'t='+now+',t='+now+',v1='+hash,'t='+now+',v1=00'])
    assert.throws(()=>verifySignature(raw,invalid,[secret],now));
});
test('merchant read adapter rejects traversal and never leaks provider error bodies',async()=>{
  const key='sk_live_synthetic_not_real';let calls=0;
  const client=new SouthbillClient(key,async(url,options)=>{
    calls++;assert.equal(new URL(url).origin,'https://api.southbill.com');
    assert.equal(options.redirect,'error');
    assert.equal(options.method,undefined);
    return new Response(JSON.stringify({error:{message:key}}),{status:403});
  });
  await assert.rejects(()=>client.get('payments','../invoices'),/INVALID_RESOURCE_ID/);
  assert.equal(calls,0);
  await assert.rejects(()=>client.get('payments','cs_1'),error=>error.message==='PROVIDER_HTTP_403'&&!error.message.includes(key));
});


test('each approved individual service invoices its own exact price and cannot be replaced by a different scope',()=>{
 for(const service of individualCatalog){
  const doc={...agreement(),approvedServiceIds:[service.serviceId],amountCents:service.unitAmountCents};
  const plan=planInvoice({...payment(),amount:service.unitAmountCents},doc);
  assert.equal(plan.lines.length,1);assert.equal(plan.lines[0].serviceId,service.serviceId);
  assert.equal(plan.draftPayload.line_items[0].unit_amount,service.unitAmountCents);
 }
 assert.equal(allocate(500,['cta-review']),null);
 assert.equal(allocate(600,individualCatalog.map(x=>x.serviceId)),null);
});

test('publishing new services does not change previously frozen six-service invoice plans',()=>{
 assert.equal(legacyCatalogVersion,'pulseaw-six-29a06da5c504b302');
 const expected=JSON.parse(readFileSync(new URL('./fixtures/southbill-legacy-plan.json',import.meta.url),'utf8'));
 const plan=planInvoice(payment(),{...agreement(),catalogVersion:legacyCatalogVersion});
 assert.deepEqual(plan,expected);
 assert.throws(()=>validateAgreement({...agreement(),catalogVersion:legacyCatalogVersion,approvedServiceIds:['utm-check'],amountCents:500}),/UNKNOWN_SERVICE/);
});

test('catalog-wide allocation remains deterministic and does not repeat a service',()=>{
 const ids=catalog.map(x=>x.serviceId),total=catalog.reduce((sum,x)=>sum+x.unitAmountCents,0);
 const lines=allocate(total,ids);assert.equal(lines.length,18);
 assert.equal(new Set(lines.map(x=>x.serviceId)).size,18);assert.equal(lines.reduce((sum,x)=>sum+x.unitAmountCents,0),total);
 assert.deepEqual(allocate(20000,['utm-check','landing-audit','ad-copy-pack','launch-readiness']).map(x=>x.serviceId),['launch-readiness']);
});
