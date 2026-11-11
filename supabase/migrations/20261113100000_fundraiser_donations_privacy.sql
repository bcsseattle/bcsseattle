-- W27: anonymous fundraiser gifts were readable by anyone. "Donations are
-- viewable by everyone" (USING true) sat beside "View non-anonymous donations";
-- policies are OR-ed, so any visitor could read every gift, the donor name and
-- message of anonymous ones included.
--
-- Now: a donor reads their own gifts, admins read all, and everyone else reads
-- non-anonymous gifts. The public donor list (website and app) comes from
-- fundraiser_supporters, which lists every completed gift but leaves out the
-- name and message of anonymous ones. The app's result screen reads one gift by
-- its id (known only to whoever made it) through fundraiser_gift.

DROP POLICY "Donations are viewable by everyone" ON public.fundraiser_donations;
CREATE POLICY "Admins can view all donations" ON public.fundraiser_donations
  FOR SELECT TO authenticated USING (public.current_user_is_admin());

CREATE FUNCTION public.fundraiser_supporters(p_fundraiser uuid)
  RETURNS TABLE (id uuid, amount numeric, donor_name text, message text, created_at timestamptz, is_anonymous boolean)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT d.id, d.amount,
         CASE WHEN d.is_anonymous THEN NULL ELSE d.donor_name END,
         CASE WHEN d.is_anonymous THEN NULL ELSE d.message END,
         d.created_at, coalesce(d.is_anonymous, false)
  FROM public.fundraiser_donations d
  WHERE d.fundraiser_id = p_fundraiser AND d.payment_status = 'completed'
  ORDER BY d.created_at DESC
$$;

CREATE FUNCTION public.fundraiser_gift(p_donation uuid)
  RETURNS TABLE (payment_status text, amount numeric, fundraiser_id uuid, fundraiser_title text, created_at timestamptz, donor_name text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT d.payment_status, d.amount, d.fundraiser_id, f.title, d.created_at,
         CASE WHEN d.is_anonymous THEN NULL ELSE d.donor_name END
  FROM public.fundraiser_donations d
  LEFT JOIN public.fundraisers f ON f.id = d.fundraiser_id
  WHERE d.id = p_donation
$$;

REVOKE ALL ON FUNCTION public.fundraiser_supporters(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fundraiser_gift(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fundraiser_supporters(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fundraiser_gift(uuid) TO anon, authenticated, service_role;
