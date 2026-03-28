'use server';

import { createClient } from '@supabase/supabase-js';

// Usamos el Service Role para bypassear RLS y poder crear usuarios Auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function createTenant(formData) {
  try {
    const name = formData.get('name');
    const plan = formData.get('plan') || 'starter';
    const ownerEmail = formData.get('owner_email');
    const password = formData.get('password');
    const maxClients = parseInt(formData.get('max_clients') || '300');
    const notes = formData.get('notes') || '';

    // 1. Crear usuario en Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: password,
      email_confirm: true // Para que no tenga que validar por mail ahora
    });

    if (authError) throw new Error(`Error Auth: ${authError.message}`);

    // 2. Crear Tenant (Sodería)
    const { data: newTenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name,
        plan,
        owner_email: ownerEmail,
        max_clients: maxClients,
        notes,
        status: 'active'
      })
      .select()
      .single();

    if (tenantError) throw new Error(`Error Tenant: ${tenantError.message}`);

    // 3. Crear Perfil de Admin vinculado a este tenant
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        tenant_id: newTenant.id,
        role: 'admin',
        email: ownerEmail,
        full_name: `Admin de ${name}`
      });

    if (profileError) throw new Error(`Error Perfil: ${profileError.message}`);
    
    // 4. Crear fila inicial en user_data referenciando el tenant_id
    const { error: dataError } = await supabaseAdmin
      .from('user_data')
      .insert({
        user_id: authUser.user.id,
        tenant_id: newTenant.id,
        clients: [],
        products: [],
        orders: [],
        payments: [],
        plans: [],
        client_plans: [],
        container_stock: [],
        bottle_swaps: [],
        pending_routes: [],
        past_routes: [],
        order_counter: 1,
        route_counter: 1
      });

    if (dataError) throw new Error(`Error Inicializando BD: ${dataError.message}`);

    return { success: true, message: 'Sodería creada correctamente' };

  } catch (error) {
    console.error('SERVER ACTION ERROR:', error);
    return { success: false, error: error.message };
  }
}
