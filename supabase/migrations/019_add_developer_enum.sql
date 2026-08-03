-- STEP 1/2 — run this file ALONE first, then run 020.
-- PostgreSQL requires the new enum value to be committed before use.

alter type public.user_role add value if not exists 'developer';
