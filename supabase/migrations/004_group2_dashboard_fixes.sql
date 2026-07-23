-- Group 2 (User Dashboard) fixes.
--
-- 1) `creatives` previously had no columns to actually back "source"
--    (generated vs uploaded), "approved", or "archived" — the dashboard
--    faked all three from the row's array index after fetch
--    (`index % 2`, `index % 3`, `index > 12`), so they changed on every
--    reload and meant nothing. These are now real, persisted columns.
--
-- 2) A real Storage bucket for creative uploads. Before this, the upload
--    button never actually uploaded the selected file — it inserted a
--    hardcoded Unsplash stock photo URL instead (see the dev comment
--    removed from Creatives.tsx: "placeholder to preserve database
--    writes"). Files now go to Supabase Storage and the row stores the
--    real public URL.

alter table public.creatives
  add column if not exists source text not null default 'uploaded' check (source in ('generated', 'uploaded')),
  add column if not exists is_approved boolean not null default false,
  add column if not exists is_archived boolean not null default false;

-- Storage bucket for uploaded/generated creative files. Public read (these
-- are ad assets meant to be served to Meta / shown in previews); writes are
-- restricted to the owning user's own folder (`{user_id}/...`) below.
insert into storage.buckets (id, name, public)
values ('creatives', 'creatives', true)
on conflict (id) do nothing;

drop policy if exists "Users upload own creative files" on storage.objects;
create policy "Users upload own creative files"
  on storage.objects for insert
  with check (
    bucket_id = 'creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users manage own creative files" on storage.objects;
create policy "Users manage own creative files"
  on storage.objects for all
  using (
    bucket_id = 'creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public read creative files" on storage.objects;
create policy "Public read creative files"
  on storage.objects for select
  using (bucket_id = 'creatives');
