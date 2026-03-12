-- Template workflow: fasi configurabili per tipo di pratica
create table workflow_templates (
  id               uuid primary key default gen_random_uuid(),
  pratica_type_id  uuid not null references pratica_types(id) on delete cascade,
  phase_order      integer not null,
  phase_code       text not null,    -- es. 'SOPRALLUOGO', 'PRODUZIONE'
  phase_label      text not null,    -- es. 'Sopralluogo', 'Produzione elaborati'
  default_role     user_role not null,
  sla_hours        integer not null default 48,  -- SLA in ore lavorative
  required_docs    text[] not null default '{}', -- pattern nomi file obbligatori
  is_final         boolean not null default false,
  created_at       timestamptz not null default now(),

  unique (pratica_type_id, phase_order),
  unique (pratica_type_id, phase_code)
);

-- RLS
alter table workflow_templates enable row level security;

create policy "Tutti gli autenticati vedono i template workflow"
  on workflow_templates for select to authenticated using (true);

create policy "Solo titolare e admin gestiscono i template"
  on workflow_templates for all to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('titolare', 'admin')
    )
  );
