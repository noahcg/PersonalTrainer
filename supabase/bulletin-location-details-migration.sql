-- Adds structured meeting spot details for session bulletin locations.
-- Run once in the Supabase SQL editor.

alter table public.bulletin_posts
  add column if not exists session_location_details jsonb;
