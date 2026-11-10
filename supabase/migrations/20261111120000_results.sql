-- Election management Phase 5: tally, run-offs and certification
-- (docs/election-management-plan.md D5, D8, B4–B8, B13, B16).
--
-- election_outcomes is the one place the result is worked out: the admin
-- Results tab shows it, and election_certify freezes it into election_results.
-- It reads only counts, never who voted for whom.
--
-- Candidates: plurality, top N for N seats (B4); a candidate needs at least one
-- vote to win. Withdrawn candidates can't win (B13). A tie for the last seat
-- is settled by a run-off (B5), a linked election that must be certified
-- first. Uncontested positions elected at lock are "elected unopposed".
-- Initiatives: Yes > No, or Yes >= 2/3 of Yes + No for a two-thirds
-- initiative (B7, B8); abstentions never count; no votes means not passed.

CREATE OR REPLACE FUNCTION public.election_outcomes(p_election uuid)
  RETURNS TABLE (
    ballot_position_id uuid,
    candidate_id uuid,
    initiative_id uuid,
    votes integer,
    yes integer,
    no integer,
    abstain integer,
    rank integer,
    outcome text,
    note text
  )
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
  e public.elections;
  p record;
  c record;
  i record;
  runoff public.elections;
  active integer;
  total integer;
  cutoff integer;
  above integer;
  at_cutoff integer;
  elected integer;
BEGIN
  -- (Inside this function current_user is its owner, so the caller is checked by its JWT role.)
  IF NOT public.current_user_is_admin() AND coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Only admins can see the count before results are published.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO e FROM public.elections WHERE id = p_election;
  IF e.id IS NULL THEN
    RAISE EXCEPTION 'Election not found.' USING ERRCODE = 'P0002';
  END IF;
  IF e.status NOT IN ('ballot_locked', 'certified', 'completed', 'archived') THEN
    RAISE EXCEPTION 'There''s nothing to count before the ballot is locked.' USING ERRCODE = '22023';
  END IF;
  -- Nobody sees counts while any voting window is open (B16).
  IF e.status = 'ballot_locked' AND now() <= greatest(
       e.end_date,
       CASE WHEN coalesce(e.enable_separate_voting_periods, e.type IN ('leadership', 'board')) THEN e.candidate_voting_end END
     ) THEN
    RAISE EXCEPTION 'Votes are counted once voting has closed.' USING ERRCODE = '22023';
  END IF;

  FOR p IN SELECT * FROM public.ballot_positions WHERE election_id = p_election ORDER BY display_order LOOP
    IF p.vacant THEN
      RETURN QUERY SELECT p.id, NULL::uuid, NULL::uuid, NULL::integer, NULL::integer, NULL::integer, NULL::integer, NULL::integer,
        'vacant'::text, 'No candidates'::text;
      CONTINUE;
    END IF;

    SELECT count(*) FILTER (WHERE withdrawn_at IS NULL), count(*) INTO active, total
    FROM public.candidates WHERE ballot_position_id = p.id;

    -- Elected unopposed at lock: no vote was held for this position.
    IF p.unopposed_decision = 'elect' AND total <= p.seats THEN
      RETURN QUERY
        SELECT p.id, cd.id, NULL::uuid, NULL::integer, NULL::integer, NULL::integer, NULL::integer, NULL::integer,
               CASE WHEN cd.withdrawn_at IS NULL THEN 'elected_unopposed' ELSE 'withdrawn' END, NULL::text
        FROM public.candidates cd WHERE cd.ballot_position_id = p.id ORDER BY cd.full_name;
      IF active < p.seats THEN
        RETURN QUERY SELECT p.id, NULL::uuid, NULL::uuid, NULL::integer, NULL::integer, NULL::integer, NULL::integer, NULL::integer,
          'vacant'::text, format('%s of %s seats unfilled', p.seats - active, p.seats);
      END IF;
      CONTINUE;
    END IF;

    -- A certified run-off for this position settles its tie.
    SELECT r.* INTO runoff FROM public.elections r
    WHERE r.runoff_of = p_election AND r.status IN ('certified', 'completed', 'archived')
      AND EXISTS (SELECT 1 FROM public.ballot_positions rp WHERE rp.election_id = r.id AND rp.title = p.title)
    ORDER BY r.created_at DESC LIMIT 1;

    -- Votes per active candidate; the cutoff is the votes of the last seat.
    CREATE TEMP TABLE IF NOT EXISTS pg_temp.tally (id uuid, name text, user_id uuid, withdrawn boolean, votes integer) ON COMMIT DROP;
    DELETE FROM pg_temp.tally;
    INSERT INTO pg_temp.tally
      SELECT cd.id, cd.full_name, cd.user_id, cd.withdrawn_at IS NOT NULL,
             (SELECT count(*)::integer FROM public.votes v WHERE v.candidate_id = cd.id)
      FROM public.candidates cd WHERE cd.ballot_position_id = p.id;

    SELECT t.votes INTO cutoff FROM pg_temp.tally t WHERE NOT t.withdrawn AND t.votes > 0
    ORDER BY t.votes DESC OFFSET p.seats - 1 LIMIT 1;
    SELECT count(*) INTO above FROM pg_temp.tally t WHERE NOT t.withdrawn AND t.votes > coalesce(cutoff, 0) AND t.votes > 0;
    SELECT count(*) INTO at_cutoff FROM pg_temp.tally t WHERE NOT t.withdrawn AND cutoff IS NOT NULL AND t.votes = cutoff;
    elected := 0;

    FOR c IN
      SELECT t.*, dense_rank() OVER (ORDER BY t.votes DESC)::integer AS place
      FROM pg_temp.tally t WHERE NOT t.withdrawn ORDER BY t.votes DESC, t.name
    LOOP
      IF c.votes > 0 AND (cutoff IS NULL OR c.votes > cutoff OR (c.votes = cutoff AND above + at_cutoff <= p.seats)) THEN
        RETURN QUERY SELECT p.id, c.id, NULL::uuid, c.votes, NULL::integer, NULL::integer, NULL::integer, c.place, 'elected'::text, NULL::text;
        elected := elected + 1;
      ELSIF c.votes > 0 AND c.votes = cutoff THEN
        -- Tied for the last seat(s): settled by a run-off.
        IF runoff.id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.election_results er
          JOIN public.candidates rc ON rc.id = er.candidate_id
          WHERE er.election_id = runoff.id AND er.outcome IN ('elected', 'elected_unopposed')
            AND (rc.user_id = c.user_id OR (rc.user_id IS NULL AND rc.full_name = c.name))
        ) THEN
          RETURN QUERY SELECT p.id, c.id, NULL::uuid, c.votes, NULL::integer, NULL::integer, NULL::integer, c.place, 'elected'::text,
            'Won the run-off'::text;
          elected := elected + 1;
        ELSIF runoff.id IS NOT NULL THEN
          RETURN QUERY SELECT p.id, c.id, NULL::uuid, c.votes, NULL::integer, NULL::integer, NULL::integer, c.place, 'not_elected'::text,
            'Lost the run-off'::text;
        ELSE
          RETURN QUERY SELECT p.id, c.id, NULL::uuid, c.votes, NULL::integer, NULL::integer, NULL::integer, c.place, 'runoff'::text,
            format('Tied for the last seat with %s votes', c.votes);
          elected := elected + 1; -- a seat is waiting for the run-off, not vacant
        END IF;
      ELSE
        RETURN QUERY SELECT p.id, c.id, NULL::uuid, c.votes, NULL::integer, NULL::integer, NULL::integer, c.place, 'not_elected'::text, NULL::text;
      END IF;
    END LOOP;

    RETURN QUERY
      SELECT p.id, t.id, NULL::uuid, t.votes, NULL::integer, NULL::integer, NULL::integer, NULL::integer, 'withdrawn'::text,
             'Withdrew after the ballot was locked'::text
      FROM pg_temp.tally t WHERE t.withdrawn ORDER BY t.name;

    IF elected < p.seats THEN
      RETURN QUERY SELECT p.id, NULL::uuid, NULL::uuid, NULL::integer, NULL::integer, NULL::integer, NULL::integer, NULL::integer,
        'vacant'::text, format('%s of %s seats unfilled', p.seats - elected, p.seats);
    END IF;
  END LOOP;

  FOR i IN
    SELECT it.id, it.pass_threshold,
           count(*) FILTER (WHERE v.vote_value = 'yes')::integer AS y,
           count(*) FILTER (WHERE v.vote_value = 'no')::integer AS n,
           count(*) FILTER (WHERE v.vote_value = 'abstain')::integer AS a
    FROM public.initiatives it LEFT JOIN public.votes v ON v.initiative_id = it.id
    WHERE it.election_id = p_election
    GROUP BY it.id, it.pass_threshold, it.ballot_order
    ORDER BY it.ballot_order
  LOOP
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, i.id, NULL::integer, i.y, i.n, i.a, NULL::integer,
      CASE
        WHEN i.y + i.n = 0 THEN 'not_passed'
        WHEN i.pass_threshold = 'two_thirds' AND i.y * 3 >= (i.y + i.n) * 2 THEN 'passed'
        WHEN i.pass_threshold = 'majority' AND i.y > i.n THEN 'passed'
        ELSE 'not_passed'
      END,
      CASE
        WHEN i.y + i.n = 0 THEN 'No Yes or No votes'
        WHEN i.pass_threshold = 'majority' AND i.y = i.n THEN 'Tied'
        WHEN i.pass_threshold = 'two_thirds' THEN 'Two-thirds of Yes and No needed'
      END;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.election_outcomes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.election_outcomes(uuid) TO authenticated, service_role;

-- Ballot_locked -> certified, once every voting window has closed and every
-- tie has a certified run-off. Freezes the outcome; members see it once
-- results are published (election_publish_results).
CREATE OR REPLACE FUNCTION public.election_certify(p_election uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e public.elections := public.election_for_admin_action(p_election, 'certify');
  tied text;
BEGIN
  IF e.status <> 'ballot_locked' THEN
    RAISE EXCEPTION 'Only a locked ballot can be certified.' USING ERRCODE = '22023';
  END IF;
  DROP TABLE IF EXISTS pg_temp.outcome;
  CREATE TEMP TABLE pg_temp.outcome ON COMMIT DROP AS SELECT * FROM public.election_outcomes(p_election);
  SELECT string_agg(DISTINCT b.title, ', ') INTO tied
  FROM pg_temp.outcome o JOIN public.ballot_positions b ON b.id = o.ballot_position_id WHERE o.outcome = 'runoff';
  IF tied IS NOT NULL THEN
    RAISE EXCEPTION 'Settle the tie for % with a run-off first.', tied USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.election_results
    (election_id, ballot_position_id, candidate_id, initiative_id, votes, yes, no, abstain, rank, outcome, note, certified_by)
  SELECT p_election, o.ballot_position_id, o.candidate_id, o.initiative_id, o.votes, o.yes, o.no, o.abstain, o.rank, o.outcome, o.note, auth.uid()
  FROM pg_temp.outcome o;
  UPDATE public.elections SET status = 'certified', updated_at = now() WHERE id = p_election;
  PERFORM public.election_action_done();
END $$;
REVOKE ALL ON FUNCTION public.election_certify(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.election_certify(uuid) TO authenticated, service_role;

-- A tie for the last seat(s) of a position: a draft run-off election, linked
-- by runoff_of, with that position, the seats still to fill and only the tied
-- candidates. No nominations; its voter roll is the original's (taken at lock).
-- The admin sets its dates, publishes and runs it as usual.
CREATE OR REPLACE FUNCTION public.election_start_runoff(p_election uuid, p_position uuid) RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e public.elections := public.election_for_admin_action(p_election, 'start_runoff');
  pos public.ballot_positions;
  r uuid;
  r_pos uuid;
  tied integer;
  open_seats integer;
BEGIN
  SELECT * INTO pos FROM public.ballot_positions WHERE id = p_position AND election_id = p_election;
  IF pos.id IS NULL THEN
    RAISE EXCEPTION 'Choose a position on this election''s ballot.' USING ERRCODE = '22023';
  END IF;
  IF e.status <> 'ballot_locked' THEN
    RAISE EXCEPTION 'A run-off starts from a locked ballot whose voting has closed.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.elections WHERE runoff_of = p_election AND status NOT IN ('cancelled')
             AND EXISTS (SELECT 1 FROM public.ballot_positions b WHERE b.election_id = elections.id AND b.title = pos.title)) THEN
    RAISE EXCEPTION 'A run-off for % already exists.', pos.title USING ERRCODE = '22023';
  END IF;
  DROP TABLE IF EXISTS pg_temp.outcome;
  CREATE TEMP TABLE pg_temp.outcome ON COMMIT DROP AS SELECT * FROM public.election_outcomes(p_election);
  SELECT count(*) INTO tied FROM pg_temp.outcome WHERE ballot_position_id = p_position AND outcome = 'runoff';
  IF tied = 0 THEN
    RAISE EXCEPTION 'There''s no tie for %.', pos.title USING ERRCODE = '22023';
  END IF;
  SELECT pos.seats - count(*) FILTER (WHERE outcome IN ('elected', 'elected_unopposed')) INTO open_seats
  FROM pg_temp.outcome WHERE ballot_position_id = p_position;

  INSERT INTO public.elections (title, description, type, status, start_date, end_date, results_date, runoff_of, created_by, show_unopposed_status)
  VALUES (
    format('%s: run-off for %s', e.title, pos.title),
    format('A run-off between the candidates tied for %s in %s.', pos.title, e.title),
    e.type, 'draft', now() + interval '7 days', now() + interval '10 days', NULL, p_election, auth.uid(), false
  ) RETURNING id INTO r;
  -- Only the tied position, not the type's template.
  DELETE FROM public.ballot_positions WHERE election_id = r;
  INSERT INTO public.ballot_positions (election_id, title, description, seats, display_order)
  VALUES (r, pos.title, pos.description, open_seats, 1) RETURNING id INTO r_pos;
  INSERT INTO public.candidates (election_id, user_id, full_name, position, ballot_position_id, bio, manifesto, photo_url)
  SELECT r, c.user_id, c.full_name, pos.title, r_pos, c.bio, c.manifesto, c.photo_url
  FROM pg_temp.outcome o JOIN public.candidates c ON c.id = o.candidate_id
  WHERE o.ballot_position_id = p_position AND o.outcome = 'runoff';
  PERFORM public.election_action_done();
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.election_start_runoff(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.election_start_runoff(uuid, uuid) TO authenticated, service_role;

-- A run-off has no nominations, and its voter roll is the original's.
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
    AND m.created_at <= coalesce(e.eligibility_cutoff, now())
  WHERE e.id = p_election AND e.runoff_of IS NULL
  ON CONFLICT DO NOTHING;
$$;

-- election_publish: a run-off has positions but no nominations window.
CREATE OR REPLACE FUNCTION public.election_publish(p_election uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.elections := public.election_for_admin_action(p_election, 'publish');
BEGIN
  IF e.status <> 'draft' THEN
    RAISE EXCEPTION 'Only a draft can be published.' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(coalesce(e.title, ''))) = 0 THEN
    RAISE EXCEPTION 'Give the election a title.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ballot_positions WHERE election_id = p_election)
     AND NOT EXISTS (SELECT 1 FROM public.initiatives WHERE election_id = p_election) THEN
    RAISE EXCEPTION 'Add at least one position or initiative.' USING ERRCODE = '22023';
  END IF;
  IF e.runoff_of IS NULL AND EXISTS (SELECT 1 FROM public.ballot_positions WHERE election_id = p_election)
     AND (e.nomination_start IS NULL OR e.nomination_end IS NULL) THEN
    RAISE EXCEPTION 'Set the nominations window.' USING ERRCODE = '22023';
  END IF;
  IF e.start_date <= now() THEN
    RAISE EXCEPTION 'Voting must start in the future.' USING ERRCODE = '22023';
  END IF;
  IF e.nomination_end > e.start_date
     OR (e.candidate_voting_start IS NOT NULL AND e.nomination_end IS NOT NULL AND e.candidate_voting_start < e.nomination_end)
     OR (e.candidate_voting_end IS NOT NULL AND e.candidate_voting_start IS NOT NULL AND e.candidate_voting_end <= e.candidate_voting_start)
     OR (e.results_date IS NOT NULL AND (e.results_date < e.end_date OR e.results_date < coalesce(e.candidate_voting_end, e.end_date))) THEN
    RAISE EXCEPTION 'The dates are out of order: nominations, then voting, then results.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.elections SET status = 'scheduled', updated_at = now() WHERE id = p_election;
  PERFORM public.election_action_done();
END $$;
