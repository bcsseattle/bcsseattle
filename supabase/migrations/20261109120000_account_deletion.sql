-- Account deletion (docs/mobile-app-plan.md §5.1, option (a), approved 9 Nov 2026).
--
-- Deleting an auth user must remove the person's own data but keep records
-- the organisation has to retain: votes (past results must not change),
-- donations and invoices (tax and bookkeeping), audit logs, and content
-- admins created. Those rows stay, with their link to the person set to NULL.
--
--   deleted with the user (CASCADE): users, customers, subscriptions,
--     nominations, feature_flags.user_id (unchanged)
--   kept, link cleared (SET NULL): votes, vote_sessions, vote_confirmations,
--     donors, fundraiser_donations, candidates, members, audit_logs and the
--     created_by of elections, fundraisers, fundraiser_updates, feature_flags
--
-- The member row is anonymised by /api/app/account/delete before the user is
-- deleted; this migration only makes sure the delete can't fail or cascade
-- into records that must stay.

-- Votes: kept anonymously. NULLs don't collide in the unique indexes.
ALTER TABLE public.votes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.votes DROP CONSTRAINT votes_user_id_fkey,
  ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.vote_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.vote_sessions DROP CONSTRAINT vote_sessions_user_id_fkey,
  ADD CONSTRAINT vote_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.vote_confirmations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.vote_confirmations DROP CONSTRAINT vote_confirmations_user_id_fkey,
  ADD CONSTRAINT vote_confirmations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- The person's own rows go with them.
ALTER TABLE public.users DROP CONSTRAINT users_id_fkey,
  ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.customers DROP CONSTRAINT customers_id_fkey,
  ADD CONSTRAINT customers_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_user_id_fkey,
  ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Rows that reference users or customers: kept, link cleared.
-- (members.user_id was CASCADE and members.stripe_customer_id CASCADE: either
-- would have deleted the member row, which invoices must keep pointing at.)
ALTER TABLE public.members DROP CONSTRAINT members_user_id_fkey,
  ADD CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.members DROP CONSTRAINT members_stripe_customer_id_fkey,
  ADD CONSTRAINT members_stripe_customer_id_fkey FOREIGN KEY (stripe_customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.donors DROP CONSTRAINT donors_user_id_fkey,
  ADD CONSTRAINT donors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.candidates DROP CONSTRAINT candidates_user_id_fkey,
  ADD CONSTRAINT candidates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.fundraiser_donations DROP CONSTRAINT fundraiser_donations_donor_id_fkey,
  ADD CONSTRAINT fundraiser_donations_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_user_id_fkey,
  ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Content an admin created stays when that admin deletes their account.
ALTER TABLE public.elections DROP CONSTRAINT elections_created_by_fkey,
  ADD CONSTRAINT elections_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.feature_flags DROP CONSTRAINT feature_flags_created_by_fkey,
  ADD CONSTRAINT feature_flags_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.fundraisers ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.fundraisers DROP CONSTRAINT fundraisers_created_by_fkey,
  ADD CONSTRAINT fundraisers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.fundraiser_updates ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.fundraiser_updates DROP CONSTRAINT fundraiser_updates_created_by_fkey,
  ADD CONSTRAINT fundraiser_updates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
