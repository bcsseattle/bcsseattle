-- Election management (docs/election-management-plan.md §3, M1).
-- The statuses an admin decides. They're added on their own because Postgres
-- can't use a new enum value in the transaction that adds it; the next
-- migration backfills and constrains them.
ALTER TYPE public.election_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE public.election_status ADD VALUE IF NOT EXISTS 'ballot_locked';
ALTER TYPE public.election_status ADD VALUE IF NOT EXISTS 'certified';
ALTER TYPE public.election_status ADD VALUE IF NOT EXISTS 'archived';
