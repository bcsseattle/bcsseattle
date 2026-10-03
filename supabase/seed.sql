-- First truncate tables with foreign key dependencies
TRUNCATE TABLE public.subscriptions CASCADE;

TRUNCATE TABLE public.members CASCADE;

-- Now we can safely truncate products and prices
TRUNCATE TABLE public.prices CASCADE;

TRUNCATE TABLE public.products CASCADE;

-- create function public.handle_new_user() returns trigger as $$
-- begin
-- insert into
--     public.users (id, full_name, avatar_url)
-- values
--     (
--         new.id,
--         new.raw_user_meta_data ->> 'full_name',
--         new.raw_user_meta_data ->> 'avatar_url'
--     );

-- return new;

-- end;
-- $$ language plpgsql security definer;

create trigger on_auth_user_created
after
insert
    on auth.users for each row execute procedure public.handle_new_user();

-- Insert products
INSERT INTO
    "public"."products" (
        "id",
        "active",
        "name",
        "description",
        "image",
        "metadata"
    )
VALUES
    (
        'prod_RSZNLgej7oSpZs',
        'true',
        'Membership Fee',
        'A one-time fee to become a member of Baloch Community Services of Seattle',
        null,
        '{"type": "membership"}'
    ),
    (
        'prod_RSZPR3iDRVfgRb',
        'true',
        'Contribution Plans',
        'Contribution plan for BCS Seattle',
        null,
        '{"type": "contribution"}'
    ),
    (
        'prod_RSZRySmbYAWS3G',
        'true',
        'BCS Donation',
        'Contribute to support additional work of BCS Seattle',
        null,
        '{"type": "donation"}'
    );

-- Insert prices
INSERT INTO
    "public"."prices" (
        "id",
        "product_id",
        "active",
        "description",
        "unit_amount",
        "currency",
        "type",
        "interval",
        "interval_count",
        "trial_period_days",
        "metadata"
    )
VALUES
    (
        'price_1QZeEOFMlzXQHtL1E8wf8y0S',
        'prod_RSZNLgej7oSpZs',
        'true',
        null,
        '2000',
        'usd',
        'one_time',
        null,
        null,
        '0',
        null
    ),
    (
        'price_1QZeH0FMlzXQHtL1PY8GrcIP',
        'prod_RSZPR3iDRVfgRb',
        'true',
        null,
        '6000',
        'usd',
        'recurring',
        'year',
        '1',
        '0',
        '{"type": "contribution"}'
    ),
    (
        'price_1QZeH0FMlzXQHtL1ftcL6K6g',
        'prod_RSZPR3iDRVfgRb',
        'true',
        null,
        '500',
        'usd',
        'recurring',
        'month',
        '1',
        '0',
        '{"type": "contribution"}'
    ),
    (
        'price_1QZeIaFMlzXQHtL1HTbktSmk',
        'prod_RSZRySmbYAWS3G',
        'true',
        null,
        null,
        'usd',
        'one_time',
        null,
        null,
        '0',
        null
    ),
    (
        'price_1PSpHlFMlzXQHtL1KoMwxDKE',
        'prod_RSZPR3iDRVfgRb',
        'false',
        null,
        '6000',
        'usd',
        'one_time',
        null,
        null,
        '0',
        null
    ),
    (
        'price_1QZeIaFMlzXQHtL1wlZWlmRm',
        'prod_RSZRySmbYAWS3G',
        'true',
        null,
        '10000',
        'usd',
        'recurring',
        'month',
        '1',
        '0',
        null
    ),
    (
        'price_1QZeIaFMlzXQHtL1ZHh3iTGR',
        'prod_RSZRySmbYAWS3G',
        'true',
        null,
        '10000',
        'usd',
        'recurring',
        'year',
        '1',
        '0',
        null
    ),
    (
        'price_1QZeH0FMlzXQHtL1kGTqnRTZ',
        'prod_RSZPR3iDRVfgRb',
        'true',
        null,
        '3000',
        'usd',
        'recurring',
        'month',
        '6',
        '0',
        '{"type": "contribution"}'
    );

INSERT INTO
    "public"."election_positions" (
        "id",
        "election_type",
        "position",
        "display_order",
        "description",
        "created_at"
    )
VALUES
    (
        '1b733041-eb2d-4d34-a9f0-e47f769b5d3a',
        'leadership',
        'President',
        '1',
        'Chief executive officer who leads the organization and represents it publicly',
        '2025-06-17 18:43:03.357228+00'
    ),
    (
        '25ba781a-10a5-42f8-9da2-5925e1739f58',
        'leadership',
        'Secretary',
        '6',
        'Records meeting minutes, manages correspondence, and maintains official documents',
        '2025-06-17 18:43:03.357228+00'
    ),
    (
        '36c24ddc-8633-485f-88aa-a09fb1a0e664',
        'leadership',
        'Vice President of Community Outreach and Engagement',
        '2',
        'Leads community relationship-building, outreach events, and communications.',
        '2025-06-17 18:43:03.357228+00'
    ),
    (
        '4458c9cd-bf55-4fdf-841d-f7835ab34989',
        'leadership',
        'Vice President of Youth and Education Initiatives',
        '5',
        'Designs and leads programs for Baloch youth, including education support and mentoring.',
        '2025-06-17 18:43:03.357228+00'
    ),
    (
        '75644c53-538d-410c-b298-ab24871542ce',
        'leadership',
        'Vice President of Programs and Operations',
        '3',
        'Oversees funeral services, emergency fund logistics, and day-to-day service delivery.',
        '2025-06-17 18:43:03.357228+00'
    ),
    (
        'af889d7b-c9da-4468-bb57-b3dbab1a1fa3',
        'leadership',
        'Treasurer',
        '7',
        'Manages organizational finances, budget, and financial reporting',
        '2025-06-17 18:43:03.357228+00'
    ),
    (
        'd601336f-4fdb-4eb5-b55d-3a072eb6c73b',
        'leadership',
        'Vice President of Finance and Development',
        '4',
        'Manages budgeting, contributions, and fundraising strategy.',
        '2025-06-17 18:43:03.357228+00'
    );

INSERT INTO
    "public"."elections" (
        "id",
        "title",
        "description",
        "type",
        "start_date",
        "end_date",
        "nomination_start",
        "nomination_end",
        "is_active",
        "settings",
        "created_at",
        "updated_at",
        "created_by",
        "status"
    )
VALUES
    (
        '27dfac0d-b491-40c4-a0bd-87f62a2cce28',
        'BCS Seattle Annual Elections - 2025',
        'Vote for your 2025 executive leadership team.',
        'leadership',
        '2025-06-21 19:30:00+00',
        '2025-06-21 21:30:00+00',
        '2025-06-17 18:00:00+00',
        '2025-06-21 16:00:00+00',
        'true',
        '{}',
        '2025-06-17 18:44:55.80366+00',
        '2025-06-17 18:44:55.80366+00',
        null,
        'nominations_open'
    );

-- INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "confirmed_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES ('00000000-0000-0000-0000-000000000000', '460454b3-f200-44c2-94bb-33a99fb0c72d', 'authenticated', 'authenticated', 'info@bcsseattle.org', '$2a$10$.2MeUFPInsE7v4Bahs5zS.aK/iLz5tfeTLNFxRpNZmTI8vrGxs8Ia', '2025-06-19 21:27:32.521315+00', null, '', null, '', null, '', '', null, '2025-06-19 21:27:32.525265+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "460454b3-f200-44c2-94bb-33a99fb0c72d", "email": "info@bcsseattle.org", "email_verified": true, "phone_verified": false}', null, '2025-06-19 21:27:32.514961+00', '2025-06-19 21:27:32.526313+00', null, null, '', '', null, '2025-06-19 21:27:32.521315+00', '', '0', null, '', null, 'false', null, 'false');
-- INSERT INTO "public"."users" ("id", "full_name", "avatar_url", "billing_address", "payment_method") VALUES ('460454b3-f200-44c2-94bb-33a99fb0c72d', null, null, null, null);
-- INSERT INTO "public"."customers" ("id", "stripe_customer_id") VALUES ('460454b3-f200-44c2-94bb-33a99fb0c72d', 'cus_SWtn7Dfj1DqqUr');
-- INSERT INTO "public"."members" ("created_at", "fullName", "phone", "address", "address2", "city", "state", "zip", "user_id", "stripe_customer_id", "subscription_id", "status", "membershipType", "totalMembersInFamily", "terms", "id", "isApproved") VALUES ('2025-06-19 21:27:42.450487+00', 'Test User3', '1232525254', '123 Test Address', 'Apt 502', 'Seattle', 'WA', '98087', '460454b3-f200-44c2-94bb-33a99fb0c72d', '460454b3-f200-44c2-94bb-33a99fb0c72d', 'sub_1Rbq0HFMlzXQHtL1UBDgRs4r', 'active', 'Individual', '1', 'true', '75b96b02-f525-4b3b-a479-41a2b63448b7', 'true');
-- INSERT INTO "public"."candidates" ("id", "user_id", "full_name", "position", "bio", "photo_url", "election_id", "created_at", "manifesto") VALUES ('22479c14-293a-4e20-9b55-d1ed3fd341d7', '460454b3-f200-44c2-94bb-33a99fb0c72d', 'Test User3', 'President', '', '', '27dfac0d-b491-40c4-a0bd-87f62a2cce28', '2025-06-19 21:29:30.656149+00', '');