create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student', 'teacher')),
  daily_goal integer not null default 10 check (daily_goal between 5 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  lesson_id integer,
  seconds integer not null check (seconds > 0),
  cpm integer not null check (cpm >= 0),
  accuracy integer not null check (accuracy between 0 and 100),
  errors integer not null default 0 check (errors >= 0),
  mistake_keys jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  join_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  lesson_id integer not null check (lesson_id between 1 and 20),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists results_user_created_idx on public.results(user_id, created_at desc);
create index if not exists class_members_user_idx on public.class_members(user_id);
create index if not exists assignments_class_idx on public.assignments(class_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.results enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;

create or replace function public.is_class_teacher(target_class uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from classes where id = target_class and teacher_id = auth.uid()) $$;

create or replace function public.is_class_member(target_class uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from class_members where class_id = target_class and user_id = auth.uid()) $$;

create or replace function public.shares_teacher_class(target_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from class_members cm join classes c on c.id = cm.class_id
    where cm.user_id = target_user and c.teacher_id = auth.uid()
  )
$$;

drop policy if exists "profiles own or teacher read" on public.profiles;
create policy "profiles own or teacher read" on public.profiles for select
using (id = auth.uid() or public.shares_teacher_class(id));
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "results own or teacher read" on public.results;
create policy "results own or teacher read" on public.results for select
using (user_id = auth.uid() or public.shares_teacher_class(user_id));
drop policy if exists "results own insert" on public.results;
create policy "results own insert" on public.results for insert with check (user_id = auth.uid());
drop policy if exists "results own delete" on public.results;
create policy "results own delete" on public.results for delete using (user_id = auth.uid());

drop policy if exists "classes visible to teacher and members" on public.classes;
create policy "classes visible to teacher and members" on public.classes for select
using (teacher_id = auth.uid() or public.is_class_member(id));
drop policy if exists "teachers manage classes" on public.classes;
create policy "teachers manage classes" on public.classes for all
using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "members visible to self and teacher" on public.class_members;
create policy "members visible to self and teacher" on public.class_members for select
using (user_id = auth.uid() or public.is_class_teacher(class_id));
drop policy if exists "members leave class" on public.class_members;
create policy "members leave class" on public.class_members for delete using (user_id = auth.uid() or public.is_class_teacher(class_id));

drop policy if exists "assignments visible in class" on public.assignments;
create policy "assignments visible in class" on public.assignments for select
using (teacher_id = auth.uid() or public.is_class_member(class_id));
drop policy if exists "teachers manage assignments" on public.assignments;
create policy "teachers manage assignments" on public.assignments for all
using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_class_teacher(class_id));

create or replace function public.join_class(invite_code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare target_id uuid;
begin
  if auth.uid() is null then raise exception 'Алдымен аккаунтқа кіріңіз'; end if;
  select id into target_id from classes where upper(join_code) = upper(trim(invite_code));
  if target_id is null then raise exception 'Сынып коды табылмады'; end if;
  insert into class_members(class_id, user_id) values(target_id, auth.uid()) on conflict do nothing;
  return target_id;
end;
$$;
grant execute on function public.join_class(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles(id, full_name) values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
