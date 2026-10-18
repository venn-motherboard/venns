create table if not exists students (
  card_uid text primary key,
  student_name text not null,
  student_number text not null unique
);

create table if not exists attendance_logs (
  id uuid primary key default gen_random_uuid(),
  card_uid text not null references students(card_uid) on update cascade on delete cascade,
  timestamp timestamptz not null default now()
);
create index if not exists attendance_logs_ts_idx on attendance_logs (timestamp desc);

-- Only signed-in professors can read/write. Create professor accounts manually in
-- Supabase Dashboard > Authentication > Users, and turn OFF "Allow new users to sign up".
alter table students enable row level security;
alter table attendance_logs enable row level security;
create policy "professors manage students" on students for all to authenticated using (true) with check (true);
create policy "professors manage logs" on attendance_logs for all to authenticated using (true) with check (true);
