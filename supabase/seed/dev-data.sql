-- Dati di sviluppo: NON applicare in produzione
-- Crea utenti di test con password 'password123'
-- Nota: gli utenti auth devono essere creati dalla Supabase Dashboard o via API

-- Clienti di esempio
insert into clients (client_type, first_name, last_name, email, phone, city, tax_code) values
  ('privato',  'Mario',    'Rossi',    'mario.rossi@example.com',   '+39 333 1234567', 'Catanzaro', 'RSSMRA70A01F061X'),
  ('privato',  'Lucia',    'Bianchi',  'lucia.bianchi@example.com', '+39 347 9876543', 'Lamezia Terme', 'BNCLCU75B41D086Y'),
  ('azienda',  null,       null,       'info@edilcostruzioni.it',   '+39 0961 111222', 'Catanzaro', null);

update clients set company_name = 'Edil Costruzioni SRL' where email = 'info@edilcostruzioni.it';
