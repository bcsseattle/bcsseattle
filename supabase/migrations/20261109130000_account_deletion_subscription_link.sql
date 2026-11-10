-- Account deletion, follow-up to 20261109120000: deleting a user cascades to
-- their subscriptions, and members.subscription_id (NO ACTION) then blocked
-- the whole delete ("Database error deleting user"). The member row is kept
-- (invoices point at it), so clear the link instead.
ALTER TABLE public.members DROP CONSTRAINT members_subscription_id_fkey,
  ADD CONSTRAINT members_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;
