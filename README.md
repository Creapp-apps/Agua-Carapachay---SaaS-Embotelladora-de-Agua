# AguaControl 💧

Sistema de gestión para soderías argentinas. Repartos, clientes, stock y métricas.

## Features

- 📱 **Mobile-first** — Diseñado para que el repartidor lo use en la calle
- 🗺️ **Mapas integrados** — Leaflet + OpenStreetMap (gratis, sin API key)
- 📍 **Auto-zona por dirección** — Al cargar un cliente, escribís la dirección y la zona se detecta automáticamente por barrio (geocoding Nominatim)
- 🚚 **Flujo de reparto completo** — Cargar camión → Armar recorrido (por zona o cliente) → Entregar con cobro
- 🧮 **Control de envases** — Sifones y bidones, lo más importante de una sodería
- 🌙 **Modo oscuro**
- 👤 **3 roles** — Admin, Repartidor, Operador

## Paso a paso: Deploy en Vercel

### 1. Requisitos previos

Necesitás tener instalado:
- **Node.js 18+** → https://nodejs.org
- **Git** → https://git-scm.com
- Cuenta en **GitHub** → https://github.com
- Cuenta en **Vercel** → https://vercel.com (gratis con GitHub)

### 2. Clonar y probar en local

```bash
# Descomprimí el .zip o cloná desde GitHub
cd aguacontrol

# Instalar dependencias
npm install

# Correr en desarrollo
npm run dev
```

Abrí http://localhost:3000 — deberías ver la app funcionando.

### 3. Crear repositorio en GitHub

**Opción A — Desde la web:**
1. Andá a https://github.com/new
2. Nombre: `aguacontrol`
3. Privado o público, como prefieras
4. NO marques "Add a README" (ya tenemos uno)
5. Click en "Create repository"

**Opción B — Desde terminal con GitHub CLI:**
```bash
gh repo create aguacontrol --private --source=. --push
```

### 4. Subir el código

```bash
cd aguacontrol

git init
git add .
git commit -m "feat: initial aguacontrol app"

# Reemplazá TU_USUARIO con tu usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/aguacontrol.git
git branch -M main
git push -u origin main
```

### 5. Deploy en Vercel

1. Andá a https://vercel.com/new
2. Click en "Import Git Repository"
3. Seleccioná `aguacontrol` de la lista
4. Vercel detecta automáticamente que es Next.js
5. Click en **Deploy**
6. Esperá ~1 minuto
7. ¡Listo! Te da una URL tipo `aguacontrol-xxxx.vercel.app`

**Cada vez que hagas `git push`, Vercel redeploya automáticamente.**

### 6. Dominio personalizado (opcional)

En Vercel → tu proyecto → Settings → Domains:
- Podés agregar un dominio propio (ej: `app.misoderia.com.ar`)
- O usar el subdominio gratis de Vercel

### 7. Instalar como PWA en el celular

Desde el celular del repartidor:
1. Abrí la URL en Chrome/Safari
2. **Android:** Menú ⋮ → "Agregar a pantalla de inicio"
3. **iPhone:** Compartir → "Agregar a inicio"

Se instala como una app nativa, sin barra del navegador.

---

## Estructura del proyecto

```
aguacontrol/
├── public/
│   └── manifest.json          # PWA config
├── src/
│   ├── app/
│   │   ├── globals.css        # Tailwind + estilos globales
│   │   ├── layout.js          # Root layout con meta tags
│   │   └── page.js            # Página principal
│   └── components/
│       └── App.js             # 🔥 Toda la app (módulos, UI, mapas)
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── next.config.js
└── .env.local.example         # Variables de entorno (futuro)
```

## Próximos pasos

### Conectar Supabase (base de datos real)

1. Crear proyecto en https://supabase.com
2. Copiar URL y anon key
3. Crear `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Instalar: `npm install @supabase/supabase-js`
5. Crear las tablas (schema SQL incluido abajo)

### Schema SQL para Supabase

```sql
-- Zonas
CREATE TABLE zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  barrios TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('casa', 'empresa')) DEFAULT 'casa',
  phone TEXT,
  address TEXT,
  zone_id UUID REFERENCES zones(id),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  balance INTEGER DEFAULT 0,
  sifones INTEGER DEFAULT 0,
  bidones INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'un',
  stock INTEGER DEFAULT 0,
  price INTEGER DEFAULT 0,
  returnable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repartos
CREATE TABLE routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID,
  status TEXT CHECK (status IN ('activo', 'finalizado')) DEFAULT 'activo',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- Stock cargado en camión
CREATE TABLE route_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL
);

-- Paradas del reparto
CREATE TABLE route_stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  stop_order INTEGER,
  status TEXT CHECK (status IN ('pendiente', 'entregado', 'saltado')) DEFAULT 'pendiente',
  payment_method TEXT,
  payment_amount INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  sifones_returned INTEGER DEFAULT 0,
  bidones_returned INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ
);

-- Items entregados en cada parada
CREATE TABLE stop_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stop_id UUID REFERENCES route_stops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL
);

-- Usuarios (auth de Supabase)
-- Usar supabase.auth.signUp() / signIn()
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  role TEXT CHECK (role IN ('admin', 'repartidor', 'operador')) DEFAULT 'repartidor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Autenticación

Supabase tiene auth integrado. Para agregar login:
1. Activar Email/Password en Supabase → Authentication → Providers
2. Crear página de login con `supabase.auth.signInWithPassword()`
3. Proteger rutas chequeando `supabase.auth.getUser()`

---

## Tech Stack

- **Next.js 14** — Framework React con SSR
- **Tailwind CSS** — Estilos utility-first
- **Leaflet** — Mapas OpenStreetMap (gratis)
- **Nominatim** — Geocoding gratuito para autocompletar direcciones
- **Vercel** — Hosting con deploy automático
- **Supabase** (futuro) — Base de datos PostgreSQL + Auth

## Licencia

Proyecto privado para uso interno de la sodería.
