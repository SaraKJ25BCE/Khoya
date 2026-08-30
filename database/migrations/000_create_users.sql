-- Users table for storing authenticated user profiles from Google OAuth
-- and other OAuth providers.

create table if not exists users (
    id                uuid primary key default gen_random_uuid(),

    -- Google OAuth profile fields
    google_id         text unique not null,
    email             text unique not null,
    email_verified    boolean default false,

    name              text,
    given_name        text,
    family_name       text,
    picture           text,             -- avatar picture URL
    locale            text,

    -- timestamps
    last_login_at     timestamptz default now(),
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists idx_users_google_id on users (google_id);
create index if not exists idx_users_email on users (email);
