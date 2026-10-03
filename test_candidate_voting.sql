-- Test and management queries for candidate voting periods
-- Run these in your Supabase SQL editor to test and manage the new functionality

-- 1. Check current election configuration
SELECT 
    id, 
    title, 
    start_date, 
    end_date,
    candidate_voting_start,
    candidate_voting_end,
    enable_separate_voting_periods,
    show_unopposed_status
FROM "public"."elections" 
WHERE "end_date" > NOW()
ORDER BY "start_date";

-- 2. Example: Close candidate voting while keeping initiative voting open
-- Replace 'your-election-id' with the actual election ID
UPDATE "public"."elections" 
SET 
    "candidate_voting_end" = '2025-01-22 00:00:00+00',  -- Close candidate voting early
    "enable_separate_voting_periods" = true,
    "show_unopposed_status" = true
WHERE "id" = 'your-election-id';

-- 3. Example: Re-open candidate voting (if needed)
UPDATE "public"."elections" 
SET 
    "candidate_voting_end" = "end_date",  -- Same as general election end
    "enable_separate_voting_periods" = false
WHERE "id" = 'your-election-id';

-- 4. Example: Create a new election with separate voting periods
INSERT INTO "public"."elections" (
    "title",
    "description", 
    "type",
    "start_date",
    "end_date",
    "candidate_voting_start",
    "candidate_voting_end",
    "enable_separate_voting_periods",
    "show_unopposed_status"
) VALUES (
    'Test Election with Separate Periods',
    'Test election to demonstrate separate candidate and initiative voting',
    'leadership',
    '2025-01-20 00:00:00+00',  -- General voting starts
    '2025-01-25 00:00:00+00',  -- General voting ends
    '2025-01-20 00:00:00+00',  -- Candidate voting starts (same)
    '2025-01-22 00:00:00+00',  -- Candidate voting ends early
    true,                       -- Enable separate periods
    true                        -- Show unopposed status
);

-- 5. Check voting status for current time (useful for debugging)
WITH current_time AS (
    SELECT NOW() as now_utc
),
election_status AS (
    SELECT 
        e.*,
        ct.now_utc,
        CASE 
            WHEN e.enable_separate_voting_periods AND e.candidate_voting_end IS NOT NULL 
            THEN ct.now_utc < e.candidate_voting_end
            ELSE true
        END as candidate_voting_open,
        ct.now_utc >= e.start_date AND ct.now_utc <= e.end_date as initiative_voting_open
    FROM "public"."elections" e
    CROSS JOIN current_time ct
    WHERE e.end_date > ct.now_utc
)
SELECT 
    title,
    candidate_voting_open,
    initiative_voting_open,
    CASE 
        WHEN candidate_voting_open THEN 'Candidate voting is open'
        WHEN NOT candidate_voting_open AND show_unopposed_status THEN 'Candidates elected unopposed'
        ELSE 'Candidate voting closed'
    END as candidate_status,
    CASE 
        WHEN initiative_voting_open THEN 'Initiative voting is open'
        ELSE 'Initiative voting closed'
    END as initiative_status
FROM election_status;
