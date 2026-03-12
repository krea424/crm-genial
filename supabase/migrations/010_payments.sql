-- Pagamenti multi-step per pratica
create type payment_status as enum ('atteso', 'ricevuto', 'in_ritardo');

create table payments (
  id              uuid primary key default gen_random_uuid(),
  pratica_id      uuid not null references pratiche(id) on delete cascade,
  preventivo_id   uuid references preventivi(id),
  step_label      text not null,       -- es. "Acconto 30%", "Saldo 70%"
  amount          numeric(10,2) not null,
  due_date        date,
  received_at     timestamptz,
  status          payment_status not null default 'atteso',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger payments_updated_at
  before update on payments
  for each row execute procedure update_updated_at();

create index payments_pratica_idx on payments (pratica_id);
create index payments_status_idx on payments (status);

-- RLS
alter table payments enable row level security;

create policy "Autenticati vedono i pagamenti"
  on payments for select to authenticated using (true);

create policy "Amministrativa e titolare gestiscono pagamenti"
  on payments for all to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('titolare', 'amministrativa', 'admin')
    )
  );
