-- Initiative questions can either use the traditional approval choices or a
-- list of custom, administrator-defined responses.
ALTER TABLE public.initiatives
  ADD COLUMN response_type text NOT NULL DEFAULT 'approval'
    CHECK (response_type IN ('approval', 'choice')),
  ADD COLUMN response_options jsonb NOT NULL DEFAULT
    '[{"value":"yes","label":"Support","detail":"Support this initiative"},{"value":"no","label":"Oppose","detail":"Oppose this initiative"},{"value":"abstain","label":"Abstain","detail":"No position"}]'::jsonb;

ALTER TABLE public.initiatives ADD CONSTRAINT initiatives_response_options_valid CHECK (
  jsonb_typeof(response_options) = 'array'
  AND jsonb_array_length(response_options) BETWEEN 2 AND 10
);

COMMENT ON COLUMN public.initiatives.response_type IS 'approval uses Support/Oppose/Abstain; choice uses response_options';
COMMENT ON COLUMN public.initiatives.response_options IS 'Ordered [{value,label,detail?}] choices shown on the ballot';

ALTER TABLE public.votes ADD COLUMN response_value text;
UPDATE public.votes SET response_value = vote_value::text WHERE initiative_id IS NOT NULL;

ALTER TABLE public.votes DROP CONSTRAINT vote_type_check;
ALTER TABLE public.votes ADD CONSTRAINT vote_type_check CHECK (
  (candidate_id IS NOT NULL AND initiative_id IS NULL AND vote_value IS NULL AND response_value IS NULL)
  OR
  (candidate_id IS NULL AND initiative_id IS NOT NULL AND response_value IS NOT NULL)
);
COMMENT ON COLUMN public.votes.response_value IS 'Selected initiative response value; validated against initiatives.response_options';

CREATE OR REPLACE FUNCTION public.validate_initiative_response() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.initiative_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.initiatives i, jsonb_array_elements(i.response_options) option
    WHERE i.id = NEW.initiative_id
      AND option->>'value' = NEW.response_value
  ) THEN
    RAISE EXCEPTION 'Invalid response for initiative' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_initiative_response_before_write
  BEFORE INSERT OR UPDATE OF initiative_id, response_value ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.validate_initiative_response();

ALTER TABLE public.election_results ADD COLUMN option_counts jsonb;
COMMENT ON COLUMN public.election_results.option_counts IS 'Certified [{value,label,count}] tally for an initiative';

CREATE OR REPLACE FUNCTION public.snapshot_initiative_option_counts() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  custom boolean;
BEGIN
  IF NEW.initiative_id IS NULL THEN RETURN NEW; END IF;
  SELECT response_type = 'choice' INTO custom FROM public.initiatives WHERE id = NEW.initiative_id;
  UPDATE public.election_results er SET
    option_counts = (
      SELECT jsonb_agg(jsonb_build_object(
        'value', option->>'value',
        'label', option->>'label',
        'count', (SELECT count(*) FROM public.votes v
                  WHERE v.initiative_id = NEW.initiative_id
                    AND v.response_value = option->>'value')
      ) ORDER BY ordinality)
      FROM public.initiatives i,
           jsonb_array_elements(i.response_options) WITH ORDINALITY AS choices(option, ordinality)
      WHERE i.id = NEW.initiative_id
    ),
    outcome = CASE WHEN custom THEN 'recorded' ELSE er.outcome END,
    note = CASE WHEN custom THEN NULL ELSE er.note END
  WHERE er.id = NEW.id;
  RETURN NEW;
END $$;

CREATE TRIGGER snapshot_initiative_option_counts_after_insert
  AFTER INSERT ON public.election_results
  FOR EACH ROW WHEN (NEW.initiative_id IS NOT NULL)
  EXECUTE FUNCTION public.snapshot_initiative_option_counts();

CREATE OR REPLACE FUNCTION public.initiative_choice_counts(p_election uuid)
  RETURNS TABLE (initiative_id uuid, option_counts jsonb)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e public.elections;
BEGIN
  IF NOT public.current_user_is_admin() AND coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Only admins can see the count before results are published.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO e FROM public.elections WHERE id = p_election;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Election not found.' USING ERRCODE = 'P0002'; END IF;
  IF e.status = 'ballot_locked' AND now() <= greatest(
    e.end_date,
    CASE WHEN coalesce(e.enable_separate_voting_periods, e.type IN ('leadership', 'board')) THEN e.candidate_voting_end END
  ) THEN
    RAISE EXCEPTION 'Votes are counted once voting has closed.' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
    SELECT i.id,
      jsonb_agg(jsonb_build_object(
        'value', option->>'value',
        'label', option->>'label',
        'count', (SELECT count(*) FROM public.votes v
                  WHERE v.initiative_id = i.id AND v.response_value = option->>'value')
      ) ORDER BY ordinality)
    FROM public.initiatives i,
         jsonb_array_elements(i.response_options) WITH ORDINALITY AS choices(option, ordinality)
    WHERE i.election_id = p_election AND i.response_type = 'choice'
    GROUP BY i.id, i.ballot_order
    ORDER BY i.ballot_order;
END $$;
REVOKE ALL ON FUNCTION public.initiative_choice_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initiative_choice_counts(uuid) TO authenticated, service_role;
