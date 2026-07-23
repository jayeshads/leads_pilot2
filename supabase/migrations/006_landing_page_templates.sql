-- Migration to create landing_page_templates

create table if not exists public.landing_page_templates (
  id text primary key,
  name text not null,
  category text not null,
  industry text not null,
  version text not null default 'v1.0.0',
  status text not null default 'draft' check (status in ('active', 'draft')),
  preview_url text,
  html_content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.landing_page_templates enable row level security;

-- Admins can manage all templates
create policy "Admins manage landing page templates"
  on public.landing_page_templates for all
  using (public.is_admin());

-- Everyone (authenticated) can read active templates
create policy "Users read active templates"
  on public.landing_page_templates for select
  using (status = 'active' or public.is_admin());

-- Updated at trigger
create trigger landing_page_templates_updated_at
  before update on public.landing_page_templates
  for each row execute function public.handle_updated_at();
