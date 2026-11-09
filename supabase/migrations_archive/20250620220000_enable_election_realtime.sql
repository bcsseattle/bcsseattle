-- Enable realtime for election result tables
-- This allows live updates for election results

-- Add election tables to realtime publication
-- Only add tables that aren't already in the publication
DO $$
BEGIN
    -- Add votes table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'votes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE votes;
    END IF;

    -- Add vote_sessions table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'vote_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE vote_sessions;
    END IF;

    -- Add vote_confirmations table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'vote_confirmations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE vote_confirmations;
    END IF;

    -- Add elections table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'elections'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE elections;
    END IF;

    -- Add candidates table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'candidates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE candidates;
    END IF;

    -- Add initiatives table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'initiatives'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE initiatives;
    END IF;
END $$;
