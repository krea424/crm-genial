-- Migrazione 020: trigger billing_ready
-- Quando una pratica viene completata, notifica l'amministrativa che è pronto per la fatturazione

create or replace function notify_billing_ready()
returns trigger as $$
begin
  -- Quando la pratica passa a 'completata'
  if new.status = 'completata' and (old.status is distinct from 'completata') then
    insert into notifications (recipient_id, type, title, body, action_url, read)
    select
      p.id,
      'billing_ready',
      'Pratica completata — ' || new.practice_code,
      'La pratica è stata completata ed è pronta per la fatturazione.',
      '/pratiche/' || new.id,
      false
    from profiles p
    where p.role in ('amministrativa', 'titolare', 'admin');
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_pratica_completed on pratiche;

create trigger on_pratica_completed
  after update of status on pratiche
  for each row
  execute function notify_billing_ready();
