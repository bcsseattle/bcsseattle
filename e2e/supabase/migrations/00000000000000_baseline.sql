

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


CREATE TYPE "public"."vote_session_type" AS ENUM (
    'candidates',
    'initiatives',
    'combined'
);


ALTER TYPE "public"."vote_session_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rls_enabled"("table_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = table_name 
    AND rowsecurity = true
  );
END;
$$;


ALTER FUNCTION "public"."check_rls_enabled"("table_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_rls_enabled"("table_name" "text") IS 'Checks if Row Level Security is enabled on a table';



CREATE OR REPLACE FUNCTION "public"."check_unique_constraints"() RETURNS TABLE("table_name" "text", "constraint_name" "text", "columns" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.table_name::TEXT,
    tc.constraint_name::TEXT,
    array_agg(kcu.column_name) AS columns
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_name IN ('votes', 'initiatives', 'vote_confirmations')
    AND tc.table_schema = 'public'
  GROUP BY tc.table_name, tc.constraint_name
  ORDER BY tc.table_name, tc.constraint_name;
END;
$$;


ALTER FUNCTION "public"."check_unique_constraints"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_unique_constraints"() IS 'Lists all unique constraints on voting tables';



CREATE OR REPLACE FUNCTION "public"."find_duplicate_votes"() RETURNS TABLE("user_id" "uuid", "election_id" "uuid", "duplicate_type" "text", "count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  -- Duplicate candidate votes (same user, same candidate)
  SELECT 
    v.user_id,
    v.election_id,
    'candidate'::TEXT as duplicate_type,
    COUNT(*)::BIGINT
  FROM public.votes v
  WHERE v.candidate_id IS NOT NULL
  GROUP BY v.user_id, v.election_id, v.candidate_id
  HAVING COUNT(*) > 1

  UNION ALL

  -- Duplicate initiative votes (same user, same initiative)
  SELECT 
    v.user_id,
    v.election_id,
    'initiative'::TEXT as duplicate_type,
    COUNT(*)::BIGINT
  FROM public.votes v
  WHERE v.initiative_id IS NOT NULL
  GROUP BY v.user_id, v.election_id, v.initiative_id
  HAVING COUNT(*) > 1;
END;
$$;


ALTER FUNCTION "public"."find_duplicate_votes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_duplicate_votes"() IS 'Finds duplicate votes (should be prevented by constraints)';



CREATE OR REPLACE FUNCTION "public"."find_invalid_votes"() RETURNS TABLE("vote_id" "uuid", "election_id" "uuid", "user_id" "uuid", "issue" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  -- Votes with both candidate_id and initiative_id
  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Vote has both candidate and initiative'::TEXT
  FROM public.votes v
  WHERE v.candidate_id IS NOT NULL AND v.initiative_id IS NOT NULL

  UNION ALL

  -- Votes with neither candidate_id nor initiative_id
  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Vote has neither candidate nor initiative'::TEXT
  FROM public.votes v
  WHERE v.candidate_id IS NULL AND v.initiative_id IS NULL

  UNION ALL

  -- Initiative votes without vote_value
  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Initiative vote missing vote_value'::TEXT
  FROM public.votes v
  WHERE v.initiative_id IS NOT NULL AND v.vote_value IS NULL

  UNION ALL

  -- Candidate votes with vote_value (should be NULL)
  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Candidate vote has unexpected vote_value'::TEXT
  FROM public.votes v
  WHERE v.candidate_id IS NOT NULL AND v.vote_value IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."find_invalid_votes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_invalid_votes"() IS 'Finds votes that violate business rules';



CREATE OR REPLACE FUNCTION "public"."find_orphaned_votes"() RETURNS TABLE("vote_id" "uuid", "election_id" "uuid", "user_id" "uuid", "issue" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Election not found'::TEXT
  FROM public.votes v
  LEFT JOIN public.elections e ON v.election_id = e.id
  WHERE e.id IS NULL

  UNION ALL

  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Candidate not found'::TEXT
  FROM public.votes v
  LEFT JOIN public.candidates c ON v.candidate_id = c.id
  WHERE v.candidate_id IS NOT NULL AND c.id IS NULL

  UNION ALL

  SELECT 
    v.id,
    v.election_id,
    v.user_id,
    'Initiative not found'::TEXT
  FROM public.votes v
  LEFT JOIN public.initiatives i ON v.initiative_id = i.id
  WHERE v.initiative_id IS NOT NULL AND i.id IS NULL;
END;
$$;


ALTER FUNCTION "public"."find_orphaned_votes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_orphaned_votes"() IS 'Finds votes that reference non-existent elections, candidates, or initiatives';



CREATE OR REPLACE FUNCTION "public"."get_election_vote_count"("election_uuid" "uuid") RETURNS TABLE("candidate_votes" bigint, "initiative_votes" bigint, "total_voters" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.votes WHERE election_id = election_uuid AND candidate_id IS NOT NULL) as candidate_votes,
    (SELECT COUNT(*) FROM public.votes WHERE election_id = election_uuid AND initiative_id IS NOT NULL) as initiative_votes,
    (SELECT COUNT(DISTINCT user_id) FROM public.votes WHERE election_id = election_uuid) as total_voters;
END;
$$;


ALTER FUNCTION "public"."get_election_vote_count"("election_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_table_constraints"("table_name" "text") RETURNS TABLE("constraint_name" "text", "constraint_type" "text", "column_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.constraint_name::TEXT,
    tc.constraint_type::TEXT,
    kcu.column_name::TEXT
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = table_name
    AND tc.table_schema = 'public'
  ORDER BY tc.constraint_name;
END;
$$;


ALTER FUNCTION "public"."get_table_constraints"("table_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_table_constraints"("table_name" "text") IS 'Returns all constraints for a given table';



CREATE OR REPLACE FUNCTION "public"."get_user_feature_flags"("p_user_id" "uuid", "p_user_role" character varying DEFAULT NULL::character varying, "p_environment" character varying DEFAULT 'production'::character varying) RETURNS TABLE("feature_name" character varying, "enabled" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (ff.feature_name)
    ff.feature_name,
    ff.enabled
  FROM feature_flags ff
  WHERE 
    -- User-specific flags (highest priority)
    (ff.user_id = p_user_id)
    OR 
    -- Role-based flags
    (ff.user_id IS NULL AND ff.user_role = p_user_role AND ff.environment = p_environment)
    OR
    -- Global environment flags
    (ff.user_id IS NULL AND ff.user_role IS NULL AND ff.environment = p_environment)
  ORDER BY 
    ff.feature_name,
    -- Priority: user-specific > role-based > environment-based
    CASE 
      WHEN ff.user_id IS NOT NULL THEN 1
      WHEN ff.user_role IS NOT NULL THEN 2
      ELSE 3
    END;
END;
$$;


ALTER FUNCTION "public"."get_user_feature_flags"("p_user_id" "uuid", "p_user_role" character varying, "p_environment" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_voting_status"("user_uuid" "uuid", "election_uuid" "uuid") RETURNS TABLE("has_voted_candidates" boolean, "has_voted_initiatives" boolean, "candidate_session_id" "uuid", "initiative_session_id" "uuid", "candidate_confirmation_code" "text", "initiative_confirmation_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    public.user_has_completed_vote_session(user_uuid, election_uuid, 'candidates'::public.vote_session_type),
    public.user_has_completed_vote_session(user_uuid, election_uuid, 'initiatives'::public.vote_session_type),
    (SELECT vs.id FROM public.vote_sessions vs WHERE vs.user_id = user_uuid AND vs.election_id = election_uuid AND vs.session_type = 'candidates'::public.vote_session_type),
    (SELECT vs.id FROM public.vote_sessions vs WHERE vs.user_id = user_uuid AND vs.election_id = election_uuid AND vs.session_type = 'initiatives'::public.vote_session_type),
    (SELECT vs.confirmation_code FROM public.vote_sessions vs WHERE vs.user_id = user_uuid AND vs.election_id = election_uuid AND vs.session_type = 'candidates'::public.vote_session_type),
    (SELECT vs.confirmation_code FROM public.vote_sessions vs WHERE vs.user_id = user_uuid AND vs.election_id = election_uuid AND vs.session_type = 'initiatives'::public.vote_session_type);
END;
$$;


ALTER FUNCTION "public"."get_user_voting_status"("user_uuid" "uuid", "election_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_voting_security_stats"("election_uuid" "uuid") RETURNS TABLE("total_votes" bigint, "unique_voters" bigint, "candidate_votes" bigint, "initiative_votes" bigint, "votes_per_user_avg" numeric, "suspicious_activity_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_votes,
    COUNT(DISTINCT user_id)::BIGINT as unique_voters,
    COUNT(CASE WHEN candidate_id IS NOT NULL THEN 1 END)::BIGINT as candidate_votes,
    COUNT(CASE WHEN initiative_id IS NOT NULL THEN 1 END)::BIGINT as initiative_votes,
    ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT user_id), 0), 2) as votes_per_user_avg,
    (
      SELECT COUNT(*)::BIGINT
      FROM (
        SELECT user_id, COUNT(*) as vote_count
        FROM public.votes 
        WHERE election_id = election_uuid
        GROUP BY user_id
        HAVING COUNT(*) > (
          SELECT COUNT(*) FROM public.election_positions ep 
          WHERE ep.election_type = (
            SELECT type FROM public.elections WHERE id = election_uuid
          )
        ) + (
          SELECT COUNT(*) FROM public.initiatives i 
          WHERE i.election_id = election_uuid
        )
      ) suspicious
    ) as suspicious_activity_count
  FROM public.votes v
  WHERE v.election_id = election_uuid;
END;
$$;


ALTER FUNCTION "public"."get_voting_security_stats"("election_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_voting_security_stats"("election_uuid" "uuid") IS 'Returns security statistics for an election';



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


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_vote_in_session"("user_uuid" "uuid", "election_uuid" "uuid", "session_type_param" "public"."vote_session_type") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  election_record RECORD;
BEGIN
  -- Get election details
  SELECT start_date, end_date INTO election_record
  FROM public.elections 
  WHERE id = election_uuid;
  
  -- Check if election exists and is in voting period
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if voting is open
  IF NOW() < election_record.start_date OR NOW() > election_record.end_date THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user hasn't already completed this session
  RETURN NOT public.user_has_completed_vote_session(user_uuid, election_uuid, session_type_param);
END;
$$;


ALTER FUNCTION "public"."user_can_vote_in_session"("user_uuid" "uuid", "election_uuid" "uuid", "session_type_param" "public"."vote_session_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_active_membership"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.members 
    WHERE user_id = user_uuid 
    AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."user_has_active_membership"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_completed_vote_session"("user_uuid" "uuid", "election_uuid" "uuid", "session_type_param" "public"."vote_session_type") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.vote_sessions vs
    WHERE vs.user_id = user_uuid 
    AND vs.election_id = election_uuid 
    AND vs.session_type = session_type_param
    AND vs.completed_at IS NOT NULL
  );
END;
$$;


ALTER FUNCTION "public"."user_has_completed_vote_session"("user_uuid" "uuid", "election_uuid" "uuid", "session_type_param" "public"."vote_session_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_voted_in_election"("election_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.votes 
    WHERE election_id = election_uuid 
    AND user_id = user_uuid
  );
END;
$$;


ALTER FUNCTION "public"."user_has_voted_in_election"("election_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";

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
    "candidate_voting_start" timestamp with time zone,
    "candidate_voting_end" timestamp with time zone,
    "enable_separate_voting_periods" boolean DEFAULT false,
    "show_unopposed_status" boolean DEFAULT true,
    CONSTRAINT "elections_dates_check" CHECK (("end_date" > "start_date")),
    CONSTRAINT "elections_nomination_dates_check" CHECK (((("nomination_start" IS NULL) AND ("nomination_end" IS NULL)) OR (("nomination_start" IS NOT NULL) AND ("nomination_end" IS NOT NULL) AND ("nomination_end" > "nomination_start"))))
);


ALTER TABLE "public"."elections" OWNER TO "postgres";


COMMENT ON COLUMN "public"."elections"."candidate_voting_start" IS 'Start date for candidate voting (can be different from general voting start)';



COMMENT ON COLUMN "public"."elections"."candidate_voting_end" IS 'End date for candidate voting (can be different from general voting end)';



COMMENT ON COLUMN "public"."elections"."enable_separate_voting_periods" IS 'Whether this election uses separate candidate and initiative voting periods';



COMMENT ON COLUMN "public"."elections"."show_unopposed_status" IS 'Whether to show "Elected Unopposed" status for candidates when voting is closed';



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


CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_name" character varying(100) NOT NULL,
    "user_id" "uuid",
    "user_role" character varying(50),
    "environment" character varying(20) DEFAULT 'production'::character varying,
    "enabled" boolean DEFAULT false NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."feature_flags" OWNER TO "postgres";


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
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ballot_order" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."initiatives" OWNER TO "postgres";


COMMENT ON COLUMN "public"."initiatives"."ballot_order" IS 'Order in which initiatives appear on the ballot';



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
    "payment_method" "jsonb",
    "is_admin" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vote_confirmations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "election_id" "uuid" NOT NULL,
    "confirmation_code" character varying(32) NOT NULL,
    "votes_cast" integer NOT NULL,
    "confirmed_at" timestamp with time zone DEFAULT "now"(),
    "session_type" "public"."vote_session_type" DEFAULT 'combined'::"public"."vote_session_type"
);


ALTER TABLE "public"."vote_confirmations" OWNER TO "postgres";


COMMENT ON TABLE "public"."vote_confirmations" IS 'Vote confirmation records with unique codes for audit';



COMMENT ON COLUMN "public"."vote_confirmations"."confirmation_code" IS 'Unique confirmation code provided to voter';



CREATE TABLE IF NOT EXISTS "public"."vote_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "election_id" "uuid" NOT NULL,
    "session_type" "public"."vote_session_type" NOT NULL,
    "confirmation_code" character varying(32) NOT NULL,
    "votes_cast" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."vote_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "election_id" "uuid" NOT NULL,
    "candidate_id" "uuid",
    "initiative_id" "uuid",
    "vote_value" "public"."vote_option",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "voted_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "uuid",
    "vote_type" "public"."vote_session_type" NOT NULL,
    CONSTRAINT "vote_type_check" CHECK (((("candidate_id" IS NOT NULL) AND ("initiative_id" IS NULL) AND ("vote_value" IS NULL)) OR (("candidate_id" IS NULL) AND ("initiative_id" IS NOT NULL) AND ("vote_value" IS NOT NULL))))
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."votes"."vote_value" IS 'For initiatives: yes/no/abstain using vote_option enum. NULL for candidate votes.';



COMMENT ON COLUMN "public"."votes"."ip_address" IS 'IP address of voter for audit trail';



COMMENT ON COLUMN "public"."votes"."user_agent" IS 'Browser user agent for audit trail';



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



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "unique_candidate_vote" UNIQUE ("user_id", "candidate_id");



ALTER TABLE ONLY "public"."funeral_fund_interest"
    ADD CONSTRAINT "unique_email" UNIQUE ("email");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "unique_feature_role_env" UNIQUE ("feature_name", "user_role", "environment");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "unique_feature_user" UNIQUE ("feature_name", "user_id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "unique_initiative_vote" UNIQUE ("user_id", "initiative_id");



ALTER TABLE ONLY "public"."vote_confirmations"
    ADD CONSTRAINT "unique_user_election_confirmation" UNIQUE ("user_id", "election_id");



ALTER TABLE ONLY "public"."vote_sessions"
    ADD CONSTRAINT "unique_user_election_session" UNIQUE ("user_id", "election_id", "session_type");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vote_confirmations"
    ADD CONSTRAINT "vote_confirmations_confirmation_code_key" UNIQUE ("confirmation_code");



ALTER TABLE ONLY "public"."vote_confirmations"
    ADD CONSTRAINT "vote_confirmations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vote_sessions"
    ADD CONSTRAINT "vote_sessions_confirmation_code_key" UNIQUE ("confirmation_code");



ALTER TABLE ONLY "public"."vote_sessions"
    ADD CONSTRAINT "vote_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_candidate_id_key" UNIQUE ("user_id", "candidate_id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_initiative_id_key" UNIQUE ("user_id", "initiative_id");



CREATE INDEX "idx_feature_flags_environment" ON "public"."feature_flags" USING "btree" ("environment");



CREATE INDEX "idx_feature_flags_feature_name" ON "public"."feature_flags" USING "btree" ("feature_name");



CREATE INDEX "idx_feature_flags_user_id" ON "public"."feature_flags" USING "btree" ("user_id");



CREATE INDEX "idx_feature_flags_user_role" ON "public"."feature_flags" USING "btree" ("user_role");



CREATE INDEX "idx_initiatives_ballot_order" ON "public"."initiatives" USING "btree" ("election_id", "ballot_order");



CREATE INDEX "idx_initiatives_election_id" ON "public"."initiatives" USING "btree" ("election_id");



CREATE INDEX "idx_vote_confirmations_user_election" ON "public"."vote_confirmations" USING "btree" ("user_id", "election_id");



CREATE INDEX "idx_vote_sessions_type" ON "public"."vote_sessions" USING "btree" ("session_type");



CREATE INDEX "idx_vote_sessions_user_election" ON "public"."vote_sessions" USING "btree" ("user_id", "election_id");



CREATE INDEX "idx_votes_candidate_id" ON "public"."votes" USING "btree" ("candidate_id");



CREATE INDEX "idx_votes_election_id" ON "public"."votes" USING "btree" ("election_id");



CREATE INDEX "idx_votes_initiative_id" ON "public"."votes" USING "btree" ("initiative_id");



CREATE INDEX "idx_votes_session_id" ON "public"."votes" USING "btree" ("session_id");



CREATE INDEX "idx_votes_type" ON "public"."votes" USING "btree" ("vote_type");



CREATE INDEX "idx_votes_user_id" ON "public"."votes" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_initiatives_updated_at" BEFORE UPDATE ON "public"."initiatives" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



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



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."feature_flags"
    ADD CONSTRAINT "feature_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."initiatives"
    ADD CONSTRAINT "initiatives_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."vote_confirmations"
    ADD CONSTRAINT "vote_confirmations_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vote_confirmations"
    ADD CONSTRAINT "vote_confirmations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vote_sessions"
    ADD CONSTRAINT "vote_sessions_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vote_sessions"
    ADD CONSTRAINT "vote_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_initiative_id_fkey" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."vote_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow admins to delete members" ON "public"."members" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "Allow admins to insert members" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "Allow admins to update members" ON "public"."members" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."is_admin" = true)))));



CREATE POLICY "Allow public read-only access." ON "public"."prices" FOR SELECT USING (true);



CREATE POLICY "Allow public read-only access." ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "Allow read access to feature flags" ON "public"."feature_flags" FOR SELECT USING (true);



CREATE POLICY "Allow users to insert own member record" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow users to update own member record" ON "public"."members" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Anyone can view initiatives" ON "public"."initiatives" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create nominations" ON "public"."nominations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can manage initiatives" ON "public"."initiatives" TO "authenticated" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view all elections" ON "public"."elections" FOR SELECT TO "authenticated" USING (true);



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



CREATE POLICY "Restrict feature flag modifications" ON "public"."feature_flags" USING (false);



CREATE POLICY "Service role can insert audit logs" ON "public"."audit_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Users can create vote sessions during voting window" ON "public"."vote_sessions" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."user_can_vote_in_session"("auth"."uid"(), "election_id", "session_type")));



CREATE POLICY "Users can delete their own candidacy" ON "public"."candidates" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own nominations" ON "public"."nominations" FOR DELETE TO "authenticated" USING (("nominee_user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own confirmations" ON "public"."vote_confirmations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert votes with valid session" ON "public"."votes" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (("session_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."vote_sessions" "vs"
  WHERE (("vs"."id" = "votes"."session_id") AND ("vs"."user_id" = "auth"."uid"()) AND ("vs"."completed_at" IS NULL) AND "public"."user_can_vote_in_session"("auth"."uid"(), "vs"."election_id", "vs"."session_type")))))));



CREATE POLICY "Users can nominate themselves" ON "public"."candidates" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own candidacy" ON "public"."candidates" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own incomplete sessions" ON "public"."vote_sessions" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("completed_at" IS NULL))) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own nominations" ON "public"."nominations" FOR UPDATE TO "authenticated" USING (("nominee_user_id" = "auth"."uid"())) WITH CHECK (("nominee_user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own confirmations" ON "public"."vote_confirmations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own vote sessions" ON "public"."vote_sessions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own votes" ON "public"."votes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."donations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."donors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."election_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."elections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_flags" ENABLE ROW LEVEL SECURITY;


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


ALTER TABLE "public"."vote_confirmations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vote_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."prices";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."products";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."vote_confirmations";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TYPE "public"."vote_session_type" TO "authenticated";

















































































































































































GRANT ALL ON FUNCTION "public"."check_rls_enabled"("table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_rls_enabled"("table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rls_enabled"("table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_unique_constraints"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_unique_constraints"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_unique_constraints"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_duplicate_votes"() TO "anon";
GRANT ALL ON FUNCTION "public"."find_duplicate_votes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_duplicate_votes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_invalid_votes"() TO "anon";
GRANT ALL ON FUNCTION "public"."find_invalid_votes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_invalid_votes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_orphaned_votes"() TO "anon";
GRANT ALL ON FUNCTION "public"."find_orphaned_votes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_orphaned_votes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_election_vote_count"("election_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_election_vote_count"("election_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_election_vote_count"("election_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_table_constraints"("table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_table_constraints"("table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_table_constraints"("table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_feature_flags"("p_user_id" "uuid", "p_user_role" character varying, "p_environment" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_feature_flags"("p_user_id" "uuid", "p_user_role" character varying, "p_environment" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_feature_flags"("p_user_id" "uuid", "p_user_role" character varying, "p_environment" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_voting_status"("user_uuid" "uuid", "election_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_voting_status"("user_uuid" "uuid", "election_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_voting_status"("user_uuid" "uuid", "election_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_voting_security_stats"("election_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_voting_security_stats"("election_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_voting_security_stats"("election_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_vote_in_session"("user_uuid" "uuid", "election_uuid" "uuid", "session_type_param" "public"."vote_session_type") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_vote_in_session"("user_uuid" "uuid", "election_uuid" "uuid", "session_type_param" "public"."vote_session_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_vote_in_session"("user_uuid" "uuid", "election_uuid" "uuid", "session_type_param" "public"."vote_session_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_active_membership"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_active_membership"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_active_membership"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_completed_vote_session"("user_uuid" "uuid", "election_uuid" "uuid", "session_type_param" "public"."vote_session_type") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_completed_vote_session"("user_uuid" "uuid", "election_uuid" "uuid", "session_type_param" "public"."vote_session_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_completed_vote_session"("user_uuid" "uuid", "election_uuid" "uuid", "session_type_param" "public"."vote_session_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_voted_in_election"("election_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_voted_in_election"("election_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_voted_in_election"("election_uuid" "uuid", "user_uuid" "uuid") TO "service_role";


















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



GRANT ALL ON TABLE "public"."feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_flags" TO "service_role";



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



GRANT ALL ON TABLE "public"."vote_confirmations" TO "anon";
GRANT ALL ON TABLE "public"."vote_confirmations" TO "authenticated";
GRANT ALL ON TABLE "public"."vote_confirmations" TO "service_role";



GRANT ALL ON TABLE "public"."vote_sessions" TO "anon";
GRANT ALL ON TABLE "public"."vote_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."vote_sessions" TO "service_role";



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
