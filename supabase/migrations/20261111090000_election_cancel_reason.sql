-- Election management Phase 2: members see why an election was cancelled
-- (election_events, where the reason is also logged, is admin-only).
ALTER TABLE public.elections ADD COLUMN cancel_reason text CHECK (cancel_reason IS NULL OR length(cancel_reason) <= 500);
COMMENT ON COLUMN public.elections.cancel_reason IS 'Shown to members on a cancelled election; set by election_cancel';

CREATE OR REPLACE FUNCTION public.election_cancel(p_election uuid, p_reason text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.elections := public.election_for_admin_action(p_election, 'cancel', p_reason);
BEGIN
  PERFORM public.election_require_reason(p_reason);
  IF e.status NOT IN ('scheduled', 'ballot_locked') THEN
    RAISE EXCEPTION 'Only a published election that isn''t certified can be cancelled. Delete a draft instead.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.elections SET status = 'cancelled', cancel_reason = btrim(p_reason), updated_at = now() WHERE id = p_election;
  PERFORM public.election_action_done();
END $$;
