const { assignServices } = require("./algorithm");
const { findOrCreateStripeCustomer, createAndPayInvoice } = require("./stripeService");
const {
  upsertCustomer,
  saveInvoice,
  getUsedHashes,
  isPaymentProcessed,
  tryAcquireLock,
  releaseLock,
} = require("./supabaseService");

/**
 * Extract customer info from a PaymentIntent.
 * Looks in: metadata, then linked Stripe Customer object.
 */
function extractCustomerInfo(paymentIntent) {
  const meta = paymentIntent.metadata || {};
  return {
    email: meta.customer_email || null,
    name:  meta.customer_name  || null,
    phone: meta.customer_phone || null,
  };
}

async function handlePaymentIntentSucceeded(paymentIntent, stripeInstance) {
  const { id: paymentIntentId, amount: amountCents } = paymentIntent;

  // Atomic lock: prevents concurrent webhook deliveries (automatic retries
  // or manual resends) from running the full flow in parallel, which would
  // race on Stripe invoice creation and yield duplicate/$0 invoices.
  const acquired = await tryAcquireLock(paymentIntentId);
  if (!acquired) {
    console.log(`[webhook] Concurrent run blocked for ${paymentIntentId}, skipping.`);
    return { skipped: true, reason: "concurrent_run" };
  }

  try {
    // Secondary idempotency: skip if a previous run already persisted the invoice
    if (await isPaymentProcessed(paymentIntentId)) {
      console.log(`[webhook] Already processed ${paymentIntentId}, skipping.`);
      return { skipped: true, reason: "already_processed" };
    }

    return await processPayment(paymentIntent, stripeInstance, paymentIntentId, amountCents);
  } catch (err) {
    // Release lock on failure so the next retry can re-attempt cleanly.
    // On success, we deliberately keep the lock — isPaymentProcessed() will
    // short-circuit future retries via the persisted invoice row.
    await releaseLock(paymentIntentId);
    throw err;
  }
}

async function processPayment(paymentIntent, stripeInstance, paymentIntentId, amountCents) {
  // Resolve customer info — try multiple sources in order:
  // 1. metadata (when set by our frontend/backend)
  // 2. attached Stripe Customer
  // 3. receipt_email (set by Checkout / Payment Links)
  // 4. latest charge billing_details (always set after a successful charge)
  let customerInfo = extractCustomerInfo(paymentIntent);

  if (!customerInfo.email && paymentIntent.customer) {
    const stripeCust = await stripeInstance.customers.retrieve(paymentIntent.customer);
    customerInfo = {
      email: stripeCust.email  || customerInfo.email,
      name:  stripeCust.name   || customerInfo.name,
      phone: stripeCust.phone  || customerInfo.phone,
    };
  }

  if (!customerInfo.email && paymentIntent.receipt_email) {
    customerInfo.email = paymentIntent.receipt_email;
  }

  // Authoritative source for Payment Link / Checkout Session data.
  // The session's customer_details contains the name/email/phone collected at
  // checkout. When Payment Links use a "full_name" custom field,
  // customer_details.name may be null and the name lives in
  // session.custom_fields instead — read both.
  if (!customerInfo.email || !customerInfo.name || !customerInfo.phone) {
    const sessions = await stripeInstance.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1,
    });
    const session = sessions.data[0];
    if (session) {
      const cd = session.customer_details || {};
      // Try custom_fields.full_name (Payment Link convention).
      let customFieldName = null;
      if (Array.isArray(session.custom_fields)) {
        const nameField = session.custom_fields.find(
          (f) => f && f.key === "full_name"
        );
        if (nameField && nameField.text && nameField.text.value) {
          customFieldName = nameField.text.value;
        }
      }
      customerInfo = {
        email: customerInfo.email || cd.email || null,
        name:  customerInfo.name  || cd.name  || customFieldName || null,
        phone: customerInfo.phone || cd.phone || null,
      };
    }
  }

  // Last resort: latest charge billing_details (useful for non-Checkout flows).
  if (!customerInfo.email || !customerInfo.name || !customerInfo.phone) {
    const chargeId = paymentIntent.latest_charge;
    if (chargeId) {
      const charge = await stripeInstance.charges.retrieve(chargeId);
      const bd = charge.billing_details || {};
      customerInfo = {
        email: customerInfo.email || bd.email || null,
        name:  customerInfo.name  || bd.name  || null,
        phone: customerInfo.phone || bd.phone || null,
      };
    }
  }

  if (!customerInfo.email) {
    throw new Error(`No customer email found on PaymentIntent ${paymentIntentId}`);
  }

  // Get or create Stripe customer
  const stripeCustomer = await findOrCreateStripeCustomer(customerInfo);

  // Fetch used hashes for this amount to avoid repeats
  const usedHashes = await getUsedHashes(amountCents);

  // Assign services (amount in dollars)
  const amountDollars = amountCents / 100;
  const { services, hash, total, source } = assignServices(amountDollars, usedHashes);

  console.log(
    `[webhook] ${paymentIntentId} | $${amountDollars} | ${services.length} items | source: ${source} | hash: ${hash.slice(0, 8)}...`
  );

  // Create & pay invoice in Stripe
  const invoice = await createAndPayInvoice(
    stripeCustomer,
    services,
    paymentIntentId
  );

  // Persist customer + invoice in Supabase
  const dbCustomer = await upsertCustomer({
    email:            customerInfo.email,
    name:             customerInfo.name,
    phone:            customerInfo.phone,
    stripeCustomerId: stripeCustomer.id,
  });

  await saveInvoice({
    customerId:            dbCustomer.id,
    stripeInvoiceId:       invoice.id,
    stripePaymentIntentId: paymentIntentId,
    amountCents,
    services,
    combinationHash:       hash,
  });

  console.log(`[webhook] Invoice ${invoice.id} created for ${customerInfo.email}`);
  return { invoiceId: invoice.id, services, total };
}

module.exports = { handlePaymentIntentSucceeded };
