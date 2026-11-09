alter table "public"."funeral_fund_interest" drop constraint "funeral_fund_interest_additional_services_check";

create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "action" text not null,
    "meta" jsonb,
    "created_at" timestamp without time zone default now()
);


alter table "public"."audit_logs" enable row level security;

create table "public"."nominations" (
    "id" uuid not null default gen_random_uuid(),
    "election_id" uuid not null,
    "nominee_user_id" uuid not null,
    "position" text not null,
    "message" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."nominations" enable row level security;

alter table "public"."elections" drop column "candidate_voting_end";

alter table "public"."elections" drop column "candidate_voting_start";

alter table "public"."elections" drop column "enable_separate_voting_periods";

alter table "public"."elections" drop column "show_unopposed_status";

CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX nominations_election_id_nominee_user_id_position_key ON public.nominations USING btree (election_id, nominee_user_id, "position");

CREATE UNIQUE INDEX nominations_pkey ON public.nominations USING btree (id);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."nominations" add constraint "nominations_pkey" PRIMARY KEY using index "nominations_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_user_id_fkey";

alter table "public"."nominations" add constraint "nominations_election_id_nominee_user_id_position_key" UNIQUE using index "nominations_election_id_nominee_user_id_position_key";

alter table "public"."nominations" add constraint "nominations_nominee_user_id_fkey" FOREIGN KEY (nominee_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."nominations" validate constraint "nominations_nominee_user_id_fkey";

alter table "public"."funeral_fund_interest" add constraint "funeral_fund_interest_additional_services_check" CHECK (((additional_services)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying, 'Not sure'::character varying])::text[]))) not valid;

alter table "public"."funeral_fund_interest" validate constraint "funeral_fund_interest_additional_services_check";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."nominations" to "anon";

grant insert on table "public"."nominations" to "anon";

grant references on table "public"."nominations" to "anon";

grant select on table "public"."nominations" to "anon";

grant trigger on table "public"."nominations" to "anon";

grant truncate on table "public"."nominations" to "anon";

grant update on table "public"."nominations" to "anon";

grant delete on table "public"."nominations" to "authenticated";

grant insert on table "public"."nominations" to "authenticated";

grant references on table "public"."nominations" to "authenticated";

grant select on table "public"."nominations" to "authenticated";

grant trigger on table "public"."nominations" to "authenticated";

grant truncate on table "public"."nominations" to "authenticated";

grant update on table "public"."nominations" to "authenticated";

grant delete on table "public"."nominations" to "service_role";

grant insert on table "public"."nominations" to "service_role";

grant references on table "public"."nominations" to "service_role";

grant select on table "public"."nominations" to "service_role";

grant trigger on table "public"."nominations" to "service_role";

grant truncate on table "public"."nominations" to "service_role";

grant update on table "public"."nominations" to "service_role";

create policy "Service role can insert audit logs"
on "public"."audit_logs"
as permissive
for insert
to service_role
with check (true);


create policy "Users can view their own audit logs"
on "public"."audit_logs"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));


create policy "Authenticated users can create nominations"
on "public"."nominations"
as permissive
for insert
to authenticated
with check (true);


create policy "Public can view nominations"
on "public"."nominations"
as permissive
for select
to public
using (true);


create policy "Users can delete their own nominations"
on "public"."nominations"
as permissive
for delete
to authenticated
using ((nominee_user_id = auth.uid()));


create policy "Users can update their own nominations"
on "public"."nominations"
as permissive
for update
to authenticated
using ((nominee_user_id = auth.uid()))
with check ((nominee_user_id = auth.uid()));



