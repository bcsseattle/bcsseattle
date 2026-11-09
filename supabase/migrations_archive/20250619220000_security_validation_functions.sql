-- Additional security validation functions for the voting system
-- These functions support the security validation utilities

-- ============================================================================
-- RLS VALIDATION FUNCTIONS
-- ============================================================================

-- Function to check if RLS is enabled on a table
CREATE OR REPLACE FUNCTION public.check_rls_enabled(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = table_name 
    AND rowsecurity = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table constraints
CREATE OR REPLACE FUNCTION public.get_table_constraints(table_name TEXT)
RETURNS TABLE(
  constraint_name TEXT,
  constraint_type TEXT,
  column_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.constraint_name::TEXT,
    tc.constraint_type::TEXT,
    kcu.column_name::TEXT
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = table_name
    AND tc.table_schema = 'public'
  ORDER BY tc.constraint_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check unique constraints
CREATE OR REPLACE FUNCTION public.check_unique_constraints()
RETURNS TABLE(
  table_name TEXT,
  constraint_name TEXT,
  columns TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.table_name::TEXT,
    tc.constraint_name::TEXT,
    array_agg(kcu.column_name) AS columns
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_name IN ('votes', 'initiatives', 'vote_confirmations')
    AND tc.table_schema = 'public'
  GROUP BY tc.table_name, tc.constraint_name
  ORDER BY tc.table_name, tc.constraint_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DATA INTEGRITY VALIDATION FUNCTIONS
-- ============================================================================

-- Function to find orphaned votes (votes without valid elections)
CREATE OR REPLACE FUNCTION public.find_orphaned_votes()
RETURNS TABLE(
  vote_id UUID,
  election_id UUID,
  user_id UUID,
  issue TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Election not found'::TEXT
  FROM public.votes v
  LEFT JOIN public.elections e ON v.election_id = e.id
  WHERE e.id IS NULL

  UNION ALL

  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Candidate not found'::TEXT
  FROM public.votes v
  LEFT JOIN public.candidates c ON v.candidate_id = c.id
  WHERE v.candidate_id IS NOT NULL AND c.id IS NULL

  UNION ALL

  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Initiative not found'::TEXT
  FROM public.votes v
  LEFT JOIN public.initiatives i ON v.initiative_id = i.id
  WHERE v.initiative_id IS NOT NULL AND i.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find invalid votes (violating business rules)
CREATE OR REPLACE FUNCTION public.find_invalid_votes()
RETURNS TABLE(
  vote_id UUID,
  election_id UUID,
  user_id UUID,
  issue TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Votes with both candidate_id and initiative_id
  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Vote has both candidate and initiative'::TEXT
  FROM public.votes v
  WHERE v.candidate_id IS NOT NULL AND v.initiative_id IS NOT NULL

  UNION ALL

  -- Votes with neither candidate_id nor initiative_id
  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Vote has neither candidate nor initiative'::TEXT
  FROM public.votes v
  WHERE v.candidate_id IS NULL AND v.initiative_id IS NULL

  UNION ALL

  -- Initiative votes without vote_value
  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Initiative vote missing vote_value'::TEXT
  FROM public.votes v
  WHERE v.initiative_id IS NOT NULL AND v.vote_value IS NULL

  UNION ALL

  -- Candidate votes with vote_value (should be NULL)
  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Candidate vote has unexpected vote_value'::TEXT
  FROM public.votes v
  WHERE v.candidate_id IS NOT NULL AND v.vote_value IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECURITY AUDIT FUNCTIONS
-- ============================================================================

-- Function to get voting statistics for security monitoring
CREATE OR REPLACE FUNCTION public.get_voting_security_stats(election_uuid UUID)
RETURNS TABLE(
  total_votes BIGINT,
  unique_voters BIGINT,
  candidate_votes BIGINT,
  initiative_votes BIGINT,
  votes_per_user_avg NUMERIC,
  suspicious_activity_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_votes,
    COUNT(DISTINCT user_id)::BIGINT as unique_voters,
    COUNT(CASE WHEN candidate_id IS NOT NULL THEN 1 END)::BIGINT as candidate_votes,
    COUNT(CASE WHEN initiative_id IS NOT NULL THEN 1 END)::BIGINT as initiative_votes,
    ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT user_id), 0), 2) as votes_per_user_avg,
    (
      SELECT COUNT(*)::BIGINT
      FROM (
        SELECT user_id, COUNT(*) as vote_count
        FROM public.votes 
        WHERE election_id = election_uuid
        GROUP BY user_id
        HAVING COUNT(*) > (
          SELECT COUNT(*) FROM public.election_positions ep 
          WHERE ep.election_type = (
            SELECT type FROM public.elections WHERE id = election_uuid
          )
        ) + (
          SELECT COUNT(*) FROM public.initiatives i 
          WHERE i.election_id = election_uuid
        )
      ) suspicious
    ) as suspicious_activity_count
  FROM public.votes v
  WHERE v.election_id = election_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for duplicate votes (should be prevented by constraints)
CREATE OR REPLACE FUNCTION public.find_duplicate_votes()
RETURNS TABLE(
  user_id UUID,
  election_id UUID,
  duplicate_type TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  -- Duplicate candidate votes (same user, same candidate)
  SELECT 
    v.user_id,
    v.election_id,
    'candidate'::TEXT as duplicate_type,
    COUNT(*)::BIGINT
  FROM public.votes v
  WHERE v.candidate_id IS NOT NULL
  GROUP BY v.user_id, v.election_id, v.candidate_id
  HAVING COUNT(*) > 1

  UNION ALL

  -- Duplicate initiative votes (same user, same initiative)
  SELECT 
    v.user_id,
    v.election_id,
    'initiative'::TEXT as duplicate_type,
    COUNT(*)::BIGINT
  FROM public.votes v
  WHERE v.initiative_id IS NOT NULL
  GROUP BY v.user_id, v.election_id, v.initiative_id
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION public.check_rls_enabled(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_constraints(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_unique_constraints() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_orphaned_votes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_invalid_votes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_voting_security_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_votes() TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.check_rls_enabled(TEXT) IS 'Checks if Row Level Security is enabled on a table';
COMMENT ON FUNCTION public.get_table_constraints(TEXT) IS 'Returns all constraints for a given table';
COMMENT ON FUNCTION public.check_unique_constraints() IS 'Lists all unique constraints on voting tables';
COMMENT ON FUNCTION public.find_orphaned_votes() IS 'Finds votes that reference non-existent elections, candidates, or initiatives';
COMMENT ON FUNCTION public.find_invalid_votes() IS 'Finds votes that violate business rules';
COMMENT ON FUNCTION public.get_voting_security_stats(UUID) IS 'Returns security statistics for an election';
COMMENT ON FUNCTION public.find_duplicate_votes() IS 'Finds duplicate votes (should be prevented by constraints)';
