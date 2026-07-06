const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Find or create a customer record. Returns the row.
 */
async function upsertCustomer({ email, name, phone, stripeCustomerId }) {
  const { data, error } = await supabase
    .from("customers")
    .upsert(
      {
        email: email.toLowerCase().trim(),
        name: name || null,
        phone: phone || null,
        stripe_customer_id: stripeCustomerId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw new Error(`Supabase upsertCustomer: ${error.message}`);
  return data;
}

/**
 * Save a completed invoice and its combination hash.
 */
async function saveInvoice({
  customerId,
  stripeInvoiceId,
  stripePaymentIntentId,
  amountCents,
  services,
  combinationHash,
}) {
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      customer_id: customerId,
      stripe_invoice_id: stripeInvoiceId,
      stripe_payment_intent_id: stripePaymentIntentId,
      amount_cents: amountCents,
      services,
      combination_hash: combinationHash,
    })
    .select()
    .single();

  if (error) throw new Error(`Supabase saveInvoice: ${error.message}`);
  return data;
}

/**
 * Retrieve all combination hashes already used for a given amount (in cents).
 */
async function getUsedHashes(amountCents) {
  const { data, error } = await supabase
    .from("invoices")
    .select("combination_hash")
    .eq("amount_cents", amountCents);

  if (error) throw new Error(`Supabase getUsedHashes: ${error.message}`);
  return (data || []).map((row) => row.combination_hash);
}

/**
 * Check whether a payment intent was already processed (idempotency guard).
 */
async function isPaymentProcessed(stripePaymentIntentId) {
  const { data, error } = await supabase
    .from("invoices")
    .select("id")
    .eq("stripe_payment_intent_id", stripePaymentIntentId)
    .maybeSingle();

  if (error) throw new Error(`Supabase isPaymentProcessed: ${error.message}`);
  return data !== null;
}

/**
 * Try to acquire an exclusive lock for processing a payment intent.
 * Returns true if the lock was acquired (row inserted), false if another
 * instance already holds it. Atomic via the UNIQUE constraint on
 * payment_locks.stripe_payment_intent_id (its PRIMARY KEY).
 */
async function tryAcquireLock(stripePaymentIntentId) {
  const { error } = await supabase
    .from("payment_locks")
    .insert({ stripe_payment_intent_id: stripePaymentIntentId });
  if (error) {
    // Postgres "unique_violation" — another instance holds the lock
    if (error.code === "23505") return false;
    throw new Error(`Supabase tryAcquireLock: ${error.message}`);
  }
  return true;
}

/**
 * Release the processing lock. Call on handler failure so a later retry can
 * re-attempt. On success, leave the lock in place — isPaymentProcessed()
 * will skip future retries cleanly.
 */
async function releaseLock(stripePaymentIntentId) {
  const { error } = await supabase
    .from("payment_locks")
    .delete()
    .eq("stripe_payment_intent_id", stripePaymentIntentId);
  if (error) {
    // Don't throw — releasing is best-effort cleanup.
    console.error(`[releaseLock] ${error.message}`);
  }
}

module.exports = {
  upsertCustomer,
  saveInvoice,
  getUsedHashes,
  isPaymentProcessed,
  tryAcquireLock,
  releaseLock,
};
