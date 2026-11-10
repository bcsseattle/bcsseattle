-- Election management Phase 4 (B13): after the ballot is locked, an admin
-- marks a candidate withdrawn, with a reason. They stay on the ballot,
-- labelled; nobody can choose them any more (the vote handlers check), they
-- can't win (the tally, Phase 5), and votes already cast aren't moved.
-- Before the lock, the nominee withdraws or the nomination is rejected instead.
CREATE OR REPLACE FUNCTION public.election_withdraw_candidate(p_candidate uuid, p_reason text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  c public.candidates;
  e public.elections;
BEGIN
  SELECT * INTO c FROM public.candidates WHERE id = p_candidate;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Candidate not found.' USING ERRCODE = 'P0002';
  END IF;
  e := public.election_for_admin_action(c.election_id, 'withdraw_candidate', p_reason);
  PERFORM public.election_require_reason(p_reason);
  IF e.status <> 'ballot_locked' THEN
    RAISE EXCEPTION 'Only a candidate on a locked ballot can be marked withdrawn. Before the lock, reject the nomination instead.' USING ERRCODE = '22023';
  END IF;
  IF c.withdrawn_at IS NOT NULL THEN
    RAISE EXCEPTION 'This candidate is already withdrawn.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.candidates SET withdrawn_at = now() WHERE id = c.id;
  UPDATE public.nominations SET status = 'withdrawn' WHERE candidate_id = c.id;
  PERFORM public.election_action_done();
END $$;
REVOKE ALL ON FUNCTION public.election_withdraw_candidate(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.election_withdraw_candidate(uuid, text) TO authenticated, service_role;
