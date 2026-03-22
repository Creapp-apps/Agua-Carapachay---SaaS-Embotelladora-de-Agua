'use client';

import { useState, useEffect, useRef, useMemo, createContext, useContext, useCallback } from 'react';

const AppContext = createContext();
const useApp = () => useContext(AppContext);

/* ============================================================
   ZONE <-> BARRIO AUTO-MAPPING
   When a user types an address, we geocode it via Nominatim,
   extract the barrio/suburb, and auto-assign the zone.
   ============================================================ */
const ZONE_BARRIOS = {
  Centro: ['monserrat','san nicolás','san nicolas','retiro','puerto madero','constitución','constitucion','microcentro','centro','balvanera','san cristóbal','san cristobal'],
  Palermo: ['palermo','palermo soho','palermo hollywood','palermo viejo','palermo chico','colegiales'],
  'San Telmo': ['san telmo','la boca','barracas','parque patricios'],
  Belgrano: ['belgrano','núñez','nuñez','coghlan','saavedra','villa urquiza'],
  Caballito: ['caballito','almagro','boedo','parque chacabuco','flores'],
  'Villa Crespo': ['villa crespo','chacarita','paternal','villa del parque','agronomía','agronomia'],
  Recoleta: ['recoleta','barrio norte'],
};

function detectZoneFromAddress(addressParts) {
  const text = (typeof addressParts === 'string' ? addressParts : Object.values(addressParts).join(' ')).toLowerCase();
  for (const [zone, barrios] of Object.entries(ZONE_BARRIOS)) {
    for (const b of barrios) {
      if (text.includes(b)) return zone;
    }
  }
  return null;
}

// Nominatim geocoding (free, no API key)
async function geocodeAddress(address) {
  try {
    const q = encodeURIComponent(address + ', Buenos Aires, Argentina');
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=5&countrycodes=ar`, {
      headers: { 'Accept-Language': 'es' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(r => ({
      display: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      suburb: r.address?.suburb || r.address?.neighbourhood || r.address?.city_district || '',
      city: r.address?.city || r.address?.town || '',
      road: r.address?.road || '',
      number: r.address?.house_number || '',
    }));
  } catch {
    return [];
  }
}

/* ============================================================ */

const ZONES = Object.keys(ZONE_BARRIOS);
const ZONE_COLORS = { Centro:'sky', Palermo:'violet', 'San Telmo':'amber', Belgrano:'emerald', Caballito:'rose', 'Villa Crespo':'orange', Recoleta:'indigo' };
const zoneColor = (z) => ZONE_COLORS[z] || 'gray';

const INITIAL_CLIENTS = [
  { id:1, name:'María González', type:'casa', phone:'1155443322', address:'Av. Rivadavia 4502, Caballito, CABA', zone:'Caballito', lat:-34.6098, lng:-58.4307, balance:-1200, containers:{sifones:3,bidones:1}, lastOrder:'2026-03-20' },
  { id:2, name:'Kiosco Don Pedro', type:'empresa', phone:'1166778899', address:'Sarmiento 1820, Centro, CABA', zone:'Centro', lat:-34.6045, lng:-58.3910, balance:0, containers:{sifones:8,bidones:4}, lastOrder:'2026-03-18' },
  { id:3, name:'Oficina TechCorp', type:'empresa', phone:'1144556677', address:'Corrientes 880, Centro, CABA', zone:'Centro', lat:-34.6037, lng:-58.3785, balance:-3500, containers:{sifones:0,bidones:6}, lastOrder:'2026-03-15' },
  { id:4, name:'Juan Pérez', type:'casa', phone:'1133221100', address:'Cabildo 1245, Belgrano, CABA', zone:'Belgrano', lat:-34.5627, lng:-58.4563, balance:500, containers:{sifones:2,bidones:0}, lastOrder:'2026-03-22' },
  { id:5, name:'Bar El Farolito', type:'empresa', phone:'1122334455', address:'Defensa 920, San Telmo, CABA', zone:'San Telmo', lat:-34.6214, lng:-58.3716, balance:-8200, containers:{sifones:12,bidones:2}, lastOrder:'2026-03-10' },
  { id:6, name:'Ana Rodríguez', type:'casa', phone:'1199887766', address:'Scalabrini Ortiz 3200, Palermo, CABA', zone:'Palermo', lat:-34.5885, lng:-58.4226, balance:0, containers:{sifones:4,bidones:2}, lastOrder:'2026-03-21' },
  { id:7, name:'Café Palermo Soho', type:'empresa', phone:'1177665544', address:'Honduras 4800, Palermo, CABA', zone:'Palermo', lat:-34.5862, lng:-58.4275, balance:-2100, containers:{sifones:6,bidones:3}, lastOrder:'2026-03-19' },
  { id:8, name:'Laura Fernández', type:'casa', phone:'1188776655', address:'Juramento 2300, Belgrano, CABA', zone:'Belgrano', lat:-34.5608, lng:-58.4529, balance:-600, containers:{sifones:2,bidones:1}, lastOrder:'2026-03-17' },
];

const INITIAL_PRODUCTS = [
  { id:1, name:'Sifón clásico', unit:'un', stock:340, price:850, returnable:true },
  { id:2, name:'Sifón retornable', unit:'un', stock:120, price:0, returnable:true },
  { id:3, name:'Bidón 20L', unit:'un', stock:85, price:2200, returnable:true },
  { id:4, name:'Agua 500ml', unit:'un', stock:480, price:450, returnable:false },
  { id:5, name:'Pack agua 500ml x6', unit:'pack', stock:60, price:2400, returnable:false },
  { id:6, name:'Soda 2L', unit:'un', stock:200, price:1100, returnable:false },
];

// --- Icons ---
const I = ({d,size=20,className=''})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d}/></svg>);
const IC = {
  home:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',users:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  pkg:'M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  truck:'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  chart:'M18 20V10M12 20V4M6 20v-6',sun:'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 17a5 5 0 100-10 5 5 0 000 10z',
  moon:'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',search:'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35',plus:'M12 5v14M5 12h14',check:'M20 6L9 17l-5-5',x:'M18 6L6 18M6 6l12 12',
  phone:'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z',
  wa:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z',
  back:'M19 12H5M12 19l-7-7 7-7',pin:'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',alert:'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  camera:'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z',mapPin2:'M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z',
  userPlus:'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6',box:'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
  route:'M3 17l4-4 4 4 4-4 4 4M3 7l4-4 4 4 4-4 4 4',play:'M5 3l14 9-14 9V3z',nav:'M3 11l19-9-9 19-2-8-8-2z',loader:'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
};

// --- Utilities ---
const fmt = (n)=>{const a=Math.abs(n);const s=a.toLocaleString('es-AR');return n<0?`-$${s}`:`$${s}`;};
const openGMaps = (stops)=>{if(!stops?.length)return;const v=stops.filter(s=>s.lat&&s.lng);if(!v.length)return;if(v.length===1){window.open(`https://www.google.com/maps/dir/?api=1&destination=${v[0].lat},${v[0].lng}`,'_blank');return;}const d=v[v.length-1];const wp=v.slice(0,-1).map(s=>`${s.lat},${s.lng}`).join('|');window.open(`https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}&waypoints=${wp}`,'_blank');};

// --- UI Components ---
const Badge = ({children,variant='default',className=''})=>{const c={default:'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',success:'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',warning:'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',danger:'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',info:'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',violet:'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'};return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${c[variant]||c.default} ${className}`}>{children}</span>;};
const Card = ({children,className='',onClick})=>(<div onClick={onClick} className={`bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl p-4 ${onClick?'cursor-pointer active:scale-[0.98] transition-transform':''} ${className}`}>{children}</div>);
const Stat = ({label,value,sub,variant})=>{const c={default:'text-gray-900 dark:text-gray-100',success:'text-emerald-600 dark:text-emerald-400',danger:'text-red-600 dark:text-red-400',warning:'text-amber-600 dark:text-amber-400'};return <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3.5"><p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 font-medium">{label}</p><p className={`text-xl font-bold tabular-nums ${c[variant||'default']}`}>{value}</p>{sub&&<p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}</div>;};
const Btn = ({children,onClick,v='primary',className='',disabled,size='md'})=>{const base='flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none select-none';const sz=size==='sm'?'py-2 px-4 text-sm':size==='lg'?'py-4 px-6 text-base':'py-3 px-5 text-sm';const vars={primary:'bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-600/20',secondary:'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200',danger:'bg-red-600 hover:bg-red-700 text-white',success:'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20',outline:'border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'};return <button onClick={onClick} disabled={disabled} className={`${base} ${sz} ${vars[v]} ${className}`}>{children}</button>;};
const Qty = ({value,onChange,min=0,max=9999,label})=>(<div className="flex items-center gap-1">{label&&<span className="text-sm text-gray-500 dark:text-gray-400 mr-2 min-w-[70px]">{label}</span>}<button onClick={()=>onChange(Math.max(min,value-1))} className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl font-bold text-gray-500 dark:text-gray-400 active:scale-90 transition-all select-none">−</button><span className="w-12 text-center text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</span><button onClick={()=>onChange(Math.min(max,value+1))} className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-xl font-bold text-sky-600 dark:text-sky-400 active:scale-90 transition-all select-none">+</button></div>);
const Search = ({value,onChange,placeholder='Buscar...'})=>(<div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><I d={IC.search} size={18}/></div><input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/></div>);
const BackBtn = ({onClick,label='Volver'})=>(<button onClick={onClick} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2"><I d={IC.back} size={16}/>{label}</button>);
const StepBar = ({steps,current})=>(<div className="flex items-center gap-1.5 mb-4">{steps.map((s,i)=>(<div key={i} className="flex items-center gap-1.5 flex-1"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${i<current?'bg-emerald-500 text-white':i===current?'bg-sky-600 text-white ring-4 ring-sky-600/20':'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>{i<current?<I d={IC.check} size={13}/>:i+1}</div><span className={`text-[11px] font-semibold truncate ${i===current?'text-sky-600 dark:text-sky-400':i<current?'text-emerald-600':'text-gray-400'}`}>{s}</span>{i<steps.length-1&&<div className={`flex-1 h-0.5 rounded ${i<current?'bg-emerald-400':'bg-gray-200 dark:bg-gray-700'}`}/>}</div>))}</div>);
const Modal = ({open,onClose,title,children})=>{if(!open)return null;return(<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/><div onClick={e=>e.stopPropagation()} className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl"><div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 shrink-0"><h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><I d={IC.x} size={20}/></button></div><div className="overflow-y-auto flex-1 p-4">{children}</div></div></div>);};

// --- Map ---
const RouteMap = ({stops=[],height=260,showRoute=true})=>{const mapRef=useRef(null);const mapInst=useRef(null);const markers=useRef([]);const poly=useRef(null);const[loaded,setLoaded]=useState(false);
  useEffect(()=>{if(typeof window==='undefined')return;if(window.L){setLoaded(true);return;}const css=document.createElement('link');css.rel='stylesheet';css.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(css);const js=document.createElement('script');js.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';js.onload=()=>setLoaded(true);document.head.appendChild(js);},[]);
  useEffect(()=>{if(!loaded||!mapRef.current||!window.L)return;const L=window.L;if(!mapInst.current){mapInst.current=L.map(mapRef.current,{zoomControl:false,attributionControl:false}).setView([-34.6037,-58.3816],13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(mapInst.current);L.control.zoom({position:'bottomright'}).addTo(mapInst.current);}const map=mapInst.current;markers.current.forEach(m=>map.removeLayer(m));markers.current=[];if(poly.current){map.removeLayer(poly.current);poly.current=null;}if(!stops?.length)return;const vs=stops.filter(s=>s.lat&&s.lng);const bounds=[];vs.forEach((s,i)=>{const done=s.status==='entregado';const icon=L.divIcon({className:'',html:`<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:white;background:${done?'#059669':'#0284c7'};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-family:system-ui;">${i+1}</div>`,iconSize:[32,32],iconAnchor:[16,16]});const m=L.marker([s.lat,s.lng],{icon}).addTo(map);m.bindPopup(`<b>${s.clientName||s.name}</b><br/><small>${s.address}</small>`);markers.current.push(m);bounds.push([s.lat,s.lng]);});if(showRoute&&bounds.length>1){poly.current=L.polyline(bounds,{color:'#0284c7',weight:3,opacity:0.7,dashArray:'8 6'}).addTo(map);}if(bounds.length>0)map.fitBounds(bounds,{padding:[40,40],maxZoom:15});setTimeout(()=>map.invalidateSize(),100);},[loaded,stops,showRoute]);
  useEffect(()=>()=>{if(mapInst.current){mapInst.current.remove();mapInst.current=null;}},[]);
  return(<div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative" style={{height}}><div ref={mapRef} style={{width:'100%',height:'100%'}}/>{!loaded&&<div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"><p className="text-xs text-gray-400 animate-pulse">Cargando mapa...</p></div>}</div>);
};

/* ============================================================
   ADDRESS AUTOCOMPLETE + AUTO-ZONE COMPONENT
   ============================================================ */
const AddressInput = ({ value, onChange, onSelect }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (q.length < 4) { setSuggestions([]); return; }
    setLoading(true);
    const results = await geocodeAddress(q);
    setSuggestions(results);
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 500);
  };

  const handleSelect = (s) => {
    const shortAddr = [s.road, s.number, s.suburb].filter(Boolean).join(' ');
    const zone = detectZoneFromAddress(s.suburb + ' ' + s.display);
    onSelect({
      address: shortAddr || s.display.split(',').slice(0, 3).join(','),
      lat: s.lat,
      lng: s.lng,
      zone: zone,
      suburb: s.suburb,
    });
    setSuggestions([]);
    setFocused(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><I d={IC.pin} size={16}/></div>
        <input
          type="text" value={value} onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Escribí la dirección..."
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        )}
      </div>
      {focused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => {
            const zone = detectZoneFromAddress(s.suburb + ' ' + s.display);
            return (
              <button key={i} onMouseDown={() => handleSelect(s)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="flex items-start gap-2">
                  <I d={IC.pin} size={14} className="text-gray-400 mt-0.5 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {s.road} {s.number}{s.suburb ? `, ${s.suburb}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{s.display}</p>
                  </div>
                  {zone && <Badge variant="violet" className="shrink-0 mt-0.5">{zone}</Badge>}
                  {!zone && s.suburb && <Badge variant="default" className="shrink-0 mt-0.5">{s.suburb}</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   MÓDULO 1: CLIENTES
   ============================================================ */
const ClientsModule = () => {
  const {clients,setClients}=useApp();const[search,setSearch]=useState('');const[filter,setFilter]=useState('all');const[selected,setSelected]=useState(null);const[showNew,setShowNew]=useState(false);
  const filtered=useMemo(()=>{let l=clients;if(filter!=='all')l=l.filter(c=>c.type===filter);if(search)l=l.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.address.toLowerCase().includes(search.toLowerCase())||c.zone?.toLowerCase().includes(search.toLowerCase()));return l;},[clients,search,filter]);
  if(selected)return <ClientDetail client={selected} onBack={()=>setSelected(null)}/>;if(showNew)return <NewClientForm onBack={()=>setShowNew(false)}/>;
  return(<div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Clientes</h2><Btn v="primary" size="sm" onClick={()=>setShowNew(true)}><I d={IC.plus} size={16}/>Nuevo</Btn></div><Search value={search} onChange={setSearch} placeholder="Buscar por nombre, dirección o zona..."/><div className="flex gap-2 flex-wrap">{[['all','Todos'],['casa','Casas'],['empresa','Empresas']].map(([k,l])=>(<button key={k} onClick={()=>setFilter(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter===k?'bg-sky-600 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{l}</button>))}</div>
    <div className="space-y-2">{filtered.map(c=>(<Card key={c.id} onClick={()=>setSelected(c)} className="!p-3"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 flex-wrap"><span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{c.name}</span><Badge variant={c.type==='empresa'?'info':'default'}>{c.type==='empresa'?'Empresa':'Casa'}</Badge>{c.zone&&<Badge variant="violet">{c.zone}</Badge>}</div><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{c.address}</p></div><div className="text-right ml-3"><span className={`text-sm font-bold ${c.balance<0?'text-red-600 dark:text-red-400':c.balance>0?'text-emerald-600 dark:text-emerald-400':'text-gray-400'}`}>{fmt(c.balance)}</span>{c.balance<0&&<p className="text-[10px] text-red-400">Fiado</p>}</div></div></Card>))}</div>
  </div>);
};

const ClientDetail = ({client,onBack})=>(<div className="space-y-4"><BackBtn onClick={onBack}/><div><div className="flex items-center gap-2 flex-wrap mb-1"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{client.name}</h2><Badge variant={client.type==='empresa'?'info':'default'}>{client.type==='empresa'?'Empresa':'Casa'}</Badge>{client.zone&&<Badge variant="violet">{client.zone}</Badge>}</div><p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><I d={IC.pin} size={14}/>{client.address}</p></div>{client.lat&&<RouteMap stops={[{...client,clientName:client.name}]} height={180} showRoute={false}/>}<div className="flex gap-2"><a href={`tel:${client.phone}`} className="flex-1"><Btn v="secondary" className="w-full"><I d={IC.phone} size={16}/>Llamar</Btn></a><a href={`https://wa.me/549${client.phone}`} target="_blank" rel="noopener" className="flex-1"><Btn v="success" className="w-full">WhatsApp</Btn></a></div><div className="grid grid-cols-2 gap-3"><Stat label="Saldo" value={fmt(client.balance)} variant={client.balance<0?'danger':client.balance>0?'success':'default'}/><Stat label="Último pedido" value={client.lastOrder}/><Stat label="Sifones" value={client.containers.sifones}/><Stat label="Bidones" value={client.containers.bidones}/></div></div>);

/* ============================================================
   NEW CLIENT FORM with ADDRESS AUTOCOMPLETE + AUTO-ZONE
   ============================================================ */
const NewClientForm = ({onBack}) => {
  const {clients,setClients}=useApp();
  const [f,sF]=useState({name:'',type:'casa',phone:'',address:'',zone:'',lat:null,lng:null});
  const [zoneAuto,setZoneAuto]=useState(true); // true = auto-detected, false = manual override

  const handleAddressSelect = (data) => {
    sF(prev => ({
      ...prev,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      zone: data.zone || prev.zone,
    }));
    if (data.zone) setZoneAuto(true);
  };

  const save = () => {
    if (!f.name || !f.phone) return;
    setClients([...clients, { id: Date.now(), ...f, balance: 0, containers: { sifones: 0, bidones: 0 }, lastOrder: '-' }]);
    onBack();
  };

  return (
    <div className="space-y-4">
      <BackBtn onClick={onBack}/>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nuevo cliente</h2>
      <div className="space-y-3">
        <input placeholder="Nombre / Razón Social" value={f.name} onChange={e=>sF({...f,name:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
        <div className="flex gap-2">{['casa','empresa'].map(t=>(<button key={t} onClick={()=>sF({...f,type:t})} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${f.type===t?'bg-sky-600 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{t==='casa'?'Casa':'Empresa'}</button>))}</div>
        <input placeholder="Teléfono" value={f.phone} onChange={e=>sF({...f,phone:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>

        {/* ADDRESS with autocomplete */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block font-medium">Dirección</label>
          <AddressInput value={f.address} onChange={v=>sF({...f,address:v})} onSelect={handleAddressSelect}/>
        </div>

        {/* AUTO-ZONE indicator */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Zona</label>
            {f.zone && zoneAuto && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <I d={IC.check} size={12}/> Detectada automáticamente
              </span>
            )}
          </div>
          {f.zone ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-300 dark:border-violet-700 text-sm font-semibold text-violet-700 dark:text-violet-400">
                {f.zone}
              </div>
              <button onClick={() => { sF({...f, zone: ''}); setZoneAuto(false); }}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                Cambiar
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ZONES.map(z=>(
                <button key={z} onClick={()=>{sF({...f,zone:z});setZoneAuto(false);}}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-violet-100 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-400 transition">{z}</button>
              ))}
            </div>
          )}
        </div>

        {/* Mini map preview */}
        {f.lat && <RouteMap stops={[{lat:f.lat,lng:f.lng,name:f.name||'Nuevo cliente',address:f.address,clientName:f.name||'Nuevo'}]} height={160} showRoute={false}/>}
      </div>
      <Btn v="primary" onClick={save} disabled={!f.name||!f.phone} className="w-full">Guardar cliente</Btn>
    </div>
  );
};

/* ============================================================
   MÓDULO 2: STOCK
   ============================================================ */
const StockModule = ()=>{const{products,setProducts,role}=useApp();const[search,setSearch]=useState('');const[showNew,setShowNew]=useState(false);const[editing,setEditing]=useState(null);const filtered=products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));const lowStock=products.filter(p=>p.stock<50);if(showNew)return <NewProductForm onBack={()=>setShowNew(false)}/>;if(editing)return <StockMov product={editing} onBack={()=>setEditing(null)}/>;return(<div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Stock</h2>{role==='admin'&&<Btn v="primary" size="sm" onClick={()=>setShowNew(true)}><I d={IC.plus} size={16}/>Producto</Btn>}</div>{lowStock.length>0&&<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2"><I d={IC.alert} size={16} className="text-amber-600 shrink-0 mt-0.5"/><div><p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Stock bajo</p><p className="text-xs text-amber-600">{lowStock.map(p=>p.name).join(', ')}</p></div></div>}<Search value={search} onChange={setSearch} placeholder="Buscar producto..."/><div className="space-y-2">{filtered.map(p=>(<Card key={p.id} onClick={()=>role==='admin'&&setEditing(p)} className="!p-3"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{p.name}</span>{p.returnable&&<Badge variant="info">Ret.</Badge>}</div><p className="text-xs text-gray-400 mt-0.5">{fmt(p.price)} / {p.unit}</p></div><div className="text-right"><span className={`text-lg font-bold tabular-nums ${p.stock<50?'text-amber-600 dark:text-amber-400':'text-gray-900 dark:text-gray-100'}`}>{p.stock}</span></div></div></Card>))}</div></div>);};
const StockMov = ({product,onBack})=>{const{products,setProducts}=useApp();const[type,setType]=useState('entrada');const[qty,setQty]=useState(0);const save=()=>{if(qty<=0)return;setProducts(products.map(p=>p.id===product.id?{...p,stock:type==='entrada'?p.stock+qty:Math.max(0,p.stock-qty)}:p));onBack();};return(<div className="space-y-4"><BackBtn onClick={onBack}/><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{product.name}</h2><p className="text-sm text-gray-500">Stock: <b className="text-gray-900 dark:text-gray-100">{product.stock}</b></p><div className="flex gap-2">{['entrada','salida'].map(t=>(<button key={t} onClick={()=>setType(t)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${type===t?(t==='entrada'?'bg-emerald-600 text-white':'bg-red-600 text-white'):'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{t==='entrada'?'Entrada':'Salida'}</button>))}</div><div className="flex justify-center py-4"><Qty value={qty} onChange={setQty}/></div><Btn v={type==='entrada'?'success':'danger'} onClick={save} className="w-full">Registrar {type}</Btn></div>);};
const NewProductForm = ({onBack})=>{const{products,setProducts}=useApp();const[f,sF]=useState({name:'',price:'',stock:'',unit:'un',returnable:false});const save=()=>{if(!f.name)return;setProducts([...products,{id:Date.now(),...f,price:Number(f.price)||0,stock:Number(f.stock)||0}]);onBack();};return(<div className="space-y-4"><BackBtn onClick={onBack}/><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nuevo producto</h2><div className="space-y-3"><input placeholder="Nombre" value={f.name} onChange={e=>sF({...f,name:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/><div className="grid grid-cols-2 gap-3"><input placeholder="Precio" type="number" value={f.price} onChange={e=>sF({...f,price:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/><input placeholder="Stock" type="number" value={f.stock} onChange={e=>sF({...f,stock:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/></div><label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"><input type="checkbox" checked={f.returnable} onChange={e=>sF({...f,returnable:e.target.checked})} className="w-4 h-4 rounded"/>Envase retornable</label></div><Btn v="primary" onClick={save} className="w-full">Guardar</Btn></div>);};

/* ============================================================
   MÓDULO 3: REPARTO (full flow - load truck → build route → deliver)
   ============================================================ */
const DeliveryModule = ()=>{const{activeRoute,pastRoutes}=useApp();const[showInit,setShowInit]=useState(false);if(showInit&&!activeRoute)return <InitRoute onClose={()=>setShowInit(false)}/>;if(activeRoute)return <ActiveRoute/>;return(<div className="space-y-4"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Reparto</h2><div className="text-center py-10"><div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-900/40 dark:to-sky-800/30 flex items-center justify-center mx-auto mb-5"><I d={IC.truck} size={36} className="text-sky-600 dark:text-sky-400"/></div><h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">Sin reparto activo</h3><p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-[260px] mx-auto">Cargá el camión, armá el recorrido y salí a repartir</p><Btn v="primary" size="lg" onClick={()=>setShowInit(true)} className="mx-auto shadow-lg shadow-sky-600/25"><I d={IC.plus} size={22}/>Iniciar reparto</Btn></div>{pastRoutes.length>0&&<div><p className="text-xs font-semibold text-gray-500 uppercase mb-2">Anteriores</p><div className="space-y-2">{pastRoutes.map((r,i)=>(<Card key={i} className="!p-3 opacity-70"><div className="flex justify-between"><div><p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{r.date}</p><p className="text-xs text-gray-400">{r.stops} paradas — {r.delivered} entregas</p></div><span className="text-sm font-bold text-emerald-600">{fmt(r.collected)}</span></div></Card>))}</div></div>}</div>);};

const InitRoute = ({onClose})=>{const{products,setProducts,clients,setActiveRoute}=useApp();const[step,setStep]=useState(0);const[ts,setTs]=useState(products.reduce((a,p)=>({...a,[p.id]:0}),{}));const[rc,setRc]=useState([]);const[mode,setMode]=useState(null);const[selZones,setSelZones]=useState([]);
  const truckTotal=Object.entries(ts).reduce((s,[id,q])=>{const p=products.find(x=>x.id===Number(id));return s+(p?p.price*q:0);},0);const truckItems=Object.entries(ts).filter(([,q])=>q>0);
  const start=()=>{setProducts(p=>p.map(x=>({...x,stock:x.stock-(ts[x.id]||0)})));setActiveRoute({id:Date.now(),truckStock:{...ts},stops:rc.map((c,i)=>({id:i+1,clientId:c.id,clientName:c.name,address:c.address,zone:c.zone,lat:c.lat,lng:c.lng,status:'pendiente',items:[],returnContainers:{sifones:0,bidones:0},payment:null,paymentMethod:null,total:0})),startedAt:new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})});onClose();};
  return(<div className="space-y-4"><BackBtn onClick={onClose} label="Cancelar"/><StepBar steps={['Cargar camión','Armar recorrido','Confirmar']} current={step}/>
    {step===0&&<div className="space-y-4"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><I d={IC.box} size={22} className="text-amber-600"/></div><div><h3 className="font-bold text-gray-900 dark:text-gray-100">Cargar camión</h3><p className="text-xs text-gray-500">Seleccioná del depósito</p></div></div><div className="space-y-2">{products.filter(p=>p.stock>0&&p.price>0).map(p=>(<Card key={p.id} className="!p-3"><div className="flex items-center justify-between gap-2"><div className="flex-1 min-w-0"><span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{p.name}</span><div className="flex gap-3 mt-0.5"><span className="text-xs text-gray-400">Dep: <b>{p.stock}</b></span><span className="text-xs text-gray-400">{fmt(p.price)}</span></div></div><Qty value={ts[p.id]||0} onChange={v=>setTs({...ts,[p.id]:v})} max={p.stock}/></div></Card>))}</div>{truckItems.length>0&&<div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-3"><div className="flex justify-between"><span className="text-sm font-bold text-sky-700 dark:text-sky-400">En el camión</span><span className="text-sm font-bold text-sky-700 dark:text-sky-400">{fmt(truckTotal)}</span></div></div>}<Btn v="primary" onClick={()=>setStep(1)} disabled={!truckItems.length} className="w-full" size="lg">Siguiente: Armar recorrido</Btn></div>}
    {step===1&&<BuildRoute mode={mode} setMode={setMode} selZones={selZones} setSelZones={setSelZones} rc={rc} setRc={setRc} onBack={()=>setStep(0)} onNext={()=>setStep(2)}/>}
    {step===2&&<div className="space-y-4"><RouteMap stops={rc.map(c=>({...c,clientName:c.name}))} height={220}/><Btn v="outline" size="sm" onClick={()=>openGMaps(rc)} className="w-full"><I d={IC.nav} size={16}/>Abrir en Google Maps</Btn><Card><h4 className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Camión</h4>{truckItems.map(([id,q])=>{const p=products.find(x=>x.id===Number(id));return p&&<div key={id} className="flex justify-between text-sm"><span className="text-gray-700 dark:text-gray-300">{p.name}</span><span className="font-bold">{q} {p.unit}</span></div>;})}<div className="flex justify-between text-sm border-t border-gray-100 dark:border-gray-800 pt-2 mt-2"><span className="font-bold">Total</span><span className="font-bold text-sky-600">{fmt(truckTotal)}</span></div></Card><Card><h4 className="text-[11px] font-semibold text-gray-500 uppercase mb-2">{rc.length} paradas</h4>{rc.map((c,i)=>(<div key={c.id} className="flex items-center gap-2 mb-2"><div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-[11px] font-bold text-sky-700">{i+1}</div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</p><p className="text-xs text-gray-400 truncate">{c.address}</p></div><Badge variant="violet">{c.zone}</Badge></div>))}</Card><div className="flex gap-2"><Btn v="secondary" onClick={()=>setStep(1)} className="flex-1">Atrás</Btn><Btn v="success" onClick={start} className="flex-1" size="lg"><I d={IC.play} size={18}/>Salir a repartir</Btn></div></div>}
  </div>);
};

const BuildRoute = ({mode,setMode,selZones,setSelZones,rc,setRc,onBack,onNext})=>{
  const{clients}=useApp();const[showAdd,setShowAdd]=useState(false);const[search,setSearch]=useState('');
  const toggleZone=(n)=>{const s=selZones.includes(n);setSelZones(s?selZones.filter(z=>z!==n):[...selZones,n]);if(s)setRc(p=>p.filter(c=>c.zone!==n));else{const zc=clients.filter(c=>c.zone===n&&!rc.find(r=>r.id===c.id));setRc(p=>[...p,...zc]);}};
  const addC=(c)=>{if(!rc.find(r=>r.id===c.id))setRc(p=>[...p,c]);setShowAdd(false);setSearch('');};
  const moveC=(i,d)=>{const n=[...rc];const t=i+d;if(t<0||t>=n.length)return;[n[i],n[t]]=[n[t],n[i]];setRc(n);};
  const avail=clients.filter(c=>!rc.find(r=>r.id===c.id));
  const searched=search?avail.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.address.toLowerCase().includes(search.toLowerCase())||(c.zone||'').toLowerCase().includes(search.toLowerCase())):avail;
  return(<div className="space-y-4"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"><I d={IC.route} size={22} className="text-violet-600"/></div><div><h3 className="font-bold text-gray-900 dark:text-gray-100">Armar recorrido</h3><p className="text-xs text-gray-500">Por zona, por cliente, o combiná</p></div></div>
    {!mode?(<div className="grid grid-cols-2 gap-3"><Card onClick={()=>setMode('zona')} className="!p-5 text-center"><div className="w-14 h-14 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-3"><I d={IC.mapPin2} size={26} className="text-violet-600"/></div><p className="font-bold text-sm text-gray-900 dark:text-gray-100">Por zona</p></Card><Card onClick={()=>setMode('cliente')} className="!p-5 text-center"><div className="w-14 h-14 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mx-auto mb-3"><I d={IC.users} size={26} className="text-sky-600"/></div><p className="font-bold text-sm text-gray-900 dark:text-gray-100">Por cliente</p></Card></div>):(<>
      <div><p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Zonas</p><div className="flex flex-wrap gap-2">{ZONES.map(z=>{const s=selZones.includes(z);const cnt=clients.filter(c=>c.zone===z).length;return <button key={z} onClick={()=>toggleZone(z)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${s?'bg-violet-600 text-white border-violet-600':'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>{s&&<I d={IC.check} size={14}/>}{z} <span className="opacity-60">({cnt})</span></button>;})}</div></div>
      {rc.length>0&&<RouteMap stops={rc.map(c=>({...c,clientName:c.name}))} height={200}/>}
      {rc.length>0&&<div><div className="flex justify-between mb-2"><p className="text-[11px] font-semibold text-gray-500 uppercase">Paradas ({rc.length})</p><button onClick={()=>setShowAdd(true)} className="flex items-center gap-1 text-xs font-semibold text-sky-600"><I d={IC.userPlus} size={14}/>Agregar</button></div><div className="space-y-1.5">{rc.map((c,i)=>(<div key={c.id} className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl p-2.5"><div className="flex flex-col gap-0.5"><button onClick={()=>moveC(i,-1)} disabled={!i} className="text-gray-400 disabled:opacity-20"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg></button><button onClick={()=>moveC(i,1)} disabled={i===rc.length-1} className="text-gray-400 disabled:opacity-20"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg></button></div><div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-800 flex items-center justify-center text-[11px] font-bold text-sky-700 dark:text-sky-400">{i+1}</div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</p><p className="text-xs text-gray-400 truncate">{c.address}</p></div><Badge variant="violet" className="shrink-0">{c.zone}</Badge><button onClick={()=>setRc(p=>p.filter(x=>x.id!==c.id))} className="p-1 text-gray-400 hover:text-red-500"><I d={IC.x} size={16}/></button></div>))}</div></div>}
      {mode==='cliente'&&!rc.length&&<Btn v="outline" onClick={()=>setShowAdd(true)} className="w-full"><I d={IC.userPlus} size={18}/>Agregar clientes</Btn>}
      <Modal open={showAdd} onClose={()=>{setShowAdd(false);setSearch('');}} title="Agregar cliente"><div className="space-y-3"><Search value={search} onChange={setSearch} placeholder="Nombre, dirección o zona..."/><div className="space-y-1 max-h-[50vh] overflow-y-auto">{searched.map(c=>(<button key={c.id} onClick={()=>addC(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{c.name}</span><Badge variant="violet">{c.zone}</Badge></div><p className="text-xs text-gray-400 truncate">{c.address}</p></div><div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0"><I d={IC.plus} size={18} className="text-sky-600"/></div></button>))}</div></div></Modal>
      <div className="flex gap-2"><Btn v="secondary" onClick={()=>{setMode(null);setRc([]);setSelZones([]);}} className="flex-1">Cambiar</Btn><Btn v="primary" onClick={onNext} disabled={!rc.length} className="flex-1" size="lg">Siguiente</Btn></div>
    </>)}
    {!mode&&<Btn v="secondary" onClick={onBack} className="w-full">Volver</Btn>}
  </div>);
};

const ActiveRoute = ()=>{const{activeRoute:ar,setActiveRoute,setPastRoutes,clients,setClients}=useApp();const[sel,setSel]=useState(null);const[showAdd,setShowAdd]=useState(false);const[search,setSearch]=useState('');
  const pend=ar.stops.filter(s=>s.status==='pendiente');const done=ar.stops.filter(s=>s.status==='entregado');const tot=done.reduce((s,x)=>s+(x.payment||0),0);
  const finish=()=>{setPastRoutes(p=>[{date:new Date().toLocaleDateString('es-AR'),stops:ar.stops.length,delivered:done.length,collected:tot},...p]);setActiveRoute(null);};
  const avail=clients.filter(c=>!ar.stops.find(s=>s.clientId===c.id));const searched=search?avail.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())):avail;
  const addC=(c)=>{setActiveRoute({...ar,stops:[...ar.stops,{id:ar.stops.length+1,clientId:c.id,clientName:c.name,address:c.address,zone:c.zone,lat:c.lat,lng:c.lng,status:'pendiente',items:[],returnContainers:{sifones:0,bidones:0},payment:null,paymentMethod:null,total:0}]});setShowAdd(false);setSearch('');};
  if(sel)return <StopDetail stop={sel} onBack={()=>setSel(null)}/>;
  return(<div className="space-y-4"><div className="flex justify-between"><div><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Reparto en curso</h2><p className="text-xs text-gray-500">{ar.startedAt}</p></div><Badge variant="info">{pend.length} pend.</Badge></div><RouteMap stops={ar.stops} height={220}/><Btn v="outline" size="sm" onClick={()=>openGMaps(pend.length?pend:ar.stops)} className="w-full"><I d={IC.nav} size={16}/>Google Maps</Btn><div className="grid grid-cols-3 gap-3"><Stat label="Pendientes" value={pend.length} variant="warning"/><Stat label="Entregados" value={done.length} variant="success"/><Stat label="Cobrado" value={fmt(tot)} variant="success"/></div><Btn v="outline" onClick={()=>setShowAdd(true)} className="w-full" size="sm"><I d={IC.userPlus} size={16}/>Agregar parada</Btn>
    <Modal open={showAdd} onClose={()=>{setShowAdd(false);setSearch('');}} title="Agregar parada"><div className="space-y-3"><Search value={search} onChange={setSearch}/><div className="space-y-1 max-h-[50vh] overflow-y-auto">{searched.map(c=>(<button key={c.id} onClick={()=>addC(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left"><div className="flex-1 min-w-0"><span className="font-semibold text-sm text-gray-900 dark:text-gray-100 block truncate">{c.name}</span><p className="text-xs text-gray-400 truncate">{c.address}</p></div><div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center"><I d={IC.plus} size={18} className="text-sky-600"/></div></button>))}</div></div></Modal>
    {pend.length>0&&<div><p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Pendientes</p>{pend.map((s,i)=>(<Card key={s.id} onClick={()=>setSel(s)} className="!p-3 mb-2"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-sm font-bold text-amber-700">{i+1}</div><div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{s.clientName}</p><p className="text-xs text-gray-400 truncate">{s.address}</p></div><Badge variant="violet">{s.zone}</Badge></div></Card>))}</div>}
    {done.length>0&&<div><p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Entregados</p>{done.map(s=>(<Card key={s.id} className="!p-3 mb-2 opacity-60"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><I d={IC.check} size={16} className="text-emerald-600"/></div><div className="flex-1"><p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{s.clientName}</p><p className="text-xs text-gray-400">{s.paymentMethod==='fiado'?'Fiado':`${s.paymentMethod} — ${fmt(s.payment)}`}</p></div></div></Card>))}</div>}
    {!pend.length&&<Btn v="success" onClick={finish} className="w-full" size="lg"><I d={IC.check} size={20}/>Finalizar</Btn>}
    {pend.length>0&&<Btn v="danger" onClick={finish} className="w-full" size="sm">Finalizar anticipado</Btn>}
  </div>);
};

const StopDetail = ({stop,onBack})=>{const{activeRoute:ar,setActiveRoute,clients,setClients,products}=useApp();const[step,setStep]=useState(0);const[items,setItems]=useState(products.filter(p=>p.price>0).map(p=>({...p,qty:0})));const[rS,sRS]=useState(0);const[rB,sRB]=useState(0);const[pm,sPm]=useState(null);const[pa,sPa]=useState('');
  const total=items.reduce((s,it)=>s+it.price*it.qty,0);
  const confirm=()=>{const paid=pm==='fiado'?0:(Number(pa)||total);const rem=total-paid;setActiveRoute(p=>({...p,stops:p.stops.map(s=>s.id===stop.id?{...s,status:'entregado',items:items.filter(it=>it.qty>0).map(it=>({productId:it.id,qty:it.qty,name:it.name})),returnContainers:{sifones:rS,bidones:rB},payment:paid,paymentMethod:pm,total}:s)}));if(rem>0)setClients(p=>p.map(c=>c.id===stop.clientId?{...c,balance:c.balance-rem}:c));setStep(3);};
  if(step===3)return(<div className="text-center py-10 space-y-4"><div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto"><I d={IC.check} size={32} className="text-emerald-600"/></div><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Entrega registrada</h2><Btn v="primary" onClick={onBack} className="w-full">Volver</Btn></div>);
  return(<div className="space-y-4"><BackBtn onClick={onBack}/><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{stop.clientName}</h2><p className="text-sm text-gray-500 flex items-center gap-1"><I d={IC.pin} size={14}/>{stop.address}</p>{stop.lat&&<RouteMap stops={[stop]} height={140} showRoute={false}/>}{stop.lat&&<Btn v="outline" size="sm" onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`,'_blank')} className="w-full"><I d={IC.nav} size={16}/>Cómo llegar</Btn>}<div className="flex gap-1">{['Productos','Envases','Cobro'].map((l,i)=>(<div key={i} className={`flex-1 h-1.5 rounded-full ${step>=i?'bg-sky-600':'bg-gray-200 dark:bg-gray-700'}`}/>))}</div>
    {step===0&&<div className="space-y-3"><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">¿Qué dejás?</h3>{items.filter(it=>(ar.truckStock[it.id]||0)>0).map(it=>(<Card key={it.id} className="!p-3"><div className="flex items-center justify-between gap-2"><div className="flex-1"><p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{it.name}</p><p className="text-xs text-gray-400">{fmt(it.price)} — Camión: {ar.truckStock[it.id]||0}</p></div><Qty value={it.qty} onChange={v=>{setItems(p=>p.map(x=>x.id===it.id?{...x,qty:v}:x));}} max={ar.truckStock[it.id]||0}/></div></Card>))}<div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center"><span className="text-xs text-gray-400">Total</span><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(total)}</p></div><Btn v="primary" onClick={()=>setStep(1)} className="w-full">Siguiente: Envases</Btn></div>}
    {step===1&&<div className="space-y-4"><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Envases que retirás</h3><Card className="!p-4 space-y-4"><Qty value={rS} onChange={sRS} label="Sifones"/><Qty value={rB} onChange={sRB} label="Bidones"/></Card><div className="flex gap-2"><Btn v="secondary" onClick={()=>setStep(0)} className="flex-1">Atrás</Btn><Btn v="primary" onClick={()=>{setStep(2);sPa(String(total));}} className="flex-1">Siguiente: Cobro</Btn></div></div>}
    {step===2&&<div className="space-y-4"><div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center"><span className="text-xs text-gray-400">Total</span><p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{fmt(total)}</p></div><div className="grid grid-cols-2 gap-2">{[['efectivo','Efectivo'],['transferencia','Transferencia'],['mercadopago','Mercado Pago'],['fiado','Fiado']].map(([k,l])=>(<button key={k} onClick={()=>{sPm(k);sPa(k==='fiado'?'0':String(total));}} className={`py-3.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${pm===k?(k==='fiado'?'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400':'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'):'border-gray-200 dark:border-gray-700 text-gray-500'}`}>{l}</button>))}</div>{pm&&pm!=='fiado'&&<div><label className="text-xs text-gray-500">Monto</label><input type="number" value={pa} onChange={e=>sPa(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-lg font-bold mt-1 focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>{Number(pa)<total&&Number(pa)>0&&<p className="text-xs text-amber-600 mt-1">Diferencia {fmt(total-Number(pa))} → fiado</p>}</div>}{pm==='fiado'&&<div className="bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800 rounded-xl p-3"><p className="text-xs text-red-600 font-semibold">{fmt(total)} se suma a la deuda</p></div>}<div className="flex gap-2"><Btn v="secondary" onClick={()=>setStep(1)} className="flex-1">Atrás</Btn><Btn v="success" onClick={confirm} disabled={!pm||!total} className="flex-1" size="lg"><I d={IC.check} size={18}/>Confirmar</Btn></div></div>}
  </div>);
};

/* ============================================================
   MÓDULO 4: MÉTRICAS
   ============================================================ */
const MetricsModule = ()=>{const{activeRoute:ar,clients}=useApp();const done=ar?ar.stops.filter(s=>s.status==='entregado'):[];const sales=done.reduce((s,d)=>s+d.total,0);const debt=clients.reduce((s,c)=>s+Math.min(0,c.balance),0);const by=done.reduce((a,d)=>{a[d.paymentMethod]=(a[d.paymentMethod]||0)+(d.payment||0);return a;},{});const debtors=[...clients].filter(c=>c.balance<0).sort((a,b)=>a.balance-b.balance);return(<div className="space-y-4"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Métricas</h2><div className="grid grid-cols-2 gap-3"><Stat label="Ventas hoy" value={fmt(sales)} variant="success"/><Stat label="Entregas" value={done.length}/><Stat label="Fiados" value={fmt(debt)} variant="danger" sub="En la calle"/><Stat label="Clientes" value={clients.length}/></div><Card><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ingresos por método</h3>{[['efectivo','Efectivo','bg-emerald-500'],['transferencia','Transferencia','bg-sky-500'],['mercadopago','Mercado Pago','bg-blue-500'],['fiado','Fiado','bg-red-400']].map(([k,l,c])=>{const a=by[k]||0;const p=sales>0?Math.round(a/sales*100):0;return(<div key={k} className="mb-2"><div className="flex justify-between text-xs mb-1"><span className="text-gray-500">{l}</span><span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(a)}</span></div><div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className={`h-full ${c} rounded-full`} style={{width:`${p}%`}}/></div></div>);})}</Card>{debtors.length>0&&<Card><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mayores deudores</h3>{debtors.slice(0,5).map(c=>(<div key={c.id} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"><div><p className="text-sm text-gray-900 dark:text-gray-100">{c.name}</p><p className="text-xs text-gray-400">{c.zone}</p></div><span className="text-sm font-bold text-red-600">{fmt(c.balance)}</span></div>))}</Card>}</div>);};

/* ============================================================
   HOME
   ============================================================ */
const HomeView = ()=>{const{activeRoute:ar,clients,role,setView}=useApp();const p=ar?ar.stops.filter(s=>s.status==='pendiente').length:0;const d=ar?ar.stops.filter(s=>s.status==='entregado').length:0;const debt=clients.reduce((s,c)=>s+Math.min(0,c.balance),0);return(<div className="space-y-4"><div><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{role==='repartidor'?'Tu reparto':'Panel de control'}</h2><p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</p></div><div className="grid grid-cols-2 gap-3">{ar?<><Stat label="Pendientes" value={p} variant="warning"/><Stat label="Entregados" value={d} variant="success"/></>:<Stat label="Sin reparto" value="—" sub="Iniciá desde Reparto"/>}{role!=='repartidor'&&<><Stat label="Fiados" value={fmt(debt)} variant="danger"/><Stat label="Clientes" value={clients.length}/></>}</div>{role==='repartidor'&&!ar&&<Btn v="primary" size="lg" onClick={()=>setView('reparto')} className="w-full"><I d={IC.truck} size={20}/>Ir a Reparto</Btn>}{role==='repartidor'&&ar&&<Btn v="success" size="lg" onClick={()=>setView('reparto')} className="w-full"><I d={IC.truck} size={20}/>Continuar ({p})</Btn>}{role==='admin'&&<div><p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Accesos rápidos</p><div className="grid grid-cols-2 gap-2">{[['clientes','Clientes',IC.users],['stock','Stock',IC.pkg],['reparto','Reparto',IC.truck],['metricas','Métricas',IC.chart]].map(([v,l,icon])=>(<button key={v} onClick={()=>setView(v)} className="flex items-center gap-2 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95"><I d={icon} size={18}/>{l}</button>))}</div></div>}</div>);};

/* ============================================================
   APP SHELL
   ============================================================ */
const NAV={admin:[{k:'home',l:'Inicio',i:IC.home},{k:'clientes',l:'Clientes',i:IC.users},{k:'stock',l:'Stock',i:IC.pkg},{k:'reparto',l:'Reparto',i:IC.truck},{k:'metricas',l:'Métricas',i:IC.chart}],repartidor:[{k:'home',l:'Inicio',i:IC.home},{k:'reparto',l:'Reparto',i:IC.truck},{k:'clientes',l:'Clientes',i:IC.users}],operador:[{k:'home',l:'Inicio',i:IC.home},{k:'clientes',l:'Clientes',i:IC.users},{k:'stock',l:'Stock',i:IC.pkg},{k:'reparto',l:'Reparto',i:IC.truck}]};
const VIEWS={home:HomeView,clientes:ClientsModule,stock:StockModule,reparto:DeliveryModule,metricas:MetricsModule};

export default function App(){
  const[dark,setDark]=useState(false);const[role,setRole]=useState('admin');const[view,setView]=useState('home');const[clients,setClients]=useState(INITIAL_CLIENTS);const[products,setProducts]=useState(INITIAL_PRODUCTS);const[activeRoute,setActiveRoute]=useState(null);const[pastRoutes,setPastRoutes]=useState([{date:'21/03/2026',stops:8,delivered:7,collected:42500},{date:'20/03/2026',stops:6,delivered:6,collected:31200}]);const[showRP,setShowRP]=useState(false);
  const ctx=useMemo(()=>({role,view,setView,clients,setClients,products,setProducts,activeRoute,setActiveRoute,pastRoutes,setPastRoutes}),[role,view,clients,products,activeRoute,pastRoutes]);
  const V=VIEWS[view]||HomeView;const nav=NAV[role]||NAV.admin;
  return(<AppContext.Provider value={ctx}><div className={dark?'dark':''}><div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800"><div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow-sm shadow-sky-500/30"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 017 7c0 3-2 5.5-3 7H8c-1-1.5-3-4-3-7a7 7 0 017-7z"/><path d="M9 16v2a3 3 0 006 0v-2"/></svg></div><span className="font-extrabold text-gray-900 dark:text-gray-100 text-base tracking-tight">AguaControl</span></div><div className="flex items-center gap-1"><button onClick={()=>setShowRP(!showRP)} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{role==='admin'?'Admin':role==='repartidor'?'Repartidor':'Operador'} ▾</button><button onClick={()=>setDark(!dark)} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><I d={dark?IC.sun:IC.moon} size={18}/></button></div></div>{showRP&&<div className="max-w-lg mx-auto px-4 pb-2"><div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">{[['admin','Admin'],['repartidor','Repartidor'],['operador','Operador']].map(([r,l])=>(<button key={r} onClick={()=>{setRole(r);setShowRP(false);setView('home');}} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${role===r?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500'}`}>{l}</button>))}</div></div>}</header>
    <main className="max-w-lg mx-auto px-4 py-4 pb-24"><V/></main>
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800"><div className="max-w-lg mx-auto flex">{nav.map(n=>(<button key={n.k} onClick={()=>setView(n.k)} className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition ${view===n.k?'text-sky-600 dark:text-sky-400':'text-gray-400 dark:text-gray-500'}`}><I d={n.i} size={20}/><span className="text-[10px] font-semibold">{n.l}</span></button>))}</div></nav>
  </div></div></AppContext.Provider>);
}
