alter table "public"."funeral_fund_interest" drop constraint "funeral_fund_interest_additional_services_check";

alter table "public"."funeral_fund_interest" add constraint "funeral_fund_interest_additional_services_check" CHECK (((additional_services)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying, 'Not sure'::character varying])::text[]))) not valid;

alter table "public"."funeral_fund_interest" validate constraint "funeral_fund_interest_additional_services_check";

create policy "Allow admins to delete members"
on "public"."members"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))));


create policy "Allow admins to insert members"
on "public"."members"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))));


create policy "Allow admins to update members"
on "public"."members"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))))
with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true)))));


create policy "Allow users to insert own member record"
on "public"."members"
as permissive
for insert
to authenticated
with check ((user_id = auth.uid()));


create policy "Allow users to update own member record"
on "public"."members"
as permissive
for update
to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



