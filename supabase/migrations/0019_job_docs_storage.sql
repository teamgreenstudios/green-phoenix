-- 0019: private storage bucket for tailored application documents.
--
-- The local `npm run sync` (service role) uploads each tailored job's generated docs from
-- Job Hunter's applications/<application_folder>/ into job-docs/<external_id>/<file>, so the
-- deployed /jobs board can offer real downloads (signed URLs via a Server Action).
--
-- Access model: uploads happen only via the service role (bypasses RLS) — no INSERT/UPDATE
-- policies on purpose. Reads are allowed only to allowlisted users via the same
-- public.is_allowed_user() gate used by every user-data table (0005): the Supabase project is
-- shared with the guest job board (jobhunt_guest schema), whose user must NOT see Rob's docs.

insert into storage.buckets (id, name, public)
values ('job-docs', 'job-docs', false)
on conflict (id) do nothing;

drop policy if exists "job docs readable by allowed users" on storage.objects;
create policy "job docs readable by allowed users"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'job-docs' and (select public.is_allowed_user()));
