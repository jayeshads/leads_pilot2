-- Migration to add utr_number to transactions
alter table public.transactions
  add column if not exists utr_number text;
