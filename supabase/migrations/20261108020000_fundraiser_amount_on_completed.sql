-- BUG-012: the raised total was updated by the webhook with read-then-write, so a
-- replayed Stripe event double-counted and concurrent donations lost updates.
-- This trigger already counted only the transition into "paid", atomically, but
-- it looked for 'succeeded' while the app writes 'completed', so it never fired.
-- The app now leaves current_amount to this trigger.
CREATE OR REPLACE FUNCTION public.update_fundraiser_amount() RETURNS trigger AS $$
DECLARE
  was_paid boolean := TG_OP = 'UPDATE' AND OLD.payment_status IN ('completed', 'succeeded');
  is_paid  boolean := NEW.payment_status IN ('completed', 'succeeded');
BEGIN
  IF is_paid AND NOT was_paid THEN
    UPDATE public.fundraisers SET current_amount = coalesce(current_amount, 0) + NEW.amount WHERE id = NEW.fundraiser_id;
  ELSIF was_paid AND NOT is_paid THEN
    UPDATE public.fundraisers SET current_amount = coalesce(current_amount, 0) - OLD.amount WHERE id = OLD.fundraiser_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recompute every total from its paid donations. Corrects totals the old
-- read-then-write over- or under-counted, and makes the deploy order safe: any
-- donation completed between the app deploy and this migration is counted here.
-- (Nothing else writes current_amount; it starts at 0 when a fundraiser is created.)
UPDATE public.fundraisers f
SET current_amount = coalesce((
  SELECT sum(d.amount) FROM public.fundraiser_donations d
  WHERE d.fundraiser_id = f.id AND d.payment_status IN ('completed', 'succeeded')
), 0);
