-- ═══════════════════════════════════════════════════════════
-- PROTECCIÓN TOTAL ANTI-BORRADO DE DATOS
-- Ejecutar TODO junto en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════

-- 1. TABLA DE BACKUPS AUTOMÁTICOS
CREATE TABLE IF NOT EXISTS user_data_backups (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  clients JSONB DEFAULT '[]',
  orders JSONB DEFAULT '[]',
  products JSONB DEFAULT '[]',
  payments JSONB DEFAULT '[]',
  backed_up_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_backups_tenant ON user_data_backups(tenant_id, backed_up_at DESC);
ALTER TABLE user_data_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage backups" ON user_data_backups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. TRIGGER: BACKUP AUTOMÁTICO ANTES DE CADA UPDATE
-- Guarda una copia de los datos ANTES de cada modificación
CREATE OR REPLACE FUNCTION backup_before_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo hacer backup si hay datos reales que proteger
  IF (OLD.clients IS NOT NULL AND jsonb_array_length(COALESCE(OLD.clients, '[]'::jsonb)) > 0) THEN
    INSERT INTO user_data_backups (tenant_id, clients, orders, products, payments, backed_up_at)
    VALUES (OLD.tenant_id, OLD.clients, OLD.orders, OLD.products, OLD.payments, NOW());
    
    -- Mantener solo los últimos 10 backups por tenant para no llenar la DB
    DELETE FROM user_data_backups 
    WHERE tenant_id = OLD.tenant_id 
    AND id NOT IN (
      SELECT id FROM user_data_backups 
      WHERE tenant_id = OLD.tenant_id 
      ORDER BY backed_up_at DESC 
      LIMIT 10
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_backup_user_data ON user_data;
CREATE TRIGGER trg_backup_user_data
  BEFORE UPDATE ON user_data
  FOR EACH ROW
  EXECUTE FUNCTION backup_before_update();

-- 3. TRIGGER: BLOQUEAR BORRADO MASIVO
-- Si la fila tenía clientes y el UPDATE trae 0, RECHAZAR el update
CREATE OR REPLACE FUNCTION prevent_data_wipe()
RETURNS TRIGGER AS $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  old_count := jsonb_array_length(COALESCE(OLD.clients, '[]'::jsonb));
  new_count := jsonb_array_length(COALESCE(NEW.clients, '[]'::jsonb));
  
  -- Si había más de 5 clientes y ahora vienen 0, BLOQUEAR
  IF old_count > 5 AND new_count = 0 THEN
    RAISE EXCEPTION 'ANTI-WIPE: Bloqueado. No se puede reemplazar % clientes con 0. Usar DELETE explícito si es intencional.', old_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_wipe ON user_data;
CREATE TRIGGER trg_prevent_wipe
  BEFORE UPDATE ON user_data
  FOR EACH ROW
  EXECUTE FUNCTION prevent_data_wipe();
