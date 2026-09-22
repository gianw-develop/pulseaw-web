-- PulseAW invoice bookkeeping, authorized by the owner on 2026-09-22.
-- Run after schema.sql. No data is removed and no payment is created by this migration.
CREATE TABLE IF NOT EXISTS pulseaw_southbill.invoice_jobs (
 merchant_id text NOT NULL, livemode boolean NOT NULL, payment_id text NOT NULL,
 plan_hash text NOT NULL, reconciliation_key text NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','retry','paid','review')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts>=0),
 invoice_id text, search_cursor text, create_started_at timestamptz,
 lease_token text, lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 outcome_code text, paid_document_url text, completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (merchant_id,livemode,payment_id),
 UNIQUE (merchant_id,livemode,invoice_id), UNIQUE (merchant_id,livemode,reconciliation_key),
 FOREIGN KEY (merchant_id,livemode,payment_id) REFERENCES pulseaw_southbill.invoice_plans(merchant_id,livemode,payment_id)
);
CREATE INDEX IF NOT EXISTS southbill_pending_invoices ON pulseaw_southbill.invoice_jobs(merchant_id,livemode,status,next_attempt_at);
REVOKE ALL ON pulseaw_southbill.invoice_jobs FROM PUBLIC;
