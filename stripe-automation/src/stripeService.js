const crypto = require("crypto");
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Stripe invoice numbers follow the format "<prefix>-<sequence>".
// We randomize BOTH parts before every invoice:
//   - invoice_prefix  → 8 random uppercase alphanumeric chars (e.g. "VDEK53A6")
//   - next_invoice_sequence → random 4-digit number 1000–9999 (e.g. 7832)
// Result: every invoice looks like "VDEK53A6-7832" — fully unpredictable,
// never sequential, and never repeating the same suffix across clients.
function generateInvoicePrefix() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

/**
 * Find or create a Stripe Customer by email.
 */
async function findOrCreateStripeCustomer({ email, name, phone }) {
  const existing = await stripe.customers.list({ email, limit: 1 });

  if (existing.data.length > 0) {
    return existing.data[0];
  }

  return stripe.customers.create({
    email,
    name: name || undefined,
    phone: phone || undefined,
  });
}

/**
 * Create a finalized Stripe invoice with line items for each service,
 * then mark it paid out-of-band (since payment already occurred via Cash App).
 *
 * @param {object} customer  - Stripe Customer object
 * @param {Array}  services  - [{ name, price }]
 * @param {string} paymentIntentId
 * @param {string} description - Optional memo
 * @returns {object} Stripe Invoice
 */
async function createAndPayInvoice(customer, services, paymentIntentId, description = "") {
  // Randomize BOTH the prefix and the 4-digit sequence number so every
  // invoice looks like "VDEK53A6-7832" — fully unpredictable and unique.
  await stripe.customers.update(customer.id, {
    invoice_prefix: generateInvoicePrefix(),
    next_invoice_sequence: Math.floor(Math.random() * 9000) + 1000, // 1000–9999
  });

  // Create one invoice item per service.
  // If the line item carries a real Stripe Price ID (from FIXED_PRODUCTS),
  // reference it directly — this ties the invoice to a registered catalog
  // Product in Stripe, which is the strongest compliance signal during
  // risk reviews. Otherwise fall back to an ad-hoc amount+description item
  // (legacy behavior for variable-service fallback).
  await Promise.all(
    services.map((svc) => {
      if (svc.stripePriceId && svc.stripePriceId.startsWith("price_")) {
        return stripe.invoiceItems.create({
          customer: customer.id,
          price: svc.stripePriceId,
        });
      }
      return stripe.invoiceItems.create({
        customer: customer.id,
        amount: Math.round(svc.price * 100),
        currency: "usd",
        description: svc.name,
      });
    })
  );

  // Create the invoice.
  // IMPORTANT: since API 2022-08-01, pending_invoice_items_behavior defaults to
  // "exclude". We must explicitly set "include" so the items we just created
  // are attached to this invoice (otherwise the invoice would be $0).
  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: "send_invoice",
    days_until_due: 0,
    description: description || `Payment ref: ${paymentIntentId}`,
    metadata: {
      payment_intent_id: paymentIntentId,
      source: "awgenesis-automation",
    },
    pending_invoice_items_behavior: "include",
    auto_advance: false,
  });

  // Finalize so it gets an invoice number
  const finalized = await stripe.invoices.finalizeInvoice(invoice.id, {
    auto_advance: false,
  });

  // Mark paid (money already collected via Cash App)
  const paid = await stripe.invoices.pay(finalized.id, {
    paid_out_of_band: true,
  });

  return paid;
}

module.exports = { stripe, findOrCreateStripeCustomer, createAndPayInvoice };
