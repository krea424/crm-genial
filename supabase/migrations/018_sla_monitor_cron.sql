-- Aggiunge job pg_cron per chiamare la Edge Function sla-monitor ogni ora
-- La Edge Function verifica SLA aperti e invia notifiche warning/breach

-- Rimuove il job se già esiste (idempotente)
select cron.unschedule('sla-monitor')
  where exists (
    select 1 from cron.job where jobname = 'sla-monitor'
  );

-- Job ogni ora al minuto 0
select cron.schedule(
  'sla-monitor',
  '0 * * * *',
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/sla-monitor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Job giornaliero alle 09:00 per reminder lead non valutati
select cron.unschedule('lead-pending-reminder')
  where exists (
    select 1 from cron.job where jobname = 'lead-pending-reminder'
  );

select cron.schedule(
  'lead-pending-reminder',
  '0 9 * * *',
  $$
  -- Notifica titolari per lead non valutati da >24h
  insert into notifications (recipient_id, type, title, body, action_url, read)
  select
    p.id,
    'lead_pending',
    'Lead in attesa — ' || pr.practice_code,
    'Il lead di ' || coalesce(c.company_name, c.last_name || ' ' || c.first_name, 'cliente') || ' è in attesa da oltre 24 ore.',
    '/pratiche/' || pr.id,
    false
  from pratiche pr
  join clients c on c.id = pr.client_id
  cross join profiles p
  where pr.status = 'lead'
    and pr.created_at < now() - interval '24 hours'
    and p.role in ('titolare', 'admin')
    and not exists (
      select 1 from notifications n
      where n.type = 'lead_pending'
        and n.action_url = '/pratiche/' || pr.id
        and n.recipient_id = p.id
        and n.created_at > now() - interval '24 hours'
    );
  $$
);
