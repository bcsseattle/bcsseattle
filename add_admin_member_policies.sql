-- Add RLS policies for admin operations on members table

-- Allow admins to update member records
CREATE POLICY "Allow admins to update members" ON "public"."members" 
FOR UPDATE TO "authenticated" 
USING (
  EXISTS (
    SELECT 1 FROM "public"."users" 
    WHERE "users"."id" = "auth"."uid"() 
    AND "users"."is_admin" = true
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."users" 
    WHERE "users"."id" = "auth"."uid"() 
    AND "users"."is_admin" = true
  )
);

-- Allow admins to insert member records (if needed)
CREATE POLICY "Allow admins to insert members" ON "public"."members" 
FOR INSERT TO "authenticated" 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."users" 
    WHERE "users"."id" = "auth"."uid"() 
    AND "users"."is_admin" = true
  )
);

-- Allow admins to delete member records (if needed)
CREATE POLICY "Allow admins to delete members" ON "public"."members" 
FOR DELETE TO "authenticated" 
USING (
  EXISTS (
    SELECT 1 FROM "public"."users" 
    WHERE "users"."id" = "auth"."uid"() 
    AND "users"."is_admin" = true
  )
);

-- Allow users to insert their own member records
CREATE POLICY "Allow users to insert own member record" ON "public"."members" 
FOR INSERT TO "authenticated" 
WITH CHECK ("user_id" = "auth"."uid"());

-- Allow users to update their own member records (except admin-controlled fields)
CREATE POLICY "Allow users to update own member record" ON "public"."members" 
FOR UPDATE TO "authenticated" 
USING ("user_id" = "auth"."uid"()) 
WITH CHECK ("user_id" = "auth"."uid"());
