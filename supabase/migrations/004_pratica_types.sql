-- Tipi di pratica configurabili (DIA, DOCFA, Permesso Costruire, ecc.)
create table pratica_types (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,  -- es. 'DOCFA', 'DIA', 'PDC'
  label       text not null,         -- es. 'Accatastamento DOCFA'
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- RLS
alter table pratica_types enable row level security;

create policy "Tutti gli autenticati vedono i tipi pratica"
  on pratica_types for select to authenticated using (true);

create policy "Solo admin e titolare gestiscono i tipi"
  on pratica_types for all to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('titolare', 'admin')
    )
  );
