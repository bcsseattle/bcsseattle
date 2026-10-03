-- Create campaign category enum
CREATE TYPE public.campaign_category AS ENUM (
    'emergency',
    'medical',
    'education',
    'community',
    'religious',
    'other'
);

-- Create campaign status enum
CREATE TYPE public.campaign_status AS ENUM (
    'draft',
    'active',
    'completed',
    'cancelled'
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    goal_amount NUMERIC(10,2) NOT NULL,
    current_amount NUMERIC(10,2) DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    category campaign_category NOT NULL,
    image_url TEXT,
    minimum_donation NUMERIC(10,2) DEFAULT 0,
    enable_recurring BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    status campaign_status DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign updates table
CREATE TABLE IF NOT EXISTS public.campaign_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign donations table to link donations with campaigns
CREATE TABLE IF NOT EXISTS public.campaign_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    donation_id UUID REFERENCES donations(id) ON DELETE CASCADE,
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add campaign_id to donations table to track campaign donations
ALTER TABLE public.donations 
ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaign_donations_campaign_id ON campaign_donations(campaign_id);
CREATE INDEX idx_campaign_updates_campaign_id ON campaign_updates(campaign_id);
CREATE INDEX idx_donations_campaign_id ON donations(campaign_id);

-- Enable Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Anyone can view active campaigns" ON campaigns
    FOR SELECT USING (status = 'active' OR status = 'completed');

CREATE POLICY "Admins can manage campaigns" ON campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for campaign updates
CREATE POLICY "Anyone can view campaign updates" ON campaign_updates
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage updates" ON campaign_updates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for campaign donations
CREATE POLICY "Anyone can view non-anonymous donations" ON campaign_donations
    FOR SELECT USING (
        NOT is_anonymous OR auth.uid() = (
            SELECT donor_id FROM donations WHERE id = donation_id
        )
    );

CREATE POLICY "Donors can create their donations" ON campaign_donations
    FOR INSERT WITH CHECK (
        auth.uid() = (
            SELECT donor_id FROM donations WHERE id = donation_id
        )
    );

-- Function to update campaign amounts
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE campaigns
        SET current_amount = current_amount + NEW.donation_amount
        WHERE id = NEW.campaign_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE campaigns
        SET current_amount = current_amount - OLD.donation_amount
        WHERE id = OLD.campaign_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign amounts when donations are made or deleted
CREATE TRIGGER update_campaign_amount_trigger
    AFTER INSERT OR DELETE ON donations
    FOR EACH ROW
    WHEN (NEW.campaign_id IS NOT NULL OR OLD.campaign_id IS NOT NULL)
    EXECUTE FUNCTION update_campaign_amount();

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_updates_updated_at
    BEFORE UPDATE ON campaign_updates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
