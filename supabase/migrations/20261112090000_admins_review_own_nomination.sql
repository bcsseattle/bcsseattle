-- Decision change (D7, 12 Nov 2026): an admin who is standing in an election
-- may review its nominations, their own included. The other admin actions
-- (lock, extend, cancel, certify, publish results) still need an admin who
-- isn't standing. Every decision is logged with who made it (decided_by and
-- election_events), so a self-approval is visible in the activity log.
--
-- nomination_decide used election_for_admin_action, which refuses an admin who
-- is standing; it now checks for an admin and locks the election itself.
CREATE OR REPLACE FUNCTION public.nomination_decide(p_nomination uuid, p_approve boolean, p_reason text DEFAULT NULL) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  n public.nominations;
  e public.elections;
  candidate uuid;
BEGIN
  SELECT * INTO n FROM public.nominations WHERE id = p_nomination FOR UPDATE;
  IF n.id IS NULL THEN
    RAISE EXCEPTION 'Nomination not found.' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admins can manage elections.' USING ERRCODE = '42501';
  END IF;
  -- No standing check here (see the note at the top of this migration).
  SELECT * INTO e FROM public.elections WHERE id = n.election_id FOR UPDATE;
  PERFORM set_config('bcs.action', CASE WHEN p_approve THEN 'approve_nomination' ELSE 'reject_nomination' END, true);
  PERFORM set_config('bcs.reason', coalesce(btrim(p_reason), ''), true);
  IF e.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Nominations can be reviewed only before the ballot is locked.' USING ERRCODE = '22023';
  END IF;
  IF p_approve THEN
    IF n.status <> 'submitted' THEN
      RAISE EXCEPTION 'Only a nomination the nominee has accepted can be approved.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.candidates WHERE election_id = n.election_id AND user_id = n.nominee_user_id) THEN
      RAISE EXCEPTION 'This member is already on the ballot.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.candidates (election_id, user_id, full_name, position, ballot_position_id, bio, manifesto, photo_url)
    VALUES (n.election_id, n.nominee_user_id, n.full_name, n.position, n.ballot_position_id, n.bio, n.manifesto, n.photo_url)
    RETURNING id INTO candidate;
    UPDATE public.nominations SET status = 'approved', candidate_id = candidate, decided_by = auth.uid(), decided_at = now()
    WHERE id = n.id;
  ELSE
    PERFORM public.election_require_reason(p_reason);
    IF n.status NOT IN ('awaiting_acceptance', 'submitted') THEN
      RAISE EXCEPTION 'Only a nomination waiting for an answer or for review can be rejected.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.nominations SET status = 'rejected', rejection_reason = btrim(p_reason), decided_by = auth.uid(), decided_at = now()
    WHERE id = n.id;
  END IF;
  PERFORM public.election_action_done();
END $$;
