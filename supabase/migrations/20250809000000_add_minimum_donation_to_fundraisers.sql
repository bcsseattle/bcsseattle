-- Add minimum_donation column to fundraisers table
ALTER TABLE fundraisers 
ADD COLUMN minimum_donation DECIMAL(10,2) DEFAULT NULL;

-- Add constraint to ensure minimum_donation is not negative
ALTER TABLE fundraisers 
ADD CONSTRAINT chk_minimum_donation_positive 
CHECK (minimum_donation IS NULL OR minimum_donation >= 0);

-- Add comment for documentation
COMMENT ON COLUMN fundraisers.minimum_donation IS 'Optional minimum donation amount that donors must meet';
