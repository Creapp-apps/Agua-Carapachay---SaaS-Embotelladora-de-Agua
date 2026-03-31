-- Supabase SQL Script to add Mercado Pago configured credentials per Tenant
ALTER TABLE tenants
ADD COLUMN mp_access_token text,
ADD COLUMN mp_public_key text;

-- Asegurate de correr esto en el SQL Editor de tu Dashboard de Supabase.
