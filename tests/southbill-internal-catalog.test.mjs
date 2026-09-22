import test from 'node:test';
import assert from 'node:assert/strict';
import { INTERNAL_PRICE_LADDER, allocateInternal } from '../server/southbill/internal-allocation.ts';
import { parseInternalCatalog, internalVersion, internalServices, resolveInternalCatalog, internalCatalogHealth } from '../server/southbill/internal-catalog.ts';
import { catalog, catalogVersion, legacyCatalogVersion, allocate, supportedAmounts, planInvoice, validateAgreement } from '../server/southbill/domain.ts';

// Synthetic entries only. PulseAW's real private names and pricing are never committed.
const document=()=>({schemaVersion:1,accountKey:'pulseaw',visibility:'private',pricingPolicy:'exact-37-v1',status:'approved',
  approval:{reference:'synthetic_review',approvedBy:'synthetic_operator',approvedAt:'2026-09-22T00:00:00Z'},
  entries:INTERNAL_PRICE_LADDER.map((amount,i)=>({serviceId:'internal-synthetic-'+i,name:'Synthetic service '+i,description:'Synthetic scope for allocation tests.',currency:'usd',unitAmountCents:amount,
    deliverable:'Synthetic review document.',deliveryMethod:'Synthetic digital delivery',deliveryDays:2,evidenceType:'Synthetic delivery record',refundTreatment:'Synthetic service policy reference',
    refundPolicyUrl:'https://www.pulseaw.com/refund-policy',taxCategory:'Synthetic service tax review per order',publicCategory:'synthetic-category'}))});
function withRegistry(docs,work){const previous=process.env.SOUTHBILL_INTERNAL_CATALOG_JSON;process.env.SOUTHBILL_INTERNAL_CATALOG_JSON=JSON.stringify({catalogs:docs});
  try{return work();}finally{if(previous===undefined)delete process.env.SOUTHBILL_INTERNAL_CATALOG_JSON;else process.env.SOUTHBILL_INTERNAL_CATALOG_JSON=previous;}}
const agreement=version=>({accountKey:'pulseaw',livemode:true,reference:'synthetic_order',expectedPaymentId:'cs_synthetic',approvedServiceIds:document().entries.map(x=>x.serviceId),catalogVersion:version,amountCents:9100,currency:'usd',customerName:'Synthetic Buyer',customerEmail:'buyer@example.invalid',scopeReference:'synthetic_scope',consentReference:'synthetic_consent',verifiedBy:'synthetic_operator',taxReviewed:true,taxRateBps:0,termsAccepted:true,workApproved:true});

test('private ladder covers all 195 whole-dollar amounts with unique bounded exact lines',()=>{
 const items=internalServices(parseInternalCatalog(document()));
 for(let dollars=6;dollars<=200;dollars++){
  const result=allocateInternal(dollars*100,items);
  assert.ok(result,'Missing total '+dollars);
  assert.equal(result.reduce((sum,x)=>sum+x.unitAmountCents*x.quantity,0),dollars*100);
  assert.equal(new Set(result.map(x=>x.serviceId)).size,result.length);
  assert.ok(result.every(x=>x.quantity===1));
  assert.ok(result.length<=5 && result.length>=(dollars>=80?3:1));
 }
 for(const invalid of [0,500,20100,600.1,601,NaN,Infinity,-600])assert.throws(()=>allocateInternal(invalid,items));
});
test('requested totals use private prices, concise small totals and balanced larger totals',()=>{
 const items=internalServices(parseInternalCatalog(document()));
 const prices=amount=>allocateInternal(amount*100,items).map(x=>x.unitAmountCents/100);
 assert.deepEqual(prices(47),[47]);assert.equal(prices(56).length,2);
 assert.deepEqual(prices(91),[21,19,18,17,16]);assert.deepEqual(prices(84),[19,18,17,16,14]);
 for(const amount of [47,56,91,84])assert.deepEqual(allocateInternal(amount*100,[...items].reverse()),allocateInternal(amount*100,items));
});
test('scope restriction never falls back to public services or unapproved private services',()=>{
 const doc=document(),version=internalVersion(parseInternalCatalog(doc));
 withRegistry([doc],()=>{
  const only47=doc.entries.find(x=>x.unitAmountCents===4700).serviceId;
  assert.equal(allocate(5600,[only47],version),null);
  assert.deepEqual(supportedAmounts([only47],version),[4700]);
  assert.throws(()=>allocate(4700,['utm-check'],version),/UNKNOWN_SERVICE/);
  assert.throws(()=>allocate(4700,[only47],catalogVersion),/UNKNOWN_SERVICE/);
  assert.throws(()=>allocate(9400,[only47,only47],version),/DUPLICATE_SCOPE/);
 });
});
test('proposed, incomplete, foreign and malformed private catalogs cannot be used for live planning',()=>{
 const doc=document(),version=internalVersion(parseInternalCatalog(doc));
 const proposed={...doc,status:'proposed',approval:null};
 assert.equal(parseInternalCatalog(proposed,true).status,'proposed');
 for(const bad of [proposed,{...doc,approval:null},{...doc,accountKey:'other'},{...doc,visibility:'public'},
   {...doc,entries:doc.entries.slice(1)},{...doc,entries:doc.entries.map((x,i)=>i===0?{...x,unitAmountCents:700}:x)},
   {...doc,entries:doc.entries.map((x,i)=>i===0?{...x,deliverable:''}:x)},
   {...doc,entries:doc.entries.map((x,i)=>i===0?{...x,productId:'prod_fake'}:x)}]){
   withRegistry([bad],()=>assert.throws(()=>resolveInternalCatalog(version)));
 }
 withRegistry([doc,doc],()=>assert.throws(()=>resolveInternalCatalog(version),/DUPLICATE_INTERNAL_CATALOG_VERSION/));
 withRegistry([],()=>assert.throws(()=>resolveInternalCatalog(version),/REGISTRY/));
});
test('private catalog versions are immutable; old agreements retain exact lines after adding another version',()=>{
 const doc=document(),version=internalVersion(parseInternalCatalog(doc));
 const changed=structuredClone(doc);changed.entries[0].description='Another synthetic scope, separately reviewed.';
 const changedVersion=internalVersion(parseInternalCatalog(changed));assert.notEqual(version,changedVersion);
 const reversed={...doc,entries:[...doc.entries].reverse()};assert.equal(internalVersion(parseInternalCatalog(reversed)),version);
 withRegistry([doc,changed],()=>{
  assert.deepEqual(resolveInternalCatalog(version).services,internalServices(parseInternalCatalog(doc)));
  assert.deepEqual(resolveInternalCatalog(changedVersion).services,internalServices(parseInternalCatalog(changed)));
 });
 withRegistry([changed],()=>assert.throws(()=>resolveInternalCatalog(version),/CATALOG_VERSION_MISMATCH/));
});
test('verified captured payment plans private lines without creating public provider products',()=>{
 const doc=document(),version=internalVersion(parseInternalCatalog(doc)),ag=agreement(version);
 withRegistry([doc],()=>{
  const plan=planInvoice({id:'cs_synthetic',livemode:true,status:'succeeded',amount:9100,currency:'usd',customer_name:ag.customerName,customer_email:ag.customerEmail,reference:ag.reference},ag);
  assert.equal(plan.catalogVersion,version);assert.equal(plan.draftPayload.auto_send,false);
  assert.equal(plan.draftPayload.line_items.reduce((s,x)=>s+x.quantity*x.unit_amount,0),9100);
  assert.equal(plan.lines.length,5);assert.ok(plan.lines.every(x=>!('productId' in x)&&!('priceId' in x)));
  assert.throws(()=>validateAgreement({...ag,accountKey:'other'}),/IDENTITY_MISMATCH/);
  assert.throws(()=>validateAgreement({...ag,scopeReference:''}),/VERIFIED_EVIDENCE/);
  assert.throws(()=>planInvoice({id:'cs_synthetic',livemode:true,status:'pending',amount:9100,currency:'usd',customer_name:ag.customerName,customer_email:ag.customerEmail,reference:ag.reference},ag),/PAYMENT_NOT_CAPTURED/);
 });
});
test('private catalog configuration does not alter public catalog versions or the public product list',()=>{
 withRegistry([document()],()=>{
  assert.equal(catalogVersion,'pulseaw-catalog-076b2822c419fdab');assert.equal(legacyCatalogVersion,'pulseaw-six-29a06da5c504b302');
  assert.equal(catalog.length,18);assert.ok(catalog.every(x=>!x.serviceId.startsWith('internal-')));
  assert.equal(allocate(4700,catalog.map(x=>x.serviceId)),null);
 });
});

test('authenticated health proves private coverage without returning its service details',()=>{
 withRegistry([document()],()=>{
  const health=internalCatalogHealth();assert.equal(health.configured,true);assert.equal(health.versions[0].serviceCount,37);assert.equal(health.versions[0].coveredWholeDollarAmounts,195);
  const output=JSON.stringify(health);assert.ok(!output.includes('Synthetic service'));assert.ok(!output.includes('internal-synthetic'));
 });
 withRegistry([{...document(),status:'proposed',approval:null}],()=>assert.throws(internalCatalogHealth,/APPROVAL_REQUIRED/));
});
