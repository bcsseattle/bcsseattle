-- Update existing voting tables for comprehensive voting feature
-- This migration modifies existing initiatives and votes tables and adds vote_confirmations

-- ============================================================================
-- UPDATE INITIATIVES TABLE
-- ============================================================================

-- Add missing columns to initiatives table
ALTER TABLE public.initiatives 
ADD COLUMN IF NOT EXISTS ballot_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update the position column to ballot_order for consistency (if data exists, preserve it)
UPDATE public.initiatives 
SET ballot_order = COALESCE(position, 0) 
WHERE ballot_order IS NULL;

-- Drop the old position column after data migration
ALTER TABLE public.initiatives DROP COLUMN IF EXISTS position;

-- Ensure election_id foreign key constraint exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'initiatives_election_id_fkey'
    ) THEN
        ALTER TABLE public.initiatives 
        ADD CONSTRAINT initiatives_election_id_fkey 
        FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update created_at to use timezone
ALTER TABLE public.initiatives 
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- ============================================================================
-- UPDATE VOTES TABLE
-- ============================================================================

-- Add missing audit columns to votes table
ALTER TABLE public.votes 
ADD COLUMN IF NOT EXISTS voted_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update the constraint name to match existing constraint
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS only_one_target;

-- Add the updated constraints with new names
DO $$ 
BEGIN
    -- Add unique constraints if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_candidate_vote'
    ) THEN
        ALTER TABLE public.votes 
        ADD CONSTRAINT unique_candidate_vote UNIQUE (user_id, candidate_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_initiative_vote'
    ) THEN
        ALTER TABLE public.votes 
        ADD CONSTRAINT unique_initiative_vote UNIQUE (user_id, initiative_id);
    END IF;
END $$;

-- Add the updated vote type check constraint
-- First drop any existing check constraints
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS vote_type_check;
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS only_one_target;

ALTER TABLE public.votes 
ADD CONSTRAINT vote_type_check CHECK (
    (candidate_id IS NOT NULL AND initiative_id IS NULL AND vote_value IS NULL) OR
    (candidate_id IS NULL AND initiative_id IS NOT NULL AND vote_value IS NOT NULL)
);

-- Update voted_at from created_at if it's null
UPDATE public.votes 
SET voted_at = created_at 
WHERE voted_at IS NULL;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Ensure election_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'votes_election_id_fkey'
    ) THEN
        ALTER TABLE public.votes 
        ADD CONSTRAINT votes_election_id_fkey 
        FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;
    END IF;
    
    -- Ensure candidate_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'votes_candidate_id_fkey'
    ) THEN
        ALTER TABLE public.votes 
        ADD CONSTRAINT votes_candidate_id_fkey 
        FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;
    END IF;
    
    -- Update initiative_id foreign key if needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'votes_initiative_id_fkey'
        AND table_name = 'votes'
    ) THEN
        ALTER TABLE public.votes 
        ADD CONSTRAINT votes_initiative_id_fkey 
        FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- CREATE VOTE CONFIRMATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vote_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  confirmation_code VARCHAR(32) NOT NULL UNIQUE,
  votes_cast INTEGER NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one confirmation per user per election
  CONSTRAINT unique_user_election_confirmation UNIQUE (user_id, election_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_votes_election_id ON public.votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate_id ON public.votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_initiative_id ON public.votes(initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_election_id ON public.initiatives(election_id);
CREATE INDEX IF NOT EXISTS idx_vote_confirmations_user_election ON public.vote_confirmations(user_id, election_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_ballot_order ON public.initiatives(election_id, ballot_order);

-- ============================================================================
-- ROW LEVEL SECURITY SETUP
-- ============================================================================

-- Enable RLS on vote_confirmations (others should already have RLS)
ALTER TABLE public.vote_confirmations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- UPDATE RLS POLICIES FOR INITIATIVES TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Authenticated users can manage initiatives" ON public.initiatives;

-- Add updated policies
CREATE POLICY "Anyone can view initiatives" ON public.initiatives
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage initiatives" ON public.initiatives
  FOR ALL TO authenticated USING (
    auth.uid() IS NOT NULL
  ) WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- ============================================================================
-- UPDATE RLS POLICIES FOR VOTES TABLE
-- ============================================================================

-- Drop existing policies and replace with updated ones
DROP POLICY IF EXISTS "Authenticated users can vote" ON public.votes;
DROP POLICY IF EXISTS "Users can view their own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.votes;

-- Users can view their own votes only
CREATE POLICY "Users can view their own votes" ON public.votes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert votes during voting window
CREATE POLICY "Users can insert votes during voting window" ON public.votes
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.elections e 
      WHERE e.id = election_id 
      AND NOW() >= e.start_date 
      AND NOW() <= e.end_date
    )
  );

-- ============================================================================
-- RLS POLICIES FOR VOTE CONFIRMATIONS TABLE
-- ============================================================================

-- Users can view their own confirmations only
CREATE POLICY "Users can view their own confirmations" ON public.vote_confirmations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert their own confirmations only
CREATE POLICY "Users can insert their own confirmations" ON public.vote_confirmations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS FOR VOTE VALIDATION
-- ============================================================================

-- Function to check if user has already voted in an election
CREATE OR REPLACE FUNCTION public.user_has_voted_in_election(election_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.votes 
    WHERE election_id = election_uuid 
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get vote count for an election
CREATE OR REPLACE FUNCTION public.get_election_vote_count(election_uuid UUID)
RETURNS TABLE(
  candidate_votes BIGINT,
  initiative_votes BIGINT,
  total_voters BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.votes WHERE election_id = election_uuid AND candidate_id IS NOT NULL) as candidate_votes,
    (SELECT COUNT(*) FROM public.votes WHERE election_id = election_uuid AND initiative_id IS NOT NULL) as initiative_votes,
    (SELECT COUNT(DISTINCT user_id) FROM public.votes WHERE election_id = election_uuid) as total_voters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has active membership (for membership validation)
CREATE OR REPLACE FUNCTION public.user_has_active_membership(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.members 
    WHERE user_id = user_uuid 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for initiatives table
DROP TRIGGER IF EXISTS update_initiatives_updated_at ON public.initiatives;
CREATE TRIGGER update_initiatives_updated_at
  BEFORE UPDATE ON public.initiatives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions for vote_confirmations
GRANT ALL ON TABLE public.vote_confirmations TO anon;
GRANT ALL ON TABLE public.vote_confirmations TO authenticated;
GRANT ALL ON TABLE public.vote_confirmations TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.user_has_voted_in_election(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_election_vote_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.vote_confirmations IS 'Vote confirmation records with unique codes for audit';
COMMENT ON COLUMN public.votes.vote_value IS 'For initiatives: yes/no/abstain using vote_option enum. NULL for candidate votes.';
COMMENT ON COLUMN public.votes.ip_address IS 'IP address of voter for audit trail';
COMMENT ON COLUMN public.votes.user_agent IS 'Browser user agent for audit trail';
COMMENT ON COLUMN public.vote_confirmations.confirmation_code IS 'Unique confirmation code provided to voter';
COMMENT ON COLUMN public.initiatives.ballot_order IS 'Order in which initiatives appear on the ballot';

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for vote confirmations (users can see their own confirmations in real-time)
-- Note: votes table is intentionally excluded from realtime for privacy
ALTER PUBLICATION supabase_realtime ADD TABLE public.vote_confirmations;