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

const ZONE_COLORS = { Centro:'sky', Palermo:'violet', 'San Telmo':'amber', Belgrano:'emerald', Caballito:'rose', 'Villa Crespo':'orange', Recoleta:'indigo' };
const zoneColor = (z) => ZONE_COLORS[z] || 'gray';

const INITIAL_CLIENTS = [];

const INITIAL_PRODUCTS = [];

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
  file:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6',clock:'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',money:'M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6',
};

// --- Utilities ---
const fmt = (n)=>{const a=Math.abs(n);const s=a.toLocaleString('es-AR');return n<0?`-$${s}`:`$${s}`;};
const openGMaps = (stops)=>{if(!stops?.length)return;const v=stops.filter(s=>s.lat&&s.lng);if(!v.length)return;if(v.length===1){window.open(`https://www.google.com/maps/dir/?api=1&destination=${v[0].lat},${v[0].lng}`,'_blank');return;}const d=v[v.length-1];const wp=v.slice(0,-1).map(s=>`${s.lat},${s.lng}`).join('|');window.open(`https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}&waypoints=${wp}`,'_blank');};

// --- UI Components ---
const Badge = ({children,variant='default',className=''})=>{const c={default:'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',success:'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',warning:'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',danger:'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',info:'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',violet:'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'};return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${c[variant]||c.default} ${className}`}>{children}</span>;};
const Card = ({children,className='',onClick})=>(<div onClick={onClick} className={`bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl p-4 ${onClick?'cursor-pointer active:scale-[0.98] transition-transform':''} ${className}`}>{children}</div>);
const Stat = ({label,value,sub,variant})=>{const c={default:'text-gray-900 dark:text-gray-100',success:'text-emerald-600 dark:text-emerald-400',danger:'text-red-600 dark:text-red-400',warning:'text-amber-600 dark:text-amber-400'};return <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3.5"><p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 font-medium">{label}</p><p className={`text-xl font-bold tabular-nums ${c[variant||'default']}`}>{value}</p>{sub&&<p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}</div>;};
const Btn = ({children,onClick,v='primary',className='',disabled,size='md'})=>{const base='flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none select-none';const sz=size==='sm'?'py-2 px-4 text-sm':size==='lg'?'py-4 px-6 text-base':'py-3 px-5 text-sm';const vars={primary:'bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-600/20',secondary:'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200',danger:'bg-red-600 hover:bg-red-700 text-white',success:'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20',outline:'border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'};return <button onClick={onClick} disabled={disabled} className={`${base} ${sz} ${vars[v]} ${className}`}>{children}</button>;};
const Qty = ({value,onChange,min=0,max=9999,label})=>{
  const handleInput=(e)=>{const v=e.target.value;if(v===''){onChange(min);return;}const n=parseInt(v)||0;onChange(Math.max(min,Math.min(max,n)));};
  return(<div className="flex items-center gap-1">
    {label&&<span className="text-sm text-gray-500 dark:text-gray-400 mr-2 min-w-[70px]">{label}</span>}
    <button onClick={()=>onChange(Math.max(min,value-1))} className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl font-bold text-gray-500 dark:text-gray-400 active:scale-90 transition-all select-none">−</button>
    <input type="number" inputMode="numeric" pattern="[0-9]*" value={value} onChange={handleInput} onFocus={e=>e.target.select()}
      className="w-16 h-12 text-center text-lg font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:border-sky-500 dark:focus:border-sky-500 rounded-xl focus:outline-none tabular-nums"/>
    <button onClick={()=>onChange(Math.min(max,value+1))} className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-xl font-bold text-sky-600 dark:text-sky-400 active:scale-90 transition-all select-none">+</button>
  </div>);
};
const Search = ({value,onChange,placeholder='Buscar...'})=>(<div className="relative"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><I d={IC.search} size={18}/></div><input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/></div>);
const BackBtn = ({onClick,label='Volver'})=>(<button onClick={onClick} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2"><I d={IC.back} size={16}/>{label}</button>);
const StepBar = ({steps,current})=>(<div className="flex items-center gap-1.5 mb-4">{steps.map((s,i)=>(<div key={i} className="flex items-center gap-1.5 flex-1"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${i<current?'bg-emerald-500 text-white':i===current?'bg-sky-600 text-white ring-4 ring-sky-600/20':'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>{i<current?<I d={IC.check} size={13}/>:i+1}</div><span className={`text-[11px] font-semibold truncate ${i===current?'text-sky-600 dark:text-sky-400':i<current?'text-emerald-600':'text-gray-400'}`}>{s}</span>{i<steps.length-1&&<div className={`flex-1 h-0.5 rounded ${i<current?'bg-emerald-400':'bg-gray-200 dark:bg-gray-700'}`}/>}</div>))}</div>);
const Modal = ({open,onClose,title,children})=>{if(!open)return null;return(<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={e=>{e.stopPropagation();onClose();}} onTouchEnd={e=>e.stopPropagation()}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/><div onClick={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()} className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl"><div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 shrink-0"><h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><I d={IC.x} size={20}/></button></div><div className="overflow-y-auto flex-1 p-4">{children}</div></div></div>);};

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
          <button onMouseDown={() => { onSelect({ address: value, lat: null, lng: null, zone: '' }); setSuggestions([]); setFocused(false); }}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-xs text-gray-400 flex items-center gap-2">
            <I d={IC.check} size={13}/>Usar "{value}" tal cual (sin mapa)
          </button>
        </div>
      )}
      {focused && !loading && suggestions.length === 0 && value.length >= 4 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <button onMouseDown={() => { onSelect({ address: value, lat: null, lng: null, zone: '' }); setSuggestions([]); setFocused(false); }}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-2">
            <I d={IC.check} size={14} className="text-sky-500 shrink-0"/>
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-100">Guardar "{value}" sin mapa</p>
              <p className="text-xs text-gray-400">No se encontraron resultados — guardá la dirección manualmente</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({icon,title,description,action,actionLabel})=>(
  <div className="text-center py-10">
    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4"><I d={icon} size={28} className="text-gray-400"/></div>
    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
    {description&&<p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px] mx-auto mb-4">{description}</p>}
    {action&&actionLabel&&<Btn v="primary" onClick={action} className="mx-auto"><I d={IC.plus} size={16}/>{actionLabel}</Btn>}
  </div>
);

/* ============================================================
   MÓDULO 1: CLIENTES
   ============================================================ */
const ClientsModule = () => {
  const {clients,setClients}=useApp();
  const[search,setSearch]=useState('');const[filter,setFilter]=useState('all');const[selected,setSelected]=useState(null);const[showNew,setShowNew]=useState(false);
  const[importPreview,setImportPreview]=useState([]);const[importError,setImportError]=useState('');const[showImport,setShowImport]=useState(false);

  const filtered=useMemo(()=>{let l=clients;if(filter!=='all')l=l.filter(c=>c.type===filter);if(search)l=l.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.address.toLowerCase().includes(search.toLowerCase())||c.zone?.toLowerCase().includes(search.toLowerCase()));return l;},[clients,search,filter]);

  const exportCSV=()=>{
    const headers=['nombre','telefono','direccion','zona','tipo','cuit','razon_social','condicion_iva','notas','saldo'];
    const rows=clients.map(c=>[c.name||'',c.phone||'',c.address||'',c.zone||'',c.type||'casa',c.cuit||'',c.razonSocial||'',c.condicionIva||'',c.notes||'',c.balance||0].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
    const csv=[headers.join(','),...rows].join('\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`clientes_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  };

  const handleImportFile=(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const text=ev.target?.result||'';
        const lines=text.split(/\r?\n/).filter(l=>l.trim());
        if(lines.length<2){setImportError('El archivo está vacío o le falta la fila de encabezados');return;}
        const headers=lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/['"]/g,''));
        const col=(...names)=>{for(const n of names){const i=headers.indexOf(n);if(i!==-1)return i;}return -1;};
        const iN=col('nombre','name','cliente','razon social');
        if(iN===-1){setImportError('No se encontró la columna "nombre". Revisá que el CSV tenga encabezados en la primera fila.');return;}
        const iT=col('telefono','tel','phone','celular');const iD=col('direccion','address','domicilio');
        const iZ=col('zona','zone');const iTipo=col('tipo','type');const iC=col('cuit','cuit/cuil');
        const iR=col('razon_social','razonsocial');const iNo=col('notas','notes','observaciones');const iS=col('saldo','balance','deuda');
        const parseRow=line=>{const vals=[];let cur='',inQ=false;for(const ch of line){if(ch==='"'){inQ=!inQ;}else if(ch===','&&!inQ){vals.push(cur.trim());cur='';}else{cur+=ch;}}vals.push(cur.trim());return vals;};
        const parsed=lines.slice(1).map(line=>{const v=parseRow(line);const name=(v[iN]||'').replace(/^"|"$/g,'');if(!name)return null;return{name,phone:iT>=0?(v[iT]||'').replace(/^"|"$/g,''):'',address:iD>=0?(v[iD]||'').replace(/^"|"$/g,''):'',zone:iZ>=0?(v[iZ]||'').replace(/^"|"$/g,''):'',type:iTipo>=0&&(v[iTipo]||'').toLowerCase().includes('empresa')?'empresa':'casa',cuit:iC>=0?(v[iC]||'').replace(/^"|"$/g,''):'',razonSocial:iR>=0?(v[iR]||'').replace(/^"|"$/g,''):'',notes:iNo>=0?(v[iNo]||'').replace(/^"|"$/g,''):'',balance:iS>=0?Number((v[iS]||'0').replace(/[^0-9.-]/g,''))||0:0};}).filter(Boolean);
        if(!parsed.length){setImportError('No se encontraron clientes válidos en el archivo.');return;}
        setImportPreview(parsed);setImportError('');setShowImport(true);
      }catch{setImportError('Error al procesar el archivo. Asegurate de que sea un CSV válido.');}
    };
    reader.readAsText(file,'UTF-8');e.target.value='';
  };

  const confirmImport=()=>{
    const now=Date.now();
    setClients(prev=>[...prev,...importPreview.map((c,i)=>({id:now+i,...c,containers:{},lastOrder:'-'}))]);
    setShowImport(false);setImportPreview([]);
  };

  if(selected)return <ClientDetail client={selected} onBack={()=>setSelected(null)}/>;
  if(showNew)return <NewClientForm onBack={()=>setShowNew(false)}/>;
  return(<div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Clientes</h2>
      <div className="flex items-center gap-2">
        <button onClick={exportCSV} title="Exportar CSV" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>CSV
        </button>
        <label title="Importar CSV" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>CSV
          <input type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden"/>
        </label>
        <Btn v="primary" size="sm" onClick={()=>setShowNew(true)}><I d={IC.plus} size={16}/>Nuevo</Btn>
      </div>
    </div>

    {importError&&<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2"><I d={IC.alert} size={15} className="text-red-500 shrink-0 mt-0.5"/><p className="text-xs text-red-600">{importError}</p></div>}

    <Search value={search} onChange={setSearch} placeholder="Buscar por nombre, dirección o zona..."/>
    <div className="flex gap-2 flex-wrap">{[['all','Todos'],['casa','Casas'],['empresa','Empresas']].map(([k,l])=>(<button key={k} onClick={()=>setFilter(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter===k?'bg-sky-600 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{l}</button>))}</div>
    <div className="space-y-2">{filtered.map(c=>(<Card key={c.id} onClick={()=>setSelected(c)} className="!p-3"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 flex-wrap"><span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{c.name}</span><Badge variant={c.type==='empresa'?'info':'default'}>{c.type==='empresa'?'Empresa':'Casa'}</Badge>{c.zone&&<Badge variant="violet">{c.zone}</Badge>}</div><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{c.address}</p></div><div className="text-right ml-3"><span className={`text-sm font-bold ${c.balance<0?'text-red-600 dark:text-red-400':'text-gray-400'}`}>{fmt(c.balance)}</span>{c.balance<0&&<p className="text-[10px] text-red-400">Fiado</p>}</div></div></Card>))}</div>

    <Modal open={showImport} onClose={()=>setShowImport(false)} title={`Importar ${importPreview.length} clientes`}>
      <div className="space-y-3">
        <p className="text-xs text-gray-500">Se van a agregar los siguientes clientes a la base existente:</p>
        <div className="max-h-64 overflow-y-auto space-y-1.5">
          {importPreview.map((c,i)=>(
            <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{[c.phone,c.address,c.zone].filter(Boolean).join(' · ')}</p>
              </div>
              <Badge variant={c.type==='empresa'?'info':'default'}>{c.type==='empresa'?'Empresa':'Casa'}</Badge>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">Los clientes se agregan a los existentes, no los reemplaza.</p>
        </div>
        <div className="flex gap-2">
          <Btn v="secondary" onClick={()=>setShowImport(false)} className="flex-1">Cancelar</Btn>
          <Btn v="primary" onClick={confirmImport} className="flex-1"><I d={IC.check} size={16}/>Importar {importPreview.length}</Btn>
        </div>
      </div>
    </Modal>
  </div>);
};

const ClientDetail = ({client,onBack}) => {
  const {products,setProducts,orders,setOrders,orderCounter,setOrderCounter,clients,setClients,clientPlans,setClientPlans,payments,setPayments,containerStock,setContainerStock}=useApp();
  const [showNewOrder,setShowNewOrder]=useState(false);const [showPlan,setShowPlan]=useState(false);const [showNewPayment,setShowNewPayment]=useState(false);const [showReturnContainers,setShowReturnContainers]=useState(false);const [returnQtys,setReturnQtys]=useState({});const [showPayFiado,setShowPayFiado]=useState(null);const [fiadoPayMethod,setFiadoPayMethod]=useState(null);const [fiadoReceipt,setFiadoReceipt]=useState(null);const [showDeleteClient,setShowDeleteClient]=useState(false);const [showPartialPayFiado,setShowPartialPayFiado]=useState(null);const [partialPayAmount,setPartialPayAmount]=useState('');const [partialPayMethod,setPartialPayMethod]=useState(null);
  const [expandedOrder,setExpandedOrder]=useState(null);
  const clientOrders = (orders||[]).filter(o=>o.clientId===client.id).sort((a,b)=>b.createdAt-a.createdAt);
  const clientPayments = (payments||[]).filter(p=>p.clientId===client.id).sort((a,b)=>b.createdAt-a.createdAt);
  const cur = clients.find(c=>c.id===client.id)||client;
  const createOrder = (orderItems,note,payment) => {
    const total=orderItems.reduce((s,it)=>s+it.price*it.qty,0);
    const orderNum=String(orderCounter).padStart(4,'0');
    const order={id:Date.now(),orderNum,clientId:client.id,clientName:client.name,items:orderItems,total,note,payment:payment||{},status:'pendiente',createdAt:Date.now()};
    setOrders(prev=>[order,...prev]);
    setOrderCounter(prev=>prev+1);
    // Descontar stock
    setProducts(prev=>prev.map(p=>{const it=orderItems.find(x=>x.productId===p.id);return it?{...p,stock:Math.max(0,p.stock-it.qty)}:p;}));
    // Actualizar saldo si quedó deuda
    const paid=payment?.amount||0;
    const debt=total-paid;
    setClients(prev=>prev.map(c=>c.id===client.id?{...c,lastOrder:new Date().toLocaleDateString('es-AR'),balance:debt>0?c.balance-debt:c.balance}:c));
    setShowNewOrder(false);
  };
  const markDelivered = (orderId) => {
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,status:'entregado'}:o));
  };
  if(showPlan) return (<AssignPlanForm client={cur} onBack={()=>setShowPlan(false)}/>);
  if(showNewOrder) return (<NewOrderForm client={cur} onBack={()=>setShowNewOrder(false)} onSave={createOrder}/>);
  if(showNewPayment) return (<NewPaymentForm client={cur} onBack={()=>setShowNewPayment(false)} onSave={(amount,concept,method)=>{setPayments(prev=>[{id:Date.now(),clientId:client.id,clientName:client.name,amount,concept,method,createdAt:Date.now()},...prev]);setClients(prev=>prev.map(c=>c.id===client.id?{...c,balance:Math.min(0,c.balance+amount)}:c));setShowNewPayment(false);}}/>);
  const printRemito = (order) => {
    const date = new Date(order.createdAt).toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'numeric'});
    const cuitFmt = cur.cuit ? cur.cuit.replace(/(\d{2})(\d{8})(\d{1})/,'$1-$2-$3') : '';
    const rows = order.items.map(it => `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${it.name}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${it.qty}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">$${((it.price||0)*it.qty).toLocaleString('es-AR')}</td></tr>`).join('');
    const win = window.open('','_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Remito #${order.orderNum} - ${cur.name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:32px}h1{font-size:24px;font-weight:bold;margin-bottom:4px}.subtitle{font-size:12px;color:#666;margin-bottom:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}.label{font-size:11px;color:#666;text-transform:uppercase;margin-bottom:2px}.value{font-size:14px;font-weight:600}table{width:100%;border-collapse:collapse;margin-bottom:16px}thead{background:#f3f4f6}th{padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#666}th:last-child{text-align:right}th:nth-child(2){text-align:center}.total{text-align:right;font-size:16px;font-weight:bold;border-top:2px solid #111;padding-top:8px}.firmas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:60px}.firma-line{border-top:1px solid #aaa;padding-top:8px;font-size:11px;color:#666;text-align:center}@media print{button{display:none}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px"><div><h1>REMITO</h1><div class="subtitle">Nº ${order.orderNum} · Fecha: ${date}</div></div><div style="text-align:right;font-size:12px;color:#666"><div style="font-weight:700">Carapachay Sodería</div></div></div><div class="grid"><div><div class="label">Cliente</div><div class="value">${cur.razonSocial||cur.name}</div></div><div><div class="label">CUIT</div><div class="value">${cuitFmt||'-'}</div></div><div><div class="label">Condición IVA</div><div class="value">${cur.condicionIva||'-'}</div></div><div><div class="label">Dirección</div><div class="value">${cur.address||'-'}</div></div></div><table><thead><tr><th>Producto</th><th style="text-align:center">Cantidad</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total: $${order.total.toLocaleString('es-AR')}</div><div class="firmas"><div class="firma-line">Firma del cliente</div><div class="firma-line">Firma del repartidor</div></div><script>window.onload=()=>{window.print();}<\/script></body></html>`);
    win.document.close();
  };

  return(<div className="space-y-4"><BackBtn onClick={onBack}/>
    <div><div className="flex items-center gap-2 flex-wrap mb-1"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{cur.name}</h2><Badge variant={cur.type==='empresa'?'info':'default'}>{cur.type==='empresa'?'Empresa':'Casa'}</Badge>{cur.zone&&<Badge variant="violet">{cur.zone}</Badge>}</div><p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><I d={IC.pin} size={14}/>{cur.address}</p>
    {cur.type==='empresa'&&(cur.cuit||cur.condicionIva)&&<div className="mt-2 p-2.5 bg-sky-50 dark:bg-sky-900/10 rounded-xl border border-sky-200 dark:border-sky-800 space-y-0.5"><p className="text-xs text-sky-700 dark:text-sky-400"><span className="font-semibold">CUIT:</span> {cur.cuit?cur.cuit.replace(/(\d{2})(\d{8})(\d{1})/,'$1-$2-$3'):'-'}</p><p className="text-xs text-sky-700 dark:text-sky-400"><span className="font-semibold">IVA:</span> {cur.condicionIva||'-'}</p>{cur.razonSocial&&<p className="text-xs text-sky-700 dark:text-sky-400"><span className="font-semibold">Razón Social:</span> {cur.razonSocial}</p>}</div>}
    {cur.notes&&<div className="mt-2 flex items-start gap-1.5 p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p className="text-xs text-amber-700 dark:text-amber-400">{cur.notes}</p></div>}
    </div>
    {cur.lat&&<RouteMap stops={[{...cur,clientName:cur.name}]} height={180} showRoute={false}/>}
    <div className="flex gap-2"><a href={'tel:'+cur.phone} className="flex-1"><Btn v="secondary" className="w-full"><I d={IC.phone} size={16}/>Llamar</Btn></a><a href={'https://wa.me/549'+cur.phone} target="_blank" rel="noopener" className="flex-1"><Btn v="success" className="w-full">WhatsApp</Btn></a></div>
    {cur.email&&<a href={'mailto:'+cur.email}><p className="text-sm text-sky-600 dark:text-sky-400 flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>{cur.email}</p></a>}
    <div className="grid grid-cols-2 gap-3"><Stat label="Saldo" value={fmt(cur.balance)} variant={cur.balance<0?'danger':cur.balance>0?'success':'default'}/><Stat label="Ultimo pedido" value={cur.lastOrder||'\u2014'}/>{containerStock.map(ct=><Stat key={ct.id} label={ct.name} value={cur.containers?.[ct.id]||0}/>)}</div>
    <div className="flex gap-2"><Btn v="primary" onClick={()=>setShowNewOrder(true)} className="flex-1" size="lg"><I d={IC.plus} size={20}/>Nuevo pedido</Btn><Btn v="success" onClick={()=>setShowNewPayment(true)} className="flex-1" size="lg"><I d={IC.money} size={20}/>Cobro</Btn></div>
    {containerStock.length>0&&<Btn v="outline" onClick={()=>{setReturnQtys({});setShowReturnContainers(true);}} className="w-full"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>Retirar envases</Btn>}
    <Btn v="danger" onClick={()=>setShowDeleteClient(true)} className="w-full"><I d={IC.x} size={16}/>Eliminar cliente</Btn>
    <Modal open={showDeleteClient} onClose={()=>setShowDeleteClient(false)} title="Eliminar cliente">
      <div className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">¿Seguro que querés eliminar a <b>{cur.name}</b>? Esta acción no se puede deshacer.</p>
        <div className="flex gap-2">
          <Btn v="secondary" onClick={()=>setShowDeleteClient(false)} className="flex-1">Cancelar</Btn>
          <Btn v="danger" onClick={()=>{setClients(prev=>prev.filter(c=>c.id!==client.id));onBack();}} className="flex-1">Eliminar</Btn>
        </div>
      </div>
    </Modal>
    <Modal open={showReturnContainers} onClose={()=>setShowReturnContainers(false)} title="Retirar envases">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">Ingresá cuántos envases te devuelve {cur.name}</p>
        <div className="space-y-3">{containerStock.map(ct=>(
          <div key={ct.id} className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ct.name}</p><p className="text-xs text-gray-400">Tiene: {cur.containers?.[ct.id]||0}</p></div>
            <Qty value={returnQtys[ct.id]||0} onChange={v=>setReturnQtys(p=>({...p,[ct.id]:v}))} />
          </div>
        ))}</div>
        <div className="flex gap-2">
          <Btn v="secondary" onClick={()=>setShowReturnContainers(false)} className="flex-1">Cancelar</Btn>
          <Btn v="primary" onClick={()=>{
            setClients(p=>p.map(c=>{if(c.id!==cur.id)return c;const nc={...(c.containers||{})};Object.entries(returnQtys).forEach(([id,qty])=>{nc[Number(id)]=Math.max(0,(nc[Number(id)]||0)-qty);});return{...c,containers:nc};}));
            setContainerStock(p=>p.map(ct=>({...ct,stock:ct.stock+(returnQtys[ct.id]||0)})));
            setShowReturnContainers(false);
          }} className="flex-1">Confirmar retiro</Btn>
        </div>
      </div>
    </Modal>

    <Modal open={!!showPayFiado} onClose={()=>setShowPayFiado(null)} title={`Cobrar fiado #${showPayFiado?.orderNum}`}>
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">{(showPayFiado?.partialPayments?.length>0)?'Restante a cobrar':'Total a cobrar'}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt((showPayFiado?.total||0)-(showPayFiado?.partialPayments||[]).reduce((s,p)=>s+p.amount,0))}</p>
          {(showPayFiado?.partialPayments?.length>0)&&<p className="text-xs text-gray-400 mt-1">Total: {fmt(showPayFiado?.total)} — Ya pagado: {fmt((showPayFiado?.partialPayments||[]).reduce((s,p)=>s+p.amount,0))}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Método de pago</p>
          <div className="grid grid-cols-3 gap-2">
            {[['efectivo','Efectivo'],['transferencia','Transfer.'],['mercadopago','Mercado Pago']].map(([k,l])=>(
              <button key={k} onClick={()=>setFiadoPayMethod(k)} className={`py-3 rounded-xl text-xs font-semibold border-2 transition active:scale-95 ${fiadoPayMethod===k?'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400':'border-gray-200 dark:border-gray-700 text-gray-500'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Comprobante <span className="font-normal text-gray-400">(opcional)</span></p>
          {fiadoReceipt?(
            <div className="relative">
              <img src={fiadoReceipt} alt="comprobante" className="w-full max-h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-700"/>
              <button onClick={()=>setFiadoReceipt(null)} className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow"><I d={IC.x} size={14}/></button>
            </div>
          ):(
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
              <I d={IC.camera} size={28} className="text-gray-400"/>
              <span className="text-xs text-gray-400 text-center">Tocá para adjuntar foto o imagen del comprobante</span>
              <input type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setFiadoReceipt(ev.target?.result);r.readAsDataURL(f);}} className="hidden"/>
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <Btn v="secondary" onClick={()=>setShowPayFiado(null)} className="flex-1">Cancelar</Btn>
          <Btn v="success" disabled={!fiadoPayMethod} onClick={()=>{
            const o=showPayFiado;
            const alreadyPaid=(o.partialPayments||[]).reduce((s,p)=>s+p.amount,0);
            const remaining=o.total-alreadyPaid;
            setOrders(prev=>prev.map(x=>x.id===o.id?{...x,fiadoPaidMethod:fiadoPayMethod,paidAt:Date.now(),receipt:fiadoReceipt||null}:x));
            setClients(prev=>prev.map(c=>c.id===client.id?{...c,balance:Math.min(0,c.balance+remaining)}:c));
            setPayments(prev=>[{id:Date.now(),clientId:client.id,clientName:client.name,amount:remaining,concept:`Pago fiado #${o.orderNum}`,method:fiadoPayMethod,createdAt:Date.now(),receipt:fiadoReceipt||null},...prev]);
            setShowPayFiado(null);
          }} className="flex-1"><I d={IC.check} size={16}/>Confirmar pago</Btn>
        </div>
      </div>
    </Modal>

    <Modal open={!!showPartialPayFiado} onClose={()=>{setShowPartialPayFiado(null);setPartialPayAmount('');setPartialPayMethod(null);}} title={`Pago parcial fiado #${showPartialPayFiado?.orderNum}`}>
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Total del pedido</span><span>{fmt(showPartialPayFiado?.total||0)}</span></div>
          {(showPartialPayFiado?.partialPayments?.length>0)&&<div className="flex justify-between text-xs text-gray-400 mb-1"><span>Ya pagado</span><span>{fmt((showPartialPayFiado?.partialPayments||[]).reduce((s,p)=>s+p.amount,0))}</span></div>}
          <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-2 mt-1"><span>Pendiente</span><span>{fmt((showPartialPayFiado?.total||0)-(showPartialPayFiado?.partialPayments||[]).reduce((s,p)=>s+p.amount,0))}</span></div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Monto que paga</label>
          <input type="number" inputMode="numeric" value={partialPayAmount} onChange={e=>setPartialPayAmount(e.target.value)} placeholder="0" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Método de pago</p>
          <div className="grid grid-cols-3 gap-2">
            {[['efectivo','Efectivo'],['transferencia','Transfer.'],['mercadopago','Mercado Pago']].map(([k,l])=>(
              <button key={k} onClick={()=>setPartialPayMethod(k)} className={`py-3 rounded-xl text-xs font-semibold border-2 transition active:scale-95 ${partialPayMethod===k?'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400':'border-gray-200 dark:border-gray-700 text-gray-500'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Btn v="secondary" onClick={()=>{setShowPartialPayFiado(null);setPartialPayAmount('');setPartialPayMethod(null);}} className="flex-1">Cancelar</Btn>
          <Btn v="primary" disabled={!partialPayMethod||!partialPayAmount||Number(partialPayAmount)<=0} onClick={()=>{
            const o=showPartialPayFiado;
            const amt=Number(partialPayAmount);
            const partial={amount:amt,method:partialPayMethod,date:Date.now()};
            setOrders(prev=>prev.map(x=>x.id===o.id?{...x,partialPayments:[...(x.partialPayments||[]),partial]}:x));
            setClients(prev=>prev.map(c=>c.id===client.id?{...c,balance:Math.min(0,c.balance+amt)}:c));
            setPayments(prev=>[{id:Date.now(),clientId:client.id,clientName:client.name,amount:amt,concept:`Pago parcial fiado #${o.orderNum}`,method:partialPayMethod,createdAt:Date.now()},...prev]);
            setShowPartialPayFiado(null);setPartialPayAmount('');setPartialPayMethod(null);
          }} className="flex-1"><I d={IC.money} size={16}/>Registrar pago</Btn>
        </div>
      </div>
    </Modal>

    {/* PLAN INFO */}
    {(()=>{
      const cp=(clientPlans||[]).find(x=>x.clientId===client.id&&x.active);
      if(!cp) return showPlan?<AssignPlanForm client={cur} onBack={()=>setShowPlan(false)}/>:<Btn v="outline" onClick={()=>setShowPlan(true)} className="w-full"><I d={IC.file} size={16}/>Asignar plan mensual</Btn>;
      const thisMonth=new Date().toISOString().slice(0,7);
      const delivered=(cp.deliveredMonths||[]);
      const lastDelivery=delivered.length>0?delivered.reduce((a,b)=>((b.deliveredAt||0)>(a.deliveredAt||0)?b:a)):null;
      const daysSinceLast=lastDelivery?Math.floor((Date.now()-(lastDelivery.deliveredAt||0))/(1000*60*60*24)):999;
      const daysUntilNext=Math.max(0,30-daysSinceLast);
      const canDeliver=daysUntilNext===0;
      const streak=(()=>{let s=0;const now=new Date();for(let i=0;i<12;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const k=d.toISOString().slice(0,7);if(delivered.find(x=>x.month===k))s++;else break;}return s;})();
      const deliverPlan=()=>{
        setClientPlans(prev=>prev.map(x=>x.id===cp.id?{...x,deliveredMonths:[...(x.deliveredMonths||[]),{month:thisMonth,deliveredAt:Date.now()}]}:x));
        setProducts(prev=>prev.map(p=>{const inc=cp.includes?.find(i=>i.productId===p.id);return inc?{...p,stock:Math.max(0,p.stock-inc.qty)}:p;}));
      };
      return(<div className="space-y-2">
        <Card className={'!p-4 '+(!canDeliver?'!border-emerald-200 dark:!border-emerald-800 !bg-emerald-50/50 dark:!bg-emerald-900/10':'!border-amber-200 dark:!border-amber-800 !bg-amber-50/50 dark:!bg-amber-900/10')}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[11px] font-bold uppercase tracking-wide ${!canDeliver?'text-emerald-600':'text-amber-600'}`}>{!canDeliver?'Plan entregado':'Plan pendiente de entrega'}</span>
                {streak>1&&<span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-1.5 py-0.5 rounded-full">🔥 {streak} meses</span>}
              </div>
              <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{cp.planName}</p>
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{fmt(cp.price)}<span className="text-[10px] font-normal text-gray-400">/mes</span></span>
          </div>
          <div className="space-y-2 mb-3">{(cp.includes||[]).map((inc,i)=>(
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${!canDeliver?'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700':'bg-amber-100 dark:bg-amber-900/30 text-amber-700'}`}>{inc.qty}</div>
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{inc.productName}</span>
              {!canDeliver&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
          ))}</div>
          {cp.includesMachine&&<Badge variant="info" className="mb-3">Maquina incluida</Badge>}
          {!canDeliver?(
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl p-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <div className="flex-1"><p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Entregado · próxima en {daysUntilNext} día{daysUntilNext!==1?'s':''}</p><p className="text-[10px] text-emerald-600/70">{lastDelivery&&new Date(lastDelivery.deliveredAt).toLocaleDateString('es-AR',{day:'numeric',month:'long'})}</p></div>
                <button onClick={()=>setClientPlans(prev=>prev.map(x=>x.id===cp.id?{...x,deliveredMonths:(x.deliveredMonths||[]).filter(d=>d.deliveredAt!==lastDelivery.deliveredAt)}:x))} className="text-[10px] text-gray-400 hover:text-red-400">Deshacer</button>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"><div className="bg-emerald-400 h-1.5 rounded-full transition-all" style={{width:`${Math.round((daysSinceLast/30)*100)}%`}}/></div>
              <p className="text-[10px] text-center text-gray-400">{daysSinceLast} de 30 días transcurridos</p>
            </div>
          ):(
            <button onClick={deliverPlan} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm transition active:scale-[0.97] flex items-center justify-center gap-2 shadow-md shadow-amber-500/30">
              <I d={IC.truck} size={18}/>Marcar entrega del mes
            </button>
          )}
          <div className="flex gap-3 mt-2"><p className="text-[10px] text-gray-400">Cobro: {cp.billing==='inicio_mes'?'Inicio de mes':cp.billing==='fin_mes'?'Fin de mes':cp.billing==='repartidor'?'Cuando pasa el repartidor':'Dia '+cp.customDay}</p></div>
          <button onClick={()=>setShowPlan(true)} className="text-xs text-sky-600 font-semibold mt-1">Cambiar plan</button>
        </Card>
        {delivered.length>0&&<div className="flex items-center gap-1.5 px-1">{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m,i)=>{const year=new Date().getFullYear();const key=`${year}-${String(i+1).padStart(2,'0')}`;const done=delivered.find(d=>d.month===key);const isFuture=new Date(year,i,1)>new Date();return(<div key={i} title={m} className={`flex-1 h-2 rounded-full transition-all ${done?'bg-emerald-400':isFuture?'bg-gray-100 dark:bg-gray-800':'bg-gray-200 dark:bg-gray-700'}`}/>);})}</div>}
      </div>);
    })()}
    {clientPayments.length>0&&<div><p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Cobros ({clientPayments.length})</p>
      <div className="space-y-2">{clientPayments.map(p=>(<Card key={p.id} className="!p-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0"><I d={IC.money} size={18} className="text-emerald-600"/></div><div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{p.concept}</p><p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString('es-AR')} · <span className="capitalize">{p.method}</span></p></div><span className="text-sm font-bold text-emerald-600">{fmt(p.amount)}</span></div></Card>))}</div>
    </div>}
    <div><div className="flex items-center justify-between mb-2"><p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{'Pedidos ('+clientOrders.length+')'}</p></div>
      {clientOrders.length===0?<p className="text-sm text-gray-400 text-center py-4">Sin pedidos todavia</p>:
      <div className="space-y-2">{clientOrders.map(o=>{
        const isOpen=expandedOrder===o.id;
        return(<Card key={o.id} className="!p-0 overflow-hidden">
          <div onClick={()=>setExpandedOrder(isOpen?null:o.id)} className="w-full flex items-center gap-3 p-3 text-left cursor-pointer">
            <div className={'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 '+(o.status==='entregado'?'bg-emerald-100 dark:bg-emerald-900/30':'bg-amber-100 dark:bg-amber-900/30')}>
              <I d={o.status==='entregado'?IC.check:IC.clock} size={18} className={o.status==='entregado'?'text-emerald-600':'text-amber-600'}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">#{o.orderNum}</span>
                {cur.type==='empresa'&&<button onClick={e=>{e.stopPropagation();printRemito(o);}} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 hover:text-sky-600 transition text-[10px] font-semibold"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Remito</button>}
                <Badge variant={o.status==='entregado'?'success':'warning'}>{o.status==='entregado'?'Entregado':'Pendiente'}</Badge>{o.payment?.method==='fiado'&&!o.paidAt&&<Badge variant="danger">Fiado</Badge>}{o.paidAt&&<Badge variant="success">Pagado</Badge>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(o.createdAt).toLocaleDateString('es-AR')} - {o.items.length} producto{o.items.length!==1?'s':''}</p>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(o.total)}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={'text-gray-400 transition-transform '+(isOpen?'rotate-180':'')}><path d="M6 9l6 6 6-6"/></svg>
          </div>
          {isOpen&&(<div className="border-t border-gray-100 dark:border-gray-800 p-3 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="space-y-1.5 mb-3">{o.items.map((it,idx)=>(<div key={idx} className="flex justify-between text-sm"><span className="text-gray-700 dark:text-gray-300">{it.qty}x {it.name}</span><span className="text-gray-500">{fmt(it.price*it.qty)}</span></div>))}</div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 dark:border-gray-700 pt-2"><span>Total</span><span>{fmt(o.total)}</span></div>
            {o.payment?.method&&<p className="text-xs text-gray-400 mt-1">Cobro: <span className="font-semibold capitalize">{o.paidAt?o.fiadoPaidMethod||o.payment.method:o.payment.method}</span>{o.payment.amount!=null&&o.payment.method!=='fiado'?` — ${fmt(o.payment.amount)}`:''}</p>}
            {o.note&&<p className="text-xs text-gray-400 mt-1 italic">Nota: {o.note}</p>}
            {o.paidAt&&<p className="text-xs text-emerald-600 mt-1 font-semibold">Pagado el {new Date(o.paidAt).toLocaleDateString('es-AR',{day:'numeric',month:'long'})}</p>}
            {(o.partialPayments?.length>0)&&<div className="mt-1 space-y-0.5">{o.partialPayments.map((pp,i)=><p key={i} className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pago parcial: {fmt(pp.amount)} ({pp.method}) — {new Date(pp.date).toLocaleDateString('es-AR',{day:'numeric',month:'long'})}</p>)}</div>}
            {o.receipt&&<div className="mt-2"><p className="text-[10px] text-gray-400 mb-1">Comprobante</p><img src={o.receipt} className="w-full max-h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer" onClick={e=>{e.stopPropagation();window.open(o.receipt,'_blank');}}/></div>}
            {o.status==='pendiente'&&<button onClick={e=>{e.stopPropagation();markDelivered(o.id);}} className="mt-3 w-full py-2 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition flex items-center justify-center gap-1"><I d={IC.check} size={14}/>Marcar como entregado</button>}
            {o.payment?.method==='fiado'&&!o.paidAt&&<div className="mt-3 flex gap-2"><button onClick={e=>{e.stopPropagation();setShowPartialPayFiado(o);setPartialPayAmount('');setPartialPayMethod(null);}} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition flex items-center justify-center gap-1"><I d={IC.money} size={14}/>Pago parcial</button><button onClick={e=>{e.stopPropagation();setShowPayFiado(o);setFiadoPayMethod(null);setFiadoReceipt(null);}} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center justify-center gap-1"><I d={IC.money} size={14}/>Ya pagó</button></div>}
          </div>)}
        </Card>);
      })}</div>}
    </div>
  </div>);
};
const NewOrderForm = ({client,onBack,onSave}) => {
  const {products}=useApp();
  const [step,setStep]=useState(0);
  const [items,setItems]=useState(products.filter(p=>p.price>0).map(p=>({...p,qty:0})));
  const [note,setNote]=useState('');
  const [pm,setPm]=useState(null);
  const [pa,setPa]=useState('');
  const [receipt,setReceipt]=useState(null);
  const total=items.reduce((s,it)=>s+it.price*it.qty,0);
  const hasItems=items.some(it=>it.qty>0);
  const fileRef=useRef(null);

  const handleConfirm=()=>{
    const paid=pm==='fiado'?0:(Number(pa)||total);
    onSave(
      items.filter(it=>it.qty>0).map(it=>({productId:it.id,name:it.name,qty:it.qty,price:it.price,unit:it.unit})),
      note,
      {method:pm,amount:paid,receipt:receipt?receipt.name:null}
    );
  };

  return(<div className="space-y-4"><BackBtn onClick={onBack}/>
    <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center"><I d={IC.file} size={22} className="text-sky-600"/></div><div><h3 className="font-bold text-gray-900 dark:text-gray-100">Nuevo pedido</h3><p className="text-xs text-gray-500">{client.name}</p></div></div>

    {/* Step bar */}
    <div className="flex gap-1">{['Productos','Cobro'].map((l,i)=>(<div key={i} className={'flex-1 h-1.5 rounded-full transition-all '+(step>=i?'bg-sky-600':'bg-gray-200 dark:bg-gray-700')}/>))}</div>

    {step===0&&(<>
      {products.filter(p=>p.price>0).length===0?<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center"><p className="text-sm text-amber-700 font-semibold">No hay productos</p></div>:
      <div className="space-y-2">{items.filter(it=>it.price>0).map(it=>(<Card key={it.id} className="!p-3"><div className="flex items-center justify-between gap-2"><div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{it.name}</p><p className="text-xs text-gray-400">{fmt(it.price)} / {it.unit}</p></div><Qty value={it.qty} onChange={v=>setItems(p=>p.map(x=>x.id===it.id?{...x,qty:v}:x))}/></div></Card>))}</div>}
      <input placeholder="Nota (opcional)" value={note} onChange={e=>setNote(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
      {hasItems&&<div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center"><span className="text-xs text-gray-400">Total</span><p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{fmt(total)}</p></div>}
      <Btn v="primary" onClick={()=>{setStep(1);setPa(String(total));}} disabled={!hasItems} className="w-full" size="lg">Siguiente: Cobro</Btn>
    </>)}

    {step===1&&(<>
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center"><span className="text-xs text-gray-400">Total a cobrar</span><p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{fmt(total)}</p></div>

      {/* Payment methods */}
      <div className="grid grid-cols-2 gap-2">
        {[['efectivo','Efectivo'],['transferencia','Transferencia'],['mercadopago','Mercado Pago'],['fiado','Fiado']].map(([k,l])=>(
          <button key={k} onClick={()=>{setPm(k);setPa(k==='fiado'?'0':String(total));}} className={'py-3.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 '+(pm===k?(k==='fiado'?'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400':'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'):'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400')}>{l}</button>
        ))}
      </div>

      {/* Amount input for non-fiado */}
      {pm&&pm!=='fiado'&&pm!=='mercadopago'&&(<div>
        <label className="text-xs text-gray-500 dark:text-gray-400">Monto cobrado</label>
        <input type="number" inputMode="numeric" value={pa} onChange={e=>setPa(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-lg font-bold mt-1 focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
        {Number(pa)<total&&Number(pa)>0&&<p className="text-xs text-amber-600 mt-1">Diferencia de {fmt(total-Number(pa))} queda como fiado</p>}
      </div>)}

      {/* Transfer - attach receipt */}
      {pm==='transferencia'&&(<div className="space-y-2">
        <input type="file" ref={fileRef} accept="image/*,.pdf" onChange={e=>setReceipt(e.target.files[0]||null)} className="hidden"/>
        <Btn v="outline" onClick={()=>fileRef.current?.click()} className="w-full"><I d={IC.camera} size={16}/>{receipt?receipt.name:'Adjuntar comprobante'}</Btn>
        {receipt&&<div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5"><I d={IC.check} size={16} className="text-emerald-600 shrink-0"/><span className="text-xs text-emerald-700 dark:text-emerald-400 truncate flex-1">{receipt.name}</span><button onClick={()=>setReceipt(null)} className="text-gray-400 hover:text-red-500"><I d={IC.x} size={14}/></button></div>}
      </div>)}

      {/* Mercado Pago */}
      {pm==='mercadopago'&&(<div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-800 flex items-center justify-center mx-auto"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/></svg></div>
        <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">Mercado Pago</p>
        <p className="text-xs text-sky-600 dark:text-sky-500">Se generara un link de pago por {fmt(total)}</p>
        <p className="text-[10px] text-gray-400">Proximamente: integracion con API de Mercado Pago para cobro con QR y link automatico</p>
      </div>)}

      {/* Fiado warning */}
      {pm==='fiado'&&<div className="bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800 rounded-xl p-3"><p className="text-xs text-red-600 dark:text-red-400 font-semibold">{fmt(total)} se suma a la deuda del cliente</p></div>}

      <div className="flex gap-2">
        <Btn v="secondary" onClick={()=>setStep(0)} className="flex-1">Atras</Btn>
        <Btn v="success" onClick={handleConfirm} disabled={!pm} className="flex-1" size="lg"><I d={IC.check} size={18}/>Confirmar</Btn>
      </div>
    </>)}
  </div>);
};

/* ============================================================
   NEW PAYMENT FORM
   ============================================================ */
const NewPaymentForm = ({client, onBack, onSave}) => {
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('Plan mensual');
  const [method, setMethod] = useState(null);

  const handleConfirm = () => {
    const n = Number(amount);
    if (!n || !method) return;
    onSave(n, concept, method);
  };

  return (
    <div className="space-y-4">
      <BackBtn onClick={onBack}/>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><I d={IC.money} size={22} className="text-emerald-600"/></div>
        <div><h3 className="font-bold text-gray-900 dark:text-gray-100">Registrar cobro</h3><p className="text-xs text-gray-500">{client.name}</p></div>
      </div>

      {client.balance < 0 && (
        <div className="bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold">Deuda actual: {fmt(client.balance)}</p>
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block font-medium">Concepto</label>
        <input value={concept} onChange={e=>setConcept(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
      </div>

      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block font-medium">Monto cobrado</label>
        <input type="number" inputMode="numeric" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="$0" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[['efectivo','Efectivo'],['transferencia','Transferencia'],['mercadopago','Mercado Pago'],['otro','Otro']].map(([k,l])=>(
          <button key={k} onClick={()=>setMethod(k)} className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${method===k?'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400':'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>{l}</button>
        ))}
      </div>

      <Btn v="success" onClick={handleConfirm} disabled={!amount||!method} className="w-full" size="lg"><I d={IC.check} size={18}/>Confirmar cobro</Btn>
    </div>
  );
};

/* ============================================================
   NEW CLIENT FORM with ADDRESS AUTOCOMPLETE + AUTO-ZONE
   ============================================================ */
const NewClientForm = ({onBack}) => {
  const {clients,setClients}=useApp();
  const [f,sF]=useState({name:'',type:'casa',phone:'',email:'',address:'',zone:'',lat:null,lng:null,cuit:'',razonSocial:'',condicionIva:'Responsable Inscripto',notes:''});
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
        {f.type==='empresa'&&(
          <div className="space-y-3 p-3 bg-sky-50 dark:bg-sky-900/10 rounded-xl border border-sky-200 dark:border-sky-800">
            <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide">Datos de facturación</p>
            <input placeholder="Razón Social" value={f.razonSocial} onChange={e=>sF({...f,razonSocial:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
            <input placeholder="CUIT (sin guiones, ej: 20123456789)" value={f.cuit} onChange={e=>sF({...f,cuit:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block font-medium">Condición IVA</label>
              <select value={f.condicionIva} onChange={e=>sF({...f,condicionIva:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30">
                {['Responsable Inscripto','Monotributo','Exento','Consumidor Final'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
        <input placeholder="Teléfono" value={f.phone} onChange={e=>sF({...f,phone:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
        <input placeholder="Email (opcional)" type="email" value={f.email} onChange={e=>sF({...f,email:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>

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
            <div className="space-y-2">
              {[...new Set(clients.filter(c=>c.zone).map(c=>c.zone))].length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {[...new Set(clients.filter(c=>c.zone).map(c=>c.zone))].map(z=>(
                    <button key={z} onClick={()=>{sF({...f,zone:z});setZoneAuto(false);}}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-violet-100 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-400 transition">{z}</button>
                  ))}
                </div>
              )}
              <input placeholder="O escribí una zona nueva..." onKeyDown={e=>{if(e.key==='Enter'&&e.target.value.trim()){sF({...f,zone:e.target.value.trim()});setZoneAuto(false);}}} onBlur={e=>{if(e.target.value.trim()){sF({...f,zone:e.target.value.trim()});setZoneAuto(false);}}} className="w-full px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
            </div>
          )}
        </div>

        {/* Mini map preview */}
        {f.lat && <RouteMap stops={[{lat:f.lat,lng:f.lng,name:f.name||'Nuevo cliente',address:f.address,clientName:f.name||'Nuevo'}]} height={160} showRoute={false}/>}

        {/* Observaciones */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block font-medium">Observaciones de entrega <span className="text-gray-400">(opcional)</span></label>
          <textarea placeholder="Ej: Piso 3, timbre B. Casa de rejas verdes. Dejar con el portero." value={f.notes} onChange={e=>sF({...f,notes:e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 resize-none"/>
        </div>
      </div>
      <Btn v="primary" onClick={save} disabled={!f.name||!f.phone} className="w-full">Guardar cliente</Btn>
    </div>
  );
};

/* ============================================================
   MÓDULO 2: STOCK — with minStock, hide/delete, stock bar
   ============================================================ */
const StockBar = ({stock, minStock}) => {
  const max = Math.max(stock, minStock * 3, 100);
  const pct = Math.min(100, Math.round((stock / max) * 100));
  const ratio = minStock > 0 ? stock / minStock : 10;
  const color = ratio <= 0.5 ? 'bg-red-500' : ratio <= 1 ? 'bg-amber-500' : ratio <= 1.5 ? 'bg-yellow-400' : 'bg-emerald-500';
  const emoji = ratio <= 0.5 ? '🔴' : ratio <= 1 ? '🟡' : '';
  return (
    <div className="mt-1.5">
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{width:`${pct}%`}}/>
      </div>
      {minStock > 0 && stock <= minStock && (
        <p className="text-[10px] mt-0.5 font-semibold text-amber-600 dark:text-amber-400">{emoji} Mín: {minStock} — {stock <= 0 ? 'SIN STOCK' : stock <= minStock * 0.5 ? 'Crítico' : 'Reponer'}</p>
      )}
    </div>
  );
};

const StockModule = () => {
  const {products, setProducts, role, containerStock, setContainerStock, clients} = useApp();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [newContainerName, setNewContainerName] = useState('');
  const [showNewContainer, setShowNewContainer] = useState(false);
  const [confirmDelContainer, setConfirmDelContainer] = useState(null);

  const visible = products.filter(p => showHidden ? p.hidden : !p.hidden);
  const filtered = visible.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = products.filter(p => !p.hidden && p.minStock > 0 && p.stock <= p.minStock);

  const toggleHide = (id) => setProducts(products.map(p => p.id === id ? {...p, hidden: !p.hidden} : p));
  const deleteProduct = (id) => { setProducts(products.filter(p => p.id !== id)); setConfirmDel(null); };

  if (showNew) return <NewProductForm onBack={() => setShowNew(false)}/>;
  if (editing) return <StockMov product={editing} onBack={() => setEditing(null)}/>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Stock</h2>
        <div className="flex gap-2">
          {products.some(p => p.hidden) && (
            <button onClick={() => setShowHidden(!showHidden)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${showHidden ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
              {showHidden ? 'Ver activos' : `Ocultos (${products.filter(p=>p.hidden).length})`}
            </button>
          )}
          {role === 'admin' && <Btn v="primary" size="sm" onClick={() => setShowNew(true)}><I d={IC.plus} size={16}/>Producto</Btn>}
        </div>
      </div>

      {lowStock.length > 0 && !showHidden && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
          <I d={IC.alert} size={16} className="text-amber-600 shrink-0 mt-0.5"/>
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Stock bajo ({lowStock.length})</p>
            <p className="text-xs text-amber-600">{lowStock.map(p => `${p.name} (${p.stock}/${p.minStock})`).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Envases */}
      <Card className="!p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Envases</h3>
          {role==='admin'&&<button onClick={()=>setShowNewContainer(!showNewContainer)} className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"><I d={IC.plus} size={14}/>Nuevo tipo</button>}
        </div>
        {showNewContainer&&role==='admin'&&(
          <div className="flex gap-2 mb-3">
            <input autoFocus placeholder="Ej: Sifones 1L" value={newContainerName} onChange={e=>setNewContainerName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newContainerName.trim()){setContainerStock(p=>[...p,{id:Date.now(),name:newContainerName.trim(),stock:0}]);setNewContainerName('');setShowNewContainer(false);}}} className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
            <Btn v="primary" size="sm" onClick={()=>{if(!newContainerName.trim())return;setContainerStock(p=>[...p,{id:Date.now(),name:newContainerName.trim(),stock:0}]);setNewContainerName('');setShowNewContainer(false);}}>Agregar</Btn>
          </div>
        )}
        {containerStock.length===0?(
          <p className="text-xs text-gray-400 text-center py-3">{role==='admin'?'Creá tu primer tipo de envase':'Sin envases configurados'}</p>
        ):(
          <div className="space-y-3">
            {containerStock.map(ct=>{
              const inStreet=clients.reduce((s,c)=>s+(c.containers?.[ct.id]||0),0);
              const total=ct.stock+inStreet;
              const pct=total>0?Math.round(ct.stock/total*100):0;
              return(
                <div key={ct.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{ct.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-600">{inStreet} en calle</span>
                      <div className="flex items-center gap-1">
                        {role==='admin'&&<button onClick={()=>setContainerStock(p=>p.map(x=>x.id===ct.id?{...x,stock:Math.max(0,x.stock-1)}:x))} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500 active:scale-90 transition">−</button>}
                        {role==='admin'?<input type="number" inputMode="numeric" value={ct.stock} onChange={e=>{const v=Math.max(0,parseInt(e.target.value)||0);setContainerStock(p=>p.map(x=>x.id===ct.id?{...x,stock:v}:x));}} onFocus={e=>e.target.select()} className="w-12 h-7 text-center text-base font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-sky-500 tabular-nums"/>:<span className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-100 min-w-[2rem] text-center">{ct.stock}</span>}
                        {role==='admin'&&<button onClick={()=>setContainerStock(p=>p.map(x=>x.id===ct.id?{...x,stock:x.stock+1}:x))} className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sm font-bold text-sky-600 active:scale-90 transition">+</button>}
                      </div>
                      {role==='admin'&&<button onClick={()=>setConfirmDelContainer(ct.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><I d={IC.x} size={14}/></button>}
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden flex">
                    <div className="h-full bg-emerald-400 rounded-l-full transition-all" style={{width:`${pct}%`}}/>
                    <div className="h-full bg-amber-300 rounded-r-full transition-all" style={{width:`${100-pct}%`}}/>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-emerald-600">Depósito: {ct.stock}</span>
                    <span className="text-[10px] text-gray-400">Total: {total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Modal open={!!confirmDelContainer} onClose={()=>setConfirmDelContainer(null)} title="Eliminar tipo de envase">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">¿Eliminar <b>{containerStock.find(c=>c.id===confirmDelContainer)?.name}</b>? El stock en clientes se perderá.</p>
        <div className="flex gap-2"><Btn v="secondary" onClick={()=>setConfirmDelContainer(null)} className="flex-1">Cancelar</Btn><Btn v="danger" onClick={()=>{setContainerStock(p=>p.filter(c=>c.id!==confirmDelContainer));setConfirmDelContainer(null);}} className="flex-1">Eliminar</Btn></div>
      </Modal>

      <Search value={search} onChange={setSearch} placeholder="Buscar producto..."/>

      <div className="space-y-2">
        {filtered.map(p => (
          <Card key={p.id} className={`!p-3 ${p.hidden ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between" onClick={() => role === 'admin' && !p.hidden && setEditing(p)}>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{p.name}</span>
                  {p.returnable && <Badge variant="info">{p.containerType==='sifon'?'Sifón':p.containerType==='bidon'?'Bidón':'Ret.'}</Badge>}
                  {p.hidden && <Badge variant="default">Oculto</Badge>}
                  {!p.hidden && p.minStock > 0 && p.stock <= p.minStock * 0.5 && <Badge variant="danger">Crítico</Badge>}
                  {!p.hidden && p.minStock > 0 && p.stock > p.minStock * 0.5 && p.stock <= p.minStock && <Badge variant="warning">Bajo</Badge>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(p.price)} / {p.unit}{p.minStock > 0 ? ` · Mín: ${p.minStock}` : ''}</p>
                {!p.hidden && <StockBar stock={p.stock} minStock={p.minStock || 0}/>}
              </div>
              <div className="text-right ml-3">
                <span className={`text-lg font-bold tabular-nums ${!p.hidden && p.minStock > 0 && p.stock <= p.minStock ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>{p.stock}</span>
              </div>
            </div>
            {role === 'admin' && (
              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button onClick={(e) => { e.stopPropagation(); toggleHide(p.id); }} className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  {p.hidden ? 'Mostrar' : 'Ocultar'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmDel(p.id); }} className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition">
                  Eliminar
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Eliminar producto">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">¿Seguro que querés eliminar <b>{products.find(p => p.id === confirmDel)?.name}</b>? Esta acción no se puede deshacer.</p>
        <div className="flex gap-2">
          <Btn v="secondary" onClick={() => setConfirmDel(null)} className="flex-1">Cancelar</Btn>
          <Btn v="danger" onClick={() => deleteProduct(confirmDel)} className="flex-1">Eliminar</Btn>
        </div>
      </Modal>
    </div>
  );
};

const StockMov = ({product, onBack}) => {
  const {products, setProducts} = useApp();
  const [type, setType] = useState('entrada');
  const [qty, setQty] = useState(0);
  const save = () => {
    if (qty <= 0) return;
    setProducts(products.map(p => p.id === product.id ? {...p, stock: type === 'entrada' ? p.stock + qty : Math.max(0, p.stock - qty)} : p));
    onBack();
  };
  return (
    <div className="space-y-4">
      <BackBtn onClick={onBack}/>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{product.name}</h2>
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
        <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Stock actual</span><span className="font-bold text-gray-900 dark:text-gray-100">{product.stock}</span></div>
        {product.minStock > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Stock mínimo</span><span className="font-semibold text-amber-600">{product.minStock}</span></div>}
        <StockBar stock={product.stock} minStock={product.minStock || 0}/>
      </div>
      <div className="flex gap-2">{['entrada','salida'].map(t => (
        <button key={t} onClick={() => setType(t)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${type === t ? (t === 'entrada' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
          {t === 'entrada' ? 'Entrada' : 'Salida'}
        </button>
      ))}</div>
      <div className="flex justify-center py-4"><Qty value={qty} onChange={setQty}/></div>
      <Btn v={type === 'entrada' ? 'success' : 'danger'} onClick={save} className="w-full">Registrar {type}</Btn>
    </div>
  );
};

const NewProductForm = ({onBack}) => {
  const {products, setProducts, containerStock} = useApp();
  const [f, sF] = useState({name:'', price:'', stock:'', minStock:'', unit:'un', returnable:false, containerType:null});
  const save = () => {
    if (!f.name) return;
    setProducts([...products, {id: Date.now(), ...f, price: Number(f.price) || 0, stock: Number(f.stock) || 0, minStock: Number(f.minStock) || 0, hidden: false}]);
    onBack();
  };
  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30";
  return (
    <div className="space-y-4">
      <BackBtn onClick={onBack}/>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nuevo producto</h2>
      <div className="space-y-3">
        <input placeholder="Nombre del producto" value={f.name} onChange={e => sF({...f, name: e.target.value})} className={inputClass}/>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Precio" type="number" value={f.price} onChange={e => sF({...f, price: e.target.value})} className={inputClass}/>
          <input placeholder="Stock inicial" type="number" value={f.stock} onChange={e => sF({...f, stock: e.target.value})} className={inputClass}/>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block font-medium">Stock mínimo (alerta)</label>
          <input placeholder="Ej: 20 — te avisa cuando baje de acá" type="number" value={f.minStock} onChange={e => sF({...f, minStock: e.target.value})} className={inputClass}/>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={f.returnable} onChange={e => sF({...f, returnable: e.target.checked, containerType: e.target.checked ? f.containerType : null})} className="w-4 h-4 rounded"/>
          Envase retornable
        </label>
        {f.returnable && (
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block font-medium">Tipo de envase</label>
            {containerStock.length===0?<p className="text-xs text-gray-400 italic">Primero creá tipos de envases en Stock</p>:
            <div className="flex flex-wrap gap-2">
              {containerStock.map(ct=>(
                <button key={ct.id} type="button" onClick={()=>sF({...f,containerType:f.containerType===ct.id?null:ct.id})} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${f.containerType===ct.id?'bg-sky-600 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{ct.name}</button>
              ))}
            </div>}
          </div>
        )}
      </div>
      <Btn v="primary" onClick={save} className="w-full">Guardar producto</Btn>
    </div>
  );
};



/* ============================================================
   PLANES / ABONOS MENSUALES
   ============================================================ */
const PlansModule = () => {
  const {plans,setPlans,clientPlans}=useApp();
  const [showNew,setShowNew]=useState(false);
  const [editPlan,setEditPlan]=useState(null);
  const [selectedPlan,setSelectedPlan]=useState(null);
  if(showNew||editPlan) return <NewPlanForm onBack={()=>{setShowNew(false);setEditPlan(null);}} editPlan={editPlan}/>;
  if(selectedPlan) return <PlanDetail plan={selectedPlan} onBack={()=>setSelectedPlan(null)} onEdit={()=>{setEditPlan(selectedPlan);setSelectedPlan(null);}}/>;
  return(<div className="space-y-4">
    <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Planes y abonos</h2><Btn v="primary" size="sm" onClick={()=>setShowNew(true)}><I d={IC.plus} size={16}/>Nuevo plan</Btn></div>
    {plans.length===0?<EmptyState icon={IC.file} title="Sin planes" description="Crea planes mensuales: abonos de sifones, alquiler de maquinas, etc." action={()=>setShowNew(true)} actionLabel="Crear plan"/>:
    <div className="space-y-2">{plans.map(p=>{const subCount=clientPlans.filter(cp=>cp.planId===p.id&&cp.active).length;const pendingCount=clientPlans.filter(cp=>{if(!cp.active||cp.planId!==p.id)return false;const dm=cp.deliveredMonths||[];const last=dm.length>0?dm.reduce((a,b)=>((b.deliveredAt||0)>(a.deliveredAt||0)?b:a)):null;const days=last?Math.floor((Date.now()-(last.deliveredAt||0))/(1000*60*60*24)):Math.floor((Date.now()-new Date(cp.startDate||Date.now()).getTime())/(1000*60*60*24));return days>=30;}).length;return(<button key={p.id} onClick={()=>setSelectedPlan(p)} className="w-full text-left active:scale-[0.98] transition-transform">
      <Card className="!p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0"><span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{p.name}</span>
            <p className="text-xs text-gray-500 mt-0.5">{(p.includes||[]).map(inc=>inc.qty+'x '+inc.productName).join(' + ')}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {subCount>0&&<span className="text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{subCount} suscriptor{subCount!==1?'es':''}</span>}
              {pendingCount>0&&<span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{pendingCount} para entregar</span>}
              {p.includesMachine&&<Badge variant="info">Maquina</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-3">
            <div className="text-right mr-1"><span className="text-sm font-bold text-sky-600">{fmt(p.price)}</span><p className="text-[10px] text-gray-400">/mes</p></div>
            <button onClick={e=>{e.stopPropagation();setPlans(prev=>prev.filter(x=>x.id!==p.id));}} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><I d={IC.x} size={15}/></button>
          </div>
        </div>
      </Card>
    </button>);})}
    </div>}
  </div>);
};

const NewPlanForm = ({onBack, editPlan=null}) => {
  const {products,plans,setPlans}=useApp();
  const allIncludes = products.filter(p=>p.price>0).map(p=>{
    const existing = editPlan?.includes?.find(i=>i.productId===p.id);
    return {productId:p.id,productName:p.name,qty:existing?.qty||0};
  });
  const [name,setName]=useState(editPlan?.name||'');
  const [price,setPrice]=useState(editPlan?.price||'');
  const [machine,setMachine]=useState(editPlan?.includesMachine||false);
  const [includes,setIncludes]=useState(allIncludes);
  const save=()=>{
    if(!name||!price)return;
    const updated={id:editPlan?.id||Date.now(),name,price:Number(price),includesMachine:machine,includes:includes.filter(i=>i.qty>0)};
    if(editPlan) setPlans(prev=>prev.map(p=>p.id===editPlan.id?updated:p));
    else setPlans(prev=>[...prev,updated]);
    onBack();
  };
  return(<div className="space-y-4"><BackBtn onClick={onBack}/>
    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editPlan?'Editar plan':'Nuevo plan'}</h2>
    <div className="space-y-3">
      <input placeholder="Nombre (ej: Abono Hogar, Maquina Frio/Calor)" value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
      <div><label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Precio mensual</label><input placeholder="$0" type="number" inputMode="numeric" value={price} onChange={e=>setPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/></div>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3"><input type="checkbox" checked={machine} onChange={e=>setMachine(e.target.checked)} className="w-4 h-4 rounded"/>Incluye maquina (frio/calor, dispenser, etc.)</label>
      <div><label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Productos incluidos por mes</label>
        <div className="space-y-2">{includes.map(inc=>(<div key={inc.productId} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl p-2.5"><span className="text-sm text-gray-900 dark:text-gray-100 flex-1">{inc.productName}</span><Qty value={inc.qty} onChange={v=>setIncludes(p=>p.map(x=>x.productId===inc.productId?{...x,qty:v}:x))}/></div>))}</div>
      </div>
    </div>
    <Btn v="primary" onClick={save} disabled={!name||!price} className="w-full">Guardar plan</Btn>
  </div>);
};

/* PLAN DETAIL — suscriptores y estado de entrega */
const PlanDetail = ({plan,onBack,onEdit})=>{
  const{clientPlans,clients}=useApp();
  const subs=clientPlans.filter(cp=>cp.planId===plan.id&&cp.active);
  const getStatus=(cp)=>{
    const delivered=(cp.deliveredMonths||[]);
    const last=delivered.length>0?delivered.reduce((a,b)=>((b.deliveredAt||0)>(a.deliveredAt||0)?b:a),delivered[0]):null;
    const daysSince=last?Math.floor((Date.now()-(last.deliveredAt||0))/(1000*60*60*24)):999;
    if(!last){const startDays=Math.floor((Date.now()-new Date(cp.startDate||Date.now()).getTime())/(1000*60*60*24));return startDays>=30?{label:'Para entregar',v:'warning',days:null}:{label:'Nuevo',v:'info',days:null};}
    if(daysSince>=30)return{label:'Para entregar',v:'warning',days:daysSince};
    return{label:'Al día',v:'success',days:30-daysSince};
  };
  const statusColor={success:'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',warning:'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',info:'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'};
  const pending=subs.filter(cp=>getStatus(cp).v==='warning').length;
  return(<div className="space-y-4">
    <BackBtn onClick={onBack}/>
    <div className="flex items-start justify-between">
      <div><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.name}</h2><p className="text-sm text-sky-600 font-semibold">{fmt(plan.price)}/mes</p></div>
      <button onClick={onEdit} className="p-2 rounded-lg text-gray-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
    </div>
    {plan.includes?.length>0&&<Card className="!p-3"><p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Incluye por mes</p><div className="flex flex-wrap gap-2">{plan.includes.map(inc=>(<span key={inc.productId} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold px-2.5 py-1 rounded-lg">{inc.qty}x {inc.productName}</span>))}{plan.includesMachine&&<span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-lg">Maquina</span>}</div></Card>}
    <div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{subs.length} suscriptor{subs.length!==1?'es':''}</p>{pending>0&&<span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">{pending} para entregar</span>}</div>
    {subs.length===0?<Card><p className="text-sm text-gray-400 text-center py-4">Ningún cliente tiene este plan asignado</p></Card>:
    <div className="space-y-2">{subs.map(cp=>{const cli=clients.find(c=>c.id===cp.clientId);const st=getStatus(cp);return(<Card key={cp.id} className="!p-3"><div className="flex items-center justify-between gap-2"><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{cli?.name||cp.clientId}</p><p className="text-xs text-gray-400 truncate">{cli?.address||cli?.zone||''}</p></div><div className="shrink-0 text-right"><span className={`text-[11px] font-bold px-2 py-1 rounded-full ${statusColor[st.v]}`}>{st.label}</span>{st.days!=null&&<p className="text-[10px] text-gray-400 mt-0.5">{st.v==='success'?`${st.days}d para el próximo`:`hace ${st.days}d`}</p>}</div></div></Card>);})}
    </div>}
  </div>);
};

/* ASSIGN PLAN TO CLIENT */
const AssignPlanForm = ({client,onBack}) => {
  const {plans,clientPlans,setClientPlans}=useApp();
  const [selPlan,setSelPlan]=useState(null);
  const [billing,setBilling]=useState('inicio_mes');
  const [customDay,setCustomDay]=useState('1');
  const today=new Date().toISOString().slice(0,10);
  const [startDate,setStartDate]=useState(today);
  const existing = clientPlans.find(cp=>cp.clientId===client.id&&cp.active);

  const save=()=>{
    if(!selPlan)return;
    const plan=plans.find(p=>p.id===selPlan);
    const cp={id:Date.now(),clientId:client.id,planId:selPlan,planName:plan.name,price:plan.price,includes:plan.includes,includesMachine:plan.includesMachine,billing,customDay:billing==='custom'?Number(customDay):null,startDate:new Date(startDate+'T12:00:00').toISOString(),active:true,consumedThisMonth:{}};
    setClientPlans(prev=>[...prev.filter(x=>!(x.clientId===client.id&&x.active)),cp]);
    onBack();
  };

  const removePlan=()=>{setClientPlans(prev=>prev.map(cp=>cp.clientId===client.id&&cp.active?{...cp,active:false}:cp));onBack();};

  if(plans.length===0) return(<div className="space-y-4"><BackBtn onClick={onBack}/><EmptyState icon={IC.file} title="No hay planes creados" description="Crea planes desde el modulo Stock > Planes"/></div>);

  return(<div className="space-y-4"><BackBtn onClick={onBack}/>
    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{existing?'Plan activo':'Asignar plan'}</h2>

    {existing&&<Card className="!border-sky-200 dark:!border-sky-800 !bg-sky-50/50 dark:!bg-sky-900/10">
      <div className="flex justify-between items-start"><div><p className="font-semibold text-sm text-sky-700 dark:text-sky-400">{existing.planName}</p><p className="text-xs text-gray-500 mt-0.5">{existing.includes.map(i=>i.qty+'x '+i.productName).join(' + ')}</p><p className="text-xs text-gray-400 mt-1">Cobro: {existing.billing==='inicio_mes'?'Inicio de mes':existing.billing==='fin_mes'?'Fin de mes':existing.billing==='repartidor'?'Cuando pasa el repartidor':'Dia '+existing.customDay}</p><p className="text-xs text-gray-400">Inicio: {new Date(existing.startDate).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</p></div><span className="text-lg font-bold text-sky-600">{fmt(existing.price)}<span className="text-xs font-normal text-gray-400">/mes</span></span></div>
      <Btn v="danger" size="sm" onClick={removePlan} className="w-full mt-3">Quitar plan</Btn>
    </Card>}

    <div><p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">{existing?'Cambiar a otro plan':'Seleccionar plan'}</p>
      <div className="space-y-2">{plans.map(p=>(<button key={p.id} onClick={()=>setSelPlan(p.id)} className={'w-full text-left p-3 rounded-xl border-2 transition-all '+(selPlan===p.id?'border-sky-500 bg-sky-50 dark:bg-sky-900/20':'border-gray-200 dark:border-gray-700')}>
        <div className="flex justify-between"><span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{p.name}</span><span className="text-sm font-bold text-sky-600">{fmt(p.price)}/mes</span></div>
        <p className="text-xs text-gray-400 mt-0.5">{p.includes.map(i=>i.qty+'x '+i.productName).join(' + ')}{p.includesMachine?' + Maquina':''}</p>
      </button>))}</div>
    </div>

    {selPlan&&<div><p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Cuando se cobra</p>
      <div className="grid grid-cols-2 gap-2">
        {[['inicio_mes','Inicio de mes'],['fin_mes','Fin de mes'],['repartidor','Pasa el repartidor'],['custom','Fecha custom']].map(([k,l])=>(
          <button key={k} onClick={()=>setBilling(k)} className={'py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all '+(billing===k?'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400':'border-gray-200 dark:border-gray-700 text-gray-500')}>{l}</button>
        ))}
      </div>
      {billing==='custom'&&<input type="number" inputMode="numeric" placeholder="Dia del mes (1-28)" value={customDay} onChange={e=>setCustomDay(e.target.value)} min="1" max="28" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>}
    </div>}

    {selPlan&&<div>
      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Fecha de inicio</p>
      <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
      {startDate!==today&&<p className="text-[11px] text-sky-600 dark:text-sky-400 mt-1 font-semibold">Inicio: {new Date(startDate+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</p>}
    </div>}

    {selPlan&&<Btn v="primary" onClick={save} className="w-full" size="lg"><I d={IC.check} size={18}/>Asignar plan</Btn>}
  </div>);
};

/* ============================================================
   DETALLE DE REPARTO ANTERIOR
   ============================================================ */
const PastRouteDetail = ({route:r,onBack})=>{
  const{products,containerStock}=useApp();

  // Carga que salió
  const truckItems=Object.entries(r.truckStock||{}).filter(([,q])=>q>0).map(([id,q])=>({id:Number(id),qty:q,product:products.find(p=>p.id===Number(id))}));

  // Carga que volvió (no entregada)
  const deliveredByProduct={};
  (r.stops||[]).filter(s=>s.status==='entregado').forEach(s=>(s.items||[]).forEach(it=>{deliveredByProduct[it.productId]=(deliveredByProduct[it.productId]||0)+it.qty;}));
  const returnedToDepot=truckItems.map(({id,qty,product})=>({product,salió:qty,entregó:deliveredByProduct[id]||0,volvió:qty-(deliveredByProduct[id]||0)})).filter(x=>x.volvió>0);

  // Envases recibidos
  const containerReturns={};
  (r.stops||[]).filter(s=>s.status==='entregado').forEach(s=>{Object.entries(s.returnContainers||{}).forEach(([cid,q])=>{containerReturns[cid]=(containerReturns[cid]||0)+q;});});

  // Cobros por método
  const byMethod={};
  const done=(r.stops||[]).filter(s=>s.status==='entregado');
  done.forEach(s=>{const m=s.paymentMethod||'fiado';byMethod[m]=(byMethod[m]||0)+(s.payment||0);});

  const ausentes=(r.stops||[]).filter(s=>s.ausente&&s.status==='pendiente');

  const printRoute=()=>{
    const dur=(()=>{if(!r.startedAt||!r.finishedAt)return'—';const[h,m]=r.startedAt.split(':').map(Number);const start=new Date(r.finishedAt);start.setHours(h,m,0,0);const mins=Math.round((r.finishedAt-start.getTime())/60000);return mins>0?`${Math.floor(mins/60)?Math.floor(mins/60)+'h ':''}${mins%60}min`:'—';})();
    const metodosLabel={efectivo:'Efectivo',transferencia:'Transferencia',mercadopago:'Mercado Pago',fiado:'Fiado'};
    const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reparto${r.routeNum?' #'+r.routeNum:''} — Carapachay</title><style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#111;padding:32px;max-width:700px;margin:auto;}
      h1{font-size:22px;font-weight:700;margin-bottom:2px;}
      h2{font-size:14px;font-weight:700;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.5px;color:#444;border-bottom:1px solid #ddd;padding-bottom:4px;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #111;}
      .logo{font-size:20px;font-weight:900;letter-spacing:-0.5px;}
      .meta{text-align:right;color:#555;font-size:12px;line-height:1.6;}
      .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px;}
      .box{border:1px solid #ddd;border-radius:8px;padding:10px 14px;text-align:center;}
      .box .label{font-size:10px;text-transform:uppercase;color:#888;margin-bottom:2px;}
      .box .val{font-size:18px;font-weight:700;}
      .box.green .val{color:#16a34a;}
      table{width:100%;border-collapse:collapse;margin-top:4px;}
      th{text-align:left;font-size:11px;text-transform:uppercase;color:#666;padding:6px 8px;border-bottom:1px solid #ddd;}
      td{padding:7px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;}
      tr:last-child td{border-bottom:none;}
      .badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;}
      .badge-green{background:#dcfce7;color:#15803d;}
      .badge-orange{background:#fff7ed;color:#c2410c;}
      .badge-gray{background:#f3f4f6;color:#6b7280;}
      .badge-red{background:#fee2e2;color:#b91c1c;}
      .total-row{font-weight:700;background:#f9fafb;}
      .right{text-align:right;}
      .footer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#aaa;text-align:center;}
      @media print{body{padding:20px;}@page{margin:15mm;}}
    </style></head><body>
    <div class="header">
      <div><div class="logo">Carapachay</div><div style="color:#555;font-size:12px;margin-top:2px;">Sodería</div></div>
      <div class="meta">
        <div style="font-size:16px;font-weight:700;">Reparto${r.routeNum?' #'+r.routeNum:''}</div>
        <div style="text-transform:capitalize;">${r.date||''}</div>
        ${r.startedAt?`<div>Inicio: ${r.startedAt} · Fin: ${r.finishedAt?new Date(r.finishedAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'—'} · Duración: ${dur}</div>`:''}
      </div>
    </div>
    <div class="summary">
      <div class="box green"><div class="label">Total cobrado</div><div class="val">${fmt(r.collected)}</div></div>
      <div class="box"><div class="label">Entregas</div><div class="val">${r.delivered||done.length}/${(r.stops||[]).length}</div></div>
      <div class="box"><div class="label">Ausentes</div><div class="val">${ausentes.length}</div></div>
    </div>
    ${Object.keys(byMethod).length>0?`<h2>Cobros por método</h2><table><thead><tr><th>Método</th><th class="right">Monto</th></tr></thead><tbody>
      ${Object.entries(byMethod).map(([k,v])=>`<tr><td>${metodosLabel[k]||k}</td><td class="right">${fmt(v)}</td></tr>`).join('')}
      <tr class="total-row"><td>Total</td><td class="right">${fmt(r.collected)}</td></tr>
    </tbody></table>`:''}
    ${truckItems.length>0?`<h2>Carga del camión</h2><table><thead><tr><th>Producto</th><th class="right">Salió</th><th class="right">Entregó</th><th class="right">Volvió</th></tr></thead><tbody>
      ${truckItems.map(({id,qty,product})=>`<tr><td>${product?.name||'Producto '+id}</td><td class="right">${qty}</td><td class="right">${deliveredByProduct[id]||0}</td><td class="right">${qty-(deliveredByProduct[id]||0)}</td></tr>`).join('')}
    </tbody></table>`:''}
    ${Object.keys(containerReturns).filter(k=>containerReturns[k]>0).length>0?`<h2>Envases recibidos</h2><table><thead><tr><th>Tipo</th><th class="right">Cantidad</th></tr></thead><tbody>
      ${Object.entries(containerReturns).filter(([,q])=>q>0).map(([cid,q])=>{const ct=containerStock.find(x=>x.id===Number(cid));return`<tr><td>${ct?.name||cid}</td><td class="right">${q}</td></tr>`;}).join('')}
    </tbody></table>`:''}
    <h2>Detalle de paradas</h2>
    <table><thead><tr><th>#</th><th>Cliente</th><th>Productos</th><th>Pago</th><th class="right">Monto</th></tr></thead><tbody>
      ${(r.stops||[]).map((s,i)=>{
        const statusBadge=s.status==='entregado'?'<span class="badge badge-green">Entregado</span>':s.ausente?'<span class="badge badge-orange">Ausente</span>':'<span class="badge badge-gray">Sin entregar</span>';
        const itemsStr=s.status==='entregado'?(s.items||[]).map(it=>`${it.qty}x ${it.name}`).join(', '):'—';
        const pagoStr=s.status==='entregado'?(s.paymentMethod==='fiado'?'<span class="badge badge-red">Fiado</span>':(metodosLabel[s.paymentMethod]||s.paymentMethod)):'—';
        const montoStr=s.status==='entregado'?fmt(s.payment||s.total):'—';
        return`<tr><td style="color:#888">${i+1}</td><td><strong>${s.clientName}</strong><br/>${statusBadge}</td><td style="color:#555">${itemsStr}</td><td>${pagoStr}</td><td class="right">${montoStr}</td></tr>`;
      }).join('')}
    </tbody></table>
    ${ausentes.length>0?`<div style="margin-top:16px;padding:10px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:12px;color:#c2410c;"><strong>Ausentes sin entregar:</strong> ${ausentes.map(s=>s.clientName).join(', ')}</div>`:''}
    <div class="footer">Generado por Carapachay · ${new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}</div>
    </body></html>`;
    const w=window.open('','_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(()=>w.print(),400);
  };

  return(<div className="space-y-4">
    <BackBtn onClick={onBack}/>
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Reparto{r.routeNum?` #${r.routeNum}`:''}</h2>
        <p className="text-sm text-gray-500 capitalize">{r.date}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={printRoute} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Imprimir</button>
        <div className="text-right">
          <p className="text-xl font-bold text-emerald-600">{fmt(r.collected)}</p>
          <p className="text-xs text-gray-400">{r.delivered}/{(r.stops||[]).length} entregas</p>
        </div>
      </div>
    </div>

    {/* Horario */}
    <Card className="!p-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div><p className="text-[10px] text-gray-400 mb-0.5">Inicio</p><p className="text-sm font-bold text-gray-900 dark:text-gray-100">{r.startedAt||'—'}</p></div>
        <div><p className="text-[10px] text-gray-400 mb-0.5">Fin</p><p className="text-sm font-bold text-gray-900 dark:text-gray-100">{r.finishedAt?new Date(r.finishedAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'—'}</p></div>
        <div><p className="text-[10px] text-gray-400 mb-0.5">Duración</p><p className="text-sm font-bold text-gray-900 dark:text-gray-100">{r.startedAt&&r.finishedAt?(()=>{const [h,m]=r.startedAt.split(':').map(Number);const start=new Date(r.finishedAt);start.setHours(h,m,0,0);const diff=r.finishedAt-start.getTime();const mins=Math.round(diff/60000);return mins>0?`${Math.floor(mins/60)?Math.floor(mins/60)+'h ':''}${mins%60}min`:'—';})():'—'}</p></div>
      </div>
    </Card>

    {/* Cobros por método */}
    <Card className="!p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Cobros</h3>
      <div className="space-y-2">{[['efectivo','Efectivo','text-emerald-600'],['transferencia','Transferencia','text-sky-600'],['mercadopago','Mercado Pago','text-blue-600'],['fiado','Fiado','text-red-500']].map(([k,l,c])=>byMethod[k]?(
        <div key={k} className="flex justify-between text-sm"><span className="text-gray-500">{l}</span><span className={`font-bold ${c}`}>{fmt(byMethod[k])}</span></div>
      ):null)}</div>
      <div className="flex justify-between text-sm font-bold border-t border-gray-100 dark:border-gray-800 mt-2 pt-2"><span>Total cobrado</span><span className="text-emerald-600">{fmt(r.collected)}</span></div>
    </Card>

    {/* Carga que salió */}
    {truckItems.length>0&&<Card className="!p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Carga que salió</h3>
      <div className="space-y-2">{truckItems.map(({id,qty,product})=>(
        <div key={id} className="flex justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300">{product?.name||`Producto ${id}`}</span>
          <div className="flex items-center gap-3">
            <span className="text-gray-400">{qty} unid.</span>
            <span className="text-[11px] text-emerald-600 font-semibold">↓ {deliveredByProduct[id]||0} entregadas</span>
          </div>
        </div>
      ))}</div>
    </Card>}

    {/* Carga que volvió */}
    {returnedToDepot.length>0&&<Card className="!p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Carga que volvió al depósito</h3>
      <div className="space-y-2">{returnedToDepot.map(({product,salió,volvió},i)=>(
        <div key={i} className="flex justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300">{product?.name||'Producto'}</span>
          <span className="font-semibold text-amber-600">{volvió} de {salió}</span>
        </div>
      ))}</div>
    </Card>}

    {/* Envases recibidos */}
    {Object.keys(containerReturns).length>0&&<Card className="!p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Envases recibidos</h3>
      <div className="space-y-2">{Object.entries(containerReturns).filter(([,q])=>q>0).map(([cid,q])=>{const ct=containerStock.find(x=>x.id===Number(cid));return(
        <div key={cid} className="flex justify-between text-sm"><span className="text-gray-700 dark:text-gray-300">{ct?.name||cid}</span><span className="font-bold text-sky-600">{q} devueltos</span></div>
      );})}</div>
    </Card>}

    {/* Paradas */}
    <div>
      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Paradas ({(r.stops||[]).length})</p>
      <div className="space-y-2">{(r.stops||[]).map((s,i)=>(
        <Card key={i} className="!p-3">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.status==='entregado'?'bg-emerald-100 dark:bg-emerald-900/30':s.ausente?'bg-orange-100 dark:bg-orange-900/30':'bg-gray-100 dark:bg-gray-800'}`}>
              {s.status==='entregado'?<I d={IC.check} size={15} className="text-emerald-600"/>:s.ausente?<I d={IC.alert} size={15} className="text-orange-500"/>:<I d={IC.clock} size={15} className="text-gray-400"/>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{s.clientName}</p>
                {s.status==='entregado'&&<Badge variant="success">Entregado</Badge>}
                {s.ausente&&s.status!=='entregado'&&<Badge variant="warning">Ausente</Badge>}
                {s.status==='pendiente'&&!s.ausente&&<Badge variant="default">Sin entregar</Badge>}
              </div>
              {s.status==='entregado'&&<>
                <p className="text-xs text-gray-400 mt-0.5">{(s.items||[]).map(it=>`${it.qty}x ${it.name}`).join(', ')}</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{s.paymentMethod==='fiado'?`Fiado — ${fmt(s.total)}`:`${s.paymentMethod} — ${fmt(s.payment||s.total)}`}</p>
                {Object.entries(s.returnContainers||{}).filter(([,q])=>q>0).map(([cid,q])=>{const ct=containerStock.find(x=>x.id===Number(cid));return<p key={cid} className="text-[11px] text-sky-600">↩ {q} {ct?.name||cid}</p>;})}
              </>}
            </div>
          </div>
        </Card>
      ))}</div>
    </div>

    {ausentes.length>0&&<div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3"><p className="text-xs font-semibold text-orange-700 dark:text-orange-400">Ausentes sin entregar ({ausentes.length}): {ausentes.map(s=>s.clientName).join(', ')}</p></div>}
  </div>);
};

/* ============================================================
   MÓDULO 3: REPARTO (full flow - load truck → build route → deliver)
   ============================================================ */
const DeliveryModule = ()=>{
  const{activeRoute,setActiveRoute,pendingRoutes,setPendingRoutes,pastRoutes,role}=useApp();
  const[showInit,setShowInit]=useState(false);
  const[selPast,setSelPast]=useState(null);
  if(selPast)return <PastRouteDetail route={selPast} onBack={()=>setSelPast(null)}/>;

  const startRoute=(route)=>{
    setActiveRoute({...route,startedAt:new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})});
    setPendingRoutes(prev=>prev.filter(r=>r.id!==route.id));
  };
  const deleteRoute=(id)=>setPendingRoutes(prev=>prev.filter(r=>r.id!==id));

  if(showInit&&!activeRoute)return <InitRoute onClose={()=>setShowInit(false)}/>;
  if(activeRoute)return <ActiveRoute/>;

  return(<div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Reparto</h2>
      {role==='admin'&&<Btn v="primary" size="sm" onClick={()=>setShowInit(true)}><I d={IC.plus} size={16}/>Nuevo</Btn>}
    </div>

    {pendingRoutes.length===0&&(
      <div className="text-center py-10">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-900/40 dark:to-sky-800/30 flex items-center justify-center mx-auto mb-5"><I d={IC.truck} size={36} className="text-sky-600 dark:text-sky-400"/></div>
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">Sin repartos pendientes</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-[260px] mx-auto">El admin planifica el recorrido y el repartidor lo inicia</p>
        {role==='admin'&&<Btn v="primary" size="lg" onClick={()=>setShowInit(true)} className="mx-auto shadow-lg shadow-sky-600/25"><I d={IC.plus} size={22}/>Planificar reparto</Btn>}
      </div>
    )}

    {pendingRoutes.length>0&&(
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-gray-500 uppercase">Pendientes de iniciar ({pendingRoutes.length})</p>
        {pendingRoutes.map(r=>(
          <Card key={r.id} className="!p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 dark:text-gray-100">Reparto #{r.routeNum}</span>
                  <Badge variant="warning">Pendiente</Badge>
                </div>
                {r.scheduledDate&&<p className="text-xs text-sky-600 font-semibold mt-0.5">Programado: {new Date(r.scheduledDate+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{r.stops.length} paradas · Creado {new Date(r.createdAt).toLocaleDateString('es-AR')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">{r.stops.map((s,i)=>(<span key={i} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{s.clientName}</span>))}</div>
            <div className="flex gap-2">
              {role==='admin'&&<button onClick={()=>deleteRoute(r.id)} className="px-3 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition">Cancelar</button>}
              <Btn v="success" onClick={()=>startRoute(r)} className="flex-1" size="sm"><I d={IC.play} size={16}/>Iniciar reparto</Btn>
            </div>
          </Card>
        ))}
      </div>
    )}

    {pastRoutes.length>0&&(
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Anteriores</p>
        <div className="space-y-2">{pastRoutes.map((r,i)=>(
          <Card key={i} onClick={()=>r.stops&&typeof r.stops!=='number'&&setSelPast(r)} className={`!p-3 ${r.stops&&typeof r.stops!=='number'?'cursor-pointer active:scale-[0.98] transition-transform':''}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{r.routeNum?`#${r.routeNum} · `:''}{r.date}</p>
                <p className="text-xs text-gray-400">{typeof r.stops==='number'?r.stops:r.stops?.length} paradas · {r.delivered} entregas{r.startedAt?` · ${r.startedAt}`:''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-600">{fmt(r.collected)}</span>
                {r.stops&&typeof r.stops!=='number'&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400"><path d="M9 18l6-6-6-6"/></svg>}
              </div>
            </div>
          </Card>
        ))}</div>
      </div>
    )}
  </div>);
};

const InitRoute = ({onClose})=>{
  const{products,setProducts,clients,pendingRoutes,setPendingRoutes,routeCounter,setRouteCounter}=useApp();
  const[step,setStep]=useState(0);
  const[ts,setTs]=useState(products.reduce((a,p)=>({...a,[p.id]:0}),{}));
  const[rc,setRc]=useState([]);
  const[mode,setMode]=useState(null);
  const[selZones,setSelZones]=useState([]);
  const[scheduledDate,setScheduledDate]=useState('');

  const truckTotal=Object.entries(ts).reduce((s,[id,q])=>{const p=products.find(x=>x.id===Number(id));return s+(p?p.price*q:0);},0);
  const truckItems=Object.entries(ts).filter(([,q])=>q>0);

  const saveRoute=()=>{
    const num=String(routeCounter).padStart(3,'0');
    const route={
      id:Date.now(),
      routeNum:num,
      truckStock:{...ts},
      stops:rc.map((c,i)=>({id:i+1,clientId:c.id,clientName:c.name,address:c.address,zone:c.zone,lat:c.lat,lng:c.lng,status:'pendiente',items:[],returnContainers:{sifones:0,bidones:0},payment:null,paymentMethod:null,total:0})),
      scheduledDate:scheduledDate||null,
      createdAt:Date.now(),
    };
    setProducts(p=>p.map(x=>({...x,stock:x.stock-(ts[x.id]||0)})));
    setPendingRoutes(prev=>[...prev,route]);
    setRouteCounter(prev=>prev+1);
    onClose();
  };

  return(<div className="space-y-4"><BackBtn onClick={onClose} label="Cancelar"/><StepBar steps={['Cargar camión','Armar recorrido','Confirmar']} current={step}/>
    {step===0&&<div className="space-y-4">
      <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><I d={IC.box} size={22} className="text-amber-600"/></div><div><h3 className="font-bold text-gray-900 dark:text-gray-100">Cargar camión</h3><p className="text-xs text-gray-500">Seleccioná del depósito</p></div></div>
      <div className="space-y-2">{products.filter(p=>p.stock>0&&p.price>0).map(p=>(<Card key={p.id} className="!p-3"><div className="flex items-center justify-between gap-2"><div className="flex-1 min-w-0"><span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{p.name}</span><div className="flex gap-3 mt-0.5"><span className="text-xs text-gray-400">Dep: <b>{p.stock}</b></span><span className="text-xs text-gray-400">{fmt(p.price)}</span></div></div><Qty value={ts[p.id]||0} onChange={v=>setTs({...ts,[p.id]:v})} max={p.stock}/></div></Card>))}</div>
      {truckItems.length>0&&<div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-3"><div className="flex justify-between"><span className="text-sm font-bold text-sky-700 dark:text-sky-400">En el camión</span><span className="text-sm font-bold text-sky-700 dark:text-sky-400">{fmt(truckTotal)}</span></div></div>}
      <Btn v="primary" onClick={()=>setStep(1)} disabled={!truckItems.length} className="w-full" size="lg">Siguiente: Armar recorrido</Btn>
    </div>}
    {step===1&&<BuildRoute mode={mode} setMode={setMode} selZones={selZones} setSelZones={setSelZones} rc={rc} setRc={setRc} onBack={()=>setStep(0)} onNext={()=>setStep(2)}/>}
    {step===2&&<div className="space-y-4">
      <RouteMap stops={rc.map(c=>({...c,clientName:c.name}))} height={200}/>
      <Btn v="outline" size="sm" onClick={()=>openGMaps(rc)} className="w-full"><I d={IC.nav} size={16}/>Abrir en Google Maps</Btn>
      <Card>
        <h4 className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Camión</h4>
        {truckItems.map(([id,q])=>{const p=products.find(x=>x.id===Number(id));return p&&<div key={id} className="flex justify-between text-sm"><span className="text-gray-700 dark:text-gray-300">{p.name}</span><span className="font-bold">{q} {p.unit}</span></div>;})}
        <div className="flex justify-between text-sm border-t border-gray-100 dark:border-gray-800 pt-2 mt-2"><span className="font-bold">Total</span><span className="font-bold text-sky-600">{fmt(truckTotal)}</span></div>
      </Card>
      <Card>
        <h4 className="text-[11px] font-semibold text-gray-500 uppercase mb-2">{rc.length} paradas</h4>
        {rc.map((c,i)=>(<div key={c.id} className="flex items-center gap-2 mb-2"><div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-[11px] font-bold text-sky-700">{i+1}</div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</p><p className="text-xs text-gray-400 truncate">{c.address}</p></div><Badge variant="violet">{c.zone}</Badge></div>))}
      </Card>
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Fecha programada <span className="font-normal normal-case">(opcional)</span></p>
        <input type="date" value={scheduledDate} onChange={e=>setScheduledDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>
      </div>
      <div className="flex gap-2">
        <Btn v="secondary" onClick={()=>setStep(1)} className="flex-1">Atrás</Btn>
        <Btn v="success" onClick={saveRoute} className="flex-1" size="lg"><I d={IC.check} size={18}/>Confirmar reparto</Btn>
      </div>
    </div>}
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
      <div><p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Zonas</p><div className="flex flex-wrap gap-2">{[...new Set(clients.filter(c=>c.zone).map(c=>c.zone))].map(z=>{const s=selZones.includes(z);const cnt=clients.filter(c=>c.zone===z).length;return <button key={z} onClick={()=>toggleZone(z)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95 ${s?'bg-violet-600 text-white border-violet-600':'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>{s&&<I d={IC.check} size={14}/>}{z} <span className="opacity-60">({cnt})</span></button>;})}</div></div>
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
  const finish=()=>{setPastRoutes(p=>[{...ar,finishedAt:Date.now(),date:new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}),delivered:done.length,collected:tot},...p]);setActiveRoute(null);};
  const avail=clients.filter(c=>!ar.stops.find(s=>s.clientId===c.id));const searched=search?avail.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())):avail;
  const addC=(c)=>{setActiveRoute({...ar,stops:[...ar.stops,{id:ar.stops.length+1,clientId:c.id,clientName:c.name,address:c.address,zone:c.zone,lat:c.lat,lng:c.lng,status:'pendiente',items:[],returnContainers:{sifones:0,bidones:0},payment:null,paymentMethod:null,total:0}]});setShowAdd(false);setSearch('');};
  if(sel)return <StopDetail stop={sel} onBack={()=>setSel(null)}/>;
  return(<div className="space-y-4"><div className="flex justify-between"><div><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Reparto en curso</h2><p className="text-xs text-gray-500">{ar.startedAt}</p></div><Badge variant="info">{pend.length} pend.</Badge></div><RouteMap stops={ar.stops} height={220}/><Btn v="outline" size="sm" onClick={()=>openGMaps(pend.length?pend:ar.stops)} className="w-full"><I d={IC.nav} size={16}/>Google Maps</Btn><div className="grid grid-cols-3 gap-3"><Stat label="Pendientes" value={pend.length} variant="warning"/><Stat label="Entregados" value={done.length} variant="success"/><Stat label="Cobrado" value={fmt(tot)} variant="success"/></div><Btn v="outline" onClick={()=>setShowAdd(true)} className="w-full" size="sm"><I d={IC.userPlus} size={16}/>Agregar parada</Btn>
    <Modal open={showAdd} onClose={()=>{setShowAdd(false);setSearch('');}} title="Agregar parada"><div className="space-y-3"><Search value={search} onChange={setSearch}/><div className="space-y-1 max-h-[50vh] overflow-y-auto">{searched.map(c=>(<button key={c.id} onClick={()=>addC(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left"><div className="flex-1 min-w-0"><span className="font-semibold text-sm text-gray-900 dark:text-gray-100 block truncate">{c.name}</span><p className="text-xs text-gray-400 truncate">{c.address}</p></div><div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center"><I d={IC.plus} size={18} className="text-sky-600"/></div></button>))}</div></div></Modal>
    {pend.length>0&&<div><p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Pendientes</p>{pend.map((s,i)=>(<Card key={s.id} onClick={()=>setSel(s)} className={`!p-3 mb-2 ${s.ausente?'!border-orange-200 dark:!border-orange-800':''}`}><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${s.ausente?'bg-orange-100 dark:bg-orange-900/30 text-orange-600':'bg-amber-100 dark:bg-amber-900/30 text-amber-700'}`}>{s.ausente?<I d={IC.alert} size={16}/>:i+1}</div><div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{s.clientName}</p><p className="text-xs text-gray-400 truncate">{s.ausente?`Ausente · ${new Date(s.ausenteAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`:s.address}</p></div><div className="flex items-center gap-1"><Badge variant="violet">{s.zone}</Badge></div></div></Card>))}</div>}
    {done.length>0&&<div><p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Entregados</p>{done.map(s=>(<Card key={s.id} className="!p-3 mb-2 opacity-60"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><I d={IC.check} size={16} className="text-emerald-600"/></div><div className="flex-1"><p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{s.clientName}</p><p className="text-xs text-gray-400">{s.paymentMethod==='fiado'?'Fiado':`${s.paymentMethod} — ${fmt(s.payment)}`}</p></div></div></Card>))}</div>}
    {!pend.length&&<Btn v="success" onClick={finish} className="w-full" size="lg"><I d={IC.check} size={20}/>Finalizar</Btn>}
    {pend.length>0&&<Btn v="danger" onClick={finish} className="w-full" size="sm">Finalizar anticipado</Btn>}
  </div>);
};

const StopDetail = ({stop,onBack})=>{const{activeRoute:ar,setActiveRoute,clients,setClients,products,containerStock,setContainerStock,orders,setOrders,setPayments,orderCounter,setOrderCounter}=useApp();const[step,setStep]=useState(0);const[items,setItems]=useState(products.filter(p=>p.price>0).map(p=>({...p,qty:0})));const[returned,setReturned]=useState({});const[pm,sPm]=useState(null);const[pa,sPa]=useState('');
  const total=items.reduce((s,it)=>s+it.price*it.qty,0);
  const confirm=()=>{
    const paid=pm==='fiado'?0:(Number(pa)||total);const rem=total-paid;
    const deliveredItems=items.filter(it=>it.qty>0);
    const outByContainer={};
    deliveredItems.forEach(it=>{const p=products.find(x=>x.id===it.id);if(p?.containerType){outByContainer[p.containerType]=(outByContainer[p.containerType]||0)+it.qty;}});
    const now=Date.now();
    const orderNum=String(orderCounter).padStart(4,'0');
    const newOrder={id:now,orderNum,clientId:stop.clientId,clientName:stop.clientName,items:deliveredItems.map(it=>({productId:it.id,qty:it.qty,name:it.name,price:it.price})),total,payment:{method:pm,amount:paid},status:'entregado',createdAt:now,fromRoute:true};
    setOrders(prev=>[newOrder,...prev]);
    setOrderCounter(prev=>prev+1);
    if(paid>0){setPayments(prev=>[{id:now+1,clientId:stop.clientId,clientName:stop.clientName,amount:paid,concept:`Reparto #${orderNum}`,method:pm,createdAt:now},...prev]);}
    setActiveRoute(p=>({...p,stops:p.stops.map(s=>s.id===stop.id?{...s,status:'entregado',orderNum,items:deliveredItems.map(it=>({productId:it.id,qty:it.qty,name:it.name})),returnContainers:returned,payment:paid,paymentMethod:pm,total}:s)}));
    setClients(p=>p.map(c=>{if(c.id!==stop.clientId)return c;const nc={...(c.containers||{})};containerStock.forEach(ct=>{nc[ct.id]=Math.max(0,(nc[ct.id]||0)+(outByContainer[ct.id]||0)-(returned[ct.id]||0));});return{...c,lastOrder:new Date().toLocaleDateString('es-AR'),balance:rem>0?c.balance-rem:c.balance,containers:nc};}));
    setContainerStock(prev=>prev.map(ct=>({...ct,stock:Math.max(0,ct.stock-(outByContainer[ct.id]||0)+(returned[ct.id]||0))})));
    setStep(3);
  };
  if(step===3)return(<div className="text-center py-10 space-y-4"><div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto"><I d={IC.check} size={32} className="text-emerald-600"/></div><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Entrega registrada</h2><Btn v="primary" onClick={onBack} className="w-full">Volver</Btn></div>);
  return(<div className="space-y-4"><BackBtn onClick={onBack}/><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{stop.clientName}</h2><p className="text-sm text-gray-500 flex items-center gap-1"><I d={IC.pin} size={14}/>{stop.address}</p>{stop.lat&&<RouteMap stops={[stop]} height={140} showRoute={false}/>}{stop.lat&&<Btn v="outline" size="sm" onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`,'_blank')} className="w-full"><I d={IC.nav} size={16}/>Cómo llegar</Btn>}<div className="flex gap-1">{['Productos','Envases','Cobro'].map((l,i)=>(<div key={i} className={`flex-1 h-1.5 rounded-full ${step>=i?'bg-sky-600':'bg-gray-200 dark:bg-gray-700'}`}/>))}</div>
    {step===0&&<div className="space-y-3">
      {stop.ausente&&<div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2"><I d={IC.alert} size={14} className="text-orange-500 shrink-0"/><p className="text-xs text-orange-600 font-semibold">Ausente en visita anterior</p></div>}
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">¿Qué dejás?</h3>{items.filter(it=>(ar.truckStock[it.id]||0)>0).map(it=>(<Card key={it.id} className="!p-3"><div className="flex items-center justify-between gap-2"><div className="flex-1"><p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{it.name}</p><p className="text-xs text-gray-400">{fmt(it.price)} — Camión: {ar.truckStock[it.id]||0}</p></div><Qty value={it.qty} onChange={v=>{setItems(p=>p.map(x=>x.id===it.id?{...x,qty:v}:x));}} max={ar.truckStock[it.id]||0}/></div></Card>))}<div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center"><span className="text-xs text-gray-400">Total</span><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(total)}</p></div>
      <Btn v="primary" onClick={()=>setStep(1)} className="w-full">Siguiente: Envases</Btn>
      <button onClick={()=>{setActiveRoute(p=>({...p,stops:p.stops.map(s=>s.id===stop.id?{...s,ausente:true,ausenteAt:Date.now()}:s)}));onBack();}} className="w-full py-3 rounded-xl border-2 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 text-sm font-semibold hover:bg-orange-50 dark:hover:bg-orange-900/20 transition active:scale-[0.97] flex items-center justify-center gap-2">
        <I d={IC.alert} size={16}/>No estaba en el domicilio
      </button>
    </div>}
    {step===1&&<div className="space-y-4"><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Envases que retirás</h3><Card className="!p-4 space-y-4">{containerStock.length===0?<p className="text-xs text-gray-400 text-center py-2">Sin tipos de envases configurados</p>:containerStock.map(ct=><Qty key={ct.id} value={returned[ct.id]||0} onChange={v=>setReturned(p=>({...p,[ct.id]:v}))} label={ct.name}/>)}</Card><div className="flex gap-2"><Btn v="secondary" onClick={()=>setStep(0)} className="flex-1">Atrás</Btn><Btn v="primary" onClick={()=>{setStep(2);sPa(String(total));}} className="flex-1">Siguiente: Cobro</Btn></div></div>}
    {step===2&&<div className="space-y-4"><div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center"><span className="text-xs text-gray-400">Total</span><p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{fmt(total)}</p></div><div className="grid grid-cols-2 gap-2">{[['efectivo','Efectivo'],['transferencia','Transferencia'],['mercadopago','Mercado Pago'],['fiado','Fiado']].map(([k,l])=>(<button key={k} onClick={()=>{sPm(k);sPa(k==='fiado'?'0':String(total));}} className={`py-3.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${pm===k?(k==='fiado'?'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400':'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400'):'border-gray-200 dark:border-gray-700 text-gray-500'}`}>{l}</button>))}</div>{pm&&pm!=='fiado'&&<div><label className="text-xs text-gray-500">Monto</label><input type="number" value={pa} onChange={e=>sPa(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-lg font-bold mt-1 focus:outline-none focus:ring-2 focus:ring-sky-500/30"/>{Number(pa)<total&&Number(pa)>0&&<p className="text-xs text-amber-600 mt-1">Diferencia {fmt(total-Number(pa))} → fiado</p>}</div>}{pm==='fiado'&&<div className="bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800 rounded-xl p-3"><p className="text-xs text-red-600 font-semibold">{fmt(total)} se suma a la deuda</p></div>}<div className="flex gap-2"><Btn v="secondary" onClick={()=>setStep(1)} className="flex-1">Atrás</Btn><Btn v="success" onClick={confirm} disabled={!pm||!total} className="flex-1" size="lg"><I d={IC.check} size={18}/>Confirmar</Btn></div></div>}
  </div>);
};

/* ============================================================
   MÓDULO 4: MÉTRICAS
   ============================================================ */
const MetricsModule=()=>{
  const{clients,orders,payments}=useApp();
  const[period,setPeriod]=useState('hoy');
  const[showDebtors,setShowDebtors]=useState(false);
  const[fromDate,setFromDate]=useState('');
  const[toDate,setToDate]=useState('');
  const now=Date.now();
  const getRange=()=>{
    const d=new Date();
    if(period==='hoy'){const s=new Date(d);s.setHours(0,0,0,0);return[s.getTime(),now];}
    if(period==='semana'){const s=new Date(d);s.setDate(d.getDate()-6);s.setHours(0,0,0,0);return[s.getTime(),now];}
    if(period==='mes'){const s=new Date(d);s.setDate(d.getDate()-29);s.setHours(0,0,0,0);return[s.getTime(),now];}
    if(period==='custom'&&fromDate&&toDate){return[new Date(fromDate+'T00:00:00').getTime(),new Date(toDate+'T23:59:59').getTime()];}
    return[0,now];
  };
  const[from,to]=getRange();
  const filtOrders=(orders||[]).filter(o=>o.createdAt>=from&&o.createdAt<=to);
  const filtPayments=(payments||[]).filter(p=>(p.createdAt||p.date||0)>=from&&(p.createdAt||p.date||0)<=to);
  const done=filtOrders.filter(o=>o.status==='entregado');
  const sales=done.reduce((s,o)=>s+o.total,0);
  const debtors=[...clients].filter(c=>c.balance<0).sort((a,b)=>a.balance-b.balance);
  const totalDebt=debtors.reduce((s,c)=>s+Math.abs(c.balance),0);
  const byMethod=filtPayments.reduce((a,p)=>{a[p.method]=(a[p.method]||0)+(p.amount||0);return a;},{});
  const totalCollected=['efectivo','transferencia','mercadopago'].reduce((s,m)=>s+(byMethod[m]||0),0);
  const fiadoRecuperado=byMethod['fiado']||0;
  const productTotals={};
  filtOrders.forEach(o=>(o.items||[]).forEach(it=>{if(!productTotals[it.name])productTotals[it.name]={qty:0,revenue:0};productTotals[it.name].qty+=it.qty;productTotals[it.name].revenue+=it.qty*(it.price||0);}));
  const topProducts=Object.entries(productTotals).sort((a,b)=>b[1].qty-a[1].qty);
  const maxQty=topProducts[0]?.[1]?.qty||1;
  return(<div className="space-y-4">
    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Métricas</h2>
    <div className="flex gap-1.5 flex-wrap">{[['hoy','Hoy'],['semana','Semana'],['mes','Mes'],['todo','Todo'],['custom','Rango']].map(([k,l])=>(<button key={k} onClick={()=>setPeriod(k)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${period===k?'bg-sky-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{l}</button>))}</div>
    {period==='custom'&&<div className="flex gap-2 items-center"><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500/30"/><span className="text-xs text-gray-400">a</span><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500/30"/></div>}
    <div className="grid grid-cols-2 gap-3"><Stat label="Ventas" value={fmt(sales)} variant="success"/><Stat label="Entregas" value={done.length}/></div>
    <div onClick={()=>setShowDebtors(p=>!p)} className="cursor-pointer"><Card className="!bg-red-50 dark:!bg-red-900/15 border border-red-200 dark:border-red-800/50 transition-all"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Fiado en la calle</p><p className="text-2xl font-bold text-red-600 dark:text-red-400">{fmt(totalDebt)}</p><p className="text-xs text-red-400 mt-0.5">{debtors.length} cliente{debtors.length!==1?'s':''} deben</p></div><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 text-red-400 transition-transform duration-200 ${showDebtors?'rotate-180':''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg></div>{showDebtors&&<div className="mt-4 space-y-2.5 border-t border-red-200 dark:border-red-800/50 pt-3">{debtors.length===0?<p className="text-xs text-red-400 text-center">Sin deudores</p>:debtors.map(c=>{const pct=totalDebt>0?Math.round(Math.abs(c.balance)/totalDebt*100):0;return(<div key={c.id} className="space-y-1"><div className="flex justify-between text-xs"><div><span className="font-semibold text-gray-800 dark:text-gray-200">{c.name}</span>{c.zone&&<span className="text-gray-400 ml-1.5">· {c.zone}</span>}</div><span className="font-bold text-red-600">{fmt(Math.abs(c.balance))}</span></div><div className="h-1.5 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{width:`${pct}%`}}/></div></div>);})}</div>}</Card></div>
    <Card><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Arqueo de caja</h3><div className="space-y-2">{[['efectivo','Efectivo','text-emerald-600'],['transferencia','Transferencia','text-sky-600'],['mercadopago','Mercado Pago','text-blue-600']].map(([k,l,tc])=>{const a=byMethod[k]||0;return(<div key={k} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"><span className="text-sm text-gray-500">{l}</span><span className={`text-sm font-bold ${tc}`}>{fmt(a)}</span></div>);})}<div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200 dark:border-gray-700"><span className="text-sm font-bold text-gray-700 dark:text-gray-300">Total cobrado</span><span className="text-base font-bold text-gray-900 dark:text-gray-100">{fmt(totalCollected)}</span></div>{fiadoRecuperado>0&&<div className="flex justify-between items-center text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mt-1"><span>Recupero de fiado</span><span className="font-bold">{fmt(fiadoRecuperado)}</span></div>}</div></Card>
    {topProducts.length>0&&<Card><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Productos más vendidos</h3><div className="space-y-2.5">{topProducts.map(([name,data])=>(<div key={name} className="space-y-1"><div className="flex justify-between text-xs"><span className="text-gray-700 dark:text-gray-300 font-medium">{name}</span><div className="text-right"><span className="font-bold text-gray-900 dark:text-gray-100">{data.qty} un.</span><span className="text-gray-400 ml-2">{fmt(data.revenue)}</span></div></div><div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-sky-400 rounded-full" style={{width:`${Math.round(data.qty/maxQty*100)}%`}}/></div></div>))}</div></Card>}
    <p className="text-center text-xs text-gray-400 py-2">{clients.length} clientes registrados</p>
  </div>);
};
/* ============================================================
   HOME
   ============================================================ */
const HomeView = ()=>{const{activeRoute:ar,clients,role,setView}=useApp();const p=ar?ar.stops.filter(s=>s.status==='pendiente').length:0;const d=ar?ar.stops.filter(s=>s.status==='entregado').length:0;const debt=clients.reduce((s,c)=>s+Math.min(0,c.balance),0);return(<div className="space-y-4"><div><h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{role==='repartidor'?'Tu reparto':'Panel de control'}</h2><p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</p></div><div className="grid grid-cols-2 gap-3">{ar?<><Stat label="Pendientes" value={p} variant="warning"/><Stat label="Entregados" value={d} variant="success"/></>:<Stat label="Sin reparto" value="—" sub="Iniciá desde Reparto"/>}{role!=='repartidor'&&<><Stat label="Fiados" value={fmt(debt)} variant="danger"/><Stat label="Clientes" value={clients.length}/></>}</div>{role==='repartidor'&&!ar&&<Btn v="primary" size="lg" onClick={()=>setView('reparto')} className="w-full"><I d={IC.truck} size={20}/>Ir a Reparto</Btn>}{role==='repartidor'&&ar&&<Btn v="success" size="lg" onClick={()=>setView('reparto')} className="w-full"><I d={IC.truck} size={20}/>Continuar ({p})</Btn>}{role==='admin'&&<div><p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Accesos rápidos</p><div className="grid grid-cols-2 gap-2">{[['clientes','Clientes',IC.users],['stock','Stock',IC.pkg],['reparto','Reparto',IC.truck],['metricas','Métricas',IC.chart]].map(([v,l,icon])=>(<button key={v} onClick={()=>setView(v)} className="flex items-center gap-2 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95"><I d={icon} size={18}/>{l}</button>))}</div></div>}</div>);};

/* ============================================================
   APP SHELL
   ============================================================ */
const NAV={admin:[{k:'home',l:'Inicio',i:IC.home},{k:'clientes',l:'Clientes',i:IC.users},{k:'stock',l:'Stock',i:IC.pkg},{k:'planes',l:'Planes',i:IC.file},{k:'reparto',l:'Reparto',i:IC.truck},{k:'metricas',l:'Métricas',i:IC.chart}],repartidor:[{k:'home',l:'Inicio',i:IC.home},{k:'reparto',l:'Reparto',i:IC.truck},{k:'clientes',l:'Clientes',i:IC.users}],operador:[{k:'home',l:'Inicio',i:IC.home},{k:'clientes',l:'Clientes',i:IC.users},{k:'stock',l:'Stock',i:IC.pkg},{k:'planes',l:'Planes',i:IC.file},{k:'reparto',l:'Reparto',i:IC.truck}]};
const VIEWS={home:HomeView,clientes:ClientsModule,stock:StockModule,planes:PlansModule,reparto:DeliveryModule,metricas:MetricsModule};

import { supabase } from '@/lib/supabase';

export default function App({userEmail=''}){
  const[dark,setDark]=useState(false);
  const handleLogout=async()=>{await supabase.auth.signOut();};const[role,setRole]=useState('admin');const[view,setView]=useState('home');const[clients,setClients]=useState(INITIAL_CLIENTS);const[products,setProducts]=useState(INITIAL_PRODUCTS);const[activeRoute,setActiveRoute]=useState(null);const[pendingRoutes,setPendingRoutes]=useState([]);const[routeCounter,setRouteCounter]=useState(1);const[pastRoutes,setPastRoutes]=useState([]);const[orders,setOrders]=useState([]);const[orderCounter,setOrderCounter]=useState(1);const[plans,setPlans]=useState([]);const[clientPlans,setClientPlans]=useState([]);const[showRP,setShowRP]=useState(false);const[payments,setPayments]=useState([]);const[containerStock,setContainerStock]=useState([]);
  const[dbLoaded,setDbLoaded]=useState(false);

  // Cargar datos desde Supabase al iniciar
  useEffect(()=>{
    const load=async()=>{
      const{data:{user}}=await supabase.auth.getUser();
      if(!user)return;
      const{data}=await supabase.from('user_data').select('*').eq('user_id',user.id).single();
      if(data){
        if(data.clients?.length) setClients(data.clients);
        if(data.products?.length) setProducts(data.products);
        if(data.orders?.length) setOrders(data.orders);
        if(data.plans?.length) setPlans(data.plans);
        if(data.client_plans?.length) setClientPlans(data.client_plans);
        if(data.pending_routes?.length) setPendingRoutes(data.pending_routes);
        if(data.past_routes?.length) setPastRoutes(data.past_routes);
        if(data.order_counter) setOrderCounter(data.order_counter);
        if(data.route_counter) setRouteCounter(data.route_counter);
        if(data.payments?.length) setPayments(data.payments);
        if(data.container_stock&&Array.isArray(data.container_stock)) setContainerStock(data.container_stock);
      }
      setDbLoaded(true);
    };
    load();
  },[]);

  // Guardar en Supabase cuando cambia algo (con debounce de 1s)
  useEffect(()=>{
    if(!dbLoaded)return;
    const timer=setTimeout(async()=>{
      const{data:{user}}=await supabase.auth.getUser();
      if(!user)return;
      await supabase.from('user_data').upsert({
        user_id:user.id,
        clients,products,orders,plans,payments,container_stock:containerStock,
        client_plans:clientPlans,
        pending_routes:pendingRoutes,
        past_routes:pastRoutes,
        order_counter:orderCounter,
        route_counter:routeCounter,
        updated_at:new Date().toISOString(),
      });
    },1000);
    return()=>clearTimeout(timer);
  },[dbLoaded,clients,products,orders,plans,payments,clientPlans,pendingRoutes,pastRoutes,orderCounter,routeCounter,containerStock]);
  const ctx=useMemo(()=>({role,view,setView,clients,setClients,products,setProducts,activeRoute,setActiveRoute,pendingRoutes,setPendingRoutes,routeCounter,setRouteCounter,pastRoutes,setPastRoutes,orders,setOrders,orderCounter,setOrderCounter,plans,setPlans,clientPlans,setClientPlans,payments,setPayments,containerStock,setContainerStock}),[role,view,clients,products,activeRoute,pendingRoutes,routeCounter,pastRoutes,orders,orderCounter,plans,clientPlans,payments,containerStock]);
  const V=VIEWS[view]||HomeView;const nav=NAV[role]||NAV.admin;
  return(<AppContext.Provider value={ctx}><div className={dark?'dark':''}><div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800"><div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow-sm shadow-sky-500/30"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 017 7c0 3-2 5.5-3 7H8c-1-1.5-3-4-3-7a7 7 0 017-7z"/><path d="M9 16v2a3 3 0 006 0v-2"/></svg></div><span className="font-extrabold text-gray-900 dark:text-gray-100 text-base tracking-tight">Carapachay</span></div><div className="flex items-center gap-1"><button onClick={()=>setShowRP(!showRP)} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{role==='admin'?'Admin':role==='repartidor'?'Repartidor':'Operador'} ▾</button><button onClick={()=>setDark(!dark)} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><I d={dark?IC.sun:IC.moon} size={18}/></button><button onClick={handleLogout} title={userEmail} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg></button></div></div>{showRP&&<div className="max-w-lg mx-auto px-4 pb-2"><div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">{[['admin','Admin'],['repartidor','Repartidor'],['operador','Operador']].map(([r,l])=>(<button key={r} onClick={()=>{setRole(r);setShowRP(false);setView('home');}} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${role===r?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500'}`}>{l}</button>))}</div></div>}</header>
    <main className="max-w-lg mx-auto px-4 py-4 pb-24"><V/></main>
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800"><div className="max-w-lg mx-auto flex">{nav.map(n=>(<button key={n.k} onClick={()=>setView(n.k)} className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition ${view===n.k?'text-sky-600 dark:text-sky-400':'text-gray-400 dark:text-gray-500'}`}><I d={n.i} size={20}/><span className="text-[10px] font-semibold">{n.l}</span></button>))}</div></nav>
  </div></div></AppContext.Provider>);
}
