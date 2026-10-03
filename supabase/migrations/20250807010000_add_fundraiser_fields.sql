-- Add image_url column
ALTER TABLE fundraisers
ADD COLUMN image_url text;

-- Add minimum_donation column with default 0
ALTER TABLE fundraisers
ADD COLUMN minimum_donation decimal(10,2) DEFAULT 0;

-- Add enable_recurring column with default false
ALTER TABLE fundraisers
ADD COLUMN enable_recurring boolean DEFAULT false;
