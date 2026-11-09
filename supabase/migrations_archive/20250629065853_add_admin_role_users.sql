alter table
    if exists public.users
add
    column if not exists is_admin boolean default false not null;