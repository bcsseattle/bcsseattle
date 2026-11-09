-- Fundraiser write policies (BUG-017, BUG-079).

-- BUG-079: "Anyone can create donations" (WITH CHECK true) let anyone insert a
-- donation already marked paid, which the update_fundraiser_amount trigger then
-- adds to the raised total. The app inserts donations as 'pending'; only the
-- Stripe webhook (service role) marks them paid.
DROP POLICY "Anyone can create donations" ON public.fundraiser_donations;
DROP POLICY "Donations can be created by authenticated users" ON public.fundraiser_donations;
CREATE POLICY "Anyone can start a pending donation" ON public.fundraiser_donations
  FOR INSERT TO anon, authenticated
  WITH CHECK (payment_status = 'pending' AND (donor_id IS NULL OR donor_id = auth.uid()));

-- Fundraisers are created by admins (the app only offers it to them) and can be
-- edited by any admin, not only the one who created them (BUG-017).
DROP POLICY "Fundraisers can be created by authenticated users" ON public.fundraisers;
CREATE POLICY "Admins can create fundraisers" ON public.fundraisers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.current_user_is_admin());

DROP POLICY "Fundraisers can be updated by creators" ON public.fundraisers;
CREATE POLICY "Fundraisers can be updated by their creator or an admin" ON public.fundraisers
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.current_user_is_admin())
  WITH CHECK (auth.uid() = created_by OR public.current_user_is_admin());

-- Updates: the API already requires an admin; let any admin post and edit them.
DROP POLICY "Updates can be created by fundraiser creators" ON public.fundraiser_updates;
CREATE POLICY "Updates can be posted by the fundraiser's creator or an admin" ON public.fundraiser_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      public.current_user_is_admin()
      OR auth.uid() IN (SELECT f.created_by FROM public.fundraisers f WHERE f.id = fundraiser_updates.fundraiser_id)
    )
  );

DROP POLICY "Updates can be modified by creators" ON public.fundraiser_updates;
CREATE POLICY "Updates can be edited by their author or an admin" ON public.fundraiser_updates
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.current_user_is_admin())
  WITH CHECK (auth.uid() = created_by OR public.current_user_is_admin());

-- BUG-080: fundraiser_donors (guest donors' names, emails and phones) had RLS
-- off and full grants to anon, so anyone with the public key could read or
-- change it. The app now writes it with the service role; approved members and
-- admins can read it (community transparency), except anonymous donors.
ALTER TABLE public.fundraiser_donors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fundraiser_donors FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.fundraiser_donors FROM authenticated;
CREATE POLICY "Fundraiser donors are visible to admins and active members" ON public.fundraiser_donors
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin() OR (public.current_user_is_active_member() AND NOT coalesce(is_anonymous, false)));
