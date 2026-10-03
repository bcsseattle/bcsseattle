-- Test query to see how your election will display
SELECT 
  e.title as election_title,
  e.type as election_type,
  e.status,
  e.candidate_voting_end,
  e.end_date,
  e.enable_separate_voting_periods,
  e.show_unopposed_status,
  
  -- Check if candidate voting is closed
  CASE 
    WHEN e.candidate_voting_end < NOW() THEN 'CLOSED'
    ELSE 'OPEN'
  END as candidate_voting_status,
  
  -- Check if initiative voting is open  
  CASE 
    WHEN NOW() BETWEEN e.start_date AND e.end_date THEN 'OPEN'
    ELSE 'CLOSED'
  END as initiative_voting_status,
  
  -- Count candidates and initiatives
  (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) as candidate_count,
  (SELECT COUNT(*) FROM initiatives WHERE election_id = e.id) as initiative_count

FROM elections e 
WHERE e.id = '27dfac0d-b491-40c4-a0bd-87f62a2cce28';

-- Show the specific initiatives that will appear
SELECT 
  title,
  ballot_order,
  CASE 
    WHEN LENGTH(title) > 80 THEN CONCAT(LEFT(title, 77), '...')
    ELSE title 
  END as display_title
FROM initiatives 
WHERE election_id = '27dfac0d-b491-40c4-a0bd-87f62a2cce28'
ORDER BY ballot_order;
