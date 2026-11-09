-- Fix ballot ordering for better user experience
-- This will ensure initiatives appear in a logical order for voters

UPDATE "public"."initiatives" 
SET 
  "ballot_order" = 1,
  "updated_at" = NOW()
WHERE "id" = 'b932d827-e77e-4573-811e-cc31e884246e'  -- Monthly contribution amount
  AND "election_id" = '27dfac0d-b491-40c4-a0bd-87f62a2cce28';

UPDATE "public"."initiatives" 
SET 
  "ballot_order" = 2,
  "updated_at" = NOW()
WHERE "id" = 'e9ed7921-a7eb-4c96-a70d-b387cb3827af'  -- Funeral support funding type
  AND "election_id" = '27dfac0d-b491-40c4-a0bd-87f62a2cce28';

UPDATE "public"."initiatives" 
SET 
  "ballot_order" = 3,
  "updated_at" = NOW()
WHERE "id" = '558c2138-3e28-4a75-9c11-4825c53325d6'  -- Community picnic funding
  AND "election_id" = '27dfac0d-b491-40c4-a0bd-87f62a2cce28';

-- Optional: Update election type to reflect mixed content
-- This will enable the most appropriate UI behavior
UPDATE "public"."elections"
SET 
  "type" = 'leadership',  -- Keep as leadership since that's the primary focus
  "updated_at" = NOW()
WHERE "id" = '27dfac0d-b491-40c4-a0bd-87f62a2cce28';

-- Verify the updated ballot order
SELECT 
  title,
  ballot_order,
  created_at,
  CASE 
    WHEN title LIKE '%contribution amount%' THEN 'Financial Policy'
    WHEN title LIKE '%funeral%' THEN 'Support Policy' 
    WHEN title LIKE '%picnic%' THEN 'Community Events'
    ELSE 'Other'
  END as category
FROM "public"."initiatives" 
WHERE "election_id" = '27dfac0d-b491-40c4-a0bd-87f62a2cce28'
ORDER BY "ballot_order";
