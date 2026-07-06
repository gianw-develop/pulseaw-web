#!/usr/bin/env node
/**
 * Bulk-create the FIXED_PRODUCTS from src/catalog.js as Stripe Products + Prices.
 *
 * Usage:
 *   node scripts/create-stripe-products.js            # create in the account tied to STRIPE_SECRET_KEY
 *   node scripts/create-stripe-products.js --dry-run  # print what would be created, no API calls
 *   node scripts/create-stripe-products.js --write    # also rewrite src/catalog.js with the new price IDs
 *
 * The script is idempotent: if a product with the same `metadata.catalog_name`
 * already exists, it reuses it instead of creating a duplicate. Same for the
 * Price (matched by unit_amount + currency on that product).
 *
 * Requires: STRIPE_SECRET_KEY in .env (live or test — it uses whatever is set).
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const { FIXED_PRODUCTS } = require("../src/catalog");

const DRY_RUN = process.argv.includes("--dry-run");
const WRITE   = process.argv.includes("--write");

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("ERROR: STRIPE_SECRET_KEY is not set (.env).");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const CATALOG_PATH = path.join(__dirname, "..", "src", "catalog.js");

// Tax code hints: digital goods vs services.
// These are safe defaults for consulting/digital templates in the US.
// See https://stripe.com/docs/tax/tax-codes for the full list.
const TAX_CODE_DIGITAL = "txcd_10000000"; // Digital goods — general
const TAX_CODE_SERVICE = "txcd_20030000"; // Consulting services

function describe(product) {
  // Short human-readable description shown on invoices and in the Dashboard.
  if (product.kind === "digital") {
    return `Downloadable digital product: ${product.name}. Delivered via email upon purchase confirmation.`;
  }
  return `Professional service deliverable: ${product.name}. Scoped during the intake conversation prior to invoicing.`;
}

async function findExistingProduct(catalogName) {
  // Search by metadata.catalog_name to make the script idempotent.
  // Uses the Search API (requires "products.search" — available on all live accounts).
  try {
    const res = await stripe.products.search({
      query: `metadata["catalog_name"]:"${catalogName.replace(/"/g, '\\"')}"`,
      limit: 1,
    });
    return res.data[0] || null;
  } catch (err) {
    // Fallback: list + match by name (less reliable but works on any account).
    const list = await stripe.products.list({ limit: 100, active: true });
    return list.data.find((p) => p.metadata && p.metadata.catalog_name === catalogName) || null;
  }
}

async function findExistingPrice(productId, unitAmount) {
  const prices = await stripe.prices.list({ product: productId, limit: 100, active: true });
  return prices.data.find(
    (p) => p.unit_amount === unitAmount && p.currency === "usd" && p.type === "one_time"
  ) || null;
}

async function ensureProductAndPrice(item) {
  const unitAmount = Math.round(item.price * 100);
  const taxCode    = item.kind === "digital" ? TAX_CODE_DIGITAL : TAX_CODE_SERVICE;

  if (DRY_RUN) {
    return { priceId: "price_DRYRUN_" + item.price, created: false, reused: false };
  }

  // 1) Product
  let product = await findExistingProduct(item.name);
  let productCreated = false;
  if (!product) {
    product = await stripe.products.create({
      name: item.name,
      description: describe(item),
      tax_code: taxCode,
      metadata: {
        catalog_name: item.name,
        catalog_kind: item.kind,
        source: "weill-automation-bulk",
      },
    });
    productCreated = true;
  }

  // 2) Price
  let price = await findExistingPrice(product.id, unitAmount);
  let priceCreated = false;
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: unitAmount,
      currency: "usd",
      // one_time is the default when no recurring is specified.
      metadata: {
        catalog_name: item.name,
      },
    });
    priceCreated = true;
  }

  return {
    priceId: price.id,
    productId: product.id,
    created: productCreated || priceCreated,
    reused: !productCreated && !priceCreated,
  };
}

function rewriteCatalog(results) {
  const src = fs.readFileSync(CATALOG_PATH, "utf8");
  let updated = src;

  for (const { item, priceId } of results) {
    if (!priceId || !priceId.startsWith("price_")) continue;

    // Replace stripePriceId: "" on the line that contains the exact product name.
    // The product name appears as: name: "<name>",  and stripePriceId: "",
    // on the same line. We anchor on the exact name to target the right entry.
    const nameLiteral = item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `(name:\s*"${nameLiteral}"[^\n]*?stripePriceId:\s*)"[^"]*"`,
      "g"
    );
    const before = updated;
    updated = updated.replace(re, `$1"${priceId}"`);
    if (before === updated) {
      console.warn(`[warn] Could not locate FIXED_PRODUCTS entry for: ${item.name}`);
    }
  }

  fs.writeFileSync(CATALOG_PATH, updated, "utf8");
  console.log(`\n[write] Updated ${CATALOG_PATH}`);
}

(async () => {
  console.log(
    `\nBulk Stripe product creation — ${FIXED_PRODUCTS.length} items${DRY_RUN ? " (DRY RUN)" : ""}\n`
  );

  const results = [];
  for (const item of FIXED_PRODUCTS) {
    try {
      const r = await ensureProductAndPrice(item);
      const tag = r.reused ? "reused " : r.created ? "created" : "        ";
      console.log(
        `  [${tag}] $${String(item.price).padStart(4)}  ${r.priceId}  ${item.name}`
      );
      results.push({ item, ...r });
    } catch (err) {
      console.error(`  [FAIL  ] ${item.name}: ${err.message}`);
      results.push({ item, priceId: null });
    }
  }

  if (WRITE && !DRY_RUN) {
    rewriteCatalog(results);
  } else {
    console.log(
      "\nCopy these into src/catalog.js (or re-run with --write to auto-patch):\n"
    );
    for (const { item, priceId } of results) {
      console.log(`  ${item.name}  →  ${priceId}`);
    }
  }

  console.log("\nDone.\n");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
