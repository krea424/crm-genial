-- Migrazione 019: job pg_cron per logica economica
-- 1. Segna preventivi scaduti ogni giorno
-- 2. Segna pagamenti in ritardo ogni giorno
-- 3. Notifica amministrativa quando fase PRODUZIONE completata (billing_ready)

-- ─── Job 1: preventivi scaduti ────────────────────────────────────────────────
select cron.unschedule('preventivi-scaduti')
  where exists (select 1 from cron.job where jobname = 'preventivi-scaduti');

select cron.schedule(
  'preventivi-scaduti',
  '0 8 * * *',   -- ogni mattina alle 08:00
  $$
  update preventivi
  set status = 'scaduto'
  where status = 'inviato'
    and valid_until < current_date;
  $$
);

-- ─── Job 2: pagamenti in ritardo ──────────────────────────────────────────────
select cron.unschedule('pagamenti-ritardo')
  where exists (select 1 from cron.job where jobname = 'pagamenti-ritardo');

select cron.schedule(
  'pagamenti-ritardo',
  '0 8 * * *',   -- ogni mattina alle 08:00
  $$
  -- Segna in ritardo i pagamenti scaduti non ancora ricevuti
  update payments
  set status = 'in_ritardo'
  where status = 'atteso'
    and due_date < current_date;

  -- Notifica amministrativa e titolare per ogni pagamento appena messo in ritardo
  insert into notifications (recipient_id, type, title, body, action_url, read)
  select
    p.id as recipient_id,
    'payment_overdue' as type,
    'Pagamento in ritardo — ' || pr.practice_code as title,
    pay.step_label || ' di ' || to_char(pay.amount, 'FM999G999D00') || ' € è scaduto il ' || to_char(pay.due_date, 'DD/MM/YYYY') as body,
    '/pratiche/' || pr.id as action_url,
    false as read
  from payments pay
  join pratiche pr on pr.id = pay.pratica_id
  cross join profiles p
  where pay.status = 'in_ritardo'
    and pay.due_date = current_date - interval '1 day'
    and p.role in ('amministrativa', 'titolare', 'admin')
    and not exists (
      select 1 from notifications n
      where n.type = 'payment_overdue'
        and n.action_url = '/pratiche/' || pr.id
        and n.recipient_id = p.id
        and n.created_at > now() - interval '24 hours'
    );
  $$
);
