-- Migration: Add candidate voting periods to elections table
-- This allows each election to have separate candidate and initiative voting periods
-- Timestamp: 20250622123736

-- Add new columns to elections table for separate voting periods
ALTER TABLE "public"."elections" 
ADD COLUMN IF NOT EXISTS "candidate_voting_start" timestamptz,
ADD COLUMN IF NOT EXISTS "candidate_voting_end" timestamptz,
ADD COLUMN IF NOT EXISTS "enable_separate_voting_periods" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "show_unopposed_status" boolean DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN "public"."elections"."candidate_voting_start" IS 'Start date for candidate voting (can be different from general voting start)';
COMMENT ON COLUMN "public"."elections"."candidate_voting_end" IS 'End date for candidate voting (can be different from general voting end)';
COMMENT ON COLUMN "public"."elections"."enable_separate_voting_periods" IS 'Whether this election uses separate candidate and initiative voting periods';
COMMENT ON COLUMN "public"."elections"."show_unopposed_status" IS 'Whether to show "Elected Unopposed" status for candidates when voting is closed';

-- Update existing elections to enable the new functionality
-- You can customize these values per election as needed
UPDATE "public"."elections" 
SET 
    "candidate_voting_start" = "start_date",  -- Default to same as general voting start
    "candidate_voting_end" = '2025-01-22 00:00:00+00',  -- Close candidate voting early (adjust as needed)
    "enable_separate_voting_periods" = true,
    "show_unopposed_status" = true
WHERE "end_date" > NOW() -- Only update active/future elections
  AND "enable_separate_voting_periods" IS NULL; -- Only if not already set
