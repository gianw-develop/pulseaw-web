import assert from 'node:assert/strict';
import test from 'node:test';
import { requireSameOrigin, SouthbillCheckoutClient, validateCheckoutInput } from '../server/southbill/checkout.ts';

const input = { name:'  Ada   Lovelace ',email:' ADA@EXAMPLE.COM ',amount:47,requestId:'123e4567-e89b-42d3-a456-426614174000',website:'' };

test('checkout input is normalized and restricted to whole-dollar supported totals', () => {
  assert.deepEqual(validateCheckoutInput(input), {customerName:'Ada Lovelace',customerEmail:'ada@example.com',amountCents:4700,requestId:input.requestId});
  for (const amount of [5, 6.5, 201]) assert.throws(() => validateCheckoutInput({...input,amount}), {code:'WHOLE_USD_AMOUNT_REQUIRED'});
});

test('checkout rejects invalid customers, request IDs and bot field', () => {
  assert.throws(() => validateCheckoutInput({...input,name:' '}), {code:'CUSTOMER_NAME_REQUIRED'});
  assert.throws(() => validateCheckoutInput({...input,email:'bad'}), {code:'CUSTOMER_EMAIL_REQUIRED'});
  assert.throws(() => validateCheckoutInput({...input,requestId:'reused'}), {code:'INVALID_REQUEST_ID'});
  assert.throws(() => validateCheckoutInput({...input,website:'spam'}), {code:'INVALID_CHECKOUT_INPUT'});
});

test('checkout route accepts only same-origin JSON requests', () => {
  const valid = new Request('https://www.pulseaw.com/api/southbill/checkout',{method:'POST',headers:{origin:'https://www.pulseaw.com','content-type':'application/json','sec-fetch-site':'same-origin'}});
  assert.doesNotThrow(() => requireSameOrigin(valid));
  for (const headers of [
    {origin:'https://example.com','content-type':'application/json'},
    {origin:'https://www.pulseaw.com','content-type':'text/plain'},
  ]) assert.throws(() => requireSameOrigin(new Request(valid.url,{method:'POST',headers})));
});

test('client creates a tightly-scoped live session with idempotency', async () => {
  let seen;
  const fetcher = async (url, options) => {
    seen = {url,options};
    return Response.json({id:'cs_verified',object:'checkout.session',livemode:true,status:'open',amount:4700,currency:'usd',checkout_url:'https://payments.southbill.com/c/cs_verified?cs=secret'});
  };
  const url = await new SouthbillCheckoutClient('sk_live_example',fetcher).create(validateCheckoutInput(input));
  assert.equal(url,'https://payments.southbill.com/c/cs_verified?cs=secret');
  assert.equal(seen.url,'https://api.southbill.com/v1/checkout/sessions');
  assert.equal(seen.options.headers['Idempotency-Key'],'pulseaw_checkout_'+input.requestId);
  const body=JSON.parse(seen.options.body);
  assert.deepEqual({amount:body.amount,currency:body.currency,customer_name:body.customer_name,customer_email:body.customer_email},{amount:4700,currency:'usd',customer_name:'Ada Lovelace',customer_email:'ada@example.com'});
  assert.equal(body.phone,undefined);assert.equal(body.billing_address,undefined);assert.equal(body.collect_phone,undefined);assert.equal(body.collect_address,undefined);
});

test('client rejects unverified provider sessions and URLs', async () => {
  const response = (overrides={}) => async () => Response.json({id:'cs_verified',object:'checkout.session',livemode:true,status:'open',amount:4700,currency:'usd',checkout_url:'https://payments.southbill.com/c/cs_verified?cs=secret',...overrides});
  await assert.rejects(() => new SouthbillCheckoutClient('sk_live_example',response({livemode:false})).create(validateCheckoutInput(input)), {code:'PROVIDER_SESSION_UNVERIFIED'});
  await assert.rejects(() => new SouthbillCheckoutClient('sk_live_example',response({checkout_url:'https://evil.example/c/cs_verified?cs=secret'})).create(validateCheckoutInput(input)), {code:'PROVIDER_CHECKOUT_URL_UNVERIFIED'});
});