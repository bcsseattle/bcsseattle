-- Election management (docs/election-management-plan.md §3, M2).
--
-- elections.status now holds only what an admin decides: draft, scheduled,
-- ballot_locked, certified, completed (results published), archived,
-- cancelled. Whether nominations or voting are open follows from the dates
-- (utils/elections/rules.ts electionPhase; election_voting_open below).
--
-- Admins change status only through the election_* functions at the end, which
-- check the guards and log the change. Every change to an election, its
-- positions, initiatives, candidates and nominations is logged in
-- election_events by trigger, whoever makes it.

-------------------------------------------------------------------------------
-- 1. New columns and missing foreign keys
-------------------------------------------------------------------------------

ALTER TABLE public.elections
  ADD COLUMN results_date timestamptz,
  ADD COLUMN eligibility_cutoff timestamptz,
  ADD COLUMN results_published_at timestamptz,
  ADD COLUMN runoff_of uuid REFERENCES public.elections(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.elections.results_date IS 'When results are expected; shown to members';
COMMENT ON COLUMN public.elections.eligibility_cutoff IS 'Members who joined after this can''t nominate, be nominated or vote (null: when the ballot is locked)';
COMMENT ON COLUMN public.elections.runoff_of IS 'The election whose tie this run-off settles';

ALTER TABLE public.initiatives
  ADD COLUMN pass_threshold text NOT NULL DEFAULT 'majority' CHECK (pass_threshold IN ('majority', 'two_thirds'));
COMMENT ON COLUMN public.initiatives.pass_threshold IS 'majority: Yes > No. two_thirds: Yes >= 2/3 of Yes + No (bylaw amendments, Art. XII). Abstentions never count';

ALTER TABLE public.candidates ADD COLUMN withdrawn_at timestamptz;
COMMENT ON COLUMN public.candidates.withdrawn_at IS 'Withdrawn after the ballot was locked: stays on the ballot, can''t win';

-- Production had no orphans (checked 10 Nov 2026). Elsewhere, rows pointing at a
-- deleted election go: their votes went with the election (votes cascade).
DELETE FROM public.candidates c
WHERE c.election_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.elections e WHERE e.id = c.election_id);
DELETE FROM public.nominations n
WHERE NOT EXISTS (SELECT 1 FROM public.elections e WHERE e.id = n.election_id);
ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;
ALTER TABLE public.nominations
  ADD CONSTRAINT nominations_election_id_fkey FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

-------------------------------------------------------------------------------
-- 2. Status backfill (one production row: the 2025 election becomes completed)
-------------------------------------------------------------------------------

UPDATE public.elections SET status = (CASE
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN status = 'draft' AND NOT coalesce(is_active, false) THEN 'draft'
    WHEN greatest(end_date, coalesce(
           CASE WHEN coalesce(enable_separate_voting_periods, type IN ('leadership', 'board')) THEN candidate_voting_end END,
           end_date)) < now() THEN
      CASE WHEN NOT coalesce(is_active, false) THEN 'archived'
           WHEN status = 'draft' THEN 'certified' -- results were hidden; an admin publishes them
           ELSE 'completed' END
    WHEN nomination_end IS NULL OR nomination_end < now() THEN 'ballot_locked'
    ELSE 'scheduled'
  END)::public.election_status
WHERE status IN ('draft', 'nominations_open', 'nominations_closed', 'voting_open', 'voting_closed', 'completed');

UPDATE public.elections SET is_active = status NOT IN ('draft', 'cancelled');

-- Time decides those phases now; nothing may store them again.
ALTER TABLE public.elections ADD CONSTRAINT elections_status_is_a_decision
  CHECK (status NOT IN ('nominations_open', 'nominations_closed', 'voting_open', 'voting_closed'));
ALTER TABLE public.elections ALTER COLUMN status SET NOT NULL;

-- Timeline order for new writes; old rows are left alone (NOT VALID).
ALTER TABLE public.elections ADD CONSTRAINT elections_timeline_order CHECK (
  (nomination_end IS NULL OR nomination_end <= start_date)
  AND (candidate_voting_start IS NULL OR nomination_end IS NULL OR candidate_voting_start >= nomination_end)
  AND (candidate_voting_start IS NULL OR candidate_voting_end IS NULL OR candidate_voting_end > candidate_voting_start)
  AND (results_date IS NULL OR (results_date >= end_date AND (candidate_voting_end IS NULL OR results_date >= candidate_voting_end)))
) NOT VALID;

-------------------------------------------------------------------------------
-- 3. Positions per election
-------------------------------------------------------------------------------

CREATE TABLE public.ballot_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR length(description) <= 1000),
  seats integer NOT NULL DEFAULT 1 CHECK (seats BETWEEN 1 AND 9),
  display_order integer NOT NULL DEFAULT 0,
  -- Decided at lock when candidates <= seats; null until then (the election's
  -- show_unopposed_status, else its type, is the default).
  unopposed_decision text CHECK (unopposed_decision IN ('elect', 'keep_on_ballot')),
  vacant boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (election_id, title)
);
CREATE INDEX ballot_positions_election_idx ON public.ballot_positions (election_id, display_order);
CREATE TRIGGER ballot_positions_updated_at BEFORE UPDATE ON public.ballot_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
COMMENT ON TABLE public.ballot_positions IS 'The positions on one election''s ballot, with seats and order. election_positions is the per-type template.';

-- Each election gets its type's positions (as positionOrder() shows them today),
-- then any candidate position that isn't among them.
INSERT INTO public.ballot_positions (election_id, title, description, display_order)
SELECT e.id, p.position, p.description, p.display_order
FROM public.elections e
JOIN public.election_positions p ON p.election_type = e.type::text;

INSERT INTO public.ballot_positions (election_id, title, display_order)
SELECT c.election_id, c.position,
       (SELECT coalesce(max(b.display_order), 0) FROM public.ballot_positions b WHERE b.election_id = c.election_id)
         + row_number() OVER (PARTITION BY c.election_id ORDER BY c.position)
FROM (SELECT DISTINCT election_id, position FROM public.candidates WHERE election_id IS NOT NULL) c
WHERE NOT EXISTS (SELECT 1 FROM public.ballot_positions b WHERE b.election_id = c.election_id AND b.title = c.position);

-- New elections start from their type's template.
CREATE FUNCTION public.election_default_positions() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.ballot_positions (election_id, title, description, display_order)
  SELECT NEW.id, p.position, p.description, p.display_order
  FROM public.election_positions p WHERE p.election_type = NEW.type::text;
  RETURN NULL;
END $$;
CREATE TRIGGER elections_default_positions AFTER INSERT ON public.elections
  FOR EACH ROW EXECUTE FUNCTION public.election_default_positions();

ALTER TABLE public.candidates
  ADD COLUMN ballot_position_id uuid REFERENCES public.ballot_positions(id);
UPDATE public.candidates c SET ballot_position_id = b.id
FROM public.ballot_positions b WHERE b.election_id = c.election_id AND b.title = c.position;
CREATE INDEX candidates_ballot_position_idx ON public.candidates (ballot_position_id);

-- candidates.position stays as text (the vote handlers and the app read it).
-- This keeps it and ballot_position_id in step, and refuses a position that
-- isn't on the election's ballot (W8).
CREATE FUNCTION public.candidate_position_sync() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE pos public.ballot_positions;
BEGIN
  IF NEW.ballot_position_id IS NOT NULL THEN
    SELECT * INTO pos FROM public.ballot_positions WHERE id = NEW.ballot_position_id AND election_id = NEW.election_id;
  ELSE
    SELECT * INTO pos FROM public.ballot_positions WHERE election_id = NEW.election_id AND title = NEW.position;
  END IF;
  IF pos.id IS NULL THEN
    RAISE EXCEPTION 'The position "%" isn''t on this election''s ballot.', NEW.position USING ERRCODE = '23514';
  END IF;
  NEW.ballot_position_id := pos.id;
  NEW.position := pos.title;
  RETURN NEW;
END $$;
CREATE TRIGGER candidates_position_sync BEFORE INSERT OR UPDATE OF position, ballot_position_id, election_id ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.candidate_position_sync();

-- Nothing used it; candidates.position is text.
DROP TYPE public.position_enum;

-------------------------------------------------------------------------------
-- 4. Nominations
-------------------------------------------------------------------------------

ALTER TABLE public.nominations
  ADD COLUMN nominated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN ballot_position_id uuid REFERENCES public.ballot_positions(id) ON DELETE CASCADE,
  ADD COLUMN status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('awaiting_acceptance', 'submitted', 'approved', 'rejected', 'declined', 'withdrawn')),
  ADD COLUMN full_name text,
  ADD COLUMN bio text,
  ADD COLUMN manifesto text CHECK (manifesto IS NULL OR length(manifesto) <= 1000),
  ADD COLUMN photo_url text,
  ADD COLUMN rejection_reason text,
  ADD COLUMN decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN decided_at timestamptz,
  ADD COLUMN candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
COMMENT ON COLUMN public.nominations.message IS 'The nominator''s note to the nominee';
COMMENT ON COLUMN public.nominations.status IS 'awaiting_acceptance (someone else nominated them) -> submitted -> approved (candidate created) | rejected; or declined / withdrawn';

-- Production has none; any row would be someone's own, waiting for review.
UPDATE public.nominations n SET nominated_by = n.nominee_user_id,
  ballot_position_id = (SELECT b.id FROM public.ballot_positions b WHERE b.election_id = n.election_id AND b.title = n.position);

-- Existing candidates count as approved (D4), so they show under My nominations.
INSERT INTO public.nominations
  (election_id, nominee_user_id, nominated_by, ballot_position_id, position, status,
   full_name, bio, manifesto, photo_url, candidate_id, decided_at, created_at)
SELECT c.election_id, c.user_id, c.user_id, c.ballot_position_id, c.position, 'approved',
       c.full_name, c.bio, nullif(c.manifesto, ''), c.photo_url, c.id, c.created_at, coalesce(c.created_at, now())
FROM public.candidates c
WHERE c.user_id IS NOT NULL AND c.election_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.nominations ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.nominations DROP CONSTRAINT nominations_election_id_nominee_user_id_position_key;
ALTER TABLE public.nominations ADD CONSTRAINT nominations_one_per_position UNIQUE (election_id, nominee_user_id, ballot_position_id);
-- A person accepts one position per election (B2).
CREATE UNIQUE INDEX nominations_one_accepted_per_election ON public.nominations (election_id, nominee_user_id)
  WHERE status IN ('submitted', 'approved');
CREATE TRIGGER nominations_updated_at BEFORE UPDATE ON public.nominations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-------------------------------------------------------------------------------
-- 5. Voter roll, frozen results, notification log, activity log
-------------------------------------------------------------------------------

-- Filled when the ballot is locked: approved, active members who joined by the
-- cutoff (B11). members has no history, so this is the record of who could vote.
CREATE TABLE public.election_voters (
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (election_id, user_id)
);

-- The certified tally: aggregates only, never who voted for what.
CREATE TABLE public.election_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  ballot_position_id uuid REFERENCES public.ballot_positions(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE CASCADE,
  votes integer,
  yes integer,
  no integer,
  abstain integer,
  rank integer,
  outcome text NOT NULL CHECK (outcome IN
    ('elected', 'elected_unopposed', 'not_elected', 'withdrawn', 'vacant', 'runoff', 'passed', 'not_passed')),
  note text,
  certified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  certified_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((candidate_id IS NULL) OR (initiative_id IS NULL))
);
CREATE INDEX election_results_election_idx ON public.election_results (election_id);

CREATE TABLE public.election_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  kind text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now()
);
-- One send per election, kind and person (null person: the broadcast itself).
CREATE UNIQUE INDEX election_notifications_once ON public.election_notifications
  (election_id, kind, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Append-only. No foreign key, so the history outlives a deleted draft.
CREATE TABLE public.election_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  election_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  subject text NOT NULL,
  subject_id uuid,
  reason text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX election_events_election_idx ON public.election_events (election_id, created_at DESC);

CREATE FUNCTION public.election_events_append_only() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'The election activity log can''t be changed.' USING ERRCODE = '42501';
END $$;
CREATE TRIGGER election_events_append_only BEFORE UPDATE OR DELETE ON public.election_events
  FOR EACH ROW EXECUTE FUNCTION public.election_events_append_only();

-- Who changed what, with only the fields that changed. The election_* functions
-- name the action and give the reason through bcs.action / bcs.reason.
CREATE FUNCTION public.election_log_change() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  old_row jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  new_row jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  row_ jsonb := coalesce(new_row, old_row);
  before_ jsonb;
  after_ jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(key, value) INTO before_ FROM jsonb_each(old_row)
      WHERE key NOT IN ('updated_at') AND new_row -> key IS DISTINCT FROM value;
    SELECT jsonb_object_agg(key, value) INTO after_ FROM jsonb_each(new_row)
      WHERE key NOT IN ('updated_at') AND old_row -> key IS DISTINCT FROM value;
    IF before_ IS NULL THEN RETURN NULL; END IF;
  ELSE
    before_ := old_row;
    after_ := new_row;
  END IF;
  INSERT INTO public.election_events (election_id, actor_id, action, subject, subject_id, reason, before, after)
  VALUES (
    CASE WHEN TG_TABLE_NAME = 'elections' THEN (row_ ->> 'id')::uuid ELSE (row_ ->> 'election_id')::uuid END,
    auth.uid(),
    coalesce(nullif(current_setting('bcs.action', true), ''), lower(TG_OP)),
    TG_TABLE_NAME,
    (row_ ->> 'id')::uuid,
    nullif(current_setting('bcs.reason', true), ''),
    before_,
    after_
  );
  RETURN NULL;
END $$;

CREATE TRIGGER elections_log AFTER INSERT OR UPDATE OR DELETE ON public.elections
  FOR EACH ROW EXECUTE FUNCTION public.election_log_change();
CREATE TRIGGER ballot_positions_log AFTER INSERT OR UPDATE OR DELETE ON public.ballot_positions
  FOR EACH ROW EXECUTE FUNCTION public.election_log_change();
CREATE TRIGGER initiatives_log AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.election_log_change();
CREATE TRIGGER candidates_log AFTER INSERT OR UPDATE OR DELETE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.election_log_change();
CREATE TRIGGER nominations_log AFTER INSERT OR UPDATE OR DELETE ON public.nominations
  FOR EACH ROW EXECUTE FUNCTION public.election_log_change();

-------------------------------------------------------------------------------
-- 6. Rules enforced on every write
-------------------------------------------------------------------------------

-- is_active is kept for older readers (results API, push cron, signed-out list).
CREATE FUNCTION public.election_sync_is_active() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.is_active := NEW.status NOT IN ('draft', 'cancelled');
  RETURN NEW;
END $$;
CREATE TRIGGER elections_sync_is_active BEFORE INSERT OR UPDATE OF status, is_active ON public.elections
  FOR EACH ROW EXECUTE FUNCTION public.election_sync_is_active();

-- Once published, the timeline changes only through election_extend, which
-- logs a reason. Signed-in users (admins, under RLS) can still edit the title,
-- description, results date and settings directly.
CREATE FUNCTION public.election_guard_timeline() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND OLD.status <> 'draft' AND (
       NEW.type IS DISTINCT FROM OLD.type
    OR NEW.nomination_start IS DISTINCT FROM OLD.nomination_start
    OR NEW.nomination_end IS DISTINCT FROM OLD.nomination_end
    OR NEW.start_date IS DISTINCT FROM OLD.start_date
    OR NEW.end_date IS DISTINCT FROM OLD.end_date
    OR NEW.candidate_voting_start IS DISTINCT FROM OLD.candidate_voting_start
    OR NEW.candidate_voting_end IS DISTINCT FROM OLD.candidate_voting_end
    OR NEW.enable_separate_voting_periods IS DISTINCT FROM OLD.enable_separate_voting_periods
    OR NEW.eligibility_cutoff IS DISTINCT FROM OLD.eligibility_cutoff) THEN
    RAISE EXCEPTION 'This election is published. Change its dates with Extend, which records a reason.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER elections_guard_timeline BEFORE UPDATE ON public.elections
  FOR EACH ROW EXECUTE FUNCTION public.election_guard_timeline();

-- The ballot (positions, initiatives, candidates) can change only in draft or
-- scheduled. Applies to every role, the service role included. After the lock,
-- a candidate's name, statement and photo can still be corrected (B14) and a
-- candidate marked withdrawn (B13); both are logged.
CREATE FUNCTION public.election_ballot_frozen(p_election uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT status NOT IN ('draft', 'scheduled') FROM public.elections WHERE id = p_election), false)
$$;

CREATE FUNCTION public.election_guard_ballot() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  election uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.election_id ELSE NEW.election_id END;
BEGIN
  -- A deleted election takes its ballot with it (its row is already gone here).
  IF NOT public.election_ballot_frozen(election) THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF TG_TABLE_NAME = 'candidates' AND TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) - ARRAY['full_name', 'bio', 'manifesto', 'photo_url', 'withdrawn_at'])
       = (to_jsonb(OLD) - ARRAY['full_name', 'bio', 'manifesto', 'photo_url', 'withdrawn_at']) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'The ballot is locked and can''t be changed.' USING ERRCODE = '42501';
END $$;

CREATE TRIGGER ballot_positions_guard BEFORE INSERT OR UPDATE OR DELETE ON public.ballot_positions
  FOR EACH ROW EXECUTE FUNCTION public.election_guard_ballot();
CREATE TRIGGER initiatives_guard BEFORE INSERT OR UPDATE OR DELETE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.election_guard_ballot();
CREATE TRIGGER candidates_guard BEFORE INSERT OR UPDATE OR DELETE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.election_guard_ballot();

-- The roll is taken when the ballot is locked, by whatever path. Rows backfilled
-- to ballot_locked above get theirs here.
CREATE FUNCTION public.election_snapshot_voters(p_election uuid) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.election_voters (election_id, user_id)
  SELECT e.id, m.user_id
  FROM public.elections e
  JOIN public.members m ON m."isApproved" AND m.status = 'active' AND m.user_id IS NOT NULL
    AND m.created_at <= coalesce(e.eligibility_cutoff, now())
  WHERE e.id = p_election
  ON CONFLICT DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.election_snapshot_voters(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.election_take_roll() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'ballot_locked' AND (TG_OP = 'INSERT' OR OLD.status <> 'ballot_locked')
     AND NOT EXISTS (SELECT 1 FROM public.election_voters WHERE election_id = NEW.id) THEN
    PERFORM public.election_snapshot_voters(NEW.id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER elections_take_roll AFTER INSERT OR UPDATE OF status ON public.elections
  FOR EACH ROW EXECUTE FUNCTION public.election_take_roll();

SELECT public.election_snapshot_voters(id) FROM public.elections WHERE status = 'ballot_locked';

-------------------------------------------------------------------------------
-- 7. When voting is open (mirrors votingWindows in utils/elections/rules.ts)
-------------------------------------------------------------------------------

-- Windows include their edges. Candidate voting follows candidate_voting_start/end
-- when separate periods are on (null: the type's default, BUG-060).
CREATE FUNCTION public.election_voting_open(p_election uuid, p_kind public.vote_session_type, p_at timestamptz DEFAULT now())
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH w AS (
    SELECT e.status, e.start_date, e.end_date,
           CASE WHEN s.separate THEN coalesce(e.candidate_voting_start, e.start_date) ELSE e.start_date END AS c_start,
           CASE WHEN s.separate THEN coalesce(e.candidate_voting_end, e.end_date) ELSE e.end_date END AS c_end
    FROM public.elections e,
         LATERAL (SELECT coalesce(e.enable_separate_voting_periods, e.type IN ('leadership', 'board')) AS separate) s
    WHERE e.id = p_election
  )
  SELECT coalesce((
    SELECT status = 'ballot_locked' AND CASE p_kind
      WHEN 'candidates' THEN p_at BETWEEN c_start AND c_end
      WHEN 'initiatives' THEN p_at BETWEEN start_date AND end_date
      ELSE p_at BETWEEN c_start AND c_end OR p_at BETWEEN start_date AND end_date
    END FROM w), false)
$$;
REVOKE ALL ON FUNCTION public.election_voting_open(uuid, public.vote_session_type, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.election_voting_open(uuid, public.vote_session_type, timestamptz) TO authenticated, service_role;

-- On the roll and still an approved, active member (B11).
CREATE FUNCTION public.election_voter_eligible(p_election uuid, p_user uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.election_voters v WHERE v.election_id = p_election AND v.user_id = p_user)
     AND EXISTS (SELECT 1 FROM public.members m WHERE m.user_id = p_user AND m."isApproved" AND m.status = 'active')
$$;
REVOKE ALL ON FUNCTION public.election_voter_eligible(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- The vote_sessions insert policy's check: it used to look at start/end_date
-- only, ignoring the status and the candidate window.
CREATE OR REPLACE FUNCTION public.user_can_vote_in_session(user_uuid uuid, election_uuid uuid, session_type_param public.vote_session_type)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.election_voting_open(election_uuid, session_type_param)
     AND public.election_voter_eligible(election_uuid, user_uuid)
     AND NOT public.user_has_completed_vote_session(user_uuid, election_uuid, session_type_param)
$$;

-------------------------------------------------------------------------------
-- 8. Row level security
-------------------------------------------------------------------------------

-- Elections: drafts are for admins only (W2/D5). Admins create drafts; status
-- and publication fields change only through the election_* functions.
DROP POLICY "Authenticated users can view all elections" ON public.elections;
DROP POLICY "Public can view active elections" ON public.elections;
DROP POLICY "Admins can manage elections" ON public.elections;
CREATE POLICY "Elections are visible once published" ON public.elections FOR SELECT
  USING (status <> 'draft' OR public.current_user_is_admin());
CREATE POLICY "Admins create draft elections" ON public.elections FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin() AND status = 'draft');
CREATE POLICY "Admins edit elections" ON public.elections FOR UPDATE TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Admins delete draft elections" ON public.elections FOR DELETE TO authenticated
  USING (public.current_user_is_admin() AND status = 'draft');
REVOKE INSERT, UPDATE ON public.elections FROM anon, authenticated;
GRANT INSERT (title, description, type, start_date, end_date, nomination_start, nomination_end,
              candidate_voting_start, candidate_voting_end, enable_separate_voting_periods,
              show_unopposed_status, settings, results_date, eligibility_cutoff, created_by)
  ON public.elections TO authenticated;
GRANT UPDATE (title, description, type, start_date, end_date, nomination_start, nomination_end,
              candidate_voting_start, candidate_voting_end, enable_separate_voting_periods,
              show_unopposed_status, settings, results_date, eligibility_cutoff, updated_at)
  ON public.elections TO authenticated;

-- What hangs off an election is visible when the election is.
ALTER TABLE public.ballot_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Positions follow their election" ON public.ballot_positions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id));
CREATE POLICY "Admins manage positions" ON public.ballot_positions TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY "Anyone can view initiatives" ON public.initiatives;
DROP POLICY "Public can view initiatives" ON public.initiatives;
CREATE POLICY "Initiatives follow their election" ON public.initiatives FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id));

-- Candidates: visible with their election. Nominating goes through the server
-- (service role, or the nomination functions later), so the self-insert policy
-- that let any signed-in user add themselves to any election is dropped.
DROP POLICY "Public can view all candidates" ON public.candidates;
DROP POLICY "Users can nominate themselves" ON public.candidates;
DROP POLICY "Candidates can edit their nomination until voting opens" ON public.candidates;
DROP POLICY "Candidates can withdraw until voting opens" ON public.candidates;
CREATE POLICY "Candidates follow their election" ON public.candidates FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id));
CREATE POLICY "Admins add candidates" ON public.candidates FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Candidates edit their own until the ballot is locked" ON public.candidates FOR UPDATE TO authenticated
  USING (public.current_user_is_admin() OR (user_id = auth.uid() AND NOT public.election_ballot_frozen(election_id)))
  WITH CHECK (public.current_user_is_admin() OR (user_id = auth.uid() AND NOT public.election_ballot_frozen(election_id)));
CREATE POLICY "Candidates withdraw until the ballot is locked" ON public.candidates FOR DELETE TO authenticated
  USING (public.current_user_is_admin() OR (user_id = auth.uid() AND NOT public.election_ballot_frozen(election_id)));

-- Nominations were insertable by anyone signed in and readable by everyone.
-- Now: the nominee, the nominator and admins; approved ones to active members.
-- Writes go through the nomination functions (Phase 3).
DROP POLICY "Authenticated users can create nominations" ON public.nominations;
DROP POLICY "Public can view nominations" ON public.nominations;
DROP POLICY "Users can delete their own nominations" ON public.nominations;
DROP POLICY "Users can update their own nominations" ON public.nominations;
CREATE POLICY "Nominations are visible to the people involved" ON public.nominations FOR SELECT TO authenticated
  USING (
    nominee_user_id = auth.uid() OR nominated_by = auth.uid() OR public.current_user_is_admin()
    OR (status = 'approved' AND public.current_user_is_active_member()
        AND EXISTS (SELECT 1 FROM public.elections e WHERE e.id = election_id))
  );

ALTER TABLE public.election_voters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see their own place on the roll; admins see the roll" ON public.election_voters FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());

ALTER TABLE public.election_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Results are visible once certified (admins) or published" ON public.election_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.elections e WHERE e.id = election_id
      AND (e.status IN ('completed', 'archived') OR (e.status = 'certified' AND public.current_user_is_admin()))
  ));

ALTER TABLE public.election_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see election notifications" ON public.election_notifications FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

ALTER TABLE public.election_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see election activity" ON public.election_events FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- None of these are written directly by signed-in users or visitors.
REVOKE INSERT, UPDATE, DELETE ON public.election_voters, public.election_results,
  public.election_notifications, public.election_events FROM anon, authenticated;

-------------------------------------------------------------------------------
-- 9. Admin actions. Each checks the caller, locks the row, applies its guard,
-- names the action and reason for the activity log, then changes the row.
-------------------------------------------------------------------------------

-- An admin who is a nominee or candidate in an election can't run it (D7).
CREATE FUNCTION public.election_for_admin_action(p_election uuid, p_action text, p_reason text DEFAULT NULL)
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
  IF EXISTS (SELECT 1 FROM public.candidates WHERE election_id = p_election AND user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.nominations WHERE election_id = p_election AND nominee_user_id = auth.uid()
                AND status IN ('awaiting_acceptance', 'submitted', 'approved')) THEN
    RAISE EXCEPTION 'You''re standing in this election, so another admin has to do this.' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('bcs.action', p_action, true);
  PERFORM set_config('bcs.reason', coalesce(btrim(p_reason), ''), true);
  RETURN e;
END $$;
REVOKE ALL ON FUNCTION public.election_for_admin_action(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Clears the action and reason so later statements in the same transaction
-- aren't logged under them. Every admin action ends with it.
CREATE FUNCTION public.election_action_done() RETURNS void
  LANGUAGE sql AS $$
  SELECT set_config('bcs.action', '', true), set_config('bcs.reason', '', true);
$$;

CREATE FUNCTION public.election_require_reason(p_reason text) RETURNS void
  LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF length(btrim(coalesce(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'Give a reason. It''s recorded in the activity log.' USING ERRCODE = '22023';
  END IF;
END $$;

-- Draft -> scheduled. The form checks the same timeline in more detail
-- (validateTimeline in utils/elections/rules.ts).
CREATE FUNCTION public.election_publish(p_election uuid) RETURNS void
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
  IF EXISTS (SELECT 1 FROM public.ballot_positions WHERE election_id = p_election)
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

-- Moves a deadline later, with a reason: nominations before the lock, voting
-- before it closes. Earlier deadlines would cut people off, so they're refused.
CREATE FUNCTION public.election_extend(p_election uuid, p_field text, p_until timestamptz, p_reason text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e public.elections := public.election_for_admin_action(p_election, 'extend_' || p_field, p_reason);
  current_end timestamptz;
BEGIN
  PERFORM public.election_require_reason(p_reason);
  current_end := CASE p_field
    WHEN 'nomination_end' THEN e.nomination_end
    WHEN 'end_date' THEN e.end_date
    WHEN 'candidate_voting_end' THEN e.candidate_voting_end
  END;
  IF current_end IS NULL THEN
    RAISE EXCEPTION 'Only the nominations end, voting end or candidate voting end can be extended.' USING ERRCODE = '22023';
  END IF;
  IF p_until <= current_end THEN
    RAISE EXCEPTION 'The new time must be later than the current one.' USING ERRCODE = '22023';
  END IF;
  IF p_field = 'nomination_end' THEN
    IF e.status <> 'scheduled' THEN
      RAISE EXCEPTION 'Nominations can be extended only before the ballot is locked.' USING ERRCODE = '22023';
    END IF;
    IF p_until > e.start_date OR (e.candidate_voting_start IS NOT NULL AND p_until > e.candidate_voting_start) THEN
      RAISE EXCEPTION 'Nominations must close before voting opens. Move the voting dates first.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.elections SET nomination_end = p_until, updated_at = now() WHERE id = p_election;
  ELSE
    IF e.status NOT IN ('scheduled', 'ballot_locked') THEN
      RAISE EXCEPTION 'Voting can be extended only before results are certified.' USING ERRCODE = '22023';
    END IF;
    IF current_end < now() THEN
      RAISE EXCEPTION 'This voting window has already closed, so it can''t be extended.' USING ERRCODE = '22023';
    END IF;
    IF e.results_date IS NOT NULL AND p_until > e.results_date THEN
      RAISE EXCEPTION 'Move the results date first: it''s before the new end.' USING ERRCODE = '22023';
    END IF;
    IF p_field = 'end_date' THEN
      UPDATE public.elections SET end_date = p_until, updated_at = now() WHERE id = p_election;
    ELSE
      UPDATE public.elections SET candidate_voting_end = p_until, updated_at = now() WHERE id = p_election;
    END IF;
  END IF;
  PERFORM public.election_action_done();
END $$;

-- Scheduled -> ballot_locked, after nominations close and every nomination is
-- decided. Positions with no candidate must be marked vacant (or nominations
-- extended). Uncontested positions take the election's unopposed default
-- unless the admin chose. The voter roll is taken by trigger.
CREATE FUNCTION public.election_lock_ballot(p_election uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e public.elections := public.election_for_admin_action(p_election, 'lock_ballot');
  empty_positions text;
  elect_unopposed boolean;
BEGIN
  IF e.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Only a scheduled election''s ballot can be locked.' USING ERRCODE = '22023';
  END IF;
  IF e.nomination_end IS NOT NULL AND now() <= e.nomination_end THEN
    RAISE EXCEPTION 'Nominations are still open.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.nominations WHERE election_id = p_election AND status IN ('awaiting_acceptance', 'submitted')) THEN
    RAISE EXCEPTION 'Some nominations haven''t been decided yet.' USING ERRCODE = '22023';
  END IF;
  SELECT string_agg(b.title, ', ' ORDER BY b.display_order) INTO empty_positions
  FROM public.ballot_positions b
  WHERE b.election_id = p_election AND NOT b.vacant
    AND NOT EXISTS (SELECT 1 FROM public.candidates c WHERE c.ballot_position_id = b.id);
  IF empty_positions IS NOT NULL THEN
    RAISE EXCEPTION 'No candidates for: %. Mark them vacant or extend nominations.', empty_positions USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.candidates WHERE election_id = p_election)
     AND NOT EXISTS (SELECT 1 FROM public.initiatives WHERE election_id = p_election) THEN
    RAISE EXCEPTION 'The ballot is empty.' USING ERRCODE = '22023';
  END IF;

  elect_unopposed := coalesce(e.show_unopposed_status, e.type IN ('leadership', 'board'));
  UPDATE public.ballot_positions b
     SET unopposed_decision = CASE WHEN elect_unopposed THEN 'elect' ELSE 'keep_on_ballot' END
   WHERE b.election_id = p_election AND NOT b.vacant AND b.unopposed_decision IS NULL
     AND (SELECT count(*) FROM public.candidates c WHERE c.ballot_position_id = b.id) <= b.seats;

  UPDATE public.elections SET status = 'ballot_locked', updated_at = now() WHERE id = p_election;
  PERFORM public.election_action_done();
END $$;

-- Any time before certification, with a reason. Votes are kept but never counted.
CREATE FUNCTION public.election_cancel(p_election uuid, p_reason text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.elections := public.election_for_admin_action(p_election, 'cancel', p_reason);
BEGIN
  PERFORM public.election_require_reason(p_reason);
  IF e.status NOT IN ('scheduled', 'ballot_locked') THEN
    RAISE EXCEPTION 'Only a published election that isn''t certified can be cancelled. Delete a draft instead.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.elections SET status = 'cancelled', updated_at = now() WHERE id = p_election;
  PERFORM public.election_action_done();
END $$;

-- Certified -> ballot_locked, until results are published (D8).
CREATE FUNCTION public.election_reopen_certification(p_election uuid, p_reason text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.elections := public.election_for_admin_action(p_election, 'reopen_certification', p_reason);
BEGIN
  PERFORM public.election_require_reason(p_reason);
  IF e.status <> 'certified' THEN
    RAISE EXCEPTION 'Only certified results that aren''t published can be reopened.' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.election_results WHERE election_id = p_election;
  UPDATE public.elections SET status = 'ballot_locked', updated_at = now() WHERE id = p_election;
  PERFORM public.election_action_done();
END $$;

CREATE FUNCTION public.election_publish_results(p_election uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.elections := public.election_for_admin_action(p_election, 'publish_results');
BEGIN
  IF e.status <> 'certified' THEN
    RAISE EXCEPTION 'Certify the results before publishing them.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.elections SET status = 'completed', results_published_at = now(), updated_at = now() WHERE id = p_election;
  PERFORM public.election_action_done();
END $$;

CREATE FUNCTION public.election_archive(p_election uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.elections := public.election_for_admin_action(p_election, 'archive');
BEGIN
  IF e.status <> 'completed' THEN
    RAISE EXCEPTION 'Only an election with published results can be archived.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.elections SET status = 'archived', updated_at = now() WHERE id = p_election;
  PERFORM public.election_action_done();
END $$;

-- Turnout: counts only, never who voted for what.
CREATE FUNCTION public.election_turnout(p_election uuid)
  RETURNS TABLE (eligible bigint, voted_candidates bigint, voted_initiatives bigint)
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admins can see turnout.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT
    (SELECT count(*) FROM public.election_voters WHERE election_id = p_election),
    (SELECT count(DISTINCT user_id) FROM public.votes WHERE election_id = p_election AND candidate_id IS NOT NULL),
    (SELECT count(DISTINCT user_id) FROM public.votes WHERE election_id = p_election AND initiative_id IS NOT NULL);
END $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.election_publish(uuid)',
    'public.election_extend(uuid, text, timestamptz, text)',
    'public.election_lock_ballot(uuid)',
    'public.election_cancel(uuid, text)',
    'public.election_reopen_certification(uuid, text)',
    'public.election_publish_results(uuid)',
    'public.election_archive(uuid)',
    'public.election_turnout(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;
