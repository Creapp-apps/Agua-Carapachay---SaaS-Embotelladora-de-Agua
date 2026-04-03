-- =============================================
-- PASO 1 — DIAGNÓSTICO: Ver duplicados por tenant_id
-- Corré esto primero para ver qué hay
-- =============================================
SELECT 
  tenant_id, 
  COUNT(*) as filas,
  MIN(updated_at) as primera,
  MAX(updated_at) as ultima,
  array_agg(user_id::text ORDER BY updated_at DESC) as user_ids
FROM user_data
GROUP BY tenant_id
HAVING COUNT(*) > 1;

-- =============================================
-- PASO 2 — Eliminar duplicados usando ctid
-- (ctid es el identificador interno de fila en PostgreSQL)
-- Deja solo la fila MÁS RECIENTE por tenant_id
-- =============================================
DELETE FROM user_data
WHERE ctid NOT IN (
  SELECT DISTINCT ON (tenant_id) ctid
  FROM user_data
  ORDER BY tenant_id, updated_at DESC NULLS LAST
);

-- =============================================
-- PASO 3 — Agregar UNIQUE constraint en tenant_id
-- Previene que vuelva a ocurrir el bug
-- (solo ejecutar luego del paso 2)
-- =============================================
ALTER TABLE user_data ADD CONSTRAINT user_data_tenant_id_unique UNIQUE (tenant_id);
