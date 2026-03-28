'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const I = ({d,size=20,className=''}) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d}/></svg>);
const IC = {
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  power: 'M18.36 6.64a9 9 0 11-12.73 0M12 2v10'
};

export default function RepartidorView({ session, profile }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <I d={IC.truck} size={32} className="text-sky-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Vista de Repartidor</h1>
        <p className="text-sm text-gray-500">En desarrollo. Acá verás solo tu ruta de hoy.</p>
        <p className="text-xs text-sky-600 font-mono mt-4">Sodería: {profile?.tenant_id?.split('-')[0] || 'Ninguna'}</p>
      </div>
      
      <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition">
        <I d={IC.power} size={18} /> Cerrar Sesión
      </button>
    </div>
  );
}
