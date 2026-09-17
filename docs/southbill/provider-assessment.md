# Capability assessment — 17 September 2026

## Confirmed for this workspace/account

- GET of all six products and their prices succeeded; exact names/descriptions/images/prices matched.
- GET /invoices?limit=1 and GET /payments?limit=1 returned HTTP 200, empty lists.
- GET /events?type=product.created&limit=1 returned HTTP 200, no authentic event fixture.
- Earlier incomplete POST /invoices calls returned field validation errors. No invoice was created.
- API key remains in the parent workspace's ignored .env.local; it has not been committed or copied into artifacts.
- The user selected the six-service catalog and open-amount/payment-first flow.
- The user identified the existing Vercel project pulseaw-web-site in info-93809322s-projects.

## Published contracts reviewed

- Merchant API: https://www.southbill.com/docs/api/checkout-sessions
- Invoice operations: https://www.southbill.com/docs/api/invoices
- Payments: https://www.southbill.com/docs/api/payments
- Canonical event retrieval: https://www.southbill.com/docs/api/events
- Webhook configuration/testing: https://www.southbill.com/docs/webhooks/overview
- Raw-body signature: https://www.southbill.com/docs/webhooks/signature-verification
- Exact event types: https://www.southbill.com/docs/webhooks/events

The current merchant webhook overview explicitly says mode is always live, and describes ping.test
as synthetic. It conflicts with older API-key text mentioning Test. No simulated merchant payment
facility is established. A real payment/refund is not an authorized substitute for a simulated test.

The invoice reference documents create/update/get/send/void/mark_paid, but not attachment of an
already captured payment. Setting metadata is not attachment. mark_paid is out-of-band recording.
The App API's OpenAPI and Stripe endpoints are not substitutes for the merchant contract.

## UI evidence, not merchant proof

The published product form has Customer chooses amount with min/max/preset.
The published invoice UI includes open/partial payment settings, and its hosted page requests an amount.
These indicate provider UI capability; they do not establish a permanent product link, supported public
API parameters, buyer/scope correlation, or a payment-first invoice attachment flow for PulseAW.

Cash App Pay is listed in the SouthBill method catalog for USD/US. Its account activation and PulseAW
eligibility remain unverified. Its presence in a catalog is not an enabled payment method.

## Still missing

- Confirmed merchant ID, partner/rail and account-specific capabilities.
- Dedicated webhook endpoint/signing secret and an authentic signed delivery.
- Confirmed PulseAW database/project and isolated deployment authorization.
- Permanent open-amount link contract and trusted buyer/scope mapping.
- Original-payment association, generic-invoice reconciliation and paid-document delivery.
- Recovery worker scheduling and provider-level validation.

Local tests and a successful Next build do not certify any of these items.
