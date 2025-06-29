-- Add missing columns to elections table that exist in production

-- Add candidate voting period columns
ALTER TABLE "public"."elections" 
ADD COLUMN IF NOT EXISTS "candidate_voting_start" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "candidate_voting_end" timestamp with time zone;

-- Add election behavior control columns
ALTER TABLE "public"."elections" 
ADD COLUMN IF NOT EXISTS "enable_separate_voting_periods" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "show_unopposed_status" boolean DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN "public"."elections"."candidate_voting_start" IS 'Separate start time for candidate voting when different from general voting period';
COMMENT ON COLUMN "public"."elections"."candidate_voting_end" IS 'Separate end time for candidate voting when different from general voting period';
COMMENT ON COLUMN "public"."elections"."enable_separate_voting_periods" IS 'Whether to use separate voting periods for candidates vs initiatives';
COMMENT ON COLUMN "public"."elections"."show_unopposed_status" IS 'Whether to show unopposed status badges for single candidates';