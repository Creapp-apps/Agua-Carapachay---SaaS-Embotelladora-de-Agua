'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import LoginScreen from '@/components/LoginScreen';

const App = nextDynamic(() => import('@/components/App'), { ssr: false });

export default function Home() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  return <App userEmail={session.user.email} />;
}
