-- Create fundraiser_donors table
CREATE TABLE fundraiser_donors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255),
    full_name VARCHAR(255),
    phone VARCHAR(20),
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update fundraiser_donations table to reference fundraiser_donors
ALTER TABLE fundraiser_donations 
ADD COLUMN fundraiser_donor_id UUID REFERENCES fundraiser_donors(id);

-- Add indexes
CREATE INDEX idx_fundraiser_donors_email ON fundraiser_donors(email);

-- Add comment
COMMENT ON TABLE fundraiser_donors IS 'Stores information about donors who contribute to fundraisers';

-- Add triggers for updated_at
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON fundraiser_donors
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
