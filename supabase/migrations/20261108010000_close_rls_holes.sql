-- Closes BUG-001, BUG-002, BUG-003 and BUG-005 (docs/BUGS.md).
-- Every app read of these tables goes through the signed-in user's client, so
-- the policies below keep each page's legitimate reads and drop the rest.

-- Helpers. SECURITY DEFINER so a policy on members can ask about members
-- without recursing into its own RLS.
CREATE OR REPLACE FUNCTION public.current_user_is_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT is_admin FROM public.users WHERE id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_active_member() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE user_id = auth.uid() AND "isApproved" AND status = 'active'
  )
$$;

-- A donor is publicly identified once they have given at least one donation
-- that is neither anonymous nor private (the same rule the app's donor lists use).
-- SECURITY DEFINER: the donors and donations policies refer to each other.
CREATE OR REPLACE FUNCTION public.donor_is_public(p_donor_id uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.donations
    WHERE donor_id = p_donor_id AND NOT coalesce(is_anonymous, false) AND NOT coalesce(is_private, false)
  )
$$;

REVOKE ALL ON FUNCTION public.donor_is_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.donor_is_public(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_active_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_is_active_member() TO authenticated, service_role;

-- BUG-001: "Can update own user data." allowed every column, including is_admin.
-- Users may still rename themselves (account page); everything else is server-side.
REVOKE UPDATE ON public.users FROM anon, authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.users TO authenticated;

-- BUG-002: members could insert or update their own row with isApproved/status
-- of their choosing. Registration writes through the service role and admins
-- have their own policies, so nothing in the app needs these.
DROP POLICY "Allow users to insert own member record" ON public.members;
DROP POLICY "Allow users to update own member record" ON public.members;

-- BUG-003: these were readable by anyone, signed in or not (USING (true)).
-- Members, customers and subscriptions: yourself, admins, and approved active
-- members (the member directory and community funds list everyone).
DROP POLICY "Enable read access for all users" ON public.members;
CREATE POLICY "Members are visible to themselves, admins and active members" ON public.members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin() OR public.current_user_is_active_member());

DROP POLICY "Enable read access for all users" ON public.customers;
CREATE POLICY "Customers are visible to themselves, admins and active members" ON public.customers
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.current_user_is_admin() OR public.current_user_is_active_member());

DROP POLICY "Enable read access for all users" ON public.subscriptions;
CREATE POLICY "Subscriptions are visible to their owner, admins and active members" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin() OR public.current_user_is_active_member());

-- Donors and donations: open to approved active members, so the community can
-- see where its funds come from (confirmed 2026-11-08), except what donors or
-- admins chose to hide: private donations, and the identity of donors who only
-- gave anonymously. Guest receipts are read by the server with the service role.
DROP POLICY "Enable read access for all users" ON public.donors;
CREATE POLICY "Donors are visible to themselves, admins and active members" ON public.donors
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_is_admin()
    OR (public.current_user_is_active_member() AND public.donor_is_public(id))
  );

DROP POLICY "Enable read access for all users" ON public.donations;
CREATE POLICY "Donations are visible to their donor, admins and active members" ON public.donations
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin()
    OR donor_id IN (SELECT id FROM public.donors WHERE user_id = auth.uid())
    OR (public.current_user_is_active_member() AND NOT coalesce(is_private, false))
  );

-- Community funds data: approved active members see everything not marked private.
DROP POLICY "Enable read access for all users" ON public.expenses;
CREATE POLICY "Expenses are visible to active members and admins" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin() OR (public.current_user_is_active_member() AND NOT coalesce(is_private, false)));

DROP POLICY "Enable read access for all users" ON public.funds;
CREATE POLICY "Funds are visible to active members and admins" ON public.funds
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin() OR (public.current_user_is_active_member() AND NOT coalesce(is_private, false)));

-- Operational logs: admins only (the app reads them with the service role).
DROP POLICY "Enable read access for all users" ON public.email_logs;
CREATE POLICY "Email logs are visible to admins" ON public.email_logs
  FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY "Enable read access for all users" ON public.sms_notifications;
CREATE POLICY "SMS notifications are visible to admins" ON public.sms_notifications
  FOR SELECT TO authenticated USING (public.current_user_is_admin());

-- organization stays publicly readable: it is printed on public receipts.

-- BUG-005: the insert policy allowed session_id IS NULL, so a member could
-- write votes directly and skip the window, sessions and one-vote-per-position.
-- Votes are now written only by the ballot handlers, with the service role,
-- after their own checks.
DROP POLICY "Users can insert votes with valid session" ON public.votes;
