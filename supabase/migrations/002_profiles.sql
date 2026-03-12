-- Profili utenti estesi (estende auth.users di Supabase)
create type user_role as enum ('amministrativa', 'tecnico', 'titolare', 'admin');

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  role          user_role not null default 'tecnico',
  email         text not null,
  weekly_hours  integer not null default 40,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Crea profilo automaticamente alla registrazione utente
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Aggiorna updated_at automaticamente
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();

-- RLS
alter table profiles enable row level security;

create policy "Tutti gli utenti autenticati vedono i profili"
  on profiles for select
  to authenticated
  using (true);

create policy "Utenti modificano solo il proprio profilo"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Admin gestisce tutti i profili"
  on profiles for all
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
