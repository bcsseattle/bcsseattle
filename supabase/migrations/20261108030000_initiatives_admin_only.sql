-- BUG-006 (second half): "Authenticated users can manage initiatives" let any
-- signed-in user insert, edit or delete initiatives (deleting one deletes its
-- votes). Nothing in the app writes initiatives with a user session; only
-- admins should.
DROP POLICY "Authenticated users can manage initiatives" ON public.initiatives;
CREATE POLICY "Admins can manage initiatives" ON public.initiatives
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
