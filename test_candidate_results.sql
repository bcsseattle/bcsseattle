-- Test candidate election results display
-- This script helps you test how the updated UI will show election winners

-- Check current candidate vote counts for your election
SELECT 
  c.full_name,
  c.position,
  COUNT(v.id) as vote_count,
  -- Rank candidates within their position
  RANK() OVER (PARTITION BY c.position ORDER BY COUNT(v.id) DESC) as rank_in_position
FROM candidates c
LEFT JOIN votes v ON v.candidate_id = c.id
WHERE c.election_id = '27dfac0d-b491-40c4-a0bd-87f62a2cce28'
GROUP BY c.id, c.full_name, c.position
ORDER BY c.position, vote_count DESC;

-- See the current winner for each position
WITH candidate_votes AS (
  SELECT 
    c.id,
    c.full_name,
    c.position,
    COUNT(v.id) as vote_count,
    RANK() OVER (PARTITION BY c.position ORDER BY COUNT(v.id) DESC) as rank_in_position
  FROM candidates c
  LEFT JOIN votes v ON v.candidate_id = c.id
  WHERE c.election_id = '27dfac0d-b491-40c4-a0bd-87f62a2cce28'
  GROUP BY c.id, c.full_name, c.position
)
SELECT 
  position,
  full_name as winner,
  vote_count,
  CASE 
    WHEN rank_in_position = 1 AND vote_count > 0 THEN 'ELECTED'
    WHEN rank_in_position = 1 AND vote_count = 0 THEN 'TIED_FOR_FIRST'
    ELSE 'NOT_ELECTED'
  END as election_status
FROM candidate_votes
WHERE rank_in_position = 1
ORDER BY position;

-- If you want to simulate some votes for testing, uncomment and run:
/*
INSERT INTO votes (user_id, election_id, candidate_id) VALUES 
  ('00000000-0000-0000-0000-000000000001', '27dfac0d-b491-40c4-a0bd-87f62a2cce28', 'some-candidate-id-1'),
  ('00000000-0000-0000-0000-000000000002', '27dfac0d-b491-40c4-a0bd-87f62a2cce28', 'some-candidate-id-1'),
  ('00000000-0000-0000-0000-000000000003', '27dfac0d-b491-40c4-a0bd-87f62a2cce28', 'some-candidate-id-2');
*/
