-- Create a separate initiative-only election
INSERT INTO "public"."elections" ("id", "title", "description", "type", "start_date", "end_date", "nomination_start", "nomination_end", "is_active", "settings", "created_at", "updated_at", "created_by", "status", "candidate_voting_start", "candidate_voting_end", "enable_separate_voting_periods", "show_unopposed_status") VALUES 
('init-election-2025', 'BCS Seattle Community Initiatives - 2025', 'Vote on key community proposals and budget allocations.', 'initiative', '2025-06-25 18:00:00+00', '2025-07-05 18:00:00+00', NULL, NULL, 'true', '{}', NOW(), NOW(), null, 'upcoming', NULL, NULL, 'false', 'false');

-- Add initiatives to the separate election
INSERT INTO "public"."initiatives" ("id", "election_id", "title", "description", "ballot_order") VALUES 
('sep-init-1', 'init-election-2025', 'Community Center Renovation Funding', 'Approve $50,000 allocation for community center renovations and equipment upgrades', 1),
('sep-init-2', 'init-election-2025', 'Youth Program Expansion', 'Authorize expansion of youth mentorship programs to serve 100 additional participants', 2),
('sep-init-3', 'init-election-2025', 'Scholarship Fund Enhancement', 'Increase annual scholarship fund budget by 25% for the next three years', 3);
