#!/usr/bin/env node
/**
 * Create Stripe Products + Prices for any INTERNAL_SERVICES entry in
 * src/catalog.js that is missing a real stripePriceId (empty string),
 * then patch the file with the resulting price IDs.
 *
 * Usage:
 *   node scripts/create-internal-service-prices.js
 *
 * Requires: STRIPE_SECRET_KEY in .env
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const { INTERNAL_SERVICES } = require("../src/catalog");

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("ERROR: STRIPE_SECRET_KEY is not set (.env).");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const CATALOG_PATH = path.join(__dirname, "..", "src", "catalog.js");
const TAX_CODE_SERVICE = "txcd_20030000"; // Consulting services

const pending = INTERNAL_SERVICES.filter(
  (s) => typeof s.price === "number" && (!s.stripePriceId || s.stripePriceId === "")
);

(async () => {
  if (pending.length === 0) {
    console.log("Nothing to create — all internal services already have a stripePriceId.");
    return;
  }

  console.log(`Creating ${pending.length} internal service Product/Price pair(s)...\n`);

  const results = [];
  for (const item of pending) {
    const product = await stripe.products.create({
      name: item.name,
      description: `Internal service deliverable: ${item.name}. Used to balance invoice amounts.`,
      tax_code: TAX_CODE_SERVICE,
      metadata: { catalog_name: item.name, catalog_kind: "internal", source: "pulseaw-automation" },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(item.price * 100),
      currency: "usd",
      metadata: { catalog_name: item.name },
    });

    console.log(`  [created] $${item.price}  ${price.id}  ${item.name}`);
    results.push({ item, priceId: price.id });
  }

  let src = fs.readFileSync(CATALOG_PATH, "utf8");
  for (const { item, priceId } of results) {
    const nameLiteral = item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(name:\\s*'${nameLiteral}'[^\\n]*?stripePriceId:\\s*)''`, "g");
    src = src.replace(re, `$1'${priceId}'`);
  }
  fs.writeFileSync(CATALOG_PATH, src, "utf8");
  console.log(`\n[write] Updated ${CATALOG_PATH}`);
  console.log("\nDone.\n");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
