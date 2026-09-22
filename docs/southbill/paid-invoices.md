# Recording an invoice for a previously captured payment

SouthBill support confirmed on 2026-09-22 that POST /v1/invoices/{id}/mark_paid works directly on an unsent draft. The integration does not call /send and therefore does not send a payment-request email.

After mark_paid, SouthBill returns a paid invoice with paid_at, amount_paid equal to the total, amount_due equal to zero and a public hosted_invoice_url. The invoice number is assigned at creation. SouthBill also confirmed that mark_paid does not create another payment or ledger entry; the original payment-link transaction remains the financial record.

## Production state

Production uses SOUTHBILL_INVOICE_MODE=record_prior_payment. The webhook receiver, Supabase ledger, recovery worker and private allocation catalog are enabled. The reusable Live link accepts a customer-entered whole-dollar amount from USD 6 through USD 200.

No real payment or invoice was created while installing or verifying this flow. The first genuine paid invoice will provide account-specific settlement evidence; provider failures remain visible as review states.

## Required evidence

Each invoice requires:

- A canonical succeeded SouthBill payment from checkout or payment_link.
- The exact account mode, amount, USD currency, customer name and customer email.
- A reviewed agreement containing the services actually purchased, consent evidence, tax review and the unique payment binding.
- invoiceReviewReference confirming that the operator checked for any invoice already representing the payment.
- Whole-dollar totals supported by the approved scope. Cents and unsupported totals stop for review.

A shared payment-link reference identifies the source link. It does not identify one customer order or authorize invoice services by itself.

## Duplicate prevention and recovery

The invoice stores source_payment, payment_record and reconciliation_ref metadata. Before creating anything, the worker scans existing invoices for source_payment or reconciliation_ref. Creation also uses the stable idempotency key inv-<payment_id>.

The draft is never sent. Only a verified draft can proceed to mark_paid. An invoice that is already open, void, mismatched or incomplete stops for review. Lost create or mark_paid responses are reconciled by rereading SouthBill; the worker does not blindly create another invoice.

Completion requires a fresh provider read that verifies:

- status paid;
- the exact customer, lines, subtotal, zero reviewed tax and total;
- a provider invoice number;
- amount_paid equal to total, amount_due equal to zero and paid_at present;
- a valid public SouthBill hosted invoice URL.

Refund or dispute activity on the original payment flags the completed invoice job for accounting review.

## Operator flow

1. Agree the services and whole-dollar total with the customer before sharing the link.
2. The customer pays through the Live link.
3. Verify the captured payment and confirm that no invoice already represents it.
4. Complete a private agreement with the real payment ID, buyer, service scope, consent, tax evidence and invoiceReviewReference.
5. Register the agreement. If its webhook event arrived first, requeue that real event.
6. The scheduled worker creates the unsent draft, marks it paid and stores the public document URL.

Commands:

~~~sh
npm run southbill -- register-agreement .southbill/reviewed-order.json
npm run southbill -- requeue EVENT_ID
npm run southbill -- process-invoice
npm run southbill -- invoice-status
~~~

The public repository contains no real client agreements or private catalog contents.

Validation: 69 tests, ESLint and the Next.js production build pass. Production health confirms the database, receiver, invoice mode and all 195 private whole-dollar allocations. These checks do not substitute for a genuine client payment.

Sources: [Invoices](https://www.southbill.com/docs/api/invoices), [Idempotency](https://www.southbill.com/docs/api/idempotency), [Payments](https://www.southbill.com/docs/api/payments).