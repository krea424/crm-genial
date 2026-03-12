-- Seed: template workflow DOCFA (8 fasi standard)
do $$
declare
  docfa_type_id uuid;
  dia_type_id   uuid;
begin
  select id into docfa_type_id from pratica_types where code = 'DOCFA';
  select id into dia_type_id   from pratica_types where code = 'DIA';

  -- Template DOCFA
  insert into workflow_templates
    (pratica_type_id, phase_order, phase_code, phase_label, default_role, sla_hours, required_docs, is_final)
  values
    (docfa_type_id, 1, 'SOPRALLUOGO',    'Sopralluogo',                     'tecnico',        24,  '{}',                    false),
    (docfa_type_id, 2, 'RILIEVO',        'Rilievo e misurazioni',           'tecnico',        48,  '{"planimetria"}',       false),
    (docfa_type_id, 3, 'ELABORAZIONE',   'Elaborazione planimetria DOCFA',  'tecnico',        72,  '{}',                    false),
    (docfa_type_id, 4, 'VERIFICA',       'Verifica e controllo',            'titolare',       24,  '{"planimetria_docfa"}', false),
    (docfa_type_id, 5, 'DEPOSITO_CATASTO','Deposito al Catasto',            'tecnico',        24,  '{"docfa_firmato"}',     false),
    (docfa_type_id, 6, 'ATTESA_CATASTO', 'Attesa risposta Catasto',         'tecnico',        240, '{}',                    false),
    (docfa_type_id, 7, 'PROTOCOLLAZIONE','Protocollazione e verifica',      'tecnico',        24,  '{"ricevuta_catasto"}',  false),
    (docfa_type_id, 8, 'CHIUSURA',       'Chiusura e fatturazione',         'amministrativa', 24,  '{}',                    true);

  -- Template DIA (4 fasi)
  insert into workflow_templates
    (pratica_type_id, phase_order, phase_code, phase_label, default_role, sla_hours, required_docs, is_final)
  values
    (dia_type_id, 1, 'SOPRALLUOGO',  'Sopralluogo e rilievo',        'tecnico',        24,  '{}',                  false),
    (dia_type_id, 2, 'PROGETTAZIONE','Progettazione e disegni',      'tecnico',        120, '{"tavole_progetto"}',  false),
    (dia_type_id, 3, 'DEPOSITO_SUE', 'Deposito al SUE comunale',     'tecnico',        48,  '{"dia_firmata"}',     false),
    (dia_type_id, 4, 'CHIUSURA',     'Chiusura e fatturazione',      'amministrativa', 24,  '{}',                   true);
end;
$$;
