# PulseAW / SouthBill integration

Status (2026-09-22): the Live receiver, private Supabase ledger and Vercel server configuration are enabled. The owner subsequently authorized manual invoice settlement through mark_paid after a verified payment. That adapter is implemented but automatic emission remains disabled until direct draft-to-paid behavior is verified; native payment attachment is not claimed. Locally signed production probes are not provider-originated delivery or settlement evidence.

The approved scope preserves PulseAW's six existing packages and adds twelve individual services priced from USD 5 to 200. It implements the groundwork for:
open amount -> confirmed payment -> exact authorized service allocation -> detailed invoice.
The existing website and `stripe-automation` are not migrated or modified.

## What is installed

- Server catalog derived from `app/engagements.ts` and `app/individual-services.ts`, with 18 verified Live SouthBill product/price pairs.
- Deterministic exact allocation, integer cents, one line per eligible service and no invented fillers.
- Raw-body HMAC-SHA256 verification with five-minute tolerance and signing-secret rotation.
- `POST /api/webhooks/southbill`: commits an event before acknowledging it.
- Private PostgreSQL inbox, immutable agreements/payment totals/invoice plans, leases and bounded retries.
- Retrieval of the canonical event and payment with the merchant API before reconciliation.
- Refund/dispute events retain a manual-review state even when older success events arrive later.
- A local draft invoice payload containing the actual services, original payment reference and exact total.
- `POST /api/internal/southbill/process`: authenticated, bounded queue worker for recovery.
- Supabase pg_cron recovery every minute when due work exists, with a path-bound HMAC credential valid for 60 seconds.
- Operator commands, private schema/recovery migrations and tests using a real embedded PostgreSQL engine.
- Authenticated POST /api/internal/southbill/health verifies the deployed database connection without processing an event.

The invoice adapter can create an unsent invoice and call mark_paid only for a canonically verified
captured payment with a trusted agreement and duplicate-invoice review. This is manual bookkeeping
of previously received funds, authorized by the owner on 2026-09-22; it is not native payment attachment.
There is no send, checkout, charge or refund method in this adapter. Automatic emission is currently
disabled because SouthBill has not yet demonstrated draft -> mark_paid -> paid without /send.
An intermediate provider draft is inherent in its two-request API. Network recovery cannot guarantee
an immediate paid state during an outage; permanent rejection is recorded for review, never hidden.
Paid-document URLs are exposed only after a fresh read verifies paid, amount_paid=total and amount_due=0.
No automated invoice email delivery is implemented.

## Catalog behavior

Original package prices: USD 1,500; 2,800; 3,900; 4,900; 6,500; 8,000.
All are one-time engagements. A product may only appear once in a confirmed scope.
The original six-package set has 55 distinct representable totals, from USD 1,500 through 27,600.
These are mathematical possibilities, not permission to combine overlapping services.

Examples using the original six-package scope:
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

After confirming the actual PulseAW database, account-specific credentials and mode:

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

## Account configuration

The official Merchant API authenticates with the merchant API key. Webhooks use the endpoint's
signing secret. The published examples do not require an internal SouthBill merchant UUID.
Do not ask an operator to extract IDs from browser network requests.

PulseAW uses accountKey=pulseaw plus livemode as a private, stable ledger namespace. This is
an application label, not a provider-issued ID. For compatibility, the installed database column
is still named merchant_id; it stores accountKey. No SQL schema migration is needed. The receiver
was disabled and the ledger had no production events before this configuration correction.

SOUTHBILL_MERCHANT_ID is optional and must remain empty unless SouthBill supplies a verified
provider identity. If an authentic payload explicitly includes merchant_id without a configured
verified value, it fails closed with PROVIDER_MERCHANT_ID_UNVERIFIED. A configured mismatch is
also rejected. The internal accountKey must never be substituted for a provider merchant_id.
Agreements include accountKey and, only when configured, merchantId.

The dedicated endpoint secret, raw-body signature, explicit live mode and canonical event/payment
reads using this merchant's own API key remain mandatory. Verify all pinned catalog products
before enabling the receiver. Optional identity configuration does not certify delivery, payment
settlement or the post-payment invoice flow.

Sources: [Merchant authentication](https://www.southbill.com/docs/getting-started/api-keys),
[signature verification](https://www.southbill.com/docs/webhooks/signature-verification),
[event retrieval](https://www.southbill.com/docs/api/events).

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

Set SOUTHBILL_ENABLED=false until account-specific credentials, database and signing secret are verified.
SOUTHBILL_ENABLED controls webhook observation and LOCAL plans. The separate SOUTHBILL_INVOICE_MODE
must remain disabled until direct draft settlement is verified. record_prior_payment enables the
owner-authorized invoice adapter for reviewed agreements only. Never advertise an unverified flow as operational.

The existing dedicated Live endpoint is https://www.pulseaw.com/api/webhooks/southbill.
Its enabled state, wildcard subscription and saved signing-secret suffix were verified through
GET /webhook_endpoints on 2026-09-22. Unknown event types are safely ignored. The endpoint's native
Test delivery still needs to be observed; locally signed probes do not prove SouthBill delivery.

The after-response worker processes one queued job. Recovery is configured in the confirmed Supabase
project using server/southbill/recovery.sql. The private Vault secret pulseaw_southbill_worker_token
must match SOUTHBILL_WORKER_TOKEN in Vercel. Install/update this SQL as the project administrator only
after deploying support for Pulseaw-Worker-Signature. It upserts two PulseAW-only cron jobs: a minute
recovery dispatcher and daily seven-day execution-log retention. The dispatcher does not call Vercel
when no work is due. It sends only a 60-second, method/path-bound HMAC signature to pg_net, never the
master token. Supabase owns the network queue permissions. A short-lived signature can invoke the
idempotent worker only; it cannot authorize the health endpoint. Manual operator calls still accept
the private Bearer token. Only the administrator can execute the dispatcher or read its Vault secret.
Vercel's current Hobby plan does not support the required minute cron frequency.

## Before activating the requested financial flow

1. Confirm merchant identity, actual partner/rail, approved methods and PulseAW eligibility.
2. Confirm a permanent open-amount link, its bounds and how each event maps to the agreed order.
3. Verify direct draft-to-paid mark_paid behavior. The owner approved manual bookkeeping of the original payment; native payment attachment is not required for this alternative.
4. Verify a single authoritative invoice per payment, including provider-generated invoices.
5. Verify paid-document access/delivery without reopening collection.
6. Define unsupported amounts/cents and refund handling; review tax treatment.
7. Authorize any real-payment test separately. The owner selected Live-only configuration and declined Sandbox provisioning on 2026-09-22; this does not authorize a real charge.

See [provider assessment](provider-assessment.md) and [provider questions](support-questions.md).

## Verification performed

- Skill toolkit: 20 offline tests passed.
- PulseAW integration: 56 tests passed, including persistent PostgreSQL close/reopen, exclusive leases, duplicate events, invalid signatures and refund ordering. These use synthetic provider responses.
- Merchant read adapter: all 18 Live product/price pairs verified. Twelve approved products were provisioned in this account; no payment was made.
- Next.js production build and ESLint pass. Next.js upgraded from 16.2.9 to 16.3.5; npm audit reports zero vulnerabilities in the root dependency tree.
- Production HTTP checks: homepage 200; authenticated database health 200, receiver enabled; unsigned/tampered webhook 400; wrong-mode event 400. A locally signed ping was durably recorded, and a duplicate returned 200 without a second event.
- Supabase recovery dispatch reached the production worker and processed a labeled local ping fixture. Cron jobs are enabled; these are local transport/recovery checks, not provider payment tests.
- No real charge, provider invoice, paid-invoice attachment, hosted open link or provider-originated webhook delivery has been tested.

## Owner-authorized paid invoice adapter

See [manual invoice settlement](paid-invoices.md) for the account-specific release gate, operator commands,
reconciliation requirements and recovery behavior. The [USD 5–200 catalog](catalog-5-200-proposal.md) was approved and its 12 products were created and verified in Live. It supplements the six existing packages.

## Approved individual services

The twelve one-time prices are USD 5, 10, 15, 20, 25, 35, 50, 75, 100, 125, 150 and 200.
They are individual services, not a promise that every whole-dollar amount in that range is supported.
Each requires its actual approved scope; no invoice line is selected merely to explain a paid amount.
The allocator uses dynamic programming and preserves deterministic, quantity-one results. Legacy
agreements retain pulseaw-six-29a06da5c504b302 and reproduce their frozen invoice payload exactly.
New agreements use the current combined catalog version. No existing product or price was changed.
