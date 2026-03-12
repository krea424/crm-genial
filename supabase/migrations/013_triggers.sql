-- Trigger principale: genera practice_code in formato YYYY-NNN
create or replace function generate_practice_code()
returns trigger language plpgsql as $$
declare
  year_str  text;
  next_num  integer;
  new_code  text;
begin
  -- Solo per pratiche che diventano 'attiva' senza codice
  if new.status = 'attiva' and (new.practice_code is null or new.practice_code = '') then
    year_str := to_char(now(), 'YYYY');

    select coalesce(max(
      cast(split_part(practice_code, '-', 2) as integer)
    ), 0) + 1
    into next_num
    from pratiche
    where practice_code like year_str || '-%';

    new_code := year_str || '-' || lpad(next_num::text, 3, '0');
    new.practice_code := new_code;
  end if;

  return new;
end;
$$;

create trigger pratiche_generate_code
  before insert or update on pratiche
  for each row execute procedure generate_practice_code();

-- Trigger audit log su pratiche (cambi di status)
create or replace function audit_pratica_status_change()
returns trigger language plpgsql security definer as $$
begin
  if old.status is distinct from new.status then
    insert into audit_log (entity_type, entity_id, action, actor_id, old_data, new_data)
    values (
      'pratica',
      new.id,
      'status_changed',
      auth.uid(),
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status, 'practice_code', new.practice_code)
    );
  end if;
  return new;
end;
$$;

create trigger pratiche_audit_status
  after update on pratiche
  for each row execute procedure audit_pratica_status_change();
