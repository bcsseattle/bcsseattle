alter table "public"."funeral_fund_interest" drop constraint "funeral_fund_interest_additional_services_check";

alter table "public"."funeral_fund_interest" add constraint "funeral_fund_interest_additional_services_check" CHECK (((additional_services)::text = ANY ((ARRAY['Yes'::character varying, 'No'::character varying, 'Not sure'::character varying])::text[]))) not valid;

alter table "public"."funeral_fund_interest" validate constraint "funeral_fund_interest_additional_services_check";


