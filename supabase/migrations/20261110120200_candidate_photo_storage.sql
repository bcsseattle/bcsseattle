-- W1 (docs/mobile-app-gaps.md), approved 10 Nov 2026 (election plan O2):
-- the candidate-photos bucket had no policies in any migration, so uploads
-- failed with "violates row-level security policy". Members write only under
-- their own folder (<uid>/<file>); admins anywhere in the bucket. Photos are
-- public, like the bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-photos', 'candidate-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Candidate photos: members upload to their own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'candidate-photos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.current_user_is_admin()));

CREATE POLICY "Candidate photos: members replace their own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'candidate-photos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.current_user_is_admin()));

CREATE POLICY "Candidate photos: members remove their own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'candidate-photos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.current_user_is_admin()));
