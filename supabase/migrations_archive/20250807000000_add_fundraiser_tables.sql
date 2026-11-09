-- Create fundraiser status enum
CREATE TYPE fundraiser_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');

-- Create fundraisers table
CREATE TABLE IF NOT EXISTS fundraisers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    goal_amount INTEGER NOT NULL,
    current_amount INTEGER DEFAULT 0,
    status fundraiser_status DEFAULT 'draft',
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE,
    image_url TEXT,
    category TEXT,
    beneficiary TEXT
);

-- Create fundraiser_updates table
CREATE TABLE IF NOT EXISTS fundraiser_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fundraiser_id UUID REFERENCES fundraisers(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create fundraiser_donations table
CREATE TABLE IF NOT EXISTS fundraiser_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fundraiser_id UUID REFERENCES fundraisers(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    donor_id UUID REFERENCES auth.users(id),
    donor_name TEXT,
    message TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    payment_intent_id TEXT UNIQUE,
    payment_status TEXT DEFAULT 'pending'
);

-- Add RLS policies
ALTER TABLE fundraisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraiser_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraiser_donations ENABLE ROW LEVEL SECURITY;

-- Fundraisers policies
CREATE POLICY "Fundraisers are viewable by everyone" 
ON fundraisers FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Fundraisers can be created by authenticated users" 
ON fundraisers FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Fundraisers can be updated by creators" 
ON fundraisers FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by);

-- Fundraiser updates policies
CREATE POLICY "Updates are viewable by everyone" 
ON fundraiser_updates FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Updates can be created by fundraiser creators" 
ON fundraiser_updates FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.uid() IN (
        SELECT created_by 
        FROM fundraisers 
        WHERE id = fundraiser_id
    )
);

CREATE POLICY "Updates can be modified by creators" 
ON fundraiser_updates FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by);

-- Fundraiser donations policies
CREATE POLICY "Donations are viewable by everyone" 
ON fundraiser_donations FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Donations can be created by authenticated users" 
ON fundraiser_donations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = donor_id);

-- Add triggers for updating current_amount
CREATE OR REPLACE FUNCTION update_fundraiser_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.payment_status = 'succeeded' THEN
        UPDATE fundraisers
        SET current_amount = current_amount + NEW.amount
        WHERE id = NEW.fundraiser_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.payment_status = 'succeeded' AND OLD.payment_status != 'succeeded' THEN
        UPDATE fundraisers
        SET current_amount = current_amount + NEW.amount
        WHERE id = NEW.fundraiser_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.payment_status != 'succeeded' AND OLD.payment_status = 'succeeded' THEN
        UPDATE fundraisers
        SET current_amount = current_amount - OLD.amount
        WHERE id = NEW.fundraiser_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fundraiser_amount_trigger
AFTER INSERT OR UPDATE ON fundraiser_donations
FOR EACH ROW
EXECUTE FUNCTION update_fundraiser_amount();
