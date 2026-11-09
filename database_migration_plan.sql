-- Migration Plan: Add candidate voting periods to elections table
-- This allows each election to have separate candidate and initiative voting periods

-- Option 1: Add fields to existing elections table (RECOMMENDED)
ALTER TABLE "public"."elections" 
ADD COLUMN "candidate_voting_start" timestamptz,
ADD COLUMN "candidate_voting_end" timestamptz,
ADD COLUMN "enable_separate_voting_periods" boolean DEFAULT false,
ADD COLUMN "show_unopposed_status" boolean DEFAULT true;

-- Update the current election with candidate voting cutoff
UPDATE "public"."elections" 
SET 
    "candidate_voting_start" = "start_date",  -- Same as general voting start
    "candidate_voting_end" = '2025-01-22 00:00:00+00',  -- Close candidate voting early
    "enable_separate_voting_periods" = true,
    "show_unopposed_status" = true
WHERE "id" = '27dfac0d-b491-40c4-a0bd-87f62a2cce28';

-- Option 2: Create separate voting_periods table (More flexible for future)
CREATE TABLE IF NOT EXISTS "public"."voting_periods" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "election_id" uuid REFERENCES "public"."elections"("id") ON DELETE CASCADE,
    "voting_type" text NOT NULL, -- 'candidates' or 'initiatives'
    "start_date" timestamptz NOT NULL,
    "end_date" timestamptz NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT NOW(),
    "updated_at" timestamptz DEFAULT NOW(),
    
    UNIQUE("election_id", "voting_type")
);

-- Create RLS policies for voting_periods (if using Option 2)
ALTER TABLE "public"."voting_periods" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voting_periods_select_policy" ON "public"."voting_periods"
    FOR SELECT USING (true);

CREATE POLICY "voting_periods_insert_policy" ON "public"."voting_periods"
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "voting_periods_update_policy" ON "public"."voting_periods"
    FOR UPDATE USING (auth.role() = 'service_role');

-- Insert voting periods for current election (if using Option 2)
INSERT INTO "public"."voting_periods" ("election_id", "voting_type", "start_date", "end_date")
VALUES 
    ('27dfac0d-b491-40c4-a0bd-87f62a2cce28', 'candidates', '2025-06-22 02:30:00+00', '2025-01-22 00:00:00+00'),
    ('27dfac0d-b491-40c4-a0bd-87f62a2cce28', 'initiatives', '2025-06-22 02:30:00+00', '2025-06-22 04:30:00+00');
