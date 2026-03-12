-- Clienti: privati, aziende, enti pubblici
create type client_type as enum ('privato', 'azienda', 'ente_pubblico');

create table clients (
  id            uuid primary key default uuid_generate_v4(),
  client_type   client_type not null default 'privato',
  first_name    text,
  last_name     text,
  company_name  text,
  tax_code      text,   -- codice fiscale privato
  vat_number    text,   -- P.IVA azienda/ente
  email         text,
  phone         text,
  address       text,
  city          text,
  notes         text,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Almeno uno tra nome e ragione sociale obbligatorio
  constraint clients_identity_check check (
    (client_type = 'privato' and last_name is not null) or
    (client_type in ('azienda', 'ente_pubblico') and company_name is not null)
  )
);

-- Indice GIN per fuzzy matching (pg_trgm)
create index clients_name_gin_idx on clients
  using gin (
    (coalesce(lower(last_name), '') || ' ' || coalesce(lower(first_name), '') || ' ' || coalesce(lower(company_name), ''))
    gin_trgm_ops
  );

create index clients_vat_idx on clients (vat_number) where vat_number is not null;
create index clients_tax_code_idx on clients (tax_code) where tax_code is not null;

create trigger clients_updated_at
  before update on clients
  for each row execute procedure update_updated_at();

-- RLS
alter table clients enable row level security;

create policy "Utenti autenticati vedono tutti i clienti"
  on clients for select to authenticated using (true);

create policy "Amministrativa e titolare creano clienti"
  on clients for insert to authenticated
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('amministrativa', 'titolare', 'admin')
    )
  );

create policy "Amministrativa e titolare modificano clienti"
  on clients for update to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('amministrativa', 'titolare', 'admin')
    )
  );
