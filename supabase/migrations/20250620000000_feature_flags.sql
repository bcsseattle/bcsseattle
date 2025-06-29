-- Feature Flags Table for Database-Driven Configuration
-- This allows for user/role-specific feature toggles

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Feature identification
  feature_name VARCHAR(100) NOT NULL,
  
  -- Targeting options
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role VARCHAR(50),
  environment VARCHAR(20) DEFAULT 'production',
  
  -- Feature state
  enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure unique combinations
  CONSTRAINT unique_feature_user UNIQUE (feature_name, user_id),
  CONSTRAINT unique_feature_role_env UNIQUE (feature_name, user_role, environment)
);

-- Indexes for performance
CREATE INDEX idx_feature_flags_feature_name ON feature_flags(feature_name);
CREATE INDEX idx_feature_flags_user_id ON feature_flags(user_id);
CREATE INDEX idx_feature_flags_user_role ON feature_flags(user_role);
CREATE INDEX idx_feature_flags_environment ON feature_flags(environment);

-- Row Level Security
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Only allow authorized users to manage feature flags
-- For now, we'll allow anyone to read, but you can add more restrictive policies later
CREATE POLICY "Allow read access to feature flags" ON feature_flags
  FOR SELECT USING (true);

-- Only allow database admin functions to modify feature flags
-- This ensures feature flags are managed through database functions only
CREATE POLICY "Restrict feature flag modifications" ON feature_flags
  FOR ALL USING (false);

-- Example feature flag entries
INSERT INTO feature_flags (feature_name, user_role, environment, enabled, description) VALUES
('skipMembershipCheck', 'active', 'development', true, 'Allow active members to bypass membership checks in development'),
('enableBetaFeatures', 'active', 'staging', true, 'Enable beta features for active members in staging'),
('allowGuestVoting', NULL, 'development', true, 'Allow guest voting in development environment');

-- Function to get feature flags for a user with proper priority handling
CREATE OR REPLACE FUNCTION get_user_feature_flags(
  p_user_id UUID,
  p_user_role VARCHAR(50) DEFAULT NULL,
  p_environment VARCHAR(20) DEFAULT 'production'
)
RETURNS TABLE (
  feature_name VARCHAR(100),
  enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (ff.feature_name)
    ff.feature_name,
    ff.enabled
  FROM feature_flags ff
  WHERE 
    -- User-specific flags (highest priority)
    (ff.user_id = p_user_id)
    OR 
    -- Role-based flags
    (ff.user_id IS NULL AND ff.user_role = p_user_role AND ff.environment = p_environment)
    OR
    -- Global environment flags
    (ff.user_id IS NULL AND ff.user_role IS NULL AND ff.environment = p_environment)
  ORDER BY 
    ff.feature_name,
    -- Priority: user-specific > role-based > environment-based
    CASE 
      WHEN ff.user_id IS NOT NULL THEN 1
      WHEN ff.user_role IS NOT NULL THEN 2
      ELSE 3
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
