-- Add initiatives to your existing leadership election
-- This allows voters to handle both leadership and initiatives in one voting session

INSERT INTO "public"."initiatives" ("id", "election_id", "title", "description", "ballot_order") VALUES 
('init-1', '27dfac0d-b491-40c4-a0bd-87f62a2cce28', 'Community Center Renovation Funding', 'Approve $50,000 allocation for community center renovations and equipment upgrades', 1),
('init-2', '27dfac0d-b491-40c4-a0bd-87f62a2cce28', 'Youth Program Expansion', 'Authorize expansion of youth mentorship programs to serve 100 additional participants', 2),
('init-3', '27dfac0d-b491-40c4-a0bd-87f62a2cce28', 'Scholarship Fund Enhancement', 'Increase annual scholarship fund budget by 25% for the next three years', 3);

-- The existing voting logic already supports this!
