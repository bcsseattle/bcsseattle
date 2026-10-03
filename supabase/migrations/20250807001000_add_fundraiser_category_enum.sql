-- Create fundraiser category enum
CREATE TYPE fundraiser_category AS ENUM (
    'general',
    'emergency',
    'medical',
    'education',
    'community',
    'funeral',
    'zakat',
    'other'
);

-- Alter fundraisers table to use the new enum
ALTER TABLE fundraisers 
    ALTER COLUMN category TYPE fundraiser_category USING category::fundraiser_category;
