-- pg_cron: abilita estensione e configura job schedulati
create extension if not exists pg_cron;
grant usage on schema cron to postgres;

-- Job 1: SLA monitoring — ogni ora controlla pratiche attive in breach o warning
-- Crea notifiche se SLA al 80%+ senza duplicati nelle ultime 24h
select cron.schedule(
  'sla-monitoring',
  '0 * * * *',  -- ogni ora
  $$
  with active_phases as (
    select
      pp.id,
      pp.pratica_id,
      pp.responsible_id,
      pp.sla_hours,
      extract(epoch from (now() - pp.started_at)) / 3600 as hours_elapsed,
      p.practice_code,
      p.title
    from pratica_phases pp
    join pratiche p on p.id = pp.pratica_id
    where pp.ended_at is null
      and p.status = 'attiva'
  ),
  breach_candidates as (
    select *,
      hours_elapsed / sla_hours as ratio,
      case
        when hours_elapsed / sla_hours >= 1.0 then 'sla_breach'
        when hours_elapsed / sla_hours >= 0.8 then 'sla_warning'
        else null
      end as notif_type
    from active_phases
    where hours_elapsed / sla_hours >= 0.8
  )
  insert into notifications (recipient_id, type, title, body, action_url)
  select
    bc.responsible_id,
    bc.notif_type::notification_type,
    case bc.notif_type
      when 'sla_breach' then 'SLA superato: ' || bc.practice_code
      else 'SLA in scadenza: ' || bc.practice_code
    end,
    'La pratica ' || bc.practice_code || ' ha superato l''80% del tempo SLA.',
    '/pratiche/' || bc.pratica_id
  from breach_candidates bc
  where bc.notif_type is not null
    and not exists (
      select 1 from notifications n
      where n.recipient_id = bc.responsible_id
        and n.type = bc.notif_type::notification_type
        and (n.action_url = '/pratiche/' || bc.pratica_id)
        and n.created_at > now() - interval '24 hours'
    );
  $$
);

-- Job 2: Scadenza preventivi — ogni giorno alle 08:00
select cron.schedule(
  'expire-preventivi',
  '0 8 * * *',
  $$
  update preventivi
  set status = 'scaduto'
  where status = 'inviato'
    and valid_until < current_date;
  $$
);

-- Job 3: Reminder lead non valutati — ogni giorno alle 09:00
select cron.schedule(
  'lead-reminder',
  '0 9 * * *',
  $$
  insert into notifications (recipient_id, type, title, body, action_url)
  select
    p.id,
    'lead_pending'::notification_type,
    'Lead in attesa di valutazione',
    count(pr.id) || ' lead non ancora valutati',
    '/pratiche?status=lead'
  from pratiche pr
  cross join profiles p
  where pr.status = 'lead'
    and pr.created_at < now() - interval '24 hours'
    and p.role in ('titolare', 'admin')
    and not exists (
      select 1 from notifications n
      where n.recipient_id = p.id
        and n.type = 'lead_pending'
        and n.created_at > now() - interval '24 hours'
    )
  group by p.id
  having count(pr.id) > 0;
  $$
);
