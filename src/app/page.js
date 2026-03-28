'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import LoginScreen from '@/components/LoginScreen';

const App = nextDynamic(() => import('@/components/App'), { ssr: false });
const SuperAdminApp = nextDynamic(() => import('@/components/super-admin/SuperAdminApp'), { ssr: false });
const RepartidorView = nextDynamic(() => import('@/components/repartidor/RepartidorView'), { ssr: false });

export default function Home() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      supabase.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data) setProfile(data);
          else setProfile({ role: 'admin', tenant_id: null }); // Fallback si no hay perfil
        });
    } else {
      setProfile(null);
    }
  }, [session]);

  if (session === undefined || (session && !profile)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  // Seleccionar vista según el rol
  if (profile.role === 'super_admin') {
    return <SuperAdminApp session={session} profile={profile} />;
  }
  
  if (profile.role === 'repartidor') {
    return <RepartidorView session={session} profile={profile} />;
  }

  return <App userEmail={session.user.email} profile={profile} />;
}
