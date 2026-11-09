-- BUG-046: election permissions.

-- Any signed-in user could create an election (created_by = themselves), which
-- then showed to everyone. Elections are run by admins.
DROP POLICY "Creators can manage their elections" ON public.elections;
CREATE POLICY "Admins can manage elections" ON public.elections
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Candidates could edit or delete their row at any time, mid-election included.
-- They may change or withdraw their nomination only until voting opens.
DROP POLICY "Users can update their own candidacy" ON public.candidates;
DROP POLICY "Users can delete their own candidacy" ON public.candidates;

CREATE POLICY "Candidates can edit their nomination until voting opens" ON public.candidates
  FOR UPDATE TO authenticated
  USING (
    public.current_user_is_admin()
    OR (user_id = auth.uid() AND now() < (SELECT e.start_date FROM public.elections e WHERE e.id = candidates.election_id))
  )
  WITH CHECK (
    public.current_user_is_admin()
    OR (user_id = auth.uid() AND now() < (SELECT e.start_date FROM public.elections e WHERE e.id = candidates.election_id))
  );

CREATE POLICY "Candidates can withdraw until voting opens" ON public.candidates
  FOR DELETE TO authenticated
  USING (
    public.current_user_is_admin()
    OR (user_id = auth.uid() AND now() < (SELECT e.start_date FROM public.elections e WHERE e.id = candidates.election_id))
  );

-- Deleting a candidate silently deleted every vote cast for them. Votes now block
-- the delete (checked at the end of the statement, so deleting a whole election,
-- which removes its votes too, still works).
ALTER TABLE public.votes DROP CONSTRAINT votes_candidate_id_fkey;
ALTER TABLE public.votes ADD CONSTRAINT votes_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES public.candidates(id);
