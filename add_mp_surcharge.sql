-- Agregar porcentaje de recargo a la tabla de tenants (Soderías)
ALTER TABLE tenants
ADD COLUMN mp_surcharge_percent numeric DEFAULT 0;
