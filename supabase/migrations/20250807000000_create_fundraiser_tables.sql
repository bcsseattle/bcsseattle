-- Create fundraiser status enum
create type fundraiser_status as enum ('draft', 'active', 'completed', 'cancelled');

-- Create fundraiser table
create table fundraisers (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    target_amount decimal(10,2) not null,
    current_amount decimal(10,2) default 0,
    status fundraiser_status default 'draft',
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_by uuid references auth.users(id) not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create fundraiser updates table
create table fundraiser_updates (
    id uuid default gen_random_uuid() primary key,
    fundraiser_id uuid references fundraisers(id) on delete cascade,
    message text not null,
    created_by uuid references auth.users(id) not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create fundraiser donations table
create table fundraiser_donations (
    id uuid default gen_random_uuid() primary key,
    fundraiser_id uuid references fundraisers(id) on delete cascade,
    amount decimal(10,2) not null,
    donor_id uuid references auth.users(id),
    donor_name text,
    donor_email text,
    is_anonymous boolean default false,
    message text,
    stripe_payment_intent_id text,
    created_at timestamp with time zone default now()
);

-- Add RLS policies
alter table fundraisers enable row level security;
alter table fundraiser_updates enable row level security;
alter table fundraiser_donations enable row level security;

-- Fundraisers policies
create policy "Fundraisers are viewable by everyone"
    on fundraisers for select
    using (true);

create policy "Fundraisers can be created by authenticated users"
    on fundraisers for insert
    with check (auth.uid() = created_by);

create policy "Fundraisers can be updated by creators"
    on fundraisers for update
    using (auth.uid() = created_by);

-- Updates policies
create policy "Updates are viewable by everyone"
    on fundraiser_updates for select
    using (true);

create policy "Updates can be created by fundraiser creators"
    on fundraiser_updates for insert
    with check (
        auth.uid() in (
            select created_by from fundraisers where id = fundraiser_id
        )
    );

create policy "Updates can be modified by creators"
    on fundraiser_updates for update
    using (auth.uid() = created_by);

-- Donations policies
create policy "Donations are viewable by everyone"
    on fundraiser_donations for select
    using (true);

create policy "Donations can be created by authenticated users"
    on fundraiser_donations for insert
    with check (
        auth.uid() = donor_id or donor_id is null
    );

-- Add triggers to update fundraiser amount
create or replace function update_fundraiser_amount()
returns trigger as $$
begin
    update fundraisers
    set current_amount = (
        select coalesce(sum(amount), 0)
        from fundraiser_donations
        where fundraiser_id = new.fundraiser_id
    )
    where id = new.fundraiser_id;
    return new;
end;
$$ language plpgsql;

create trigger update_fundraiser_amount_after_donation
    after insert on fundraiser_donations
    for each row
    execute function update_fundraiser_amount();
