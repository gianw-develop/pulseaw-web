# Manual settlement of a previously captured payment

On 2026-09-22 the owner explicitly requested mark_paid after payment and a paid final invoice.
This overrides the earlier skill-level prohibition on substituting manual invoice bookkeeping.
It does not authorize inventing a payment, charging twice or reporting manual settlement as native attachment.

## Current state

The code is deployed behind SOUTHBILL_INVOICE_MODE. Keep its value disabled until the provider confirms
or demonstrates draft -> mark_paid -> paid without /send. The documented lifecycle shows mark_paid
from open, while /send opens collection and emails the buyer. There is no documented atomic create-paid
call. No genuine payment exists in this Live account yet. The owner declined Sandbox provisioning.

The adapter uses only documented /invoices and /invoices/{id}/mark_paid writes. It deliberately has no
/send method. If draft marking is rejected, it records review and retains the known invoice ID; it does
not email a payment request, report success or silently recreate the invoice. A provider draft can exist
between API calls or during failures. Zero intermediate drafts cannot be guaranteed by this API.

## Evidence before emission

- A canonical captured payment, correct account/mode, exact amount/currency and buyer email.
- A trusted immutable agreement with the actual services, consent, tax review and payment binding.
- invoiceReviewReference: operator evidence that no existing invoice already accounts for the payment.
  Include it before registering the immutable agreement. This is not a browser-supplied consent flag.
- Supported source checkout or payment_link and no existing invoice pointer on the payment.

The invoice notes and metadata state that this is a manual record of the original SouthBill payment.
The original payment ID is retained locally and in metadata; metadata alone is not a native association.

## Recovery and verification

invoice_jobs is private and unique per account/mode/payment. Exclusive leases prevent parallel workers
from issuing two invoices. Stable create/mark keys are saved by derivation from that binding.
A lost creation response is reconciled by metadata search before any repeated create. A repeated create
is allowed only within 23 hours of its original request, inside the documented 24-hour retention window.
After that, an unresolved result requires review. Pagination is bounded and fails closed.

Only a fresh paid invoice with matching lines, subtotal, zero reviewed tax, total, buyer, original-payment
reference, amount_paid=total, amount_due=0 and paid_at is recorded as paid. Its official paid URL is then
available through the private operator command. No invoice email is sent by this integration.
Refund/dispute review of the original payment also flags its completed manual invoice for accounting
review; this adapter does not claim that an original-payment refund automatically updates a manual invoice.

## Setup and operations

Apply invoice-schema.sql as the confirmed database administrator. Grant only SELECT/INSERT/UPDATE on
invoice_jobs to pulseaw_southbill_runtime; revoke PUBLIC/anon/authenticated access. Apply recovery.sql
after this migration. The scheduler includes pending invoice work and post-refund review.

After direct draft settlement is verified, configure SOUTHBILL_INVOICE_MODE=record_prior_payment in the
existing Vercel project and redeploy. User authorization for mark_paid is already present; do not ask again.
Until verification, leave the switch disabled while the existing webhook receiver remains enabled.

Commands (ignored environment file only):

```sh
npm run southbill -- register-agreement .southbill/reviewed-order.json
npm run southbill -- process-invoice
npm run southbill -- invoice-status
```

The recovery endpoint prioritizes one event; when the event queue is idle, it processes one bounded
invoice job. Initial processing, retries and invoice jobs share the existing private scheduler.

Validation: 53 tests pass, including lost create/mark responses, duplicate events, expired idempotency,
wrong amounts/customer, incomplete paid totals, exclusive leases, provider rejection and refund review.
These fixtures do not establish that the Live provider accepts direct draft settlement.

Sources: [Invoices](https://www.southbill.com/docs/api/invoices),
[Idempotency](https://www.southbill.com/docs/api/idempotency),
[Payments](https://www.southbill.com/docs/api/payments).
