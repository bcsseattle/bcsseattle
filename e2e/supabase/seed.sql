-- Reference data for the E2E stack. Per-scenario data (users, members,
-- elections, fundraisers, donations) is created by e2e/support/db.ts instead.

-- Production has this trigger in the `auth` schema, which `db dump` of public
-- doesn't include (verified against prod 2026-11-08).
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.organization (name, address, city, state, zip, country, phone, email, ein, description)
VALUES ('Baloch Community Services of Seattle', '123 Test Ave', 'Seattle', 'WA', '98101', 'USA',
        '206-555-0100', 'info@example.test', '00-0000000', 'E2E test organization');

INSERT INTO public.programs (key, value, active) VALUES
  ('general-purpose', 'General Purpose', true),
  ('funeral-and-burial', 'Funeral and Burial', true),
  ('youth-programs', 'Youth Programs', true);

INSERT INTO public.election_positions (election_type, position, display_order, description) VALUES
  ('leadership', 'President', 1, 'Leads the organization'),
  ('leadership', 'Secretary', 2, 'Keeps records'),
  ('leadership', 'Treasurer', 3, 'Manages finances');

-- Membership and contribution plans: only rendered from these rows in the
-- suite, never checked out, so the Stripe ids are placeholders. The donation
-- product needs a real Stripe *test* product and is created by
-- e2e/support/stripe.ts (ensureDonationProduct) at suite start.
INSERT INTO public.products (id, active, name, description, metadata) VALUES
  ('prod_e2e_membership', true, 'Membership Fee',
   'A one-time fee to become a member of Baloch Community Services of Seattle', '{"type": "membership"}'),
  ('prod_e2e_contribution', true, 'Contribution Plans', 'Contribution plan for BCS Seattle', '{"type": "contribution"}');

INSERT INTO public.prices (id, product_id, active, unit_amount, currency, type, interval, interval_count, trial_period_days, metadata) VALUES
  ('price_e2e_membership', 'prod_e2e_membership', true, 2000, 'usd', 'one_time', null, null, 0, null),
  ('price_e2e_monthly', 'prod_e2e_contribution', true, 500, 'usd', 'recurring', 'month', 1, 0, '{"type": "contribution"}'),
  ('price_e2e_six_months', 'prod_e2e_contribution', true, 3000, 'usd', 'recurring', 'month', 6, 0, '{"type": "contribution"}'),
  ('price_e2e_annual', 'prod_e2e_contribution', true, 6000, 'usd', 'recurring', 'year', 1, 0, '{"type": "contribution"}');

-- "BCS Donation": product id must exist in the Stripe test account (checkout
-- sends it as price_data.product). e2e/support/stripe.ts creates it with this
-- fixed id if missing. Price rows only need to exist here: the app builds
-- price_data itself and never sends these price ids to Stripe.
INSERT INTO public.products (id, active, name, description, metadata) VALUES
  ('prod_e2e_bcs_donation', true, 'BCS Donation', 'Contribute to support additional work of BCS Seattle', '{"type": "donation"}');

INSERT INTO public.prices (id, product_id, active, unit_amount, currency, type, interval, interval_count, trial_period_days) VALUES
  ('price_e2e_donation_once', 'prod_e2e_bcs_donation', true, null, 'usd', 'one_time', null, null, 0),
  ('price_e2e_donation_month', 'prod_e2e_bcs_donation', true, 10000, 'usd', 'recurring', 'month', 1, 0),
  ('price_e2e_donation_year', 'prod_e2e_bcs_donation', true, 10000, 'usd', 'recurring', 'year', 1, 0);
