import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseOptions} from '../server/southbill/database.ts';

test('database connections always verify TLS and preserve pooler account', () => {
  const config=databaseOptions('postgresql://runtime.project:example@pooler.example:6543/postgres?sslmode=verify-full','CA\\nCERT');
  assert.equal(config.ssl.rejectUnauthorized,true);
  assert.equal(config.ssl.ca,'CA\nCERT');
  assert.equal(config.max,1);
  const url=new URL(config.connectionString);
  assert.equal(url.username,'runtime.project');
  assert.equal(url.port,'6543');
  assert.equal(url.searchParams.has('sslmode'),false);
});
test('URL parameters cannot downgrade TLS or replace the configured certificate', () => {
  for(const option of ['sslmode=disable','sslmode=require','sslmode=prefer','sslmode=no-verify','ssl=false','sslrootcert=unknown','sslcert=unknown','uselibpqcompat=true'])
    assert.throws(()=>databaseOptions('postgresql://runtime:example@host/db?'+option,''),/DATABASE_TLS/);
});
test('system trust still requires verification when no custom CA is supplied', () => {
  const config=databaseOptions('postgresql://runtime:example@host/db','');
  assert.deepEqual(config.ssl,{rejectUnauthorized:true});
});
