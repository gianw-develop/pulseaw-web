import { parseInternalCatalog, internalVersion, internalServices, resolveInternalCatalog } from '../server/southbill/internal-catalog.ts';
import { allocateInternal } from '../server/southbill/internal-allocation.ts';
import { readFile } from 'node:fs/promises';
import { engagements } from '../app/engagements.ts';
import { catalog, catalogVersion, legacyCatalogVersion, supportedAmounts, validateAgreement, isId, SouthbillError } from '../server/southbill/domain.ts';
import type { Agreement } from '../server/southbill/domain.ts';
import { connectDatabase } from '../server/southbill/database.ts';
import { pulseawAccount } from '../server/southbill/account.ts';
import { Ledger } from '../server/southbill/ledger.ts';
import { SouthbillClient } from '../server/southbill/client.ts';
import { processNext } from '../server/southbill/worker.ts';
import { InvoiceLedger } from '../server/southbill/invoice-ledger.ts';
import { InvoiceClient } from '../server/southbill/invoice-client.ts';
import { processInvoiceNext } from '../server/southbill/invoice-worker.ts';

const command = process.argv[2] ?? 'status';
try {
  if (command === 'catalog') {
    console.log(JSON.stringify({visibility:'public',catalogVersion, legacyCatalogVersion, products:catalog.map(x=>({id:x.serviceId,name:x.name,USD:x.unitAmountCents/100})),
      supportedAmountCount:supportedAmounts(catalog.map(x=>x.serviceId)).length},null,2));
  } else if (command === 'preview-internal') {
    const file=process.argv[3];if(!file)throw new SouthbillError('PRIVATE_CATALOG_FILE_REQUIRED');
    const doc=parseInternalCatalog(JSON.parse(await readFile(file,'utf8')),true);
    const services=internalServices(doc);
    const amounts=(process.argv.slice(4).length?process.argv.slice(4):['47','56','91','84']).map(Number);
    const results=amounts.map(USD=>({USD,lines:allocateInternal(USD*100,services)?.map(x=>({serviceId:x.serviceId,name:x.name,USD:x.unitAmountCents/100,quantity:x.quantity}))??null}));
    console.log(JSON.stringify({previewOnly:true,status:doc.status,internalVersion:internalVersion(doc),privateServices:services.length,results},null,2));
  } else if (command === 'internal-catalog') {
    if(!process.argv[3])throw new SouthbillError('INTERNAL_CATALOG_VERSION_REQUIRED');
    const {document,services}=resolveInternalCatalog(process.argv[3]);
    console.log(JSON.stringify({internalVersion:internalVersion(document),visibility:'private',services:services.map(x=>({id:x.serviceId,name:x.name,USD:x.unitAmountCents/100}))},null,2));
  } else if (command === 'verify-catalog') {
    const client = new SouthbillClient(process.env.SOUTHBILL_API_KEY ?? '');
    for (const item of catalog) {
      const product = await client.get('products',item.productId);
      const packageService=engagements.find(x=>x.id===item.serviceId);
      const providerDescription=packageService ? [packageService.description,packageService.detail,'What we need from you: '+packageService.requirements,'One-time project fee in USD. Advertising spend, software subscriptions and other third-party costs are separate.'].join('\n\n'):item.description;
      const prices = Array.isArray(product.prices) ? product.prices : [];
      const price = prices.find(x=>x?.id === item.priceId);
      if (product.id !== item.productId || product.name !== item.name || product.description !== providerDescription || product.active === false ||
        !price || price.unit_amount !== item.unitAmountCents || price.currency?.toLowerCase() !== 'usd' || price.active === false || price.recurring != null)
        throw new SouthbillError('CATALOG_PROVIDER_MISMATCH');
    }
    console.log(catalog.length+' SouthBill products and prices verified; no writes.');
  } else if (['status','migrate','register-agreement','process','process-invoice','invoice-status','requeue'].includes(command)) {
    const account = pulseawAccount(process.env);
    if (!process.env.SOUTHBILL_DATABASE_URL) throw new SouthbillError('PULSEAW_DATABASE_REQUIRED');
    const db = connectDatabase(process.env.SOUTHBILL_DATABASE_URL);
    try {
      const ledger = new Ledger(db, account);
      if (command === 'migrate') {
        if (process.argv[3] !== '--apply') throw new SouthbillError('USE_MIGRATE_APPLY_AFTER_VERIFYING_PULSEAW_DATABASE');
        await db.transaction(async connection => { await connection.query(await readFile(new URL('../server/southbill/schema.sql',import.meta.url),'utf8')); await connection.query(await readFile(new URL('../server/southbill/invoice-schema.sql',import.meta.url),'utf8')); });
        console.log('PulseAW SouthBill private schema installed.');
      } else if (command === 'register-agreement') {
        const file = process.argv[3];
        if (!file) throw new SouthbillError('REVIEWED_PRIVATE_AGREEMENT_FILE_REQUIRED');
        const agreement = JSON.parse(await readFile(file,'utf8')) as Agreement;
        validateAgreement(agreement);
        if(process.env.SOUTHBILL_INVOICE_MODE==='record_prior_payment' && (!agreement.invoiceReviewReference || agreement.invoiceReviewReference.trim().length<3)) throw new SouthbillError('EXISTING_INVOICE_REVIEW_REQUIRED');
        await ledger.registerAgreement(agreement);
        console.log('Verified agreement registered; no payment or invoice created.');
      } else if (command === 'requeue') {
        if (!isId(process.argv[3])) throw new SouthbillError('EVENT_ID_REQUIRED');
        await ledger.requeue(process.argv[3]); console.log('Existing event queued for reconciliation.');
      } else if (command === 'invoice-status') {
        console.log(JSON.stringify((await db.query('SELECT payment_id,invoice_id,status,outcome_code,paid_document_url FROM pulseaw_southbill.invoice_jobs WHERE merchant_id=$1 AND livemode=$2 ORDER BY created_at DESC LIMIT 50',[account.accountKey,account.livemode])).rows));
      } else if (command === 'process-invoice') {
        if(process.env.SOUTHBILL_INVOICE_MODE!=='record_prior_payment') throw new SouthbillError('PAID_INVOICING_DISABLED');
        console.log(JSON.stringify({processed:await processInvoiceNext(new InvoiceLedger(ledger),new SouthbillClient(process.env.SOUTHBILL_API_KEY ?? ''),new InvoiceClient(process.env.SOUTHBILL_API_KEY ?? ''))}));
      } else if (command === 'process') {
        console.log(JSON.stringify({processed:await processNext(ledger,new SouthbillClient(process.env.SOUTHBILL_API_KEY ?? ''))}));
      } else console.log(JSON.stringify(await ledger.summary()));
    } finally { await db.close(); }
  } else throw new SouthbillError('UNKNOWN_COMMAND');
} catch (error) {
  console.error(error instanceof SouthbillError ? error.code : 'SOUTHBILL_COMMAND_FAILED');
  process.exitCode = 1;
}
