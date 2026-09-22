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

Actual catalog data has not been approved merely because the algorithm passes tests.
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

Enabling the private catalog is separate from invoice emission. The existing paid-invoice
adapter still requires a verified captured payment, immutable scope and duplicate-invoice
review. This change does not enable automatic invoices or verify SouthBill draft settlement.
