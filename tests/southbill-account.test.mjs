import test from 'node:test';
import assert from 'node:assert/strict';
import { pulseawAccount } from '../server/southbill/account.ts';
import { verifyProviderMerchant } from '../server/southbill/domain.ts';

test('documented merchant setup needs no internal SouthBill ID; mode remains explicit', () => {
  assert.deepEqual(pulseawAccount({SOUTHBILL_MODE:'live'}), {accountKey:'pulseaw',livemode:true});
  assert.deepEqual(pulseawAccount({SOUTHBILL_MODE:'live',SOUTHBILL_MERCHANT_ID:''}), {accountKey:'pulseaw',livemode:true});
  assert.throws(() => pulseawAccount({}), /LIVE_ACCOUNT_CONFIGURATION_REQUIRED/);
  assert.throws(() => pulseawAccount({SOUTHBILL_MODE:'test'}), /LIVE_ACCOUNT_CONFIGURATION_REQUIRED/);
});

test('a verified provider ID never changes the local ledger namespace', () => {
  const local=pulseawAccount({SOUTHBILL_MODE:'live'});
  const bound=pulseawAccount({SOUTHBILL_MODE:'live',SOUTHBILL_MERCHANT_ID:'merchant_verified'});
  assert.equal(bound.accountKey,local.accountKey);
  assert.equal(bound.merchantId,'merchant_verified');
  verifyProviderMerchant(undefined,local,'ACCOUNT_MISMATCH');
  verifyProviderMerchant('merchant_verified',bound,'ACCOUNT_MISMATCH');
  assert.throws(() => verifyProviderMerchant('merchant_other',bound,'ACCOUNT_MISMATCH'), /ACCOUNT_MISMATCH/);
});

test('explicit provider identity fails closed until verified, including a forged local namespace', () => {
  const local=pulseawAccount({SOUTHBILL_MODE:'live'});
  for (const id of ['merchant_other',local.accountKey])
    assert.throws(() => verifyProviderMerchant(id,local,'ACCOUNT_MISMATCH'), /PROVIDER_MERCHANT_ID_UNVERIFIED/);
  for (const invalid of ['',null,false,{},'../merchant'])
    assert.throws(() => verifyProviderMerchant(invalid,local,'ACCOUNT_MISMATCH'), /ACCOUNT_MISMATCH/);
});
