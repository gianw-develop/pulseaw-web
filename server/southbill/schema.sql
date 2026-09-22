-- Apply only to PulseAW's explicitly selected PostgreSQL database.
-- This private schema does not alter the legacy Stripe tables.
-- Legacy column name merchant_id stores our INTERNAL accountKey, not a SouthBill ID.
-- Provider merchant IDs, if verified, belong to the account configuration and payload.
CREATE SCHEMA IF NOT EXISTS pulseaw_southbill;
REVOKE ALL ON SCHEMA pulseaw_southbill FROM PUBLIC;

CREATE TABLE IF NOT EXISTS pulseaw_southbill.events (
  merchant_id text NOT NULL, livemode boolean NOT NULL, event_id text NOT NULL,
  event_type text NOT NULL, resource_id text, payload jsonb NOT NULL, payload_hash text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','retry','ignored','review','blocked','observed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  lease_token text, lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  outcome_code text, received_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, livemode, event_id)
);
CREATE INDEX IF NOT EXISTS southbill_pending_events ON pulseaw_southbill.events (merchant_id, livemode, status, next_attempt_at);
CREATE TABLE IF NOT EXISTS pulseaw_southbill.agreements (
  merchant_id text NOT NULL, livemode boolean NOT NULL, reference text NOT NULL,
  payment_id text NOT NULL, document jsonb NOT NULL, document_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, livemode, reference), UNIQUE (merchant_id, livemode, payment_id)
);
CREATE TABLE IF NOT EXISTS pulseaw_southbill.payment_records (
  merchant_id text NOT NULL, livemode boolean NOT NULL, payment_id text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0), currency text NOT NULL,
  provider_status text NOT NULL, manual_review boolean NOT NULL DEFAULT false,
  snapshot jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, livemode, payment_id)
);
CREATE TABLE IF NOT EXISTS pulseaw_southbill.invoice_plans (
  merchant_id text NOT NULL, livemode boolean NOT NULL, payment_id text NOT NULL,
  plan jsonb NOT NULL, plan_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('awaiting_provider_contract','ready_for_prior_payment_recording','review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, livemode, payment_id),
  FOREIGN KEY (merchant_id, livemode, payment_id)
    REFERENCES pulseaw_southbill.payment_records(merchant_id, livemode, payment_id)
);
REVOKE ALL ON ALL TABLES IN SCHEMA pulseaw_southbill FROM PUBLIC;
