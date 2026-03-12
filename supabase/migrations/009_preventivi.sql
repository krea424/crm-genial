-- Preventivi con versioning e calcoli fiscali
create type preventivo_status as enum ('bozza', 'inviato', 'accettato', 'rifiutato', 'scaduto');

create table preventivi (
  id                 uuid primary key default gen_random_uuid(),
  pratica_id         uuid not null references pratiche(id) on delete cascade,
  version_number     integer not null default 1,
  status             preventivo_status not null default 'bozza',
  honorarium         numeric(10,2) not null default 0,  -- onorario professionale
  expenses           numeric(10,2) not null default 0,  -- rimborso spese
  vat_rate           numeric(4,2) not null default 0.22, -- 22% standard
  apply_withholding  boolean not null default true,       -- ritenuta d'acconto
  -- Campi calcolati (calcolati server-side per consistenza)
  taxable_amount     numeric(10,2) not null,
  vat_amount         numeric(10,2) not null,
  withholding_tax    numeric(10,2) not null,
  total_gross        numeric(10,2) not null,
  total_net          numeric(10,2) not null,
  valid_until        date,
  sent_at            timestamptz,
  accepted_at        timestamptz,
  notes              text,
  created_by         uuid not null references profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (pratica_id, version_number)
);

create trigger preventivi_updated_at
  before update on preventivi
  for each row execute procedure update_updated_at();

create index preventivi_pratica_idx on preventivi (pratica_id);
create index preventivi_status_idx on preventivi (status);

-- RLS
alter table preventivi enable row level security;

create policy "Autenticati vedono i preventivi"
  on preventivi for select to authenticated using (true);

create policy "Titolare e amministrativa gestiscono preventivi"
  on preventivi for all to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('titolare', 'amministrativa', 'admin')
    )
  );
