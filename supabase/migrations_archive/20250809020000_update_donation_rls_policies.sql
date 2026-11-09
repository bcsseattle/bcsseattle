-- Drop existing policies on fundraiser_donations
DROP POLICY IF EXISTS "View non-anonymous donations" ON fundraiser_donations;
DROP POLICY IF EXISTS "View own donations" ON fundraiser_donations;
DROP POLICY IF EXISTS "Create donations" ON fundraiser_donations;
DROP POLICY IF EXISTS "Admins can view all donations" ON fundraiser_donations;

-- Everyone can view non-anonymous donations
CREATE POLICY "View non-anonymous donations" ON fundraiser_donations
  FOR SELECT
  USING (NOT is_anonymous OR auth.uid() = donor_id);

-- Anyone can create donations (both authenticated and anonymous)
CREATE POLICY "Anyone can create donations" ON fundraiser_donations
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all donations
CREATE POLICY "Admins can view all donations" ON fundraiser_donations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
      UNION
      SELECT user_id FROM fundraiser_moderators WHERE fundraiser_id = fundraiser_donations.fundraiser_id
    )
  );
