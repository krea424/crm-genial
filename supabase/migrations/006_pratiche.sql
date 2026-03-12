-- Pratiche: entità centrale del sistema
create type pratica_status as enum ('lead', 'attiva', 'sospesa', 'completata', 'annullata');

create table pratiche (
  id                   uuid primary key default gen_random_uuid(),
  practice_code        text unique,    -- generato dal trigger: YYYY-NNN
  pratica_type_id      uuid not null references pratica_types(id),
  client_id            uuid not null references clients(id),
  status               pratica_status not null default 'lead',
  title                text not null,
  site_address         text,
  site_city            text,
  current_phase_code   text,
  current_responsible  uuid references profiles(id),
  drive_folder_id      text,
  drive_folder_url     text,
  opened_at            timestamptz not null default now(),
  completed_at         timestamptz,
  notes                text,
  created_by           uuid not null references profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Indice per ricerca full-text
create index pratiche_code_idx on pratiche (practice_code);
create index pratiche_status_idx on pratiche (status);
create index pratiche_responsible_idx on pratiche (current_responsible);
create index pratiche_client_idx on pratiche (client_id);

create trigger pratiche_updated_at
  before update on pratiche
  for each row execute procedure update_updated_at();

-- RLS
alter table pratiche enable row level security;

create policy "Tutti gli autenticati vedono le pratiche"
  on pratiche for select to authenticated using (true);

create policy "Amministrativa crea pratiche"
  on pratiche for insert to authenticated
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('amministrativa', 'titolare', 'admin')
    )
  );

create policy "Responsabile e admin modificano pratica"
  on pratiche for update to authenticated
  using (
    current_responsible = auth.uid() or
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('titolare', 'admin', 'amministrativa')
    )
  );
