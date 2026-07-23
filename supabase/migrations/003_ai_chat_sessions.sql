-- AI Manager chat history, promoted from a backend-only SQLite/psycopg2 table
-- into the tracked Supabase schema.
--
-- Previously `ai_conversation_turns` only ever existed because the FastAPI
-- backend ran `CREATE TABLE IF NOT EXISTS` against whatever Postgres
-- connection `DATABASE_URL` happened to point at (falling back to a local
-- SQLite file if that env var was missing). Since it was never part of this
-- migrations folder, it frequently didn't exist in the actual Supabase
-- project the frontend queries via `supabase.from('ai_conversation_turns')`
-- — that mismatch is why chat history looked like it "disappeared" and why
-- previous chats never showed up in the sidebar. This migration makes the
-- table (and a real notion of a chat "session") first-class here so the
-- schema the dashboard reads from and the schema the backend writes to are
-- guaranteed to be the same one.
--
-- One business can now have many sessions ("New chat" = a new row here),
-- each with its own ordered list of turns — instead of a single unbounded
-- conversation per business_id.

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

-- Backfill for anyone who already had the backend-only version of this table
-- with no session_id column at all.
alter table public.ai_conversation_turns
  add column if not exists session_id uuid references public.ai_chat_sessions(id) on delete cascade;

create index if not exists ai_conversation_turns_session_idx
  on public.ai_conversation_turns (session_id, created_at asc);

create index if not exists ai_conversation_turns_business_id_idx
  on public.ai_conversation_turns (business_id, created_at asc);

-- One default session per business that already has turns but no session yet,
-- so nobody's existing chat history goes silently missing after this migration.
insert into public.ai_chat_sessions (id, business_id, title, created_at, updated_at)
select gen_random_uuid(), t.business_id, 'Earlier conversation', min(t.created_at), max(t.created_at)
from public.ai_conversation_turns t
where t.session_id is null
group by t.business_id;

update public.ai_conversation_turns t
set session_id = s.id
from public.ai_chat_sessions s
where t.session_id is null
  and s.business_id = t.business_id
  and s.title = 'Earlier conversation';

alter table public.ai_chat_sessions enable row level security;
alter table public.ai_conversation_turns enable row level security;

drop policy if exists "Users manage own chat sessions" on public.ai_chat_sessions;
create policy "Users manage own chat sessions"
  on public.ai_chat_sessions for all
  using (auth.uid() = business_id)
  with check (auth.uid() = business_id);

drop policy if exists "Users manage own conversation turns" on public.ai_conversation_turns;
create policy "Users manage own conversation turns"
  on public.ai_conversation_turns for all
  using (auth.uid() = business_id)
  with check (auth.uid() = business_id);

drop policy if exists "Admins read all chat sessions" on public.ai_chat_sessions;
create policy "Admins read all chat sessions"
  on public.ai_chat_sessions for select
  using (public.is_admin());

drop policy if exists "Admins read all conversation turns" on public.ai_conversation_turns;
create policy "Admins read all conversation turns"
  on public.ai_conversation_turns for select
  using (public.is_admin());
