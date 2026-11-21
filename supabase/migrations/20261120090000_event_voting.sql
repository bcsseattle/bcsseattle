-- Voting at an event: anyone at the event scans a QR code to /vote/<election>,
-- enters their email and signs in with a code (an account is made if they
-- have none). Admins open and close it per election (logged by elections_log);
-- the page also needs the allowGuestVoting flag.
ALTER TABLE public.elections ADD COLUMN event_voting boolean NOT NULL DEFAULT false;
-- Admins change elections column by column (election_lifecycle); RLS keeps it to admins.
GRANT UPDATE (event_voting) ON public.elections TO authenticated;

-- Signing in at the event puts the person on the roll with at_event, whatever
-- their membership. The server (service role) writes it.
ALTER TABLE public.election_voters ADD COLUMN at_event boolean NOT NULL DEFAULT false;

-- On the roll, and either an approved, active member, or signed in at the
-- event while event voting is open. One vote per account either way
-- (user_has_completed_vote_session), so voting online first counts once.
CREATE OR REPLACE FUNCTION public.election_voter_eligible(p_election uuid, p_user uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.election_voters v
    JOIN public.elections e ON e.id = v.election_id
    WHERE v.election_id = p_election AND v.user_id = p_user
      AND (
        (v.at_event AND e.event_voting)
        OR EXISTS (SELECT 1 FROM public.members m WHERE m.user_id = p_user AND m."isApproved" AND m.status = 'active')
      )
  )
$$;
REVOKE ALL ON FUNCTION public.election_voter_eligible(uuid, uuid) FROM PUBLIC, anon, authenticated;
