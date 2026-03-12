-- Audit log immutabile: append-only, NESSUN UPDATE o DELETE permesso
create table audit_log (
  id           uuid primary key default uuid_generate_v4(),
  entity_type  text not null,  -- es. 'pratica', 'preventivo', 'pagamento'
  entity_id    uuid not null,
  action       text not null,  -- es. 'created', 'status_changed', 'handoff', 'drive_folder_created'
  actor_id     uuid references profiles(id),
  old_data     jsonb,
  new_data     jsonb,
  metadata     jsonb,          -- dati aggiuntivi context-specific
  created_at   timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity_type, entity_id);
create index audit_log_actor_idx on audit_log (actor_id);
create index audit_log_created_idx on audit_log (created_at desc);

-- RLS
alter table audit_log enable row level security;

-- Solo titolare e admin leggono l'audit log
create policy "Titolare e admin leggono audit log"
  on audit_log for select to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('titolare', 'admin')
    )
  );

-- Tutti possono inserire (necessario per Edge Functions con anon key)
create policy "Inserimento audit log sempre permesso"
  on audit_log for insert to authenticated
  with check (true);

-- CRITICO: nessun UPDATE o DELETE sull'audit log (enforce tramite policy vuote)
-- Nota: il service role bypassa RLS, quindi il controllo è a livello applicativo
-- nelle Edge Functions che usano il service role.
