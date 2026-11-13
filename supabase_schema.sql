-- Run this script in Supabase Dashboard > SQL Editor
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  student_code text not null unique,
  class_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('Present','Absent','Late','Excused')),
  created_at timestamptz not null default now(),
  unique(student_id, attendance_date)
);
alter table public.students enable row level security;
alter table public.attendance enable row level security;
-- Authenticated users can use the app tables. Create user accounts in Supabase Auth.
create policy "authenticated manage students" on public.students
for all to authenticated using (true) with check (true);
create policy "authenticated manage attendance" on public.attendance
for all to authenticated using (true) with check (true);