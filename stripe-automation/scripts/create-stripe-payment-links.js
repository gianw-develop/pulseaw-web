#!/usr/bin/env node
/**
 * Bulk-create one Stripe Payment Link per FIXED_PRODUCTS entry.
 *
 * Requires: each product in src/catalog.js FIXED_PRODUCTS must already have a
 * live-mode stripePriceId (run `npm run stripe:create-products:write` first).
 *
 * Usage:
 *   node scripts/create-stripe-payment-links.js             # create in the account tied to STRIPE_SECRET_KEY
 *   node scripts/create-stripe-payment-links.js --dry-run   # print what would be created, no API calls
 *
 * Idempotent: if a Payment Link already exists for that Price (matched via
 * metadata.catalog_price_id), it is reused instead of creating a duplicate.
 *
 * Output: a table with product name, amount, and the public URL (buy.stripe.com/...).
 * Copy those URLs into the web repo's product catalog.
 */

require("dotenv").config();
const Stripe = require("stripe");
const { FIXED_PRODUCTS } = require("../src/catalog");

const DRY_RUN = process.argv.includes("--dry-run");
const RECREATE = process.argv.includes("--recreate");

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("ERROR: STRIPE_SECRET_KEY is not set (.env).");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

async function findExistingLinkForPrice(priceId) {
  // Payment Links don't have a direct "search by price" endpoint; iterate a page.
  // In practice there are few links per account, so this scales fine.
  const links = await stripe.paymentLinks.list({ limit: 100, active: true });
  return links.data.find(
    (link) => link.metadata && link.metadata.catalog_price_id === priceId
  ) || null;
}

async function ensurePaymentLink(item) {
  if (!item.stripePriceId || !item.stripePriceId.startsWith("price_")) {
    return { url: null, skipped: true, reason: "no stripePriceId" };
  }

  if (DRY_RUN) {
    return { url: "https://buy.stripe.com/DRYRUN_" + item.price, reused: false, created: false };
  }

  // Idempotency: reuse an existing active link if we already created one.
  let link = await findExistingLinkForPrice(item.stripePriceId);
  let reused = true;

  // --recreate: deactivate the old link (its config can't be patched) and
  // create a fresh one with the current field set. The deactivated link
  // stays visible in the Dashboard (inactive) and past invoices keep
  // referencing it for audit.
  if (link && RECREATE) {
    await stripe.paymentLinks.update(link.id, { active: false });
    link = null;
    reused = false;
  }

  if (!link) {
    link = await stripe.paymentLinks.create({
      line_items: [{ price: item.stripePriceId, quantity: 1 }],
      // Do NOT force full billing address (keeps checkout short).
      billing_address_collection: "auto",
      // Collect full name as a top-of-form custom field so it's visible in
      // "Contact details" regardless of payment method (Cash App, Link,
      // wallets do not always expose name through their own flows).
      custom_fields: [
        {
          key: "full_name",
          label: { type: "custom", custom: "Full name" },
          type: "text",
          optional: false,
        },
      ],
      // Collect phone — needed for intake follow-up and sales QA.
      phone_number_collection: { enabled: true },
      // Force explicit ToS + Privacy acceptance. REQUIRES that the account
      // has "Terms of service URL" and "Privacy policy URL" set under
      // Stripe Dashboard → Settings → Public details. If missing, this
      // call will error with a clear "terms_of_service_url is not set"
      // message. Configure those URLs first.
      // consent_collection disabled until ToS URL is configured in Stripe Dashboard
      // Always create a Stripe Customer on payment — ties the invoice flow
      // in our backend webhook handler to a persistent customer record.
      customer_creation: "always",
      // Let customers adjust quantity? No — these are fixed packages.
      // Use "allow_promotion_codes" if you want to support coupons later.
      allow_promotion_codes: true,
      metadata: {
        catalog_name: item.name,
        catalog_price_id: item.stripePriceId,
        catalog_kind: item.kind,
        source: "weill-automation-bulk",
      },
    });
    reused = false;
  }

  return { url: link.url, id: link.id, reused, created: !reused };
}

(async () => {
  console.log(
    `\nBulk Stripe Payment Link creation — ${FIXED_PRODUCTS.length} items${DRY_RUN ? " (DRY RUN)" : ""}\n`
  );

  const results = [];
  for (const item of FIXED_PRODUCTS) {
    try {
      const r = await ensurePaymentLink(item);
      if (r.skipped) {
        console.log(`  [skip   ] $${String(item.price).padStart(4)}  ${item.name}  (${r.reason})`);
      } else {
        const tag = r.reused ? "reused " : "created";
        console.log(
          `  [${tag}] $${String(item.price).padStart(4)}  ${r.url}  ${item.name}`
        );
      }
      results.push({ item, ...r });
    } catch (err) {
      console.error(`  [FAIL  ] ${item.name}: ${err.message}`);
      results.push({ item, url: null });
    }
  }

  console.log("\n--- Paste-ready for the web repo ---\n");
  console.log("// Payment Links (Stripe Live)");
  for (const { item, url } of results) {
    if (!url) continue;
    console.log(`  { name: ${JSON.stringify(item.name)}, price: ${item.price}, url: ${JSON.stringify(url)} },`);
  }

  console.log("\nDone.\n");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
