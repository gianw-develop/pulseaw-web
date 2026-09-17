# PulseAW / SouthBill integration

Status: implemented and tested; Supabase schema and Vercel server configuration provisioned. Financial fulfillment and the live webhook receiver remain disabled pending the SouthBill contract and signing secret.

The approved scope preserves PulseAW's six existing services and implements the groundwork for:
open amount -> confirmed payment -> exact authorized service allocation -> detailed invoice.
The existing website and `stripe-automation` are not migrated or modified.

## What is installed

- Server catalog derived from `app/engagements.ts`, with the six verified SouthBill product/price IDs.
- Deterministic exact allocation, integer cents, one line per eligible service and no invented fillers.
- Raw-body HMAC-SHA256 verification with five-minute tolerance and signing-secret rotation.
- `POST /api/webhooks/southbill`: commits an event before acknowledging it.
- Private PostgreSQL inbox, immutable agreements/payment totals/invoice plans, leases and bounded retries.
- Retrieval of the canonical event and payment with the merchant API before reconciliation.
- Refund/dispute events retain a manual-review state even when older success events arrive later.
- A local draft invoice payload containing the actual services, original payment reference and exact total.
- `POST /api/internal/southbill/process`: authenticated, bounded queue worker for recovery.
- Operator commands, a private schema migration and tests using a real embedded PostgreSQL engine.
- Authenticated POST /api/internal/southbill/health verifies the deployed database connection without processing an event.

No method creates an invoice, opens another collection attempt, uses mark_paid or processes a charge.
Original-payment attachment and paid-document delivery require a verified SouthBill implementation.
An environment flag cannot enable a nonexistent payment-attachment adapter.

## Catalog behavior

Prices: USD 1,500; 2,800; 3,900; 4,900; 6,500; 8,000.
All are one-time engagements. A product may only appear once in a confirmed scope.
The full set has 55 distinct representable totals, from USD 1,500 through 27,600.
These are mathematical possibilities, not permission to combine overlapping services.

Examples:
- USD 4,900 -> Paid Acquisition Launch, only when that work was approved.
- USD 4,300 -> Market Entry Blueprint + Lead Conversion System, only when both were approved.
- USD 8,000 -> Founder Growth Launch when eligible; an approved Market + Signature scope can also total 8,000.
- USD 4,000, USD 26,190 or amounts with cents -> no invented invoice lines; review required.

A reusable public link does not establish the buyer's agreed scope. A trusted agreement must bind the
provider's actual payment ID and order reference to consent evidence, the catalog version, buyer and tax review.
The operator importer is server-only and is not an endpoint for browser-supplied approval flags.
No automatic refund policy has been authorized for unsupported amounts.

## Validation and operator commands

Requires Node.js 24 (Node strip-types is used for the operator scripts and tests).

```sh
npm ci
npm test
npm run build
npm run lint
npm run southbill -- catalog
npm run southbill -- verify-catalog
npm run southbill -- status
```

The operator command reads an ignored `.env.local` when present. Start from `.env.southbill.example`;
never copy secrets into README, state, GitHub, a browser bundle or chat.

After confirming the actual PulseAW database, merchant ID and mode:

```sh
npm run southbill -- migrate --apply
npm run southbill -- register-agreement .southbill/private-reviewed-order.json
npm run southbill -- process
npm run southbill -- requeue evt_actual_event_id
```

Registering an agreement is an attestation by the operator: source contract, consent and tax treatment
must have been reviewed. It is immutable. The expectedPaymentId must be the canonical ID returned by
SouthBill GET /payments, not a guessed session or a user-entered amount.

The migration creates only the `pulseaw_southbill` private schema. Do not expose it through a public
Data API; use a database role restricted to this schema. Configure TLS in the connection URL, using
the database provider's verified settings. No TLS certificate checks are disabled by this code.

## Supabase connection

The owner confirmed project rzyvatbujushojhryohf (info@pulseaw.com's Project) on 2026-09-17.
The private schema is installed. The retired profiles/loans/transactions schema and its signup trigger
were removed after explicit cleanup authorization, a private backup and an offline restoration check.
Supabase Auth accounts were preserved. Backup files remain in ignored local storage.

The runtime role pulseaw_southbill_runtime has SELECT/INSERT/UPDATE on the four SouthBill tables and
USAGE on their private schema. It cannot access the auth schema. A real connection using this role and
full TLS verification succeeded.

For the Vercel runtime, obtain the shared transaction-pooler connection from the confirmed project's
Connect dialog. Copy its actual host and role/project username; do not infer the pooler host from a region.
Use a dedicated server role restricted to the private `pulseaw_southbill` schema and store the complete
PostgreSQL URL only in `SOUTHBILL_DATABASE_URL`. A Supabase project HTTPS URL, publishable key or
service-role API key is not a PostgreSQL connection string. Leave this private schema out of the Data API.

Run the migration over a direct connection, or a session-pooler connection when the local network
cannot reach the direct endpoint. Verify the project reference and existing schema before applying it.
The adapter uses parameterized queries without named prepared statements, and transactions retain one
checked-out client. The adapter requires verified TLS and uses one pooled connection per instance. Set
SOUTHBILL_DATABASE_CA to the official Supabase root CA PEM (literal or escaped newlines). Conflicting
URL SSL options and verification downgrades are rejected. Review connection limits for the hosting plans.

Source: [Supabase database connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
and [database roles](https://supabase.com/docs/guides/database/postgres/roles).

## Intended deployment

- Repository: gianw-develop/pulseaw-web.
- Original project: https://vercel.com/info-93809322s-projects/pulseaw-web-site
- Domain: https://pulseaw.com/
- New webhook path after deployment: /api/webhooks/southbill.
- No new Vercel project, DNS change, Stripe key change or existing-link deactivation.

Use the isolated CLI sessions already authorized for this workspace. The credentials and npm caches
are ignored by Git. Vercel identity business-aw was verified against the selected project.

```powershell
npx --yes --cache .southbill/npm-cache-vercel vercel@59.20.0 --global-config .vercel-auth --scope info-93809322s-projects projects inspect pulseaw-web-site
$env:SUPABASE_HOME = Join-Path (Get-Location).Path '.southbill/supabase-auth'
$env:SUPABASE_NO_KEYRING = '1'
npx --yes --cache .southbill/npm-cache-supabase supabase@2.117.0 --output json projects list
```

Do not omit the isolated configuration when running later commands. Set the Vercel project explicitly
to prj_A8bpbNn1kNoFeDj4C6mYDr27HVwe and the Supabase project explicitly to rzyvatbujushojhryohf.

Set SOUTHBILL_ENABLED=false until merchant, database and signing secret are verified.
When enabled, this version ONLY observes/reconciles and creates LOCAL invoice plans. It never fulfills
services or generates a provider invoice. Never advertise the open-link workflow as operational.

After deployment, add the endpoint in SouthBill Developers -> Webhooks. Store its one-time whsec secret
in the selected Vercel project's secure environment. Use an endpoint dedicated to this merchant/mode.
Subscribe to checkout.session.completed, payment_intent.succeeded, invoice.paid, invoice.payment_succeeded,
checkout.session.refunded, charge.refunded, refund.*, charge.dispute.*, checkout.session.dispute.*,
checkout.session.expired, checkout.session.canceled, checkout.session.async_payment_pending and
checkout.session.async_payment_failed. Expand event families into documented individual event names.

The dashboard's signed ping.test proves delivery only. The after-response worker processes a queued job;
a separately authenticated scheduler must invoke the recovery worker for retries and backlog, with a
Bearer SOUTHBILL_WORKER_TOKEN of at least 32 characters. Schedule availability depends on the actual
hosting plan and has not been configured. Do not rely solely on after() for reliable retries.

## Before activating the requested financial flow

1. Confirm merchant identity, actual partner/rail, approved methods and PulseAW eligibility.
2. Confirm a permanent open-amount link, its bounds and how each event maps to the agreed order.
3. Obtain a documented API associating the ORIGINAL captured payment to the detailed invoice.
4. Verify a single authoritative invoice per payment, including provider-generated invoices.
5. Verify paid-document access/delivery without reopening collection.
6. Define unsupported amounts/cents and refund handling; review tax treatment.
7. Authorize any real-payment test separately. Merchant docs currently say live only.

See [provider assessment](provider-assessment.md) and [provider questions](support-questions.md).

## Verification performed

- Skill toolkit: 20 offline tests passed.
- PulseAW integration: 31 tests passed, including persistent PostgreSQL close/reopen, exclusive leases, duplicate events, invalid signatures and refund ordering. These use synthetic provider responses.
- New merchant read adapter: all six live product/price pairs verified with no writes.
- Next.js production build and ESLint pass. Next.js upgraded from 16.2.9 to 16.3.5; npm audit reports zero vulnerabilities in the root dependency tree.
- HTTP smoke check: homepage 200, disabled webhook 503, unauthorized worker 401.
- No real charge, provider invoice, paid-invoice attachment, hosted open link or live webhook delivery has been tested.
