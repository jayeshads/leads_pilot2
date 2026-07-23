-- Group 4 (Admin Panel — Overview & Users) fixes.
--
-- 1) The admin dashboard (Overview stat cards, Users list, and every "click
--    a user to see their full profile" view) queries `profiles` with the
--    signed-in admin's own Supabase session. There was NO RLS policy on
--    `profiles` granting admins read/write access to rows other than their
--    own — is_admin() itself even depends on reading `profiles`, so without
--    this the admin check silently fails everywhere. That's why Overview's
--    counts, Users' list, and expanded user detail all showed nothing.
--
-- 2) Two new columns to actually back "block user" and "freeze funds",
--    which had no persisted state anywhere before this.
--
-- 3) Admin read access to `creatives` and `landing_pages`, needed for the
--    admin's "full profile" view of a user (campaigns/wallet/ad account/
--    creatives/landing pages) — these tables only had owner-only policies.
--
-- 4) SECURITY FIX: `profiles` had a blanket "Users can update own profile"
--    policy with no column restriction. Once (2) adds `status` and
--    `funds_frozen`, that policy would let a blocked user simply
--    UPDATE profiles SET status='active' on themselves — and, since the
--    same policy has no restriction on `role` either, a client could also
--    UPDATE profiles SET role='admin' on themselves (a pre-existing
--    privilege-escalation hole, unrelated to this ticket but made
--    critical by it). A trigger closes both: it blocks changes to
--    status / funds_frozen / role coming from an authenticated,
--    non-admin PostgREST session, while leaving the backend's own direct
--    Postgres connection (DATABASE_URL, no Supabase JWT context —
--    auth.uid() is NULL there) untouched, since that path is already
--    gated by require_admin at the FastAPI layer (see app/auth.py).

-- 1) New columns on profiles.
alter table public.profiles
  add column if not exists status text not null default 'active' check (status in ('active', 'blocked')),
  add column if not exists funds_frozen boolean not null default false;

-- 2) Admin RLS on profiles (is_admin() is defined earlier in schema.sql /
-- migration 001; this migration must run after it, which it does).
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "Admins update all profiles" on public.profiles;
create policy "Admins update all profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- 3) Admin read access for the full-profile view.
drop policy if exists "Admins read all creatives" on public.creatives;
create policy "Admins read all creatives"
  on public.creatives for select
  using (public.is_admin());

drop policy if exists "Admins read all landing pages" on public.landing_pages;
create policy "Admins read all landing pages"
  on public.landing_pages for select
  using (public.is_admin());

-- 4) Close the self-unblock / self-promote hole opened by the new columns.
create or replace function public.prevent_profile_self_privilege_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- auth.uid() is only set on connections that went through Supabase's
  -- PostgREST layer with a JWT (i.e. the client SDK). The FastAPI backend's
  -- direct psycopg2 connection has no JWT context, so auth.uid() is NULL
  -- there and this check is skipped for it (that path is already
  -- authorized by require_admin() before the query runs).
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

drop trigger if exists profiles_prevent_self_privilege_escalation on public.profiles;
create trigger profiles_prevent_self_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_self_privilege_escalation();
