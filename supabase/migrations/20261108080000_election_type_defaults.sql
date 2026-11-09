-- BUG-060: these columns defaulted to false/true, so the app's per-type defaults
-- (utils/election-types.ts, applied when the value is null) never took effect.
-- Without a column default, an election that doesn't set them follows its type.
-- Existing rows keep their stored values.
ALTER TABLE public.elections ALTER COLUMN enable_separate_voting_periods DROP DEFAULT;
ALTER TABLE public.elections ALTER COLUMN show_unopposed_status DROP DEFAULT;
