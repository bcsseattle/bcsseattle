-- Decision change (D7, 12 Nov 2026): any admin runs an election, including one
-- who is standing in it. Every action is still logged with who did it
-- (election_events.actor). Replaces the helper from 20261110120100, which refused
-- an admin who was a nominee or candidate.
CREATE OR REPLACE FUNCTION public.election_for_admin_action(p_election uuid, p_action text, p_reason text DEFAULT NULL)
  RETURNS public.elections LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.elections;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admins can manage elections.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO e FROM public.elections WHERE id = p_election FOR UPDATE;
  IF e.id IS NULL THEN
    RAISE EXCEPTION 'Election not found.' USING ERRCODE = 'P0002';
  END IF;
  PERFORM set_config('bcs.action', p_action, true);
  PERFORM set_config('bcs.reason', coalesce(btrim(p_reason), ''), true);
  RETURN e;
END $$;
REVOKE ALL ON FUNCTION public.election_for_admin_action(uuid, text, text) FROM PUBLIC, anon, authenticated;
