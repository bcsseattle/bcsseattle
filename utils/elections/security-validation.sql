-- Security Validation and Testing Script for Voting Feature
-- This script tests all RLS policies and security measures

-- ============================================================================
-- RLS POLICY TESTING
-- ============================================================================

-- Test 1: Verify votes table RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('votes', 'initiatives', 'vote_confirmations');

-- Test 2: Verify RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('votes', 'initiatives', 'vote_confirmations')
ORDER BY tablename, policyname;

-- Test 3: Verify foreign key constraints are in place
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('votes', 'initiatives', 'vote_confirmations')
ORDER BY tc.table_name;

-- Test 4: Verify unique constraints are in place
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name IN ('votes', 'initiatives', 'vote_confirmations')
ORDER BY tc.table_name, tc.constraint_name;

-- Test 5: Verify check constraints are in place
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_name IN ('votes', 'initiatives', 'vote_confirmations')
ORDER BY tc.table_name;

-- Test 6: Verify indexes exist for performance
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('votes', 'initiatives', 'vote_confirmations')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Test 7: Verify helper functions exist and have correct permissions
SELECT
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  array_to_string(p.proacl, ',') AS permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'user_has_voted_in_election',
    'get_election_vote_count',
    'user_has_active_membership',
    'update_updated_at_column'
  );

-- ============================================================================
-- SECURITY VALIDATION QUERIES
-- ============================================================================

-- Note: These queries should be run as different users to test RLS
-- They are provided as examples for manual testing

-- Example: Test vote privacy (should only return current user's votes)
-- SELECT * FROM votes WHERE election_id = 'some-election-id';

-- Example: Test vote confirmation privacy (should only return current user's confirmations)
-- SELECT * FROM vote_confirmations WHERE election_id = 'some-election-id';

-- Example: Test initiatives visibility (should be visible to all)
-- SELECT * FROM initiatives WHERE election_id = 'some-election-id';

-- ============================================================================
-- SECURITY RECOMMENDATIONS
-- ============================================================================

-- 1. Verify no sensitive data is exposed in logs
-- 2. Ensure audit trails are immutable
-- 3. Regular security audits of RLS policies
-- 4. Monitor for suspicious voting patterns
-- 5. Implement rate limiting at application level
-- 6. Use HTTPS for all communications
-- 7. Regular backup and disaster recovery testing
