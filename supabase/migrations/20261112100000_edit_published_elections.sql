-- Admins edit an election's details after publishing (12 Nov 2026). Every
-- change is still logged with its before and after values (election_events).
--
-- Until the ballot is locked: everything, as in a draft. That covers the type,
-- the nominations window, the voting dates and times, the separate candidate
-- window, the membership cutoff and the uncontested setting. Positions and
-- initiatives follow the ballot's own rule (election_guard_ballot).
-- Once locked: the voting dates and times can still move either way. The
-- type, cutoff, uncontested setting and nominations window are fixed (the
-- roll is taken and nominations are over), and so is the ballot.
-- Once voting is over (certified, published, archived) or cancelled: only the
-- title, description and results date.
--
-- The rule applies to signed-in users (admins under RLS); the election_*
-- functions and the service role run as other roles.
CREATE OR REPLACE FUNCTION public.election_guard_timeline() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  dates_changed boolean :=
       NEW.start_date IS DISTINCT FROM OLD.start_date
    OR NEW.end_date IS DISTINCT FROM OLD.end_date
    OR NEW.candidate_voting_start IS DISTINCT FROM OLD.candidate_voting_start
    OR NEW.candidate_voting_end IS DISTINCT FROM OLD.candidate_voting_end
    OR NEW.enable_separate_voting_periods IS DISTINCT FROM OLD.enable_separate_voting_periods;
  setup_changed boolean :=
       NEW.type IS DISTINCT FROM OLD.type
    OR NEW.nomination_start IS DISTINCT FROM OLD.nomination_start
    OR NEW.nomination_end IS DISTINCT FROM OLD.nomination_end
    OR NEW.eligibility_cutoff IS DISTINCT FROM OLD.eligibility_cutoff
    OR NEW.show_unopposed_status IS DISTINCT FROM OLD.show_unopposed_status;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR OLD.status IN ('draft', 'scheduled') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'ballot_locked' THEN
    IF setup_changed THEN
      RAISE EXCEPTION 'The ballot is locked: the type, nominations, membership cutoff and uncontested setting can''t change any more. The voting dates still can.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF dates_changed OR setup_changed THEN
    RAISE EXCEPTION 'Voting is over for this election, so only its title, description and results date can change.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

-- Renaming a position renames it on its candidates and nominations too (they
-- keep the title as text, and the vote handlers and the app read it).
CREATE OR REPLACE FUNCTION public.ballot_position_renamed() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.candidates SET position = NEW.title WHERE ballot_position_id = NEW.id AND position IS DISTINCT FROM NEW.title;
  UPDATE public.nominations SET position = NEW.title WHERE ballot_position_id = NEW.id AND position IS DISTINCT FROM NEW.title;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.ballot_position_renamed() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ballot_positions_renamed AFTER UPDATE OF title ON public.ballot_positions
  FOR EACH ROW WHEN (NEW.title IS DISTINCT FROM OLD.title)
  EXECUTE FUNCTION public.ballot_position_renamed();
