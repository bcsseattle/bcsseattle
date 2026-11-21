-- Voting at an event: members scan a QR code to /vote/<election>, enter their
-- email and get a sign-in code. Admins open and close it per election
-- (logged by elections_log); the page also needs the enableEventVoting flag.
ALTER TABLE public.elections ADD COLUMN event_voting boolean NOT NULL DEFAULT false;
-- Admins change elections column by column (election_lifecycle); RLS keeps it to admins.
GRANT UPDATE (event_voting) ON public.elections TO authenticated;

-- Whether this email belongs to someone on the election's voter roll. Only
-- the server calls it (service role), so the page can send a code to voters
-- without telling anyone else who is on the roll.
CREATE FUNCTION public.event_voter_on_roll(p_election uuid, p_email text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.election_voters v
    JOIN auth.users u ON u.id = v.user_id
    WHERE v.election_id = p_election AND lower(u.email) = lower(trim(p_email))
  );
$$;

REVOKE ALL ON FUNCTION public.event_voter_on_roll(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_voter_on_roll(uuid, text) TO service_role;
