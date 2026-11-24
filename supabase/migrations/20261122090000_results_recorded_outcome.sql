-- Custom-response ("choice") initiatives are certified with outcome 'recorded'
-- (snapshot_initiative_option_counts, 20261114100000), but the outcome check
-- didn't allow it, so certifying any election with one failed.
ALTER TABLE public.election_results DROP CONSTRAINT election_results_outcome_check;
ALTER TABLE public.election_results ADD CONSTRAINT election_results_outcome_check CHECK (outcome IN
  ('elected', 'elected_unopposed', 'not_elected', 'withdrawn', 'vacant', 'runoff', 'passed', 'not_passed', 'recorded'));
