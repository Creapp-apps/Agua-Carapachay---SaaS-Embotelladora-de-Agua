'use server';

import { createClient } from '@supabase/supabase-js';

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

export async function inviteUser({ email, password, fullName, role, tenantId }) {
  try {
    if (!email || !password || !role || !tenantId) {
      return { success: false, error: 'Faltan datos obligatorios' };
    }

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return { success: false, error: 'Este email ya está registrado' };
      }
      return { success: false, error: `Error Auth: ${authError.message}` };
    }

    // 2. Create profile linked to the tenant
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        tenant_id: tenantId,
        role,
        email,
        full_name: fullName || email.split('@')[0]
      });

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: `Error Perfil: ${profileError.message}` };
    }

    return { success: true, userId: authUser.user.id };

  } catch (error) {
    console.error('INVITE USER ERROR:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserProfile(userId, updates) {
  try {
    if (!userId || !updates) {
      return { success: false, error: 'Faltan datos' };
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true };

  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error);
    return { success: false, error: error.message };
  }
}

export async function removeUser(userId) {
  try {
    if (!userId) return { success: false, error: 'Falta userId' };

    // 1. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) return { success: false, error: profileError.message };

    // 2. Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) return { success: false, error: authError.message };

    return { success: true };

  } catch (error) {
    console.error('REMOVE USER ERROR:', error);
    return { success: false, error: error.message };
  }
}

export async function getTeamMembers(tenantId) {
  try {
    if (!tenantId) return { success: false, error: 'Falta tenantId', data: [] };

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message, data: [] };
    return { success: true, data: data || [] };

  } catch (error) {
    console.error('GET TEAM ERROR:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function updateTenantInfo(tenantId, info) {
  try {
    if (!tenantId) return { success: false, error: 'Falta tenantId' };

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({
        name: info.name,
        phone: info.phone,
        address: info.address,
        depot_lat: info.depotLat,
        depot_lng: info.depotLng,
        depot_address: info.depotAddress,
        show_stock_driver: info.showStockDriver,
        allow_create_route: info.allowCreateRoute,
        mp_access_token: info.mpAccessToken,
        mp_public_key: info.mpPublicKey,
        mp_surcharge_percent: Number(info.mpSurchargePercent || 0),
        mp_qr_enabled: Boolean(info.mpQrEnabled),
      })
      .eq('id', tenantId);

    if (error) return { success: false, error: error.message };
    return { success: true };

  } catch (error) {
    console.error('UPDATE TENANT ERROR:', error);
    return { success: false, error: error.message };
  }
}

export async function getTenantInfo(tenantId) {
  try {
    if (!tenantId) return { success: false, error: 'Falta tenantId', data: null };

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id, name, phone, address, depot_lat, depot_lng, depot_address, show_stock_driver, allow_create_route, owner_email, plan, status, mp_access_token, mp_public_key, mp_surcharge_percent, mp_qr_enabled')
      .eq('id', tenantId)
      .single();

    if (error) return { success: false, error: error.message, data: null };
    return { success: true, data };

  } catch (error) {
    console.error('GET TENANT ERROR:', error);
    return { success: false, error: error.message, data: null };
  }
}
