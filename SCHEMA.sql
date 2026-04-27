-- =============================================
--  SUPABASE SCHEMA — DontWannaWork.com
--  Run this in Supabase SQL Editor
-- =============================================

-- Donations table
create table if not exists donations (
  id                        uuid primary key default gen_random_uuid(),
  stripe_payment_intent_id  text unique not null,
  name                      text not null default 'Anonymous',
  message                   text,
  amount                    integer not null,   -- in cents
  likes                     integer not null default 0,
  created_at                timestamptz not null default now()
);

-- Row Level Security
alter table donations enable row level security;

-- Anyone can read donations (for public donor wall)
create policy "Public read"
  on donations for select
  using (true);

-- Only the service role (webhook) can insert
create policy "Service insert only"
  on donations for insert
  with check (false);  -- blocked for anon; service role bypasses RLS

-- Anyone can increment likes (anon key allowed)
-- We allow updates only to the 'likes' column via a function
create or replace function increment_likes(donation_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update donations
  set likes = likes + 1
  where id = donation_id;
end;
$$;

-- Grant execute to anon role
grant execute on function increment_likes(uuid) to anon;

-- Index for performance
create index if not exists donations_created_at_idx on donations(created_at desc);

-- =============================================
--  VERCEL ENVIRONMENT VARIABLES CHECKLIST
-- =============================================
-- Add these in Vercel Dashboard > Project > Settings > Environment Variables:
--
--  STRIPE_SECRET_KEY         sk_live_...   (or sk_test_ for testing)
--  STRIPE_PUBLISHABLE_KEY    pk_live_...   (or pk_test_)
--  STRIPE_WEBHOOK_SECRET     whsec_...     (from Stripe Webhooks dashboard)
--  SUPABASE_URL              https://xxxx.supabase.co
--  SUPABASE_ANON_KEY         eyJ...        (safe to expose, RLS enforced)
--  SUPABASE_SERVICE_KEY      eyJ...        (server-only, never expose to browser)
--
-- =============================================
--  STRIPE WEBHOOK SETUP
-- =============================================
-- 1. Stripe Dashboard > Developers > Webhooks > Add endpoint
-- 2. URL: https://dontwannawork.com/api/webhook
-- 3. Events to listen for: payment_intent.succeeded
-- 4. Copy the signing secret → STRIPE_WEBHOOK_SECRET env var
