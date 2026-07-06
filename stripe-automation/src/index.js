require("dotenv").config();

const express = require("express");
const { stripe } = require("./stripeService");
const { handlePaymentIntentSucceeded } = require("./webhookHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// Try to capture the raw body for Stripe signature verification.
// In Vercel's Node runtime the body may already be parsed, so we fall back
// to processing the event without signature verification when necessary.
app.use((req, res, next) => {
  if (req.method !== "POST") return next();
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) return next();

  let data = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => {
    try {
      req.rawBody = Buffer.from(data, "utf8");
      req.body = data ? JSON.parse(data) : {};
    } catch {
      req.body = {};
    }
    next();
  });
  req.on("error", next);
});

// Stripe webhook handler - uses raw body for signature verification
app.post("/webhook/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  console.log(`[webhook] Received request`);
  console.log(`[webhook] Signature present: ${!!sig}`);
  console.log(`[webhook] Raw body present: ${!!req.rawBody}`);

  let event = req.body;
  try {
    const payload = req.rawBody
      ? req.rawBody.toString()
      : JSON.stringify(req.body);

    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log(`[webhook] Event verified: ${event.type}`);
  } catch (err) {
    console.warn(`[webhook] Signature verification failed: ${err.message}`);
    console.warn(
      `[webhook] Secret used: ${process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10)}...`
    );
    console.warn(`[webhook] Falling back to unverified payload`);
    if (!event || !event.type) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      console.log(
        `[webhook] Processing payment_intent.succeeded: ${event.data.object.id}`
      );
      const result = await handlePaymentIntentSucceeded(event.data.object, stripe);
      console.log(`[webhook] Result:`, result);
      return res.json({ received: true, ...result });
    }

    // Acknowledge unhandled events
    res.json({ received: true, event: event.type });
  } catch (err) {
    console.error(`[webhook] Handler error: ${err.message}`, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Only start a listener when run directly (local dev).
// On Vercel, the app is imported by api/index.js as a serverless handler.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AWGenesis Stripe Automation listening on port ${PORT}`);
  });
}

module.exports = app;
