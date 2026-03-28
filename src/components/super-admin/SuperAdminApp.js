'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Icons ───────────────────────────────────────────────
const I = ({d,size=20,className=''}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d}/></svg>
);
const IC = {
  users:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  building:'M3 21h18M5 21V7l8-4v18M13 21V3l8 4v14M7 11h2M7 15h2M15 11h2M15 15h2',
  plus:'M12 5v14M5 12h14',
  check:'M20 6L9 17l-5-5',
  x:'M18 6L6 18M6 6l12 12',
  power:'M18.36 6.64a9 9 0 11-12.73 0M12 2v10',
  logout:'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  back:'M19 12H5M12 19l-7-7 7-7',
  chart:'M18 20V10M12 20V4M6 20v-6',
  alert:'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  search:'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35',
  edit:'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  pause:'M10 9v6M14 9v6M12 22a10 10 0 100-20 10 10 0 000 20z',
  play:'M5 3l14 9-14 9V3z',
  trash:'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2',
  eye:'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
  money:'M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6',
  pkg:'M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
};

// ─── Plan config ──────────────────────────────────────────
const PLANS = {
  starter: { label: 'Starter', maxClients: 300, maxUsers: 3, color: 'sky', desc: 'Hasta 300 clientes · 3 usuarios' },
  pro:     { label: 'Pro',     maxClients: 500, maxUsers: 8, color: 'violet', desc: 'Hasta 500 clientes · 8 usuarios' },
  enterprise: { label: 'Enterprise', maxClients: 99999, maxUsers: 99999, color: 'amber', desc: 'Ilimitado · Múltiples sucursales' },
};

// ─── UI Components ───────────────────────────────────────
const Badge = ({children, variant='default', className=''}) => {
  const c = {
    default:'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    success:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info:'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    violet:'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${c[variant]||c.default} ${className}`}>{children}</span>;
};

const Btn = ({children, onClick, v='primary', className='', disabled, size='md'}) => {
  const base = 'flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none';
  const sz = size==='sm'?'py-2 px-4 text-sm':size==='lg'?'py-3.5 px-6 text-base':'py-2.5 px-5 text-sm';
  const vars = {
    primary:'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
    secondary:'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200',
    danger:'bg-red-600 hover:bg-red-700 text-white',
    success:'bg-emerald-600 hover:bg-emerald-700 text-white',
    warning:'bg-amber-500 hover:bg-amber-600 text-white',
    outline:'border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sz} ${vars[v]} ${className}`}>{children}</button>;
};

const Modal = ({open, onClose, title, children, wide}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
      <div onClick={e=>e.stopPropagation()} className={`relative w-full ${wide?'max-w-2xl':'max-w-lg'} max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl mx-4`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><I d={IC.x} size={20}/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
};

const Input = ({label, value, onChange, type='text', placeholder='', required, className=''}) => (
  <div className={className}>
    {label && <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"/>
  </div>
);

const Stat = ({label, value, variant='default', icon}) => {
  const colors = {default:'text-gray-900 dark:text-gray-100', success:'text-emerald-600', danger:'text-red-600', warning:'text-amber-600', info:'text-indigo-600'};
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        {icon && <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><I d={icon} size={18} className="text-gray-400"/></div>}
      </div>
      <p className={`text-3xl font-bold ${colors[variant]}`}>{value}</p>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function SuperAdminApp({ session, profile }) {
  const [tenants, setTenants] = useState([]);
  const [tenantProfiles, setTenantProfiles] = useState([]);
  const [tenantData, setTenantData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');

  // ─── Create form state ──────────────────────────────────
  const [cName, setCName] = useState('');
  const [cPlan, setCPlan] = useState('starter');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [createError, setCreateError] = useState('');

  // ─── Edit form state ───────────────────────────────────
  const [eName, setEName] = useState('');
  const [ePlan, setEPlan] = useState('');
  const [eNotes, setENotes] = useState('');

  useEffect(() => { loadAll(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadAll = async () => {
    setLoading(true);
    const [tenantsRes, profilesRes, dataRes] = await Promise.all([
      supabase.from('tenants').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').neq('role', 'super_admin'),
      supabase.from('user_data').select('tenant_id, clients, orders, products, payments').not('tenant_id', 'is', null),
    ]);
    if (tenantsRes.data) setTenants(tenantsRes.data);
    if (profilesRes.data) setTenantProfiles(profilesRes.data);
    if (dataRes.data) setTenantData(dataRes.data);
    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  // ─── Create Tenant ──────────────────────────────────────
  const handleCreate = async () => {
    if (!cName || !cEmail || !cPassword) { setCreateError('Completá nombre, email y contraseña'); return; }
    if (cPassword.length < 6) { setCreateError('La contraseña debe tener al menos 6 caracteres'); return; }
    setActionLoading(true);
    setCreateError('');
    try {
      const res = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cName, plan: cPlan, ownerEmail: cEmail, password: cPassword, notes: cNotes }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      showToast(`✅ "${cName}" creada correctamente`);
      setShowCreate(false);
      setCName(''); setCEmail(''); setCPassword(''); setCNotes(''); setCPlan('starter');
      loadAll();
    } catch (e) {
      setCreateError(e.message);
    }
    setActionLoading(false);
  };

  // ─── Edit Tenant ────────────────────────────────────────
  const openEdit = (t) => {
    setEName(t.name); setEPlan(t.plan); setENotes(t.notes || '');
    setSelectedTenant(t); setShowEdit(true);
  };
  const handleEdit = async () => {
    setActionLoading(true);
    const planConfig = PLANS[ePlan];
    const { error } = await supabase.from('tenants').update({
      name: eName, plan: ePlan, notes: eNotes,
      max_clients: planConfig?.maxClients || 300,
      max_users: planConfig?.maxUsers || 3,
    }).eq('id', selectedTenant.id);
    if (!error) {
      showToast(`✅ "${eName}" actualizada`);
      setShowEdit(false);
      loadAll();
    }
    setActionLoading(false);
  };

  // ─── Suspend/Activate ──────────────────────────────────
  const handleToggleStatus = async (tenant, newStatus) => {
    setActionLoading(true);
    const { error } = await supabase.from('tenants').update({
      status: newStatus,
      suspended_at: newStatus === 'suspended' ? new Date().toISOString() : null,
    }).eq('id', tenant.id);
    if (!error) {
      showToast(newStatus === 'suspended' ? `⏸️ "${tenant.name}" suspendida` : `▶️ "${tenant.name}" reactivada`);
      setShowSuspend(false);
      loadAll();
    }
    setActionLoading(false);
  };

  // ─── Delete ────────────────────────────────────────────
  const handleDelete = async (tenant) => {
    setActionLoading(true);
    const { error } = await supabase.from('tenants').update({
      status: 'deleted',
      deleted_at: new Date().toISOString(),
    }).eq('id', tenant.id);
    if (!error) {
      showToast(`🗑️ "${tenant.name}" marcada para eliminación (3 meses de gracia)`);
      setShowDelete(false);
      setView('list');
      loadAll();
    }
    setActionLoading(false);
  };

  // ─── Computed ──────────────────────────────────────────
  const activeTenants = tenants.filter(t => t.status === 'active');
  const suspendedTenants = tenants.filter(t => t.status === 'suspended');
  const totalUsers = tenantProfiles.length;

  const getStats = (tenantId) => {
    const d = tenantData.find(x => x.tenant_id === tenantId);
    if (!d) return { clients: 0, orders: 0, products: 0 };
    return {
      clients: Array.isArray(d.clients) ? d.clients.length : 0,
      orders: Array.isArray(d.orders) ? d.orders.length : 0,
      products: Array.isArray(d.products) ? d.products.length : 0,
    };
  };

  const getUsersForTenant = (tenantId) => tenantProfiles.filter(p => p.tenant_id === tenantId);

  const filtered = useMemo(() => {
    if (!search) return tenants;
    const q = search.toLowerCase();
    return tenants.filter(t => t.name.toLowerCase().includes(q) || (t.owner_email||'').toLowerCase().includes(q));
  }, [tenants, search]);

  // ─── Detail View ───────────────────────────────────────
  if (view === 'detail' && selectedTenant) {
    const t = tenants.find(x => x.id === selectedTenant.id) || selectedTenant;
    const stats = getStats(t.id);
    const users = getUsersForTenant(t.id);
    const planInfo = PLANS[t.plan] || PLANS.starter;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header onLogout={handleLogout} />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {toast && <Toast msg={toast}/>}

          <button onClick={() => {setView('list'); setSelectedTenant(null);}} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 font-medium">
            <I d={IC.back} size={16}/> Volver a soderías
          </button>

          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.name}</h1>
                <Badge variant={t.status==='active'?'success':t.status==='suspended'?'warning':'danger'}>
                  {t.status==='active'?'Activa':t.status==='suspended'?'Suspendida':'Eliminada'}
                </Badge>
                <Badge variant={planInfo.color==='sky'?'info':planInfo.color==='violet'?'violet':'warning'}>
                  {planInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">{t.owner_email || 'Sin propietario'} · Creada {new Date(t.created_at).toLocaleDateString('es-AR')}</p>
            </div>
            <div className="flex gap-2">
              <Btn v="secondary" size="sm" onClick={() => openEdit(t)}><I d={IC.edit} size={15}/>Editar</Btn>
              {t.status === 'active' && (
                <Btn v="warning" size="sm" onClick={() => {setSelectedTenant(t); setShowSuspend(true);}}><I d={IC.pause} size={15}/>Suspender</Btn>
              )}
              {t.status === 'suspended' && (
                <Btn v="success" size="sm" onClick={() => handleToggleStatus(t, 'active')}><I d={IC.play} size={15}/>Reactivar</Btn>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Stat label="Clientes" value={stats.clients} icon={IC.users} variant="info"/>
            <Stat label="Pedidos" value={stats.orders} icon={IC.pkg} variant="success"/>
            <Stat label="Productos" value={stats.products} icon={IC.chart}/>
            <Stat label="Usuarios" value={users.length} icon={IC.users} variant="warning"/>
          </div>

          {/* Plan info */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Plan actual</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg text-gray-900 dark:text-gray-100">{planInfo.label}</p>
                <p className="text-sm text-gray-500">{planInfo.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Uso de clientes</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.clients} <span className="text-gray-400 font-normal">/ {planInfo.maxClients === 99999 ? '∞' : planInfo.maxClients}</span></p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${stats.clients >= planInfo.maxClients ? 'bg-red-500' : 'bg-indigo-500'}`}
                style={{width: `${Math.min(100, (stats.clients / planInfo.maxClients) * 100)}%`}} />
            </div>
          </div>

          {/* Users */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Usuarios ({users.length})</h3>
            {users.length === 0 ? <p className="text-sm text-gray-400">Sin usuarios vinculados</p> : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{u.full_name || u.email}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <Badge variant={u.role==='admin'?'info':u.role==='repartidor'?'success':'default'}>
                      {u.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {t.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <p className="text-xs font-semibold text-amber-600 mb-1">Notas internas</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{t.notes}</p>
            </div>
          )}

          {/* Danger zone */}
          {t.status !== 'deleted' && (
            <div className="mt-8 border-2 border-dashed border-red-200 dark:border-red-900 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-red-600 mb-2">Zona de peligro</h3>
              <p className="text-xs text-gray-500 mb-4">Marcar para eliminación. Los datos se conservan 3 meses antes de ser purgados definitivamente.</p>
              <Btn v="danger" size="sm" onClick={() => {setSelectedTenant(t); setShowDelete(true);}}><I d={IC.trash} size={15}/>Marcar para eliminación</Btn>
            </div>
          )}

          {/* Modals */}
          <SuspendModal open={showSuspend} tenant={selectedTenant} loading={actionLoading}
            onClose={() => setShowSuspend(false)}
            onConfirm={() => handleToggleStatus(selectedTenant, 'suspended')} />
          <DeleteModal open={showDelete} tenant={selectedTenant} loading={actionLoading}
            onClose={() => setShowDelete(false)}
            onConfirm={() => handleDelete(selectedTenant)} />
          <EditModal open={showEdit} loading={actionLoading}
            name={eName} setName={setEName} plan={ePlan} setPlan={setEPlan} notes={eNotes} setNotes={setENotes}
            onClose={() => setShowEdit(false)} onConfirm={handleEdit} />
        </main>
      </div>
    );
  }

  // ─── List View ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header onLogout={handleLogout} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {toast && <Toast msg={toast}/>}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Soderías</h1>
            <p className="text-sm text-gray-500">Gestioná tus clientes y suscripciones</p>
          </div>
          <Btn onClick={() => setShowCreate(true)}><I d={IC.plus} size={18}/> Nueva Sodería</Btn>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Stat label="Soderías Totales" value={tenants.length} icon={IC.building}/>
          <Stat label="Activas" value={activeTenants.length} variant="success" icon={IC.check}/>
          <Stat label="Suspendidas" value={suspendedTenants.length} variant="warning" icon={IC.pause}/>
          <Stat label="Usuarios Total" value={totalUsers} icon={IC.users} variant="info"/>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><I d={IC.search} size={18}/></div>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o email..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
            Cargando soderías...
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <I d={IC.building} size={28} className="text-gray-400"/>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{search ? 'Sin resultados' : 'Sin soderías'}</h3>
                <p className="text-sm text-gray-500 mb-4">{search ? 'Probá con otro término' : 'Creá tu primera sodería para comenzar'}</p>
                {!search && <Btn onClick={() => setShowCreate(true)} className="mx-auto"><I d={IC.plus} size={16}/> Crear primera sodería</Btn>}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map(t => {
                  const stats = getStats(t.id);
                  const users = getUsersForTenant(t.id);
                  const planInfo = PLANS[t.plan] || PLANS.starter;
                  return (
                    <div key={t.id}
                      onClick={() => {setSelectedTenant(t); setView('detail');}}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${t.status==='active'?'bg-indigo-100 dark:bg-indigo-900/30':'bg-gray-100 dark:bg-gray-800'}`}>
                        <I d={IC.building} size={20} className={t.status==='active'?'text-indigo-600':'text-gray-400'}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{t.name}</span>
                          <Badge variant={t.status==='active'?'success':t.status==='suspended'?'warning':'danger'}>
                            {t.status==='active'?'Activa':t.status==='suspended'?'Suspendida':'Eliminada'}
                          </Badge>
                          <Badge variant={planInfo.color==='sky'?'info':planInfo.color==='violet'?'violet':'warning'}>
                            {planInfo.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{t.owner_email || 'Sin propietario'} · {stats.clients} clientes · {users.length} usuario{users.length!==1?'s':''}</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Modal */}
        <Modal open={showCreate} onClose={() => {setShowCreate(false); setCreateError('');}} title="Nueva Sodería" wide>
          <div className="space-y-5">
            <Input label="Nombre de la sodería" value={cName} onChange={setCName} placeholder="Ej: Sodería El Manantial" required/>
            <Input label="Email del administrador" value={cEmail} onChange={setCEmail} type="email" placeholder="admin@soderia.com" required/>
            <Input label="Contraseña inicial" value={cPassword} onChange={setCPassword} type="password" placeholder="Mínimo 6 caracteres" required/>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Plan</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(PLANS).map(([k, p]) => (
                  <button key={k} onClick={() => setCPlan(k)}
                    className={`p-4 rounded-xl border-2 text-left transition active:scale-[0.97] ${cPlan===k?'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20':'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{p.label}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <Input label="Notas internas (opcional)" value={cNotes} onChange={setCNotes} placeholder="Observaciones para tu referencia"/>

            {createError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2">
                <I d={IC.alert} size={15} className="text-red-500 shrink-0 mt-0.5"/>
                <p className="text-xs text-red-600">{createError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Btn v="secondary" onClick={() => {setShowCreate(false); setCreateError('');}} className="flex-1">Cancelar</Btn>
              <Btn onClick={handleCreate} disabled={actionLoading} className="flex-1">
                {actionLoading ? 'Creando...' : <><I d={IC.check} size={16}/> Crear Sodería</>}
              </Btn>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────
function Header({ onLogout }) {
  return (
    <header className="bg-gray-900 border-b border-gray-800 text-white sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm shadow-indigo-500/40">
            <I d={IC.building} size={16}/>
          </div>
          <span className="font-bold tracking-tight">CreAPP <span className="text-gray-400 font-normal">| Super Admin</span></span>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
          <I d={IC.logout} size={16}/> Salir
        </button>
      </div>
    </header>
  );
}

function Toast({ msg }) {
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg bg-gray-900 text-white animate-pulse">
      {msg}
    </div>
  );
}

function SuspendModal({ open, tenant, loading, onClose, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title="Suspender Sodería">
      <div className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm text-amber-800 dark:text-amber-300">Los usuarios de <b>{tenant?.name}</b> no podrán acceder al sistema hasta que reactives el servicio. Los datos se conservan intactos.</p>
        </div>
        <div className="flex gap-3">
          <Btn v="secondary" onClick={onClose} className="flex-1">Cancelar</Btn>
          <Btn v="warning" onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? 'Suspendiendo...' : 'Confirmar suspensión'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function DeleteModal({ open, tenant, loading, onClose, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title="Eliminar Sodería">
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-800 dark:text-red-300">
            <b>{tenant?.name}</b> será marcada para eliminación. Los datos se conservarán durante <b>3 meses</b>. Después serán eliminados permanentemente.
          </p>
        </div>
        <div className="flex gap-3">
          <Btn v="secondary" onClick={onClose} className="flex-1">Cancelar</Btn>
          <Btn v="danger" onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? 'Eliminando...' : 'Eliminar definitivamente'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function EditModal({ open, loading, name, setName, plan, setPlan, notes, setNotes, onClose, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title="Editar Sodería">
      <div className="space-y-5">
        <Input label="Nombre" value={name} onChange={setName} required/>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Plan</label>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(PLANS).map(([k, p]) => (
              <button key={k} onClick={() => setPlan(k)}
                className={`p-3 rounded-xl border-2 text-left transition ${plan===k?'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20':'border-gray-200 dark:border-gray-700'}`}>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{p.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <Input label="Notas internas" value={notes} onChange={setNotes}/>
        <div className="flex gap-3">
          <Btn v="secondary" onClick={onClose} className="flex-1">Cancelar</Btn>
          <Btn onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? 'Guardando...' : <><I d={IC.check} size={16}/> Guardar cambios</>}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
