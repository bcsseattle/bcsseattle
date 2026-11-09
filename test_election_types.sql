-- Test script for election type-aware voting configuration
-- This script demonstrates how different election types work with separate voting periods

-- First, let's see our current election types
SELECT 
    id,
    title,
    type,
    start_date,
    end_date,
    candidate_voting_start,
    candidate_voting_end,
    enable_separate_voting_periods,
    show_unopposed_status
FROM elections 
ORDER BY created_at DESC;

-- Test different scenarios for each election type

-- Example 1: Leadership Election (should default to separate voting periods)
-- Leadership elections often have unopposed candidates, so this type should:
-- - Enable separate voting periods by default
-- - Show unopposed status
-- - Allow candidate voting to close early

UPDATE elections 
SET 
    type = 'leadership',
    enable_separate_voting_periods = true,
    show_unopposed_status = true,
    candidate_voting_end = end_date - INTERVAL '3 days'  -- Close candidate voting 3 days early
WHERE id = 'your-leadership-election-id'  -- Replace with actual ID
RETURNING *;

-- Example 2: Initiative Election (should default to single voting period)
-- Initiative elections are usually about policy/ballot measures, so:
-- - Separate voting periods not typically needed
-- - No unopposed candidates concept
-- - All voting happens in same period

UPDATE elections 
SET 
    type = 'initiative',
    enable_separate_voting_periods = false,
    show_unopposed_status = false,
    candidate_voting_start = NULL,
    candidate_voting_end = NULL
WHERE id = 'your-initiative-election-id'  -- Replace with actual ID
RETURNING *;

-- Example 3: Board Election (similar to leadership but shorter duration)
-- Board elections are governance-focused:
-- - Enable separate voting periods
-- - Show unopposed status
-- - Shorter typical duration than leadership elections

UPDATE elections 
SET 
    type = 'board',
    enable_separate_voting_periods = true,
    show_unopposed_status = true,
    candidate_voting_end = end_date - INTERVAL '2 days'  -- Close candidate voting 2 days early
WHERE id = 'your-board-election-id'  -- Replace with actual ID
RETURNING *;

-- Test query: Check how elections behave with type-aware logic
SELECT 
    title,
    type,
    CASE 
        WHEN type = 'leadership' THEN 'Supports unopposed candidates, 14-day typical duration'
        WHEN type = 'initiative' THEN 'Policy/ballot measures, 21-day typical duration'
        WHEN type = 'board' THEN 'Governance positions, 10-day typical duration'
        ELSE 'Unknown type'
    END as type_description,
    enable_separate_voting_periods,
    show_unopposed_status,
    CASE 
        WHEN candidate_voting_end IS NOT NULL AND candidate_voting_end < end_date 
        THEN 'Candidate voting closes early'
        ELSE 'Standard voting period'
    END as voting_configuration,
    start_date,
    candidate_voting_end,
    end_date
FROM elections
WHERE type IN ('leadership', 'initiative', 'board')
ORDER BY type, start_date;

-- Test unopposed candidate detection for leadership/board elections
WITH position_candidates AS (
    SELECT 
        e.id as election_id,
        e.title,
        e.type,
        ep.title as position_title,
        COUNT(c.id) as candidate_count
    FROM elections e
    JOIN election_positions ep ON ep.election_id = e.id
    LEFT JOIN candidates c ON c.position_id = ep.id
    WHERE e.type IN ('leadership', 'board')
    GROUP BY e.id, e.title, e.type, ep.id, ep.title
)
SELECT 
    election_id,
    title,
    type,
    position_title,
    candidate_count,
    CASE 
        WHEN candidate_count = 0 THEN 'No candidates'
        WHEN candidate_count = 1 THEN 'Unopposed - can close early'
        ELSE 'Contested - needs voting'
    END as position_status
FROM position_candidates
ORDER BY election_id, position_title;

-- Example: Find elections that could benefit from early candidate voting closure
SELECT 
    e.id,
    e.title,
    e.type,
    COUNT(DISTINCT ep.id) as total_positions,
    COUNT(DISTINCT CASE WHEN candidate_count <= 1 THEN ep.id END) as unopposed_positions,
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN candidate_count <= 1 THEN ep.id END) = COUNT(DISTINCT ep.id)
        THEN 'All positions unopposed - close candidate voting now'
        WHEN COUNT(DISTINCT CASE WHEN candidate_count <= 1 THEN ep.id END) > 0
        THEN 'Some positions unopposed - consider early closure'
        ELSE 'All positions contested - keep voting open'
    END as recommendation
FROM elections e
JOIN election_positions ep ON ep.election_id = e.id
LEFT JOIN (
    SELECT position_id, COUNT(*) as candidate_count
    FROM candidates 
    GROUP BY position_id
) c ON c.position_id = ep.id
WHERE e.type IN ('leadership', 'board')
AND e.status = 'voting_open'
GROUP BY e.id, e.title, e.type
ORDER BY e.start_date;

-- Reset test data (run this to clean up test changes)
/*
UPDATE elections 
SET 
    enable_separate_voting_periods = false,
    show_unopposed_status = true,
    candidate_voting_start = NULL,
    candidate_voting_end = NULL
WHERE id IN ('your-test-election-ids');
*/
