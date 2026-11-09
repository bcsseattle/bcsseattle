-- Add support for separate candidate and initiative voting
-- This migration adds vote session tracking and updates the schema

-- ============================================================================
-- ADD VOTE SESSIONS FOR SEPARATE VOTING FLOWS  
-- ============================================================================

-- Create vote session types
CREATE TYPE public.vote_session_type AS ENUM ('candidates', 'initiatives', 'combined');

-- Add vote session table to track separate voting sessions
CREATE TABLE IF NOT EXISTS public.vote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  session_type public.vote_session_type NOT NULL,
  confirmation_code VARCHAR(32) NOT NULL UNIQUE,
  votes_cast INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Ensure one session per user per election per type
  CONSTRAINT unique_user_election_session UNIQUE (user_id, election_id, session_type)
);

-- ============================================================================
-- UPDATE VOTES TABLE FOR SESSION TRACKING
-- ============================================================================

-- Add session reference to votes table
ALTER TABLE public.votes 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.vote_sessions(id) ON DELETE CASCADE;

-- Add vote type to track what kind of vote this is
ALTER TABLE public.votes 
ADD COLUMN IF NOT EXISTS vote_type public.vote_session_type;

-- Update existing votes to have vote_type
UPDATE public.votes 
SET vote_type = CASE 
  WHEN candidate_id IS NOT NULL THEN 'candidates'::public.vote_session_type
  WHEN initiative_id IS NOT NULL THEN 'initiatives'::public.vote_session_type
  ELSE 'combined'::public.vote_session_type
END
WHERE vote_type IS NULL;

-- Make vote_type NOT NULL after data migration
ALTER TABLE public.votes 
ALTER COLUMN vote_type SET NOT NULL;

-- ============================================================================
-- UPDATE VOTE CONFIRMATIONS FOR SESSION SUPPORT
-- ============================================================================

-- Add session tracking to vote confirmations  
ALTER TABLE public.vote_confirmations
ADD COLUMN IF NOT EXISTS session_type public.vote_session_type DEFAULT 'combined';

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has completed a specific voting session
CREATE OR REPLACE FUNCTION public.user_has_completed_vote_session(
  user_uuid UUID,
  election_uuid UUID,
  session_type_param public.vote_session_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.vote_sessions vs
    WHERE vs.user_id = user_uuid 
    AND vs.election_id = election_uuid 
    AND vs.session_type = session_type_param
    AND vs.completed_at IS NOT NULL
  );
END;
$$;

-- Function to check if user can vote in a specific session
CREATE OR REPLACE FUNCTION public.user_can_vote_in_session(
  user_uuid UUID,
  election_uuid UUID,
  session_type_param public.vote_session_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  election_record RECORD;
BEGIN
  -- Get election details
  SELECT start_date, end_date INTO election_record
  FROM public.elections 
  WHERE id = election_uuid;
  
  -- Check if election exists and is in voting period
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if voting is open
  IF NOW() < election_record.start_date OR NOW() > election_record.end_date THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user hasn't already completed this session
  RETURN NOT public.user_has_completed_vote_session(user_uuid, election_uuid, session_type_param);
END;
$$;

-- Function to get user's voting status for an election
CREATE OR REPLACE FUNCTION public.get_user_voting_status(
  user_uuid UUID,
  election_uuid UUID
)
RETURNS TABLE (
  has_voted_candidates BOOLEAN,
  has_voted_initiatives BOOLEAN,
  candidate_session_id UUID,
  initiative_session_id UUID,
  candidate_confirmation_code TEXT,
  initiative_confirmation_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    public.user_has_completed_vote_session(user_uuid, election_uuid, 'candidates'::public.vote_session_type),
    public.user_has_completed_vote_session(user_uuid, election_uuid, 'initiatives'::public.vote_session_type),
    (SELECT vs.id FROM public.vote_sessions vs WHERE vs.user_id = user_uuid AND vs.election_id = election_uuid AND vs.session_type = 'candidates'::public.vote_session_type),
    (SELECT vs.id FROM public.vote_sessions vs WHERE vs.user_id = user_uuid AND vs.election_id = election_uuid AND vs.session_type = 'initiatives'::public.vote_session_type),
    (SELECT vs.confirmation_code FROM public.vote_sessions vs WHERE vs.user_id = user_uuid AND vs.election_id = election_uuid AND vs.session_type = 'candidates'::public.vote_session_type),
    (SELECT vs.confirmation_code FROM public.vote_sessions vs WHERE vs.user_id = user_uuid AND vs.election_id = election_uuid AND vs.session_type = 'initiatives'::public.vote_session_type);
END;
$$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vote_sessions_user_election ON public.vote_sessions(user_id, election_id);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_type ON public.vote_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_votes_session_id ON public.votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_type ON public.votes(vote_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on vote_sessions
ALTER TABLE public.vote_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own vote sessions
CREATE POLICY "Users can view their own vote sessions" ON public.vote_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can create vote sessions during voting window
CREATE POLICY "Users can create vote sessions during voting window" ON public.vote_sessions
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    public.user_can_vote_in_session(auth.uid(), election_id, session_type)
  );

-- Users can update their own incomplete sessions
CREATE POLICY "Users can update their own incomplete sessions" ON public.vote_sessions
  FOR UPDATE TO authenticated USING (
    auth.uid() = user_id AND completed_at IS NULL
  ) WITH CHECK (
    auth.uid() = user_id
  );

-- ============================================================================
-- UPDATE EXISTING RLS POLICIES FOR VOTES
-- ============================================================================

-- Drop and recreate policies to include session-based voting
DROP POLICY IF EXISTS "Users can insert votes during voting window" ON public.votes;

-- Users can insert votes if they have an active session
CREATE POLICY "Users can insert votes with valid session" ON public.votes
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    (
      session_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM public.vote_sessions vs 
        WHERE vs.id = session_id 
        AND vs.user_id = auth.uid() 
        AND vs.completed_at IS NULL
        AND public.user_can_vote_in_session(auth.uid(), vs.election_id, vs.session_type)
      )
    )
  );

-- Grant necessary permissions
GRANT USAGE ON TYPE public.vote_session_type TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.vote_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_completed_vote_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_vote_in_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_voting_status TO authenticated;
