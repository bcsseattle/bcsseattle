-- Push notifications (docs/mobile-app-plan.md §6, approved 9 Nov 2026): the
-- app's push token per device. The server sends with the service role; a
-- member only ever sees or removes their own devices.

CREATE TABLE public.device_tokens (
  token text PRIMARY KEY CHECK (length(token) BETWEEN 1 AND 4096),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX device_tokens_user_id_idx ON public.device_tokens (user_id);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see their own devices" ON public.device_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members remove their own devices" ON public.device_tokens
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Registering goes through this function, not an insert policy: a phone
-- belongs to whoever signed in on it last, so a token already held by another
-- member moves to the caller (a plain upsert would be blocked by RLS).
CREATE FUNCTION public.register_device(p_token text, p_platform text) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.device_tokens (token, user_id, platform)
  VALUES (p_token, auth.uid(), p_platform)
  ON CONFLICT (token) DO UPDATE
    SET user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
$$;
REVOKE ALL ON FUNCTION public.register_device(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_device(text, text) TO authenticated;
