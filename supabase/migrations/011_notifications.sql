-- Notifiche strutturate: in-app e email
create type notification_type as enum (
  'handoff',
  'sla_warning',
  'sla_breach',
  'billing_ready',
  'lead_pending',
  'payment_overdue',
  'preventivo_accettato'
);

create table notifications (
  id            uuid primary key default uuid_generate_v4(),
  recipient_id  uuid not null references profiles(id) on delete cascade,
  type          notification_type not null,
  title         text not null,
  body          text not null,
  action_url    text,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index notifications_recipient_idx on notifications (recipient_id, read);
create index notifications_created_idx on notifications (created_at desc);

-- RLS: ogni utente vede solo le proprie notifiche
alter table notifications enable row level security;

create policy "Utenti vedono solo proprie notifiche"
  on notifications for select to authenticated
  using (recipient_id = auth.uid());

create policy "Utenti leggono le proprie notifiche"
  on notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Sistema (service role) inserisce notifiche per qualsiasi utente
create policy "Service role inserisce notifiche"
  on notifications for insert to authenticated
  with check (true);
