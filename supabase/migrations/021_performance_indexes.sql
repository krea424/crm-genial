-- Migrazione 021: indici per ottimizzare le query più frequenti

-- Pratiche: filtri principali
create index if not exists idx_pratiche_status on pratiche (status);
create index if not exists idx_pratiche_current_responsible on pratiche (current_responsible) where status = 'attiva';
create index if not exists idx_pratiche_created_at_desc on pratiche (created_at desc);
create index if not exists idx_pratiche_client_id on pratiche (client_id);
create index if not exists idx_pratiche_type_id on pratiche (pratica_type_id);

-- Pratica phases: query fasi aperte per SLA monitor
create index if not exists idx_pratica_phases_open on pratica_phases (pratica_id, phase_code)
  where ended_at is null;
create index if not exists idx_pratica_phases_pratica_id on pratica_phases (pratica_id);
create index if not exists idx_pratica_phases_sla_breach on pratica_phases (sla_breached, ended_at)
  where sla_breached = true;

-- Preventivi: query economiche
create index if not exists idx_preventivi_pratica_id on preventivi (pratica_id);
create index if not exists idx_preventivi_status on preventivi (status, valid_until);

-- Payments: query piano pagamenti e ritardi
create index if not exists idx_payments_pratica_id on payments (pratica_id);
create index if not exists idx_payments_status_due on payments (status, due_date)
  where status = 'atteso';

-- Notifications: query campana notifiche (query più frequente per ogni utente)
create index if not exists idx_notifications_recipient_unread on notifications (recipient_id, read, created_at desc)
  where read = false;
create index if not exists idx_notifications_recipient_all on notifications (recipient_id, created_at desc);

-- Audit log: query per pratica
create index if not exists idx_audit_log_entity on audit_log (entity_type, entity_id, created_at desc);

-- Clients: testo libero (già coperto da GIN trgm in 003, aggiungiamo email)
create index if not exists idx_clients_email on clients (email) where email is not null;
create index if not exists idx_clients_created_at on clients (created_at desc);

-- Analisi VACUUM per le tabelle più frequentemente aggiornate
analyze pratiche;
analyze pratica_phases;
analyze preventivi;
analyze payments;
analyze notifications;
