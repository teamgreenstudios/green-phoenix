-- Migration 0003 — pin search_path on our functions (security hardening).
--
-- Supabase's security advisor flags `function_search_path_mutable` on functions
-- that don't set a fixed search_path. Pinning it to '' prevents a search_path
-- injection vector. Both functions reference only schema-qualified (auth.jwt())
-- or pg_catalog built-ins, so an empty search_path is safe.
--
-- Apply in the SQL Editor, or via the Supabase MCP, against the existing project.

alter function public.set_updated_at() set search_path = '';
alter function public.is_allowed_user() set search_path = '';
