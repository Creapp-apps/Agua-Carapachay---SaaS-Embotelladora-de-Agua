import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service Role client — bypasses RLS, only runs server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request) {
  try {
    const { name, plan, ownerEmail, password, notes } = await request.json();

    if (!name || !ownerEmail || !password) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ success: false, error: `Error al crear usuario: ${authError.message}` }, { status: 400 });
    }

    // 2. Crear el Tenant
    const planLimits = {
      starter: { max_clients: 300, max_users: 3 },
      pro: { max_clients: 500, max_users: 8 },
      enterprise: { max_clients: 99999, max_users: 99999 },
    };
    const limits = planLimits[plan] || planLimits.starter;

    const { data: newTenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name,
        plan: plan || 'starter',
        owner_email: ownerEmail,
        notes: notes || '',
        status: 'active',
        max_clients: limits.max_clients,
        max_users: limits.max_users,
      })
      .select()
      .single();

    if (tenantError) {
      // Rollback: borrar usuario si falla
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ success: false, error: `Error tenant: ${tenantError.message}` }, { status: 500 });
    }

    // 3. Crear perfil del admin
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        tenant_id: newTenant.id,
        role: 'admin',
        email: ownerEmail,
        full_name: `Admin de ${name}`,
      });

    if (profileError) {
      return NextResponse.json({ success: false, error: `Error perfil: ${profileError.message}` }, { status: 500 });
    }

    // 4. Crear fila inicial en user_data
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
        route_counter: 1,
      });

    if (dataError) {
      return NextResponse.json({ success: false, error: `Error datos iniciales: ${dataError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, tenant: newTenant });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
