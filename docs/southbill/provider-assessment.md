# Capability assessment — 22 September 2026

## Confirmed for PulseAW

- The owner selected the existing six-service catalog and open-amount/payment-first flow.
- All six original Live product/price pairs remain intact. The owner approved twelve additional individual services (USD 5–200); all twelve products and one-time prices were created and verified on 2026-09-22.
- GET /invoices, /payments and /events returned HTTP 200 with empty lists.
- GET /webhook_endpoints confirmed the enabled dedicated Live endpoint at
  https://www.pulseaw.com/api/webhooks/southbill with wildcard events. The saved signing-secret suffix matches.
- The owner confirmed Supabase project rzyvatbujushojhryohf. Its private schema and least-privilege
  runtime connection pass full TLS verification. Vercel project pulseaw-web-site is configured and deployed.
- The receiver is enabled. Locally signed Live-mode pings, duplicate detection, tamper rejection and
  mode rejection were checked over production HTTP. These are not authentic provider-originated events.
- Supabase pg_cron/pg_net recovery dispatch reached the production worker and processed a local fixture.
- The owner reports payouts restored; this has not been independently confirmed by a payout API.
- The owner chose Live-only configuration and declined Sandbox account/key creation. No real charge was made during installation.
- The active link, hosted page and global payment/invoice lists returned HTTP 200. The link-scoped purchases endpoint returned HTTP 500; the webhook and invoice worker do not depend on that endpoint.

## Current published Merchant API contracts

Primary pages reviewed 2026-09-22; saved copies are in ignored local research storage:

- [Checkout sessions](https://www.southbill.com/docs/api/checkout-sessions)
- [Payment links](https://www.southbill.com/docs/api/payment-links)
- [Invoices](https://www.southbill.com/docs/api/invoices)
- [Payments](https://www.southbill.com/docs/api/payments)
- [Events](https://www.southbill.com/docs/api/events)
- [Webhook endpoints](https://www.southbill.com/docs/api/webhook-endpoints)
- [Signature verification](https://www.southbill.com/docs/webhooks/signature-verification)
- [Event types](https://www.southbill.com/docs/webhooks/events)
- [Sandbox overview](https://www.southbill.com/docs/sandbox/overview)

Reusable payment links collect name, email, phone and billing address and cannot disable the latter
two fields. PulseAW therefore uses the documented Checkout Sessions API through /pay: the server
submits the agreed amount, name and email and redirects to the verified hosted checkout URL. The
customer page and the Live hosted checkout omit phone, billing address and order-reference inputs.
The former reusable payment link is inactive.

The current Sandbox documentation describes isolated merchant accounts and test keys; this supersedes
the earlier Live-only assessment. No Sandbox account or key was created in this task.

SouthBill support confirmed that mark_paid accepts an unsent draft, sends no payment-request email, creates no second payment or ledger entry and exposes the hosted invoice document after settlement. A payment link creates a payment and receipt but no invoice. The integration therefore records source_payment metadata, searches before creation and uses inv-payment-id idempotency. Metadata remains reconciliation evidence rather than a native payment attachment.

The current event list no longer documents product.created/product.updated. Catalog updates are not
accepted as proof of native webhook testing. Use a documented endpoint test or an authentic relevant
event and verify its delivery; never create a customer or charge merely to manufacture such evidence.

## Remaining account and per-order checks

- Confirm PulseAW method eligibility, including Cash App Pay, in the account and actual hosted checkout.
- Observe the first provider-originated signed payment delivery and validate its account-specific shape.
- Bind each payment to actual agreed services, buyer, consent evidence and reviewed tax treatment.
- Reject cents and any total unsupported by the approved order scope.
- Review refunds, disputes, already-open invoices and provider inconsistencies manually.

Automatic invoice emission is enabled for reviewed agreements through record_prior_payment. Local tests and production health prove the deployed controls; the first genuine customer payment will provide account-specific provider settlement evidence.

The latest Live read before activation returned zero payments and zero invoices. One USD 6 Live Checkout Session was opened only for browser verification and immediately expired; no payment, customer charge or invoice was created.