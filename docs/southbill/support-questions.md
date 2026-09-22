# SouthBill support confirmation

SouthBill support confirmed the following account behavior on 2026-09-22:

1. POST /v1/invoices/{id}/mark_paid works directly on an unsent draft. Calling /send first is unnecessary, and no payment-request email is sent. The operation is rejected for invoices that are already paid, void or have an in-flight payment.
2. A successful mark_paid response has status paid, paid_at, amount_paid equal to the invoice total, amount_due equal to zero and a public hosted_invoice_url. Draft URLs return 404 until the invoice is marked paid. The invoice number exists from creation.
3. mark_paid does not create another payment or ledger entry. The original payment-link transaction remains in SouthBill balances and reporting.
4. A payment link creates a payment and SouthBill receipt, not an invoice. SouthBill performs no automatic link-payment to invoice matching.
5. To prevent duplicates, search invoice metadata for source_payment before creation and use Idempotency-Key inv-<payment_id>.
6. Include the original payment identifier and a reconciliation reference in invoice metadata.
7. customer_name is required when creating the invoice.

The integration implements this contract with a fail-closed worker and never calls the invoice send endpoint. Provider support confirmation supplements the public API documentation; it does not authorize inventing customer scope or treating metadata as a second payment.