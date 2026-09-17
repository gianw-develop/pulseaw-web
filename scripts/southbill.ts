import { readFile } from 'node:fs/promises';
import { catalog, catalogVersion, supportedAmounts, validateAgreement, isId, SouthbillError } from '../server/southbill/domain.ts';
import type { Agreement } from '../server/southbill/domain.ts';
import { connectDatabase } from '../server/southbill/database.ts';
import { pulseawAccount } from '../server/southbill/account.ts';
import { Ledger } from '../server/southbill/ledger.ts';
import { SouthbillClient } from '../server/southbill/client.ts';
import { processNext } from '../server/southbill/worker.ts';

const command = process.argv[2] ?? 'status';
try {
  if (command === 'catalog') {
    console.log(JSON.stringify({catalogVersion, products:catalog.map(x=>({id:x.serviceId,name:x.name,USD:x.unitAmountCents/100})),
      supportedUSD:supportedAmounts(catalog.map(x=>x.serviceId)).map(x=>x/100)},null,2));
  } else if (command === 'verify-catalog') {
    const client = new SouthbillClient(process.env.SOUTHBILL_API_KEY ?? '');
    for (const item of catalog) {
      const product = await client.get('products',item.productId);
      const prices = Array.isArray(product.prices) ? product.prices : [];
      const price = prices.find(x=>x?.id === item.priceId);
      if (product.id !== item.productId || product.name !== item.name || product.active === false ||
        !price || price.unit_amount !== item.unitAmountCents || price.currency?.toLowerCase() !== 'usd' || price.active === false || price.recurring != null)
        throw new SouthbillError('CATALOG_PROVIDER_MISMATCH');
    }
    console.log('Six SouthBill products and prices verified; no writes.');
  } else if (['status','migrate','register-agreement','process','requeue'].includes(command)) {
    const account = pulseawAccount(process.env);
    if (!process.env.SOUTHBILL_DATABASE_URL) throw new SouthbillError('PULSEAW_DATABASE_REQUIRED');
    const db = connectDatabase(process.env.SOUTHBILL_DATABASE_URL);
    try {
      const ledger = new Ledger(db, account);
      if (command === 'migrate') {
        if (process.argv[3] !== '--apply') throw new SouthbillError('USE_MIGRATE_APPLY_AFTER_VERIFYING_PULSEAW_DATABASE');
        await db.transaction(async connection => { await connection.query(await readFile(new URL('../server/southbill/schema.sql',import.meta.url),'utf8')); });
        console.log('PulseAW SouthBill private schema installed.');
      } else if (command === 'register-agreement') {
        const file = process.argv[3];
        if (!file) throw new SouthbillError('REVIEWED_PRIVATE_AGREEMENT_FILE_REQUIRED');
        const agreement = JSON.parse(await readFile(file,'utf8')) as Agreement;
        validateAgreement(agreement); await ledger.registerAgreement(agreement);
        console.log('Verified agreement registered; no payment or invoice created.');
      } else if (command === 'requeue') {
        if (!isId(process.argv[3])) throw new SouthbillError('EVENT_ID_REQUIRED');
        await ledger.requeue(process.argv[3]); console.log('Existing event queued for reconciliation.');
      } else if (command === 'process') {
        console.log(JSON.stringify({processed:await processNext(ledger,new SouthbillClient(process.env.SOUTHBILL_API_KEY ?? ''))}));
      } else console.log(JSON.stringify(await ledger.summary()));
    } finally { await db.close(); }
  } else throw new SouthbillError('UNKNOWN_COMMAND');
} catch (error) {
  console.error(error instanceof SouthbillError ? error.code : 'SOUTHBILL_COMMAND_FAILED');
  process.exitCode = 1;
}
