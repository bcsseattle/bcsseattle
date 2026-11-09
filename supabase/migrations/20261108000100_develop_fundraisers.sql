-- Schema that exists on `develop` but NOT in production (checked 2026-11-08 by
-- dumping project tljjvmdmahkrvklyrdqq: no fundraiser tables there, although
-- `supabase migration list` marks 20250807000000/010000 as applied).
--
-- This file reproduces the *net effect* of these app migrations, in order:
--   20250807000000_add_fundraiser_tables.sql      (the variant the code + types_db.ts use)
--   20250807001000_add_fundraiser_category_enum.sql
--   20250807010000_add_fundraiser_fields.sql
--   20250809000000_add_minimum_donation_to_fundraisers.sql
--   20250809010000_create_fundraiser_donors_table.sql
--   20250809020000_update_donation_rls_policies.sql
-- Deliberately left out:
--   * the two other 20250807000000_* variants (conflicting duplicates, BUG-027)
--   * 20250807002000_add_profiles_table.sql: prod kept the `users` version of
--     handle_new_user and the code never reads `profiles`
--   * the "Admins can view all donations" policy: it references `user_roles` and
--     `fundraiser_moderators`, which don't exist, so it can't be created
--   * 20250809010000's `trigger_set_timestamp()` trigger: that function doesn't exist
-- Keep this file in sync if develop's fundraiser migrations change.

CREATE TYPE public.fundraiser_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE public.fundraiser_category AS ENUM (
  'general', 'emergency', 'medical', 'education', 'community', 'funeral', 'zakat', 'other'
);

CREATE TABLE public.fundraisers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  goal_amount integer NOT NULL,
  current_amount integer DEFAULT 0,
  status public.fundraiser_status DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  ends_at timestamptz,
  image_url text,
  category public.fundraiser_category,
  beneficiary text,
  minimum_donation numeric(10,2) DEFAULT 0,
  enable_recurring boolean DEFAULT false,
  CONSTRAINT chk_minimum_donation_positive CHECK (minimum_donation IS NULL OR minimum_donation >= 0)
);

CREATE TABLE public.fundraiser_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fundraiser_id uuid REFERENCES public.fundraisers(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.fundraiser_donors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email varchar(255),
  full_name varchar(255),
  phone varchar(20),
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_fundraiser_donors_email ON public.fundraiser_donors(email);

CREATE TABLE public.fundraiser_donations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fundraiser_id uuid REFERENCES public.fundraisers(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  donor_id uuid REFERENCES auth.users(id),
  donor_name text,
  message text,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  payment_intent_id text UNIQUE,
  payment_status text DEFAULT 'pending',
  fundraiser_donor_id uuid REFERENCES public.fundraiser_donors(id)
);

ALTER TABLE public.fundraisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraiser_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraiser_donations ENABLE ROW LEVEL SECURITY;
-- fundraiser_donors: no RLS, exactly as the migration leaves it (BUG-030).

CREATE POLICY "Fundraisers are viewable by everyone" ON public.fundraisers
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Fundraisers can be created by authenticated users" ON public.fundraisers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Fundraisers can be updated by creators" ON public.fundraisers
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Updates are viewable by everyone" ON public.fundraiser_updates
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Updates can be created by fundraiser creators" ON public.fundraiser_updates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT created_by FROM public.fundraisers WHERE id = fundraiser_id));
CREATE POLICY "Updates can be modified by creators" ON public.fundraiser_updates
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Donations are viewable by everyone" ON public.fundraiser_donations
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Donations can be created by authenticated users" ON public.fundraiser_donations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = donor_id);
CREATE POLICY "View non-anonymous donations" ON public.fundraiser_donations
  FOR SELECT USING (NOT is_anonymous OR auth.uid() = donor_id);
CREATE POLICY "Anyone can create donations" ON public.fundraiser_donations
  FOR INSERT WITH CHECK (true);

-- Trigger from add_fundraiser_tables: fires on 'succeeded', while the code writes
-- 'completed', so it never runs in practice (see PRD §6). Kept for fidelity.
CREATE OR REPLACE FUNCTION public.update_fundraiser_amount() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'succeeded' THEN
    UPDATE public.fundraisers SET current_amount = current_amount + NEW.amount WHERE id = NEW.fundraiser_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.payment_status = 'succeeded' AND OLD.payment_status != 'succeeded' THEN
    UPDATE public.fundraisers SET current_amount = current_amount + NEW.amount WHERE id = NEW.fundraiser_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.payment_status != 'succeeded' AND OLD.payment_status = 'succeeded' THEN
    UPDATE public.fundraisers SET current_amount = current_amount - OLD.amount WHERE id = NEW.fundraiser_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fundraiser_amount_trigger
  AFTER INSERT OR UPDATE ON public.fundraiser_donations
  FOR EACH ROW EXECUTE FUNCTION public.update_fundraiser_amount();

GRANT ALL ON public.fundraisers, public.fundraiser_updates, public.fundraiser_donors, public.fundraiser_donations
  TO anon, authenticated, service_role;
