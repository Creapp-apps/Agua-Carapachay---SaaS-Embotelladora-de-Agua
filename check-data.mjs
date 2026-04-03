import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 1. Ver TODAS las filas de user_data
  const { data: rows, error } = await db.from('user_data').select('*');
  if (error) { console.error('ERROR:', error); return; }

  console.log(`\n=== ${rows.length} filas en user_data ===\n`);
  for (const r of rows) {
    const clients = Array.isArray(r.clients) ? r.clients : [];
    const orders = Array.isArray(r.orders) ? r.orders : [];
    const products = Array.isArray(r.products) ? r.products : [];
    const payments = Array.isArray(r.payments) ? r.payments : [];
    console.log(`user_id: ${r.user_id}`);
    console.log(`tenant_id: ${r.tenant_id}`);
    console.log(`updated_at: ${r.updated_at}`);
    console.log(`clientes: ${clients.length}, pedidos: ${orders.length}, productos: ${products.length}, pagos: ${payments.length}`);
    if (clients.length > 0) {
      console.log('CLIENTES ENCONTRADOS:');
      clients.forEach(c => console.log(`  - ${c.name} | ${c.address} | saldo: ${c.balance}`));
    }
    console.log('---');
  }

  // 2. Verificar si hay audit log o backups
  const { data: tenants } = await db.from('tenants').select('*');
  console.log('\n=== Tenants ===');
  tenants?.forEach(t => console.log(`  ${t.id} | ${t.name} | ${t.status} | owner: ${t.owner_email}`));
}
main();
