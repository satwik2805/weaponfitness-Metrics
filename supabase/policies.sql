-- =============================================================================
-- Row-Level Security — Milestone 0 baseline (2026-06-12)
--
-- Stance: anon gets NOTHING. Every table requires an authenticated Supabase
-- JWT. profiles has precise per-row rules + an anti-escalation trigger; the
-- remaining domain tables are authenticated-only for M0, with per-role
-- tightening scheduled in M1 as each screen's data path moves through the
-- FastAPI layer (see docs/ROADMAP.md).
--
-- Source of truth: this file. Re-runnable (drop/create) by design.
-- =============================================================================

-- ---------- helper: the caller's role, without recursive RLS ----------
create or replace function public.user_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role::text from profiles where id = auth.uid()
$$;

revoke all on function public.user_role() from anon;
grant execute on function public.user_role() to authenticated;

-- ---------- anti-escalation trigger on profiles ----------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(public.user_role(), '') not in ('Owner', 'Admin') then
      raise exception 'Only owners and admins can change roles';
    end if;
    if new.role::text = 'Owner' and public.user_role() <> 'Owner' then
      raise exception 'Only an owner can grant the Owner role';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ---------- enable RLS everywhere (anon: zero policies = zero access) ----------
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ---------- profiles: precise rules ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.user_role() in ('Owner', 'Admin', 'Receptionist', 'Trainer')
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    or public.user_role() in ('Owner', 'Admin', 'Receptionist')
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or public.user_role() in ('Owner', 'Admin')
  )
  with check (
    id = auth.uid()
    or public.user_role() in ('Owner', 'Admin')
  );

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using (public.user_role() in ('Owner', 'Admin'));

-- ---------- all other domain tables: authenticated-only (M0 stance) ----------
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in ('profiles', 'alembic_version')
  loop
    execute format('drop policy if exists %I_authenticated_all on public.%I', t.tablename, t.tablename);
    execute format(
      'create policy %I_authenticated_all on public.%I for all to authenticated using (true) with check (true)',
      t.tablename, t.tablename
    );
  end loop;
end $$;

-- alembic_version: RLS enabled, no policies — invisible to all API roles.
