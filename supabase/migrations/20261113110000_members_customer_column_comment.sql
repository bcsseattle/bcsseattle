-- W7: members.stripe_customer_id is easy to misread. It holds customers.id
-- (the member's user id, by its foreign key), not the Stripe customer id,
-- which is customers.stripe_customer_id. Renaming it would break the website,
-- the app and older app builds, so it's documented instead.
COMMENT ON COLUMN public.members.stripe_customer_id IS
  'customers.id (the member''s user id), NOT the Stripe customer id. The Stripe id is customers.stripe_customer_id: join through customers.';
