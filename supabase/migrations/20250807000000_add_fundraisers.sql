-- Create fundraiser_category enum
CREATE TYPE fundraiser_category AS ENUM (
  'general',
  'medical',
  'education',
  'emergency',
  'community',
  'other'
);

-- Create fundraiser_status enum
CREATE TYPE fundraiser_status AS ENUM (
  'draft',
  'active',
  'completed',
  'cancelled'
);

-- Create fundraisers table
CREATE TABLE fundraisers (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal DECIMAL(10,2) NOT NULL,
  raised DECIMAL(10,2) DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  category fundraiser_category NOT NULL,
  status fundraiser_status DEFAULT 'draft',
  image_url TEXT,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_highlighted BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false
);

-- Create fundraiser_updates table
CREATE TABLE fundraiser_updates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fundraiser_id uuid REFERENCES fundraisers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create fundraiser_donations table
CREATE TABLE fundraiser_donations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fundraiser_id uuid REFERENCES fundraisers(id) ON DELETE CASCADE,
  donor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_id TEXT,
  donor_type donor_type_enum NOT NULL,
  donor_name TEXT NOT NULL,
  donor_email TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  message TEXT,
  status donation_status_enum DEFAULT 'pending'
);

-- Create fundraiser_moderators table for admin access control
CREATE TABLE fundraiser_moderators (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fundraiser_id uuid REFERENCES fundraisers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(fundraiser_id, user_id)
);

-- Create trigger to update the updated_at column
CREATE TRIGGER update_fundraisers_updated_at
  BEFORE UPDATE ON fundraisers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update the raised amount
CREATE OR REPLACE FUNCTION update_fundraiser_raised_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
    UPDATE fundraisers
    SET raised = raised + NEW.amount
    WHERE id = NEW.fundraiser_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE fundraisers
    SET raised = raised + NEW.amount
    WHERE id = NEW.fundraiser_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status != 'completed' AND OLD.status = 'completed' THEN
    UPDATE fundraisers
    SET raised = raised - OLD.amount
    WHERE id = NEW.fundraiser_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fundraiser_raised_amount
  AFTER INSERT OR UPDATE ON fundraiser_donations
  FOR EACH ROW
  EXECUTE FUNCTION update_fundraiser_raised_amount();

-- RLS Policies
ALTER TABLE fundraisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraiser_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraiser_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraiser_moderators ENABLE ROW LEVEL SECURITY;

-- Everyone can view non-deleted fundraisers
CREATE POLICY "View non-deleted fundraisers" ON fundraisers
  FOR SELECT
  USING (NOT is_deleted);

-- Admins and fundraiser moderators can manage fundraisers
CREATE POLICY "Admins can manage fundraisers" ON fundraisers
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
      UNION
      SELECT user_id FROM fundraiser_moderators WHERE fundraiser_id = fundraisers.id
    )
  );

-- Everyone can view fundraiser updates
CREATE POLICY "View fundraiser updates" ON fundraiser_updates
  FOR SELECT
  USING (true);

-- Admins and fundraiser moderators can manage updates
CREATE POLICY "Admins can manage fundraiser updates" ON fundraiser_updates
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
      UNION
      SELECT user_id FROM fundraiser_moderators WHERE fundraiser_id = fundraiser_updates.fundraiser_id
    )
  );

-- Everyone can view non-anonymous donations
CREATE POLICY "View non-anonymous donations" ON fundraiser_donations
  FOR SELECT
  USING (NOT is_anonymous OR auth.uid() = donor_id);

-- Donors can view their own donations
CREATE POLICY "View own donations" ON fundraiser_donations
  FOR SELECT
  USING (auth.uid() = donor_id);

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

-- Authenticated users can create donations
CREATE POLICY "Create donations" ON fundraiser_donations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can manage moderators
CREATE POLICY "Admins can manage moderators" ON fundraiser_moderators
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Moderators can view their own assignments
CREATE POLICY "View own moderator assignments" ON fundraiser_moderators
  FOR SELECT
  USING (auth.uid() = user_id);
