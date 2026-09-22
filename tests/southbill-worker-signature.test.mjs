import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {validRecoverySignature} from '../server/southbill/worker-signature.ts';
const secret='synthetic_worker_secret_at_least_32_characters';
const time=1800000000,nonce='01a0a02c-cc22-7cb1-aa7d-bd8954213c00';
const sign=(path='/api/internal/southbill/process',method='POST')=>'t='+time+',n='+nonce+',v1='+createHmac('sha256',secret).update(time+'.'+nonce+'.'+method+'.'+path).digest('hex');
test('recovery credentials expire and remain bound to the worker path and POST',()=>{
 assert.equal(validRecoverySignature(sign(),secret,time),true);
 assert.equal(validRecoverySignature(sign(),secret,time+61),false);
 assert.equal(validRecoverySignature(sign(),secret,time-61),false);
 assert.equal(validRecoverySignature(sign('/api/internal/southbill/health'),secret,time),false);
 assert.equal(validRecoverySignature(sign(undefined,'GET'),secret,time),false);
});
test('recovery signatures reject altered, malformed, missing and wrong-secret credentials',()=>{
 for(const header of [null,'',sign().replace(nonce,'ffffffff-ffff-ffff-ffff-ffffffffffff'),sign()+',t='+time,sign().slice(0,-1),sign().replace('t='+time,'t=NaN')])
  assert.equal(validRecoverySignature(header,secret,time),false);
 assert.equal(validRecoverySignature(sign(),secret+'other',time),false);
 assert.equal(validRecoverySignature(sign(),'',time),false);
});
