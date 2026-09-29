-- =====================================================
-- EduPath – Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- =====================================================

-- Enable pgcrypto for uuid generation
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────
-- 1. PROFILES (one per user/phone - ONE PHONE NUMBER = ONE PERSISTENT ACCOUNT)
-- ────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique not null references auth.users(id) on delete cascade,
  display_name    text,
  phone           text unique,
  dob             text,
  email           text,
  school          text,
  passing_year    text,
  category        text,
  preferred_district text,
  preferred_branches text[],
  budget          integer,
  language        text default 'English',
  is_government_school_quota boolean default false,
  is_first_graduate boolean default false,
  special_reservation text,
  profile_complete boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create unique index if not exists profiles_phone_unique_idx on profiles(phone) where phone is not null;

alter table profiles enable row level security;
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"   on profiles for select using (auth.uid() = user_id or true);
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = user_id or true);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = user_id or true);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

-- ────────────────────────────────────────────────────
-- 2. STUDENT ACADEMIC RECORDS
-- ────────────────────────────────────────────────────
create table if not exists student_academic_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  maths         numeric(5,2),
  physics       numeric(5,2),
  chemistry     numeric(5,2),
  cutoff        numeric(5,2),
  category      text,
  source        text default 'manual',  -- 'manual' | 'ocr' | 'confirmed'
  academic_year text,
  confirmed     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table student_academic_records enable row level security;
drop policy if exists "Users can manage own records" on student_academic_records;
create policy "Users can manage own records" on student_academic_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists sar_updated_at on student_academic_records;
create trigger sar_updated_at before update on student_academic_records
  for each row execute function update_updated_at();

-- ────────────────────────────────────────────────────
-- 3. SAVED COLLEGES
-- ────────────────────────────────────────────────────
create table if not exists saved_colleges (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  college_code  text not null,
  college_name  text not null,
  branch_code   text not null,
  branch_name   text not null,
  district      text,
  college_type  text,
  cutoff_2023   numeric(5,2),
  fees          integer,
  created_at    timestamptz default now(),
  unique(user_id, college_code, branch_code)
);

alter table saved_colleges enable row level security;
drop policy if exists "Users can manage own saved colleges" on saved_colleges;
create policy "Users can manage own saved colleges" on saved_colleges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────
-- 4. COUNSELLING SESSIONS (chat history)
-- ────────────────────────────────────────────────────
create table if not exists counselling_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  sources    jsonb,
  created_at timestamptz default now()
);

alter table counselling_sessions enable row level security;
drop policy if exists "Users can manage own sessions" on counselling_sessions;
create policy "Users can manage own sessions" on counselling_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists counselling_sessions_user_id_idx on counselling_sessions(user_id, created_at);

-- ────────────────────────────────────────────────────
-- 5. COUNSELLING REPORTS
-- ────────────────────────────────────────────────────
create table if not exists counselling_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  report_data  jsonb not null,
  generated_at timestamptz default now()
);

alter table counselling_reports enable row level security;
drop policy if exists "Users can manage own reports" on counselling_reports;
create policy "Users can manage own reports" on counselling_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────
-- DONE
-- =====================================================
-- After running this migration:
-- 1. In Supabase Dashboard → Authentication → Providers
--    Enable "Phone" provider
-- 2. Configure your SMS provider (Twilio/MessageBird)
--    OR use the built-in test OTP for development:
--    Dashboard → Authentication → Phone → "Test phone numbers"
--    Add: +919876543210 with OTP: 123456
-- =====================================================
