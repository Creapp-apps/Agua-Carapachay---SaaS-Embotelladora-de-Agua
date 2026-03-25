-- Ejecutar en Supabase SQL Editor
-- Agrega la columna faltante que bloquea TODOS los guardados

ALTER TABLE user_data 
ADD COLUMN IF NOT EXISTS bottle_swaps JSONB DEFAULT '[]'::jsonb;

-- Verificar que todas las columnas necesarias existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_data' AND column_name='container_stock') THEN
    ALTER TABLE user_data ADD COLUMN container_stock JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_data' AND column_name='client_plans') THEN
    ALTER TABLE user_data ADD COLUMN client_plans JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_data' AND column_name='pending_routes') THEN
    ALTER TABLE user_data ADD COLUMN pending_routes JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_data' AND column_name='past_routes') THEN
    ALTER TABLE user_data ADD COLUMN past_routes JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_data' AND column_name='order_counter') THEN
    ALTER TABLE user_data ADD COLUMN order_counter INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_data' AND column_name='route_counter') THEN
    ALTER TABLE user_data ADD COLUMN route_counter INTEGER DEFAULT 1;
  END IF;
END $$;
