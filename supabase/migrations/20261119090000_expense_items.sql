-- An event's expense can carry a breakdown of what it cost and what it brought in:
--   items:  [{ "label": "Venue Rental Room 1", "amount": 57500, "group": "Venue" }, ...]
--   income: [{ "label": "Ticket Tailor, 31 tickets", "amount": 217000 }, ...]
-- Amounts are in cents, like expenses.amount, which is the total of items. income is
-- shown beside it and changes no totals (ticket money is already in Stripe or the bank).
-- Columns rather than tables: both are only ever read and written with their expense,
-- and so inherit its row-level security (private expenses keep their breakdown private).
ALTER TABLE public.expenses
  ADD COLUMN items jsonb
    CONSTRAINT expenses_items_is_array CHECK (items IS NULL OR jsonb_typeof(items) = 'array'),
  ADD COLUMN income jsonb
    CONSTRAINT expenses_income_is_array CHECK (income IS NULL OR jsonb_typeof(income) = 'array');

COMMENT ON COLUMN public.expenses.items IS 'Optional cost breakdown: array of {label, amount in cents, group?}. amount is their sum.';
COMMENT ON COLUMN public.expenses.income IS 'Optional event income: array of {label, amount in cents, group?}. Informational.';
