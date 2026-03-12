-- Estensioni PostgreSQL necessarie
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- fuzzy matching clienti
create extension if not exists "unaccent";  -- ricerca senza accenti
