-- Election management Phase 3: nominations (docs/election-management-plan.md D1, B2, B3).
--
-- A member nominates themselves (submitted at once) or another member
-- (awaiting_acceptance until the nominee accepts). A person accepts one
-- position per election; accepting declines their other pending nominations.
-- Admins approve a submitted nomination (which creates the candidate) or
-- reject it with a reason. Nominees edit or withdraw until the ballot is locked.
--
-- nominations has no write policy for users: every change goes through these
-- functions, which check who is calling, the window and eligibility.

-- Approved, active, and joined by the election's cutoff (B3, B11).
CREATE OR REPLACE FUNCTION public.election_member_eligible(p_election uuid, p_user uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members m JOIN public.elections e ON e.id = p_election
    WHERE m.user_id = p_user AND m."isApproved" AND m.status = 'active'
      AND m.created_at <= coalesce(e.eligibility_cutoff, now())
  )
$$;
REVOKE ALL ON FUNCTION public.election_member_eligible(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Published, inside the nominations window, edges included.
CREATE OR REPLACE FUNCTION public.election_nominations_open(e public.elections) RETURNS boolean
  LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT e.status = 'scheduled' AND e.nomination_start IS NOT NULL AND e.nomination_end IS NOT NULL
     AND now() BETWEEN e.nomination_start AND e.nomination_end
$$;

-- candidates.manifesto must be empty or 10 to 1,000 characters; nominations
-- copy it on approval, so the same rule applies when it's written.
CREATE OR REPLACE FUNCTION public.nomination_check_details(p_full_name text, p_manifesto text, p_bio text) RETURNS void
  LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF length(btrim(coalesce(p_full_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Give the name to show on the ballot.' USING ERRCODE = '22023';
  END IF;
  IF length(p_full_name) > 120 THEN
    RAISE EXCEPTION 'Keep the name under 120 characters.' USING ERRCODE = '22023';
  END IF;
  IF nullif(btrim(coalesce(p_manifesto, '')), '') IS NOT NULL AND length(btrim(p_manifesto)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'The platform must be 10 to 1,000 characters, or left empty.' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_bio, '')) > 2000 THEN
    RAISE EXCEPTION 'Keep the statement under 2,000 characters.' USING ERRCODE = '22023';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.nomination_log(p_action text) RETURNS void
  LANGUAGE sql AS $$
  SELECT set_config('bcs.action', p_action, true), set_config('bcs.reason', '', true);
$$;

-- Nominate yourself (details required, submitted for review) or another member
-- (they accept or decline). Returns the nomination's id.
CREATE OR REPLACE FUNCTION public.nomination_create(
  p_election uuid,
  p_position uuid,
  p_nominee uuid,
  p_message text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_manifesto text DEFAULT NULL,
  p_photo_url text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := auth.uid();
  e public.elections;
  pos public.ballot_positions;
  self boolean := p_nominee = auth.uid();
  existing public.nominations;
  result uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to nominate.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO e FROM public.elections WHERE id = p_election;
  IF e.id IS NULL OR NOT public.election_nominations_open(e) THEN
    RAISE EXCEPTION 'Nominations aren''t open for this election.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO pos FROM public.ballot_positions WHERE id = p_position AND election_id = p_election;
  IF pos.id IS NULL THEN
    RAISE EXCEPTION 'Choose a position on this election''s ballot.' USING ERRCODE = '22023';
  END IF;
  IF NOT public.election_member_eligible(p_election, me) THEN
    RAISE EXCEPTION 'Only approved members with an active membership can nominate.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.election_member_eligible(p_election, p_nominee) THEN
    RAISE EXCEPTION 'That member can''t be nominated: only approved members with an active membership can stand.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nominations WHERE election_id = p_election AND nominee_user_id = p_nominee
             AND status IN ('submitted', 'approved'))
     OR EXISTS (SELECT 1 FROM public.candidates WHERE election_id = p_election AND user_id = p_nominee) THEN
    RAISE EXCEPTION '%', CASE WHEN self THEN 'You''ve already accepted a nomination in this election. Withdraw it first to stand for another position.'
      ELSE 'They''ve already accepted a nomination in this election.' END USING ERRCODE = '22023';
  END IF;
  IF self THEN
    PERFORM public.nomination_check_details(p_full_name, p_manifesto, p_bio);
  END IF;

  SELECT * INTO existing FROM public.nominations
  WHERE election_id = p_election AND nominee_user_id = p_nominee AND ballot_position_id = p_position;
  IF existing.id IS NOT NULL AND existing.status IN ('awaiting_acceptance', 'submitted', 'approved') THEN
    RAISE EXCEPTION '%', CASE WHEN self THEN 'You''re already nominated for this position.'
      ELSE 'They''re already nominated for this position.' END USING ERRCODE = '22023';
  END IF;

  PERFORM public.nomination_log('nominate');
  IF existing.id IS NOT NULL THEN
    -- Nominated again after declining, withdrawing or being rejected.
    UPDATE public.nominations SET
      nominated_by = me,
      status = CASE WHEN self THEN 'submitted' ELSE 'awaiting_acceptance' END,
      message = nullif(btrim(p_message), ''),
      full_name = CASE WHEN self THEN btrim(p_full_name) END,
      bio = CASE WHEN self THEN nullif(btrim(p_bio), '') END,
      manifesto = CASE WHEN self THEN nullif(btrim(p_manifesto), '') END,
      photo_url = CASE WHEN self THEN nullif(p_photo_url, '') END,
      rejection_reason = NULL, decided_by = NULL, decided_at = NULL, candidate_id = NULL
    WHERE id = existing.id
    RETURNING id INTO result;
  ELSE
    INSERT INTO public.nominations
      (election_id, nominee_user_id, nominated_by, ballot_position_id, position, status, message, full_name, bio, manifesto, photo_url)
    VALUES (
      p_election, p_nominee, me, pos.id, pos.title,
      CASE WHEN self THEN 'submitted' ELSE 'awaiting_acceptance' END,
      nullif(btrim(p_message), ''),
      CASE WHEN self THEN btrim(p_full_name) END,
      CASE WHEN self THEN nullif(btrim(p_bio), '') END,
      CASE WHEN self THEN nullif(btrim(p_manifesto), '') END,
      CASE WHEN self THEN nullif(p_photo_url, '') END
    )
    RETURNING id INTO result;
  END IF;
  PERFORM public.election_action_done();
  RETURN result;
END $$;

-- The nominee accepts (with their own name, statement and photo) while
-- nominations are open, or declines any time before the ballot is locked.
-- Accepting declines their other pending nominations in the election.
CREATE OR REPLACE FUNCTION public.nomination_respond(
  p_nomination uuid,
  p_accept boolean,
  p_full_name text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_manifesto text DEFAULT NULL,
  p_photo_url text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  n public.nominations;
  e public.elections;
BEGIN
  SELECT * INTO n FROM public.nominations WHERE id = p_nomination FOR UPDATE;
  IF n.id IS NULL OR n.nominee_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'This nomination isn''t for you.' USING ERRCODE = '42501';
  END IF;
  IF n.status <> 'awaiting_acceptance' THEN
    RAISE EXCEPTION 'This nomination has already been answered.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO e FROM public.elections WHERE id = n.election_id;

  IF NOT p_accept THEN
    IF public.election_ballot_frozen(n.election_id) THEN
      RAISE EXCEPTION 'The ballot is locked.' USING ERRCODE = '22023';
    END IF;
    PERFORM public.nomination_log('decline');
    UPDATE public.nominations SET status = 'declined' WHERE id = n.id;
    PERFORM public.election_action_done();
    RETURN;
  END IF;

  IF NOT public.election_nominations_open(e) THEN
    RAISE EXCEPTION 'Nominations have closed, so this nomination can only be declined.' USING ERRCODE = '22023';
  END IF;
  IF NOT public.election_member_eligible(n.election_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only approved members with an active membership can stand.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nominations WHERE election_id = n.election_id AND nominee_user_id = auth.uid()
             AND status IN ('submitted', 'approved'))
     OR EXISTS (SELECT 1 FROM public.candidates WHERE election_id = n.election_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You''ve already accepted a nomination in this election. Withdraw it first to accept this one.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.nomination_check_details(p_full_name, p_manifesto, p_bio);

  PERFORM public.nomination_log('accept');
  UPDATE public.nominations SET
    status = 'submitted',
    full_name = btrim(p_full_name),
    bio = nullif(btrim(p_bio), ''),
    manifesto = nullif(btrim(p_manifesto), ''),
    photo_url = nullif(p_photo_url, '')
  WHERE id = n.id;
  UPDATE public.nominations SET status = 'declined'
  WHERE election_id = n.election_id AND nominee_user_id = auth.uid() AND status = 'awaiting_acceptance' AND id <> n.id;
  PERFORM public.election_action_done();
END $$;

-- The nominee changes their name, statement or photo until the ballot is
-- locked. On an approved nomination the candidate changes with it.
CREATE OR REPLACE FUNCTION public.nomination_update(
  p_nomination uuid,
  p_full_name text,
  p_bio text DEFAULT NULL,
  p_manifesto text DEFAULT NULL,
  p_photo_url text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n public.nominations;
BEGIN
  SELECT * INTO n FROM public.nominations WHERE id = p_nomination FOR UPDATE;
  IF n.id IS NULL OR n.nominee_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'This nomination isn''t yours.' USING ERRCODE = '42501';
  END IF;
  IF n.status NOT IN ('submitted', 'approved') THEN
    RAISE EXCEPTION 'Only a nomination you''ve accepted can be edited.' USING ERRCODE = '22023';
  END IF;
  IF public.election_ballot_frozen(n.election_id) THEN
    RAISE EXCEPTION 'The ballot is locked, so your details can''t change. Ask an admin if something is wrong.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.nomination_check_details(p_full_name, p_manifesto, p_bio);
  PERFORM public.nomination_log('edit_nomination');
  UPDATE public.nominations SET
    full_name = btrim(p_full_name),
    bio = nullif(btrim(p_bio), ''),
    manifesto = nullif(btrim(p_manifesto), ''),
    photo_url = coalesce(nullif(p_photo_url, ''), photo_url)
  WHERE id = n.id;
  IF n.candidate_id IS NOT NULL THEN
    UPDATE public.candidates SET
      full_name = btrim(p_full_name),
      bio = nullif(btrim(p_bio), ''),
      manifesto = nullif(btrim(p_manifesto), ''),
      photo_url = coalesce(nullif(p_photo_url, ''), photo_url)
    WHERE id = n.candidate_id;
  END IF;
  PERFORM public.election_action_done();
END $$;

-- Until the ballot is locked: the nominee withdraws any of theirs (an approved
-- one takes the candidate off the ballot); the nominator withdraws one the
-- nominee hasn't answered yet.
CREATE OR REPLACE FUNCTION public.nomination_withdraw(p_nomination uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n public.nominations;
BEGIN
  SELECT * INTO n FROM public.nominations WHERE id = p_nomination FOR UPDATE;
  IF n.id IS NULL
     OR NOT (n.nominee_user_id = auth.uid() OR (n.nominated_by = auth.uid() AND n.status = 'awaiting_acceptance')) THEN
    RAISE EXCEPTION 'You can''t withdraw this nomination.' USING ERRCODE = '42501';
  END IF;
  IF n.status NOT IN ('awaiting_acceptance', 'submitted', 'approved') THEN
    RAISE EXCEPTION 'This nomination is no longer active.' USING ERRCODE = '22023';
  END IF;
  IF public.election_ballot_frozen(n.election_id) THEN
    RAISE EXCEPTION 'The ballot is locked, so this can''t be withdrawn here. Ask an admin.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.nomination_log('withdraw');
  UPDATE public.nominations SET status = 'withdrawn', candidate_id = NULL WHERE id = n.id;
  IF n.candidate_id IS NOT NULL THEN
    DELETE FROM public.candidates WHERE id = n.candidate_id;
  END IF;
  PERFORM public.election_action_done();
END $$;

-- Admin review, before the ballot is locked: approve a submitted nomination
-- (creating the candidate) or reject it with a reason the nominee sees.
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
  e := public.election_for_admin_action(n.election_id, CASE WHEN p_approve THEN 'approve_nomination' ELSE 'reject_nomination' END, p_reason);
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

-- An admin adds a candidate directly, before the ballot is locked: a member
-- (recorded as an approved nomination, so it shows under their nominations)
-- or a name only. Returns the candidate's id.
CREATE OR REPLACE FUNCTION public.election_add_candidate(
  p_election uuid,
  p_position uuid,
  p_user uuid,
  p_full_name text,
  p_bio text DEFAULT NULL,
  p_manifesto text DEFAULT NULL,
  p_photo_url text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e public.elections := public.election_for_admin_action(p_election, 'add_candidate');
  pos public.ballot_positions;
  candidate uuid;
BEGIN
  IF e.status NOT IN ('draft', 'scheduled') THEN
    RAISE EXCEPTION 'The ballot is locked.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO pos FROM public.ballot_positions WHERE id = p_position AND election_id = p_election;
  IF pos.id IS NULL THEN
    RAISE EXCEPTION 'Choose a position on this election''s ballot.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.nomination_check_details(p_full_name, p_manifesto, p_bio);
  IF p_user IS NOT NULL THEN
    IF NOT public.election_member_eligible(p_election, p_user) THEN
      RAISE EXCEPTION 'That member can''t stand: only approved members with an active membership can.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.nominations WHERE election_id = p_election AND nominee_user_id = p_user
               AND status IN ('submitted', 'approved'))
       OR EXISTS (SELECT 1 FROM public.candidates WHERE election_id = p_election AND user_id = p_user) THEN
      RAISE EXCEPTION 'That member has already accepted a nomination in this election.' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.candidates (election_id, user_id, full_name, position, ballot_position_id, bio, manifesto, photo_url)
  VALUES (p_election, p_user, btrim(p_full_name), pos.title, pos.id, nullif(btrim(p_bio), ''), nullif(btrim(p_manifesto), ''), nullif(p_photo_url, ''))
  RETURNING id INTO candidate;
  IF p_user IS NOT NULL THEN
    INSERT INTO public.nominations
      (election_id, nominee_user_id, nominated_by, ballot_position_id, position, status, full_name, bio, manifesto, photo_url,
       candidate_id, decided_by, decided_at)
    VALUES (p_election, p_user, auth.uid(), pos.id, pos.title, 'approved', btrim(p_full_name), nullif(btrim(p_bio), ''),
            nullif(btrim(p_manifesto), ''), nullif(p_photo_url, ''), candidate, auth.uid(), now())
    ON CONFLICT (election_id, nominee_user_id, ballot_position_id) DO UPDATE SET
      status = 'approved', nominated_by = excluded.nominated_by, full_name = excluded.full_name, bio = excluded.bio,
      manifesto = excluded.manifesto, photo_url = excluded.photo_url, candidate_id = excluded.candidate_id,
      decided_by = excluded.decided_by, decided_at = excluded.decided_at, rejection_reason = NULL;
  END IF;
  PERFORM public.election_action_done();
  RETURN candidate;
END $$;

-- Who can be nominated: approved, active members, by name only. The nominate
-- form lists them; the directory already shows these names to active members.
CREATE OR REPLACE FUNCTION public.election_nominees(p_election uuid) RETURNS TABLE (user_id uuid, full_name text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.user_id, coalesce(nullif(btrim(m."fullName"), ''), 'Member') AS full_name
  FROM public.members m JOIN public.elections e ON e.id = p_election
  WHERE (public.current_user_is_active_member() OR public.current_user_is_admin())
    AND m.user_id IS NOT NULL AND m."isApproved" AND m.status = 'active'
    AND m.created_at <= coalesce(e.eligibility_cutoff, now())
  ORDER BY 2
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.nomination_create(uuid, uuid, uuid, text, text, text, text, text)',
    'public.nomination_respond(uuid, boolean, text, text, text, text)',
    'public.nomination_update(uuid, text, text, text, text)',
    'public.nomination_withdraw(uuid)',
    'public.nomination_decide(uuid, boolean, text)',
    'public.election_add_candidate(uuid, uuid, uuid, text, text, text, text)',
    'public.election_nominees(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.election_nominations_open(public.elections) FROM PUBLIC, anon;
