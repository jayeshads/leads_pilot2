create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_monthly integer not null default 0,
  campaign_limit integer not null default 0,
  leads_limit integer not null default 0,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.plans enable row level security;

create policy "Plans are viewable by everyone" on public.plans
  for select using (true);

create policy "Plans are manageable by admins" on public.plans
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
