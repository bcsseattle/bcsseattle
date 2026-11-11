-- The store review account (demo@bcsseattle.org) is an approved, active member
-- so reviewers see the member screens, but it must never vote in a real
-- election. members.is_review_account keeps a member off every voter roll
-- (taken when a ballot is locked); the vote handlers only accept members on
-- the roll, so it can't vote. It can still see elections, as members do.
ALTER TABLE public.members ADD COLUMN is_review_account boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.members.is_review_account IS
  'An app store review account: shown the member screens, never on a voter roll.';

-- As in 20261111120000_results.sql, plus NOT m.is_review_account.
CREATE OR REPLACE FUNCTION public.election_snapshot_voters(p_election uuid) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.election_voters (election_id, user_id)
  SELECT e.id, v.user_id
  FROM public.elections e JOIN public.election_voters v ON v.election_id = e.runoff_of
  WHERE e.id = p_election
  UNION
  SELECT e.id, m.user_id
  FROM public.elections e
  JOIN public.members m ON m."isApproved" AND m.status = 'active' AND m.user_id IS NOT NULL
    AND NOT m.is_review_account
    AND m.created_at <= coalesce(e.eligibility_cutoff, now())
  WHERE e.id = p_election AND e.runoff_of IS NULL
  ON CONFLICT DO NOTHING;
$$;

-- Only the service role sets the flag: a signed-in member (the reviewer
-- included) can't clear it, or set it. (Table-level grants make a column
-- REVOKE ineffective, hence the trigger.)
CREATE FUNCTION public.members_guard_review_account() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND NEW.is_review_account IS DISTINCT FROM (CASE WHEN TG_OP = 'INSERT' THEN false ELSE OLD.is_review_account END) THEN
    RAISE EXCEPTION 'Only BCS staff can change is_review_account.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER members_guard_review_account BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.members_guard_review_account();

UPDATE public.members SET is_review_account = true
WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'demo@bcsseattle.org');
