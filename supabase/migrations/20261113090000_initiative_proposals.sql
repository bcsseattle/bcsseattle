-- Members propose initiative questions (decided 13 Nov 2026, docs/election-management-plan.md B17-B20).
--
-- While nominations are open (B18), an approved, active member (B19) proposes
-- up to 3 questions per election (B20). An admin approves one, which puts it on
-- the ballot as an initiative (majority threshold; admins can change the
-- wording or threshold in the ballot until the lock), or rejects it with a
-- reason the member sees (B17). The member edits a proposal while it waits for
-- review, and withdraws it until the ballot is locked.
--
-- initiative_proposals has no write policy for users: every change goes
-- through these functions, which check who is calling, the window and
-- eligibility. Every change is logged in election_events.

CREATE TABLE public.initiative_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  proposed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  additional_info_url text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'withdrawn')),
  rejection_reason text,
  initiative_id uuid REFERENCES public.initiatives(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.initiative_proposals IS 'Initiative questions proposed by members: submitted -> approved (initiative created) | rejected; or withdrawn';
CREATE INDEX initiative_proposals_election_idx ON public.initiative_proposals (election_id, status);
CREATE INDEX initiative_proposals_proposer_idx ON public.initiative_proposals (proposed_by);

CREATE TRIGGER initiative_proposals_updated_at BEFORE UPDATE ON public.initiative_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER initiative_proposals_log AFTER INSERT OR UPDATE OR DELETE ON public.initiative_proposals
  FOR EACH ROW EXECUTE FUNCTION public.election_log_change();

ALTER TABLE public.initiative_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Proposals are visible to the proposer and admins" ON public.initiative_proposals FOR SELECT TO authenticated
  USING (proposed_by = auth.uid() OR public.current_user_is_admin());

-- If an admin takes an approved question off the ballot (Ballot step), the
-- proposer sees it was removed rather than "on the ballot".
CREATE FUNCTION public.initiative_removed() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.initiative_proposals
     SET status = 'rejected', rejection_reason = 'Taken off the ballot by an admin.', initiative_id = NULL
   WHERE initiative_id = OLD.id AND status = 'approved';
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.initiative_removed() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER initiatives_removed AFTER DELETE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.initiative_removed();

-- The ballot can't be locked while a proposal waits for review, by any path.
CREATE FUNCTION public.election_guard_proposals() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.initiative_proposals WHERE election_id = NEW.id AND status = 'submitted') THEN
    RAISE EXCEPTION 'Some initiative proposals haven''t been decided yet.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER elections_guard_proposals BEFORE UPDATE OF status ON public.elections
  FOR EACH ROW WHEN (OLD.status = 'scheduled' AND NEW.status = 'ballot_locked')
  EXECUTE FUNCTION public.election_guard_proposals();

-- Title 10-200 characters, explanation 20-2,000, link http(s) or empty.
CREATE FUNCTION public.initiative_proposal_check(p_title text, p_description text, p_url text) RETURNS void
  LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF length(btrim(coalesce(p_title, ''))) NOT BETWEEN 10 AND 200 THEN
    RAISE EXCEPTION 'Write the question in 10 to 200 characters.' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(coalesce(p_description, ''))) NOT BETWEEN 20 AND 2000 THEN
    RAISE EXCEPTION 'Explain the question in 20 to 2,000 characters.' USING ERRCODE = '22023';
  END IF;
  IF nullif(btrim(coalesce(p_url, '')), '') IS NOT NULL AND btrim(p_url) !~* '^https?://\S+$' THEN
    RAISE EXCEPTION 'The link must start with http:// or https://.' USING ERRCODE = '22023';
  END IF;
END $$;

-- Propose a question. Returns the proposal's id.
CREATE FUNCTION public.initiative_propose(p_election uuid, p_title text, p_description text, p_url text DEFAULT NULL)
  RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me uuid := auth.uid();
  e public.elections;
  result uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to propose an initiative.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO e FROM public.elections WHERE id = p_election;
  IF e.id IS NULL OR NOT public.election_nominations_open(e) THEN
    RAISE EXCEPTION 'Proposals aren''t open for this election.' USING ERRCODE = '22023';
  END IF;
  IF NOT public.election_member_eligible(p_election, me) THEN
    RAISE EXCEPTION 'Only approved members with an active membership can propose initiatives.' USING ERRCODE = '42501';
  END IF;
  -- Serialise one member's proposals so two at once can't pass the limit.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_election::text || me::text, 0));
  IF (SELECT count(*) FROM public.initiative_proposals
      WHERE election_id = p_election AND proposed_by = me AND status IN ('submitted', 'approved')) >= 3 THEN
    RAISE EXCEPTION 'You can propose up to 3 initiatives in an election. Withdraw one to propose another.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.initiative_proposal_check(p_title, p_description, p_url);
  PERFORM public.nomination_log('propose_initiative');
  INSERT INTO public.initiative_proposals (election_id, proposed_by, title, description, additional_info_url)
  VALUES (p_election, me, btrim(p_title), btrim(p_description), nullif(btrim(coalesce(p_url, '')), ''))
  RETURNING id INTO result;
  PERFORM public.election_action_done();
  RETURN result;
END $$;

-- The proposer edits a proposal while it waits for review and the ballot isn't locked.
CREATE FUNCTION public.initiative_proposal_update(p_proposal uuid, p_title text, p_description text, p_url text DEFAULT NULL)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.initiative_proposals;
BEGIN
  SELECT * INTO p FROM public.initiative_proposals WHERE id = p_proposal FOR UPDATE;
  IF p.id IS NULL OR p.proposed_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'This proposal isn''t yours.' USING ERRCODE = '42501';
  END IF;
  IF p.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only a proposal waiting for review can be edited.' USING ERRCODE = '22023';
  END IF;
  IF public.election_ballot_frozen(p.election_id) THEN
    RAISE EXCEPTION 'The ballot is locked.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.initiative_proposal_check(p_title, p_description, p_url);
  PERFORM public.nomination_log('edit_proposal');
  UPDATE public.initiative_proposals
     SET title = btrim(p_title), description = btrim(p_description), additional_info_url = nullif(btrim(coalesce(p_url, '')), '')
   WHERE id = p.id;
  PERFORM public.election_action_done();
END $$;

-- The proposer withdraws until the ballot is locked; an approved one comes off the ballot.
CREATE FUNCTION public.initiative_proposal_withdraw(p_proposal uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.initiative_proposals;
BEGIN
  SELECT * INTO p FROM public.initiative_proposals WHERE id = p_proposal FOR UPDATE;
  IF p.id IS NULL OR p.proposed_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can''t withdraw this proposal.' USING ERRCODE = '42501';
  END IF;
  IF p.status NOT IN ('submitted', 'approved') THEN
    RAISE EXCEPTION 'This proposal is no longer active.' USING ERRCODE = '22023';
  END IF;
  IF public.election_ballot_frozen(p.election_id) THEN
    RAISE EXCEPTION 'The ballot is locked, so this can''t be withdrawn here. Ask an admin.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.nomination_log('withdraw_proposal');
  UPDATE public.initiative_proposals SET status = 'withdrawn', initiative_id = NULL WHERE id = p.id;
  IF p.initiative_id IS NOT NULL THEN
    DELETE FROM public.initiatives WHERE id = p.initiative_id;
  END IF;
  PERFORM public.election_action_done();
END $$;

-- Admin review before the lock: approve (the question joins the ballot, last)
-- or reject with a reason the proposer sees.
CREATE FUNCTION public.initiative_proposal_decide(p_proposal uuid, p_approve boolean, p_reason text DEFAULT NULL)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p public.initiative_proposals;
  e public.elections;
  initiative uuid;
BEGIN
  SELECT * INTO p FROM public.initiative_proposals WHERE id = p_proposal FOR UPDATE;
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'Proposal not found.' USING ERRCODE = 'P0002';
  END IF;
  e := public.election_for_admin_action(p.election_id, CASE WHEN p_approve THEN 'approve_proposal' ELSE 'reject_proposal' END, p_reason);
  IF e.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Proposals can be reviewed only before the ballot is locked.' USING ERRCODE = '22023';
  END IF;
  IF p.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only a proposal waiting for review can be approved or rejected.' USING ERRCODE = '22023';
  END IF;
  IF p_approve THEN
    INSERT INTO public.initiatives (election_id, title, description, additional_info_url, ballot_order)
    VALUES (p.election_id, p.title, p.description, p.additional_info_url,
            coalesce((SELECT max(ballot_order) + 1 FROM public.initiatives WHERE election_id = p.election_id), 0))
    RETURNING id INTO initiative;
    UPDATE public.initiative_proposals SET status = 'approved', initiative_id = initiative, decided_by = auth.uid(), decided_at = now()
     WHERE id = p.id;
  ELSE
    PERFORM public.election_require_reason(p_reason);
    UPDATE public.initiative_proposals SET status = 'rejected', rejection_reason = btrim(p_reason), decided_by = auth.uid(), decided_at = now()
     WHERE id = p.id;
  END IF;
  PERFORM public.election_action_done();
END $$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.initiative_propose(uuid, text, text, text)',
    'public.initiative_proposal_update(uuid, text, text, text)',
    'public.initiative_proposal_withdraw(uuid)',
    'public.initiative_proposal_decide(uuid, boolean, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.initiative_proposal_check(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.election_guard_proposals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.initiative_proposals FROM anon, authenticated;
GRANT SELECT ON public.initiative_proposals TO authenticated;
GRANT ALL ON public.initiative_proposals TO service_role;
