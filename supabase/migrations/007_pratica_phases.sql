-- Storico fasi: ogni riga = una fase completata o in corso
create table pratica_phases (
  id              uuid primary key default uuid_generate_v4(),
  pratica_id      uuid not null references pratiche(id) on delete cascade,
  phase_code      text not null,
  phase_label     text not null,
  responsible_id  uuid not null references profiles(id),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  duration_hours  numeric(10,2),   -- calcolato alla chiusura
  sla_hours       integer not null default 48,
  sla_breached    boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now()
);

-- Calcola durata alla chiusura fase
create or replace function calculate_phase_duration()
returns trigger language plpgsql as $$
begin
  if new.ended_at is not null and old.ended_at is null then
    new.duration_hours := extract(epoch from (new.ended_at - new.started_at)) / 3600;
    new.sla_breached := new.duration_hours > new.sla_hours;
  end if;
  return new;
end;
$$;

create trigger pratica_phases_duration
  before update on pratica_phases
  for each row execute procedure calculate_phase_duration();

create index pratica_phases_pratica_idx on pratica_phases (pratica_id);
create index pratica_phases_responsible_idx on pratica_phases (responsible_id);

-- RLS
alter table pratica_phases enable row level security;

create policy "Tutti gli autenticati vedono le fasi"
  on pratica_phases for select to authenticated using (true);

create policy "Sistema (service role) gestisce le fasi"
  on pratica_phases for all to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('titolare', 'admin')
    )
  );
