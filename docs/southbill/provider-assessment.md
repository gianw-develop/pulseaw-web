# Capability assessment — 22 September 2026

## Confirmed for PulseAW

- The owner selected the existing six-service catalog and open-amount/payment-first flow.
- All six Live product/price pairs were read again and matched the approved catalog.
- GET /invoices, /payments and /events returned HTTP 200 with empty lists.
- GET /webhook_endpoints confirmed the enabled dedicated Live endpoint at
  https://www.pulseaw.com/api/webhooks/southbill with wildcard events. The saved signing-secret suffix matches.
- The owner confirmed Supabase project rzyvatbujushojhryohf. Its private schema and least-privilege
  runtime connection pass full TLS verification. Vercel project pulseaw-web-site is configured and deployed.
- The receiver is enabled. Locally signed Live-mode pings, duplicate detection, tamper rejection and
  mode rejection were checked over production HTTP. These are not authentic provider-originated events.
- Supabase pg_cron/pg_net recovery dispatch reached the production worker and processed a local fixture.
- The owner reports payouts restored; this has not been independently confirmed by a payout API.
- The owner chose Live-only configuration and declined Sandbox account/key creation. No real charge is authorized.

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

Reusable payment links now have a documented Merchant API. Custom pricing plus allow_custom_amount
supports minimum/maximum amounts. Name, email, phone and billing address are collected; an optional
buyer note does not itself establish the contracted scope. A shared link reference is not a unique
order reference for every buyer. No permanent link has been created for the unfinished invoice flow.

The current Sandbox documentation describes isolated merchant accounts and test keys; this supersedes
the earlier Live-only assessment. No Sandbox account or key was created in this task.

The invoice API documents creation, draft updates, send, void, mark_paid and retrieval of payments
already booked against an invoice. It still does not document attaching an existing captured payment
to a newly created invoice. Metadata is not attachment. mark_paid records an out-of-band payment;
/send opens collection and can email the buyer. Neither is a substitute for the requested paid invoice.
The App API and Stripe API are separate contracts and must not be used to invent Merchant API endpoints.

The current event list no longer documents product.created/product.updated. Catalog updates are not
accepted as proof of native webhook testing. Use a documented endpoint test or an authentic relevant
event and verify its delivery; never create a customer or charge merely to manufacture such evidence.

## Still required before the requested financial workflow

- Confirm the actual payment partner, PulseAW's enabled methods and Cash App Pay eligibility.
- Observe a provider-originated signed delivery and validate authentic payment/event shapes.
- Bind each open-link payment to actual agreed services, buyer, consent evidence and reviewed tax treatment.
- The owner explicitly authorized mark_paid bookkeeping on 2026-09-22. Verify it can settle an unsent draft without opening collection, and retain the canonical original payment in the private reconciliation ledger.
- Prove one authoritative invoice per payment and paid-document delivery without reopening collection.
- Agree handling of unsupported amounts and cents. The six real services cannot exactly represent every amount.

Automatic invoice emission remains disabled pending direct draft settlement verification. The mark_paid
adapter is implemented with local provider fixtures only. Unit tests, a build, an endpoint HTTP 200 and an
operator-generated HMAC do not establish a completed payment or reconciled invoice.

The Merchant API returned zero payments, invoices and payment links on the latest Live read on
2026-09-22. There is no genuine existing payment available for a paid-invoice validation. No fictitious
Live payment, customer or invoice was created to manufacture that evidence.
