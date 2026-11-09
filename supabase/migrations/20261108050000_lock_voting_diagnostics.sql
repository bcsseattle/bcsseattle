-- BUG-033: these SECURITY DEFINER helpers read every voter's records (user ids,
-- who voted, membership) and were callable by anyone with the public key. Only
-- the admin-gated security report (service role) uses them now.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.check_rls_enabled(text)',
    'public.check_unique_constraints()',
    'public.find_duplicate_votes()',
    'public.find_invalid_votes()',
    'public.find_orphaned_votes()',
    'public.get_table_constraints(text)',
    'public.get_user_voting_status(uuid, uuid)',
    'public.get_voting_security_stats(uuid)',
    'public.user_has_active_membership(uuid)',
    'public.user_has_completed_vote_session(uuid, uuid, public.vote_session_type)',
    'public.user_has_voted_in_election(uuid, uuid)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

-- Used by the vote_sessions insert policy, so signed-in users keep it; visitors don't need it.
REVOKE EXECUTE ON FUNCTION public.user_can_vote_in_session(uuid, uuid, public.vote_session_type) FROM PUBLIC, anon;
