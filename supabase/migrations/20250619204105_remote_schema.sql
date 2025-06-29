

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."donation_status_enum" AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);


ALTER TYPE "public"."donation_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."donor_type_enum" AS ENUM (
    'individual',
    'organization'
);


ALTER TYPE "public"."donor_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."election_status" AS ENUM (
    'draft',
    'nominations_open',
    'nominations_closed',
    'voting_open',
    'voting_closed',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."election_status" OWNER TO "postgres";


CREATE TYPE "public"."election_type" AS ENUM (
    'leadership',
    'initiative',
    'board'
);


ALTER TYPE "public"."election_type" OWNER TO "postgres";


CREATE TYPE "public"."membershiptypes" AS ENUM (
    'Individual',
    'Family'
);


ALTER TYPE "public"."membershiptypes" OWNER TO "postgres";


CREATE TYPE "public"."payment_method_enum" AS ENUM (
    'card',
    'zelle',
    'check',
    'cash',
    'us_bank_account',
    'external'
);


ALTER TYPE "public"."payment_method_enum" OWNER TO "postgres";


CREATE TYPE "public"."position_enum" AS ENUM (
    'President',
    'Vice President',
    'Secretary',
    'Treasurer'
);


ALTER TYPE "public"."position_enum" OWNER TO "postgres";


CREATE TYPE "public"."pricing_plan_interval" AS ENUM (
    'day',
    'week',
    'month',
    'year'
);


ALTER TYPE "public"."pricing_plan_interval" OWNER TO "postgres";


CREATE TYPE "public"."pricing_type" AS ENUM (
    'one_time',
    'recurring'
);


ALTER TYPE "public"."pricing_type" OWNER TO "postgres";


CREATE TYPE "public"."purpose_enum" AS ENUM (
    'general-purpose',
    'funeral-and-burial',
    'new-member-support',
    'youth-programs',
    'social-events'
);


ALTER TYPE "public"."purpose_enum" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid',
    'paused'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."vote_option" AS ENUM (
    'yes',
    'no',
    'abstain'
);


ALTER TYPE "public"."vote_option" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "meta" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" "text" NOT NULL,
    "position" "text" NOT NULL,
    "bio" "text",
    "photo_url" "text",
    "election_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "manifesto" "text",
    CONSTRAINT "manifesto_length_check" CHECK ((("manifesto" IS NULL) OR ("manifesto" = ''::"text") OR (("length"("manifesto") >= 10) AND ("length"("manifesto") <= 1000))))
);


ALTER TABLE "public"."candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" NOT NULL,
    "stripe_customer_id" "text"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."donations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "donor_id" "uuid" NOT NULL,
    "is_anonymous" boolean NOT NULL,
    "donation_amount" numeric(10,2) NOT NULL,
    "donation_date" timestamp without time zone DEFAULT "now"() NOT NULL,
    "payment_method" "public"."payment_method_enum",
    "currency" character varying(10) DEFAULT 'USD'::character varying,
    "non_cash_description" "text",
    "goods_or_services_provided" boolean DEFAULT false,
    "goods_services_description" "text",
    "goods_services_estimate" numeric(10,2),
    "intangible_benefits" boolean DEFAULT false,
    "stripe_payment_id" "text",
    "stripe_customer_id" character varying(255),
    "tax_receipt_generated" boolean DEFAULT false,
    "purpose" "public"."purpose_enum",
    "donation_status" "public"."donation_status_enum" DEFAULT 'pending'::"public"."donation_status_enum" NOT NULL,
    "donation_type" "public"."pricing_type" NOT NULL,
    "donation_interval" "public"."pricing_plan_interval",
    "donation_description" "text",
    "is_private" boolean DEFAULT false
);


ALTER TABLE "public"."donations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."donors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "donor_type" "public"."donor_type_enum" NOT NULL,
    "full_name" "text",
    "organization_name" "text",
    "email" "text" NOT NULL,
    "phone" "text",
    "address" "text",
    "city" character varying(100),
    "state" "text",
    "zip_code" "text",
    "country" "text",
    "registration_date" timestamp without time zone DEFAULT "now"(),
    "stripe_customer_id" "text",
    "user_id" "uuid"
);


ALTER TABLE "public"."donors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."election_positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "election_type" "text" NOT NULL,
    "position" "text" NOT NULL,
    "display_order" integer NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."election_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."elections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "public"."election_type" DEFAULT 'leadership'::"public"."election_type",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "nomination_start" timestamp with time zone,
    "nomination_end" timestamp with time zone,
    "is_active" boolean DEFAULT false,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "status" "public"."election_status" DEFAULT 'draft'::"public"."election_status",
    CONSTRAINT "elections_dates_check" CHECK (("end_date" > "start_date")),
    CONSTRAINT "elections_nomination_dates_check" CHECK (((("nomination_start" IS NULL) AND ("nomination_end" IS NULL)) OR (("nomination_start" IS NOT NULL) AND ("nomination_end" IS NOT NULL) AND ("nomination_end" > "nomination_start"))))
);


ALTER TABLE "public"."elections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient" "text",
    "subject" "text",
    "sent_at" timestamp without time zone DEFAULT "now"(),
    "purpose" "text"
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "date" "date" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "category" character varying(50) NOT NULL,
    "description" "text",
    "payee" character varying(100),
    "payment_method" character varying(50),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "currency" "text" DEFAULT 'USD'::"text",
    "is_private" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funds" (
    "id" "text" NOT NULL,
    "date" "date" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "source" character varying(255) NOT NULL,
    "description" "text",
    "payment_method" character varying(50),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "currency" character varying(10) DEFAULT 'USD'::character varying,
    "stripe_payout_id" character varying(255),
    "stripe_status" character varying(50),
    "stripe_fees" numeric(10,2),
    "status" "text",
    "is_private" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."funds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funeral-burial-fund" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_name" "text" NOT NULL
);


ALTER TABLE "public"."funeral-burial-fund" OWNER TO "postgres";


ALTER TABLE "public"."funeral-burial-fund" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."funeral-burial-fund_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."funeral_fund_interest" (
    "id" integer NOT NULL,
    "full_name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone_number" character varying(20) NOT NULL,
    "additional_services" character varying(10) NOT NULL,
    "additional_comments" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "funeral_fund_interest_additional_services_check" CHECK ((("additional_services")::"text" = ANY ((ARRAY['Yes'::character varying, 'No'::character varying, 'Not sure'::character varying])::"text"[])))
);


ALTER TABLE "public"."funeral_fund_interest" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."funeral_fund_interest_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."funeral_fund_interest_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."funeral_fund_interest_id_seq" OWNED BY "public"."funeral_fund_interest"."id";



CREATE TABLE IF NOT EXISTS "public"."initiatives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "election_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "additional_info_url" "text",
    "position" integer,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."initiatives" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "member_id" "uuid" NOT NULL
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fullName" character varying,
    "phone" "text",
    "address" "text",
    "address2" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "user_id" "uuid",
    "stripe_customer_id" "uuid",
    "subscription_id" "text",
    "status" "text",
    "membershipType" "public"."membershiptypes",
    "totalMembersInFamily" numeric,
    "terms" boolean,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "isApproved" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nominations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "election_id" "uuid" NOT NULL,
    "nominee_user_id" "uuid" NOT NULL,
    "position" "text" NOT NULL,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nominations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "country" "text",
    "phone" "text",
    "email" "text",
    "ein" "text",
    "description" "text"
);


ALTER TABLE "public"."organization" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prices" (
    "id" "text" NOT NULL,
    "product_id" "text",
    "active" boolean,
    "description" "text",
    "unit_amount" bigint,
    "currency" "text",
    "type" "public"."pricing_type",
    "interval" "public"."pricing_plan_interval",
    "interval_count" integer,
    "trial_period_days" integer,
    "metadata" "jsonb",
    CONSTRAINT "prices_currency_check" CHECK (("char_length"("currency") = 3))
);


ALTER TABLE "public"."prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "text" NOT NULL,
    "active" boolean,
    "name" "text",
    "description" "text",
    "image" "text",
    "metadata" "jsonb"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "key" "public"."purpose_enum" NOT NULL,
    "value" "text" NOT NULL,
    "active" boolean NOT NULL
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "text" NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "sent_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."sms_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."subscription_status",
    "metadata" "jsonb",
    "price_id" "text",
    "quantity" integer,
    "cancel_at_period_end" boolean,
    "created" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "current_period_start" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "current_period_end" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ended_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "cancel_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "canceled_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "trial_start" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "trial_end" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "billing_address" "jsonb",
    "payment_method" "jsonb"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "election_id" "uuid" NOT NULL,
    "candidate_id" "uuid",
    "initiative_id" "uuid",
    "vote_value" "public"."vote_option",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "only_one_target" CHECK (((("candidate_id" IS NOT NULL) AND ("initiative_id" IS NULL) AND ("vote_value" IS NULL)) OR (("initiative_id" IS NOT NULL) AND ("vote_value" IS NOT NULL) AND ("candidate_id" IS NULL))))
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."funeral_fund_interest" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."funeral_fund_interest_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_user_election_unique" UNIQUE ("user_id", "election_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_stripe_payment_id_key" UNIQUE ("stripe_payment_id");



ALTER TABLE ONLY "public"."donors"
    ADD CONSTRAINT "donors_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."donors"
    ADD CONSTRAINT "donors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donors"
    ADD CONSTRAINT "donors_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."election_positions"
    ADD CONSTRAINT "election_positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."elections"
    ADD CONSTRAINT "elections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funds"
    ADD CONSTRAINT "funds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funeral-burial-fund"
    ADD CONSTRAINT "funeral-burial-fund_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funeral_fund_interest"
    ADD CONSTRAINT "funeral_fund_interest_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."initiatives"
    ADD CONSTRAINT "initiatives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."nominations"
    ADD CONSTRAINT "nominations_election_id_nominee_user_id_position_key" UNIQUE ("election_id", "nominee_user_id", "position");



ALTER TABLE ONLY "public"."nominations"
    ADD CONSTRAINT "nominations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prices"
    ADD CONSTRAINT "prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_notifications"
    ADD CONSTRAINT "sms_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_notifications"
    ADD CONSTRAINT "sms_notifications_subscription_id_month_year_key" UNIQUE ("subscription_id", "month", "year");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funeral_fund_interest"
    ADD CONSTRAINT "unique_email" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_candidate_id_key" UNIQUE ("user_id", "candidate_id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_initiative_id_key" UNIQUE ("user_id", "initiative_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."donors"
    ADD CONSTRAINT "donors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."elections"
    ADD CONSTRAINT "elections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_stripe_customer_id_fkey" FOREIGN KEY ("stripe_customer_id") REFERENCES "public"."customers"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nominations"
    ADD CONSTRAINT "nominations_nominee_user_id_fkey" FOREIGN KEY ("nominee_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prices"
    ADD CONSTRAINT "prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "public"."prices"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_initiative_id_fkey" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public read-only access." ON "public"."prices" FOR SELECT USING (true);



CREATE POLICY "Allow public read-only access." ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create nominations" ON "public"."nominations" FOR INSERT TO "authenticated" WITH CHECK (true);






CREATE POLICY "Authenticated users can view all elections" ON "public"."elections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can vote" ON "public"."votes" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Can update own user data." ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Can view own user data." ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Creators can manage their elections" ON "public"."elections" TO "authenticated" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Election positions are viewable by everyone" ON "public"."election_positions" FOR SELECT USING (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."donors" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."customers" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."donations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."donors" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."email_logs" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."expenses" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."funds" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."members" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."organization" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."programs" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."sms_notifications" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."subscriptions" FOR SELECT USING (true);



CREATE POLICY "Public can view active elections" ON "public"."elections" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view all candidates" ON "public"."candidates" FOR SELECT USING (true);



CREATE POLICY "Public can view initiatives" ON "public"."initiatives" FOR SELECT USING (true);



CREATE POLICY "Public can view nominations" ON "public"."nominations" FOR SELECT USING (true);



CREATE POLICY "Service role can insert audit logs" ON "public"."audit_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Users can delete their own candidacy" ON "public"."candidates" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own nominations" ON "public"."nominations" FOR DELETE TO "authenticated" USING (("nominee_user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own votes" ON "public"."votes" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can nominate themselves" ON "public"."candidates" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own candidacy" ON "public"."candidates" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own nominations" ON "public"."nominations" FOR UPDATE TO "authenticated" USING (("nominee_user_id" = "auth"."uid"())) WITH CHECK (("nominee_user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own votes" ON "public"."votes" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));






ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."donations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."donors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."election_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."elections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."funds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."funeral-burial-fund" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."funeral_fund_interest" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."initiatives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nominations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."programs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sms_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."prices";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."products";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
































































































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";





















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."candidates" TO "anon";
GRANT ALL ON TABLE "public"."candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."candidates" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."donations" TO "anon";
GRANT ALL ON TABLE "public"."donations" TO "authenticated";
GRANT ALL ON TABLE "public"."donations" TO "service_role";



GRANT ALL ON TABLE "public"."donors" TO "anon";
GRANT ALL ON TABLE "public"."donors" TO "authenticated";
GRANT ALL ON TABLE "public"."donors" TO "service_role";



GRANT ALL ON TABLE "public"."election_positions" TO "anon";
GRANT ALL ON TABLE "public"."election_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."election_positions" TO "service_role";



GRANT ALL ON TABLE "public"."elections" TO "anon";
GRANT ALL ON TABLE "public"."elections" TO "authenticated";
GRANT ALL ON TABLE "public"."elections" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."funds" TO "anon";
GRANT ALL ON TABLE "public"."funds" TO "authenticated";
GRANT ALL ON TABLE "public"."funds" TO "service_role";



GRANT ALL ON TABLE "public"."funeral-burial-fund" TO "anon";
GRANT ALL ON TABLE "public"."funeral-burial-fund" TO "authenticated";
GRANT ALL ON TABLE "public"."funeral-burial-fund" TO "service_role";



GRANT ALL ON SEQUENCE "public"."funeral-burial-fund_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."funeral-burial-fund_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."funeral-burial-fund_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."funeral_fund_interest" TO "anon";
GRANT ALL ON TABLE "public"."funeral_fund_interest" TO "authenticated";
GRANT ALL ON TABLE "public"."funeral_fund_interest" TO "service_role";



GRANT ALL ON SEQUENCE "public"."funeral_fund_interest_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."funeral_fund_interest_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."funeral_fund_interest_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."initiatives" TO "anon";
GRANT ALL ON TABLE "public"."initiatives" TO "authenticated";
GRANT ALL ON TABLE "public"."initiatives" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."nominations" TO "anon";
GRANT ALL ON TABLE "public"."nominations" TO "authenticated";
GRANT ALL ON TABLE "public"."nominations" TO "service_role";



GRANT ALL ON TABLE "public"."organization" TO "anon";
GRANT ALL ON TABLE "public"."organization" TO "authenticated";
GRANT ALL ON TABLE "public"."organization" TO "service_role";



GRANT ALL ON TABLE "public"."prices" TO "anon";
GRANT ALL ON TABLE "public"."prices" TO "authenticated";
GRANT ALL ON TABLE "public"."prices" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."programs" TO "anon";
GRANT ALL ON TABLE "public"."programs" TO "authenticated";
GRANT ALL ON TABLE "public"."programs" TO "service_role";



GRANT ALL ON TABLE "public"."sms_notifications" TO "anon";
GRANT ALL ON TABLE "public"."sms_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
