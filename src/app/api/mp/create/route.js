import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { tenantId, title, price } = body;

    if (!tenantId || !price) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    // 1. Obtener Access Token del Tenant
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('mp_access_token')
      .eq('id', tenantId)
      .single();

    if (error || !tenant || !tenant.mp_access_token) {
      return NextResponse.json({ error: 'La sodería no tiene Mercado Pago configurado.' }, { status: 400 });
    }

    const accessToken = tenant.mp_access_token;

    // 2. Crear la preferencia en Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          {
            title: title || 'Cobro Sodería',
            quantity: 1,
            unit_price: Number(price),
            currency_id: 'ARS'
          }
        ],
        // Opcional: configurar back_urls o notification_url
      })
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('MP ERROR:', mpData);
      return NextResponse.json({ error: 'Error al generar cobro con Mercado Pago' }, { status: 500 });
    }

    // Exponemos el init_point para generar el código QR o el botón
    return NextResponse.json({ 
      init_point: mpData.init_point, 
      sandbox_init_point: mpData.sandbox_init_point,
      id: mpData.id 
    });

  } catch (error) {
    console.error('MP ROUTE ERROR:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
