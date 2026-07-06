-- Run this in your Supabase SQL editor

create table if not exists customers (
  id                uuid primary key default gen_random_uuid(),
  email             text unique not null,
  name              text,
  phone             text,
  stripe_customer_id text unique,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists invoices (
  id                        uuid primary key default gen_random_uuid(),
  customer_id               uuid references customers(id) on delete cascade,
  stripe_invoice_id         text unique not null,
  stripe_payment_intent_id  text unique not null,
  amount_cents              integer not null,
  services                  jsonb not null,
  combination_hash          text not null,
  created_at                timestamptz default now()
);

-- Index for fast duplicate-combo lookups
create index if not exists idx_invoices_amount_hash
  on invoices(amount_cents, combination_hash);

-- Index for idempotency check
create index if not exists idx_invoices_payment_intent
  on invoices(stripe_payment_intent_id);

-- Atomic lock table. One row per payment intent currently being processed.
-- The PRIMARY KEY on stripe_payment_intent_id gives us a free UNIQUE
-- constraint — concurrent webhook deliveries that try to insert the same
-- row get a 23505 (unique_violation) and skip instead of racing each other.
create table if not exists payment_locks (
  stripe_payment_intent_id text primary key,
  created_at               timestamptz default now()
);
