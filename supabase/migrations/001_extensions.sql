-- Estensioni PostgreSQL necessarie
-- uuid-ossp non necessaria: gen_random_uuid() è built-in da PostgreSQL 13+
create extension if not exists "pg_trgm";   -- fuzzy matching clienti
create extension if not exists "unaccent";  -- ricerca senza accenti
