# Private allocation catalog

The public product catalog and the private invoice allocation catalog are separate.
The 12 individual public services (USD 5–200) and six original packages retain their
existing product IDs, prices and immutable agreement versions. They do not define
which amounts the private allocator can resolve.

## Private data boundary

PulseAW's GitHub repository is public. Actual private service names, descriptions,
prices, approval records and review documents belong in ignored `.southbill/private-catalog/`
and in the server-only `SOUTHBILL_INTERNAL_CATALOG_JSON` configuration, never in Git,
`app/`, `public/`, `NEXT_PUBLIC_*`, generated browser data, client props or a public API.
`.vercelignore` also excludes private local files from CLI source uploads.
The runtime configuration is a JSON object with a `catalogs` array; each entry is a
versioned private catalog document. Keep older documents while orders reference them.
Tests use synthetic services, not PulseAW's private business catalog.

The SouthBill invoice API accepts inline descriptions and integer `unit_amount` values.
Private items therefore need no public Product or Price and receive no invented IDs.
An individual invoice necessarily discloses its selected services to that customer;
the rest of the private catalog is not exposed.
Source: https://www.southbill.com/docs/api/invoices (reviewed 2026-09-22).

## Allocation policy

Exactly 37 genuine services, one at each USD price 6–35 and 43–49. With all items
eligible, every whole-dollar amount 6–200 can be represented using quantity-one lines.
Below USD 80, prefer the fewest lines. From USD 80, use three to five lines, prefer more
lines, then the smallest maximum price, spread and sum of squares. Stable hashes break
ties. Service names are never rotated to change the appearance of recurring orders.
The private allocator has its own `pulseaw-internal-v1-...` version and is never an
implicit fallback for a public product order. Catalog/version mismatches fail closed.
USD 5 is a separate public product, not part of this 37-price internal ladder.
Amounts with cents, outside the private range, or unsupported by the actual agreed
scope require review. No invented remainder fee, discount or amount adjustment is added.

## Review and activation

The owner approved the actual 37-entry catalog on 2026-09-22 after reviewing its service details and prices.
Every entry includes its deliverable, method/time, evidence, refund policy, tax category
and related public category. Confirm the business offers all entries at the stated prices.
A catalog document is `proposed` with `approval: null` until that review is complete.
Live agreement resolution accepts only `approved` with an approval reference, reviewer
and timestamp. Tax and actual customer scope remain separate per-order checks.

Read-only local preview, without a database or API write:

```sh
npm run southbill -- preview-internal .southbill/private-catalog/catalog.proposed.json 47 56 91 84
```

After owner approval, store the approved registry in the intended PulseAW Vercel
project's private server environment using the isolated CLI and stdin. Do not put real
data in a command argument, public PR or example file. The operator may inspect one
installed version with `npm run southbill -- internal-catalog VERSION`. Agreements
explicitly name that version and only the services actually eligible for their order.
Missing private configuration does not affect existing public agreements.

The private catalog and paid-invoice adapter are enabled in Production. Every invoice still requires a verified captured payment, immutable customer scope and duplicate-invoice review.

## Approved installation (2026-09-22)

The owner approved the complete 37-entry proposal. The approved registry is installed as
a sensitive Production environment variable in the existing PulseAW Vercel project.
Authenticated health checks report version, service count and exact-amount coverage,
without returning private names or descriptions. Production health verifies the approved catalog and the record_prior_payment invoice mode without exposing private service data.
