alter table "public"."funeral_fund_interest" drop constraint "funeral_fund_interest_additional_services_check";

alter table "public"."elections" add column "candidate_voting_end" timestamp with time zone;

alter table "public"."elections" add column "candidate_voting_start" timestamp with time zone;

alter table "public"."elections" add column "enable_separate_voting_periods" boolean default false;

alter table "public"."elections" add column "show_unopposed_status" boolean default true;

alter table "public"."funeral_fund_interest" add constraint "funeral_fund_interest_additional_services_check" CHECK (((additional_services)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying, 'Not sure'::character varying])::text[]))) not valid;

alter table "public"."funeral_fund_interest" validate constraint "funeral_fund_interest_additional_services_check";


