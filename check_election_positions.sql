-- Check election positions and candidate eligibility
-- This will help us understand why all candidates show as "Elected"

-- First, let's see the election positions and their capacity
SELECT 
  ep.position,
  ep.max_candidates,
  ep.description,
  ep.display_order,
  -- Count how many candidates are running for this position
  (SELECT COUNT(*) FROM candidates c WHERE c.position = ep.position AND c.election_id = ep.election_id) as candidates_running
FROM election_positions ep 
WHERE ep.election_id = '27dfac0d-b491-40c4-a0bd-87f62a2cce28'
ORDER BY ep.display_order;

-- Check the specific candidates for President position
SELECT 
  c.full_name,
  c.position,
  c.created_at,
  c.id
FROM candidates c 
WHERE c.election_id = '27dfac0d-b491-40c4-a0bd-87f62a2cce28'
  AND c.position = 'President'
ORDER BY c.created_at;

-- Check if this election should really show "unopposed" status
SELECT 
  e.title,
  e.show_unopposed_status,
  e.enable_separate_voting_periods,
  -- Calculate if truly unopposed (candidates <= positions available)
  CASE 
    WHEN (SELECT SUM(ep.max_candidates) FROM election_positions ep WHERE ep.election_id = e.id) >= 
         (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id)
    THEN 'TRULY_UNOPPOSED'
    ELSE 'COMPETITIVE_ELECTION'
  END as actual_status
FROM elections e 
WHERE e.id = '27dfac0d-b491-40c4-a0bd-87f62a2cce28';
