-- Add some sample initiatives to your existing leadership election
-- This will immediately show up in your voting interface

INSERT INTO "public"."initiatives" ("id", "election_id", "title", "description", "ballot_order", "created_at") VALUES 
(
  gen_random_uuid(),
  '27dfac0d-b491-40c4-a0bd-87f62a2cce28', 
  'Community Center Renovation Funding', 
  'Approve $50,000 allocation for community center renovations, including new equipment, accessibility improvements, and facility upgrades to better serve our growing community.', 
  1,
  NOW()
),
(
  gen_random_uuid(),
  '27dfac0d-b491-40c4-a0bd-87f62a2cce28', 
  'Youth Program Expansion Initiative', 
  'Authorize expansion of youth mentorship and educational programs to serve an additional 100 participants annually, including after-school tutoring and leadership development.', 
  2,
  NOW()
),
(
  gen_random_uuid(),
  '27dfac0d-b491-40c4-a0bd-87f62a2cce28', 
  'Emergency Relief Fund Enhancement', 
  'Establish a dedicated emergency assistance fund with $25,000 annual budget to help community members facing unexpected financial hardships.', 
  3,
  NOW()
);

-- Verify the initiatives were added
SELECT 
  i.title,
  i.description,
  i.ballot_order,
  e.title as election_title,
  e.type as election_type
FROM initiatives i
JOIN elections e ON e.id = i.election_id
WHERE e.id = '27dfac0d-b491-40c4-a0bd-87f62a2cce28'
ORDER BY i.ballot_order;
