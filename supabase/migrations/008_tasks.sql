-- Task operativi: micro-attività sotto ogni fase
create table tasks (
  id               uuid primary key default uuid_generate_v4(),
  pratica_id       uuid not null references pratiche(id) on delete cascade,
  phase_code       text not null,
  title            text not null,
  description      text,
  assigned_to      uuid references profiles(id),
  estimated_hours  numeric(5,1),
  completed        boolean not null default false,
  completed_at     timestamptz,
  created_by       uuid not null references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger tasks_updated_at
  before update on tasks
  for each row execute procedure update_updated_at();

create index tasks_pratica_idx on tasks (pratica_id);
create index tasks_assigned_idx on tasks (assigned_to);

-- RLS
alter table tasks enable row level security;

create policy "Autenticati vedono i task"
  on tasks for select to authenticated using (true);

create policy "Assegnato e admin gestiscono i task"
  on tasks for all to authenticated
  using (
    assigned_to = auth.uid() or
    created_by = auth.uid() or
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('titolare', 'admin', 'amministrativa')
    )
  );
