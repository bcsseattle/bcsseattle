-- BUG-081: fundraiser donation amounts were integers, so any amount with cents
-- ($25.50) failed to insert and the raised total couldn't hold cents. Widening
-- keeps every existing value.
ALTER TABLE public.fundraiser_donations ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE public.fundraisers ALTER COLUMN current_amount TYPE numeric(12,2);
