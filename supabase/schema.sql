-- ─────────────────────────────────────────────
-- LeadPilot Phase 2 — Supabase SQL Schema
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────

-- 1. Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text not null,
  full_name text not null,
  telegram text,
  role text not null default 'client' check (role in ('client', 'admin')),
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  -- Admin panel: block/unblock a user's login access, and freeze/unfreeze
  -- their ability to spend, independently of each other (see migration 005).
  status text not null default 'active' check (status in ('active', 'blocked')),
  funds_frozen boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enable RLS
alter table public.profiles enable row level security;

-- 3. RLS Policies — profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Allow insert on signup"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 4. Create and update profiles from Supabase Auth.
-- This runs with database privileges because Confirm email returns no client session
-- until the user clicks the confirmation link.
create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone, full_name, telegram, email_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'telegram', ''),
    new.email_confirmed_at is not null
  )
  on conflict (id) do update
  set email = excluded.email,
      email_verified = excluded.email_verified,
      updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_profile_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_profile();

create trigger on_auth_user_profile_email_confirmed
  after update of email_confirmed_at, email on auth.users
  for each row execute function public.handle_auth_user_profile();

-- 5. Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────
-- LeadPilot Phase 3 — Dashboard tables
-- ─────────────────────────────────────────────

-- campaigns
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  objective text not null,
  daily_budget numeric(12,2) not null,
  status text not null default 'pending_review'
    check (status in ('pending_review','active','paused','completed','rejected')),
  notes text,
  meta_campaign_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  status text not null default 'new'
    check (status in ('new','contacted','qualified','converted','lost')),
  created_at timestamptz not null default now()
);

-- landing pages
create table if not exists public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null,
  url text,
  status text not null default 'draft' check (status in ('draft','live','paused')),
  views integer not null default 0,
  submissions integer not null default 0,
  created_at timestamptz not null default now()
);

-- creatives
create table if not exists public.creatives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null,
  type text not null check (type in ('image','video','carousel')),
  thumbnail_url text,
  file_url text,
  -- Real source/approval/archive state (see migration 004) — previously
  -- faked client-side from the row's array index after fetch.
  source text not null default 'uploaded' check (source in ('generated', 'uploaded')),
  is_approved boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  type text not null check (type in ('add_funds','spend')),
  status text not null default 'pending' check (status in ('pending','confirmed','failed')),
  note text,
  created_at timestamptz not null default now()
);

-- support tickets
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  last_reply_at timestamptz,
  created_at timestamptz not null default now()
);

-- ticket messages
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender text not null check (sender in ('user','admin')),
  content text not null,
  created_at timestamptz not null default now()
);

-- RLS for all Phase 3 tables
alter table public.campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.landing_pages enable row level security;
alter table public.creatives enable row level security;
alter table public.transactions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;

-- campaigns policies
create policy "Users manage own campaigns" on public.campaigns for all using (auth.uid() = user_id);

-- leads policies (via campaign ownership)
create policy "Users read own leads" on public.leads for select
  using (exists (select 1 from campaigns c where c.id = campaign_id and c.user_id = auth.uid()));

-- landing pages
create policy "Users manage own landing pages" on public.landing_pages for all using (auth.uid() = user_id);

-- creatives
create policy "Users manage own creatives" on public.creatives for all using (auth.uid() = user_id);

-- Storage bucket for uploaded/generated creative files (see migration 004).
insert into storage.buckets (id, name, public)
values ('creatives', 'creatives', true)
on conflict (id) do nothing;

create policy "Users upload own creative files"
  on storage.objects for insert
  with check (bucket_id = 'creatives' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users manage own creative files"
  on storage.objects for all
  using (bucket_id = 'creatives' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public read creative files"
  on storage.objects for select
  using (bucket_id = 'creatives');

-- transactions
create policy "Users manage own transactions" on public.transactions for all using (auth.uid() = user_id);

-- support tickets
create policy "Users manage own tickets" on public.support_tickets for all using (auth.uid() = user_id);

-- ticket messages
create policy "Users read own ticket messages" on public.ticket_messages for select
  using (exists (select 1 from support_tickets t where t.id = ticket_id and t.user_id = auth.uid()));
create policy "Users insert own ticket messages" on public.ticket_messages for insert
  with check (exists (select 1 from support_tickets t where t.id = ticket_id and t.user_id = auth.uid()));

-- updated_at trigger for campaigns
create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────
-- LeadPilot Phase 4 — Admin tables
-- ─────────────────────────────────────────────

-- Meta ad accounts
create table if not exists public.meta_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id text not null unique,
  account_name text not null,
  assigned_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active','paused','disconnected')),
  created_at timestamptz not null default now()
);

-- Metric visibility per user (admin toggles which metrics client can see)
create table if not exists public.user_metric_visibility (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric text not null,
  created_at timestamptz not null default now(),
  unique(user_id, metric)
);

-- RLS: only admins can manage meta_accounts & metric visibility
alter table public.meta_accounts enable row level security;
alter table public.user_metric_visibility enable row level security;

-- Admin-only helper function
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- profiles: admin full read + write access (see migration 005). Without
-- this, is_admin() itself can't be evaluated for any row but the caller's
-- own, and the entire admin panel (Overview counts, Users list, per-user
-- detail) silently returns nothing.
create policy "Admins read all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins update all profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Blocks a non-admin client from self-unblocking (status), self-unfreezing
-- (funds_frozen), or self-promoting (role) via the same "update own
-- profile" policy above. Skipped for the backend's direct Postgres
-- connection (no Supabase JWT context => auth.uid() is null there), which
-- is already gated by require_admin() at the API layer.
create or replace function public.prevent_profile_self_privilege_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.status is distinct from old.status
       or new.funds_frozen is distinct from old.funds_frozen
       or new.role is distinct from old.role then
      raise exception 'You are not allowed to change status, funds_frozen, or role on your own profile.';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_self_privilege_escalation();

-- meta_accounts: admin full access, clients can read own assigned
create policy "Admins manage meta accounts"
  on public.meta_accounts for all
  using (public.is_admin());

create policy "Clients read assigned meta account"
  on public.meta_accounts for select
  using (assigned_user_id = auth.uid());

-- user_metric_visibility: admin full access
create policy "Admins manage metric visibility"
  on public.user_metric_visibility for all
  using (public.is_admin());

create policy "Users read own metric visibility"
  on public.user_metric_visibility for select
  using (user_id = auth.uid());

-- Admin policies on existing tables
-- (allow admins to read all campaigns, leads, transactions, tickets)
create policy "Admins read all campaigns"
  on public.campaigns for select
  using (public.is_admin());

create policy "Admins update all campaigns"
  on public.campaigns for update
  using (public.is_admin());

create policy "Admins read all leads"
  on public.leads for select
  using (public.is_admin());

create policy "Admins manage all transactions"
  on public.transactions for all
  using (public.is_admin());

create policy "Admins manage all tickets"
  on public.support_tickets for all
  using (public.is_admin());

create policy "Admins manage all ticket messages"
  on public.ticket_messages for all
  using (public.is_admin());

-- Needed for the admin panel's per-user "full profile" view (campaigns,
-- wallet, ad account, creatives, landing pages) — these only had owner-only
-- policies before.
create policy "Admins read all creatives"
  on public.creatives for select
  using (public.is_admin());

create policy "Admins read all landing pages"
  on public.landing_pages for select
  using (public.is_admin());

-- ─────────────────────────────────────────────
-- LeadPilot Phase 5 — Meta Ads API tables
-- ─────────────────────────────────────────────

-- Add meta_lead_id + raw_data to leads table
alter table public.leads
  add column if not exists meta_lead_id text unique,
  add column if not exists raw_data jsonb;

-- Campaign insights (synced from Meta)
create table if not exists public.campaign_insights (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  date_preset text not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  spend numeric(12,2) not null default 0,
  reach bigint not null default 0,
  ctr numeric(8,4) not null default 0,
  cpc numeric(10,2) not null default 0,
  leads integer not null default 0,
  purchases integer not null default 0,
  date_start date,
  date_stop date,
  updated_at timestamptz not null default now(),
  unique(campaign_id, date_preset)
);

alter table public.campaign_insights enable row level security;

-- Clients can read own campaign insights
create policy "Users read own campaign insights"
  on public.campaign_insights for select
  using (exists (
    select 1 from campaigns c
    where c.id = campaign_id and c.user_id = auth.uid()
  ));

-- Admins manage all insights
create policy "Admins manage campaign insights"
  on public.campaign_insights for all
  using (public.is_admin());

-- Service role can upsert (used by Edge Functions)
create policy "Service role manages insights"
  on public.campaign_insights for all
  using (auth.role() = 'service_role');

create policy "Service role manages leads"
  on public.leads for insert
  with check (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- AI Manager chat history (sessions + turns)
-- One business can have many chat sessions ("New chat" creates a new row
-- in ai_chat_sessions); each session owns an ordered list of turns. This is
-- the same table the FastAPI backend's AI Manager reads/writes via
-- app/db/conversation_store.py, so it must exist here for real (not just be
-- created ad hoc by the backend) for chat history to persist and for the
-- dashboard's own Supabase queries to see it.
-- ─────────────────────────────────────────────
create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New chat',
  campaign_id uuid references public.campaigns(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_chat_sessions_business_id_idx
  on public.ai_chat_sessions (business_id, updated_at desc);

create table if not exists public.ai_conversation_turns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.ai_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_conversation_turns_session_idx
  on public.ai_conversation_turns (session_id, created_at asc);

create index if not exists ai_conversation_turns_business_id_idx
  on public.ai_conversation_turns (business_id, created_at asc);

alter table public.ai_chat_sessions enable row level security;
alter table public.ai_conversation_turns enable row level security;

create policy "Users manage own chat sessions"
  on public.ai_chat_sessions for all
  using (auth.uid() = business_id)
  with check (auth.uid() = business_id);

create policy "Users manage own conversation turns"
  on public.ai_conversation_turns for all
  using (auth.uid() = business_id)
  with check (auth.uid() = business_id);

create policy "Admins read all chat sessions"
  on public.ai_chat_sessions for select
  using (public.is_admin());

create policy "Admins read all conversation turns"
  on public.ai_conversation_turns for select
  using (public.is_admin());

-- ─────────────────────────────────────────────
-- LeadPilot Phase 1 Multi-Agent — ai_conversations table
-- ─────────────────────────────────────────────
create table if not exists public.ai_conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id),
    business_id uuid references public.profiles(id) on delete cascade,
    context jsonb not null default '{}'::jsonb,
    messages jsonb[] default array[]::jsonb[],
    stage text default 'start',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.ai_conversations enable row level security;

create policy "Users manage own ai_conversations"
  on public.ai_conversations for all
  using (auth.uid() = business_id)
  with check (auth.uid() = business_id);

create policy "Admins read all ai_conversations"
  on public.ai_conversations for select
  using (public.is_admin());

-- ─────────────────────────────────────────────
-- LeadPilot Phase 2 Multi-Agent — meta_connections table
-- ─────────────────────────────────────────────
CREATE TABLE if not exists public.meta_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    fb_user_id TEXT,
    fb_email TEXT,
    access_token TEXT NOT NULL,  -- encrypted in prod
    token_expires_at TIMESTAMPTZ,
    business_id TEXT,
    business_name TEXT,
    ad_account_id TEXT,
    ad_account_name TEXT,
    page_id TEXT,
    page_name TEXT,
    page_access_token TEXT,  -- never expires (page tokens don't expire)
    status TEXT DEFAULT 'pending',  -- pending | active | expired | revoked
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX if not exists idx_meta_conn_user ON public.meta_connections(user_id);
