-- 0011_jobs_status_expired.sql
-- Allow the "Expired" job status on the mirrored Job Hunter jobs table.
-- Job Hunter's /prune-jobs archives a no-longer-live posting as `Expired`
-- (terminal), so the disk-sync mirror must accept it or the upsert violates
-- the status CHECK from 0010_jobs.sql.

alter table public.jobs drop constraint if exists jobs_status_check;

alter table public.jobs add constraint jobs_status_check
  check (status in ('New', 'Interested', 'Tailored', 'Applied',
                    'Interviewing', 'Offer', 'Rejected', 'Passed', 'Expired'));
