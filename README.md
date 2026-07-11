# Paquerxs — App Web de Monitoreo Comunitario

Aplicación web para colectivos de Teusaquillo (Bogotá) que registra, visualiza y mapa pacas digestoras — dispositivos de regeneración biológica del suelo.

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Astro | 7.x |
| Estilos | Tailwind CSS | 4.x (Vite plugin) |
| Runtime | Node.js | >= 22.12.0 |
| SSR Adapter | @astrojs/node | 11.x |
| DB Local | better-sqlite3 | 12.x |
| DB Producción | mariadb (Driver) | 3.x |
| Mapas | Leaflet.js | 1.9.4 (CDN) |
| Despliegue | Wikimedia Toolforge | buildservice |

## Características

- **Mapa interactivo** con pins de planta por colectivo, popup con detalles, filtros por colectivo y nombre
- **Inventario** con vista tarjeta/tabla, filtros, paginación (API con `limit`/`offset`)
- **Formulario** con geolocalización automática, pin arrastrable, entrada manual de coordenadas
- **Admin** con autenticación por cookie, rate limiting (5 intentos/15min), sesiones con expiración 24h
- **PWA** — manifest, service worker, iconos 192/512, instalable en móviles
- **Dark/light theme** con detección de preferencia del sistema
- **Responsive** — hamburger nav, layouts adaptativos, mapas con alturas responsivas
- **índices en DB** — `idx_pacas_fecha`, `idx_pacas_colectivo`, `idx_pacas_coords`, `idx_sessions_expires`
- **Query logging** — métricas de queries lentas (>1s), endpoint `/api/stats`

## Estructura del Proyecto

```
pacas-app/
├── public/
│   ├── favicon.svg              # Icono de planta (SVG)
│   ├── favicon.ico
│   ├── icons/
│   │   ├── icon-192.png         # PWA icono 192x192
│   │   └── icon-512.png         # PWA icono 512x512
│   ├── manifest.webmanifest     # PWA manifest
│   └── sw.js                    # Service worker (network-first)
├── src/
│   ├── components/
│   │   ├── FormularioPaca.astro # Formulario con mapa + GPS
│   │   ├── ListaPacas.astro     # Vista tarjeta/tabla del inventario
│   │   ├── MapaPacas.astro      # Mapa Leaflet con filtros
│   │   └── ThemeToggle.astro    # Toggle dark/light
│   ├── layouts/
│   │   └── Layout.astro         # Layout principal + nav + PWA meta
│   ├── lib/
│   │   ├── db.ts                # Capa de BD (SQLite local / MariaDB ToolsDB)
│   │   ├── seed.ts              # Datos semilla (26 pacas del spreadsheet)
│   │   └── types.ts             # Tipos TypeScript
│   ├── pages/
│   │   ├── index.astro          # / — Mapa principal
│   │   ├── pacas.astro          # /pacas — Inventario
│   │   ├── formulario.astro     # /formulario — Registro
│   │   ├── about.astro          # /about — Sobre el proyecto
│   │   ├── admin.astro          # /admin — Panel admin
│   │   └── api/
│   │       ├── pacas.ts         # GET (paginado) / POST
│   │       ├── pacas/[id].ts    # GET / PUT / DELETE (requiere sesión)
│   │       ├── seed.ts          # POST — Sembrar datos
│   │       ├── stats.ts         # GET — Métricas de queries
│   │       └── auth/
│   │           ├── login.ts     # POST — Login (rate limited)
│   │           ├── logout.ts    # POST — Logout
│   │           └── check.ts     # GET — Verificar sesión
│   └── styles/
│       └── global.css           # Tailwind v4 + dark mode
├── schema.sql                   # Schema para MariaDB (ToolsDB)
├── service.template             # Toolforge webservice config
├── Procfile                     # Toolforge process type
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Desarrollo Local

### Requisitos

- Node.js >= 22.12.0
- npm

### Instalación

```bash
git clone <repo-url> pacas-app
cd pacas-app
npm install
```

### Ejecutar en desarrollo

```bash
npm run dev
# → http://localhost:4321
```

### Build y preview

```bash
npm run build
npm run preview
```

### Sembrar datos de prueba

```bash
curl -X POST http://localhost:4321/api/seed -H "Origin: http://localhost:4321"
```

Esto inserta 26 pacas de ejemplo (datos del Google Spreadsheet original).

### Variables de entorno (dev)

| Variable | Default | Descripción |
|---|---|---|
| `ADMIN_USER` | `admin` | Usuario admin |
| `ADMIN_PASS` | `pacas2025` | Password admin |

En desarrollo local usa SQLite (`pacas.db`), no necesita configuración de BD.

## Base de Datos

### Desarrollo: SQLite

Se crea automáticamente en `pacas.db` al iniciar. Tablas:

- **pacas** — id, nombre, colectivo, peso, fecha_inicio, coordenadas_lat/lng, participantes, informacion, created_at, updated_at
- **sessions** — token, username, created_at, expires_at

### Producción: MariaDB (Toolforge ToolsDB)

Nombre de base de datos: `<toolforge-user>-pacas` (ej: `noisk8-pacas`)

#### Crear la BD en Toolforge

```bash
# Conectarse a Toolforge
ssh <usuario>@tools-login.wmcloud.org

# Crear base de datos
mariadb --defaults-file=$HOME/replica.my.cnf -h tools.db.svc.wikimedia.cloud

# Dentro de MariaDB:
CREATE DATABASE `<usuario>-pacas` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### Aplicar schema

```bash
mariadb --defaults-file=$HOME/replica.my.cnf -h tools.db.svc.wikimedia.cloud <usuario>-pacas < schema.sql
```

#### Variables de entorno (producción)

| Variable | Descripción |
|---|---|
| `TOOLSDB_HOST` | `tools.db.svc.wikimedia.cloud` |
| `TOOLSDB_USER` | `<usuario>-pacas` |
| `TOOLSDB_PASSWORD` | (auto-generado por ToolsDB) |
| `TOOLSDB_DATABASE` | `<usuario>-pacas` |
| `ADMIN_USER` | Usuario admin |
| `ADMIN_PASS` | Password admin |

La app detecta automáticamente el entorno:
- Sin `TOOLSDB_HOST` → SQLite local
- Con `TOOLSDB_HOST` → MariaDB ToolsDB

## Despliegue en Wikimedia Toolforge

### Prerrequisitos

1. Tener cuenta en Toolforge: https://wikitech.wikimedia.org/wiki/Portal:Toolforge
2. SSH configurado: `ssh <usuario>@tools-login.wmcloud.org`
3. Haber creado la base de datos (ver arriba)

### Paso 1: Clonar el repositorio

```bash
ssh <usuario>@tools-login.wmcloud.org
git clone <repo-url> ~/pacas-app
cd ~/pacas-app
```

### Paso 2: Configurar Buildpack

Toolforge usa `toolforge build` para compilar la app:

```bash
toolforge build --buildservice node20
```

El archivo `service.template` define el buildpack:
```yaml
type: buildservice
buildservice-image: node20
```

### Paso 3: Crear el webservice

```bash
toolforge webservice --service pacas-app buildservice start
```

El `Procfile` indica cómo ejecutar la app:
```
web: node dist/server/entry.mjs
```

### Paso 4: Configurar variables de entorno

```bash
toolforge webservice --service pacas-app env set ADMIN_USER=admin
toolforge webservice --service pacas-app env set ADMIN_PASS=<password-seguro>
toolforge webservice --service pacas-app env set TOOLSDB_HOST=tools.db.svc.wikimedia.cloud
toolforge webservice --service pacas-app env set TOOLSDB_USER=<usuario>-pacas
toolforge webservice --service pacas-app env set TOOLSDB_PASSWORD=<password-toolsdb>
toolforge webservice --service pacas-app env set TOOLSDB_DATABASE=<usuario>-pacas
```

### Paso 5: Sembrar datos iniciales

```bash
# La app ya tiene el endpoint POST /api/seed
curl -X POST https://<usuario>-tools.wmcloud.org/pacas-app/api/seed -H "Origin: https://<usuario>-tools.wmcloud.org"
```

### Paso 6: Verificar

```bash
# Verificar que la app responde
curl https://<usuario>-tools.wmcloud.org/pacas-app/

# Verificar estadísticas
curl https://<usuario>-tools.wmcloud.org/pacas-app/api/stats
```

### Comandos útiles de Toolforge

```bash
# Ver estado del webservice
toolforge webservice --service pacas-app status

# Reiniciar
toolforge webservice --service pacas-app restart

# Ver logs
toolforge webservice --service pacas-app logs

# Detener
toolforge webservice --service pacas-app stop

# Shell de depuración
toolforge webservice --service pacas-app shell
```

### URL de producción

```
https://<usuario>-tools.wmcloud.org/pacas-app/
```

## API Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/pacas?limit=100&offset=0` | No | Lista paginada de pacas |
| `POST` | `/api/pacas` | No | Crear paca |
| `GET` | `/api/pacas/:id` | No | Obtener paca por ID |
| `PUT` | `/api/pacas/:id` | No | Actualizar paca |
| `DELETE` | `/api/pacas/:id` | Sesión | Eliminar paca (admin) |
| `POST` | `/api/seed` | No | Sembrar datos (solo si vacía) |
| `GET` | `/api/stats` | No | Métricas de queries + cleanup |
| `POST` | `/api/auth/login` | No | Login (rate limited) |
| `POST` | `/api/auth/logout` | No | Logout |
| `GET` | `/api/auth/check` | Cookie | Verificar sesión admin |

### Respuesta paginada

```json
{
  "data": [...],
  "pagination": {
    "total": 26,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

## PWA (Progressive Web App)

- **Manifest**: `public/manifest.webmanifest` — nombre, colores, icons, display standalone
- **Service Worker**: `public/sw.js` — network-first, fallback offline para APIs
- **Icons**: 192x192 y 512x512 generados desde el favicon SVG
- **Meta tags**: theme-color, apple-touch-icon, mobile-web-app-capable

En Android/Chrome: "Agregar a pantalla de inicio" automático en HTTPS.
En iOS/Safari: Compartir > Agregar a pantalla de inicio.

## Seguridad

- Sesiones con tokens aleatorios (32 bytes hex)
- Expiración de sesiones: 24 horas
- Rate limiting en login: 5 intentos / 15 minutos por IP
- DELETE protegido por sesión válida
- Service worker: solo cachea mismos orígenes, ignora `chrome-extension://`
- Admin credentials via variables de entorno (no hardcoded en producción)

## Datos Originales

Las 26 pacas semilla provienen de un Google Spreadsheet con datos reales de colectivos de Teusaquillo:

- Paquerxs del Parkway
- Paquerxs de San Luis
- Paquerxs del Neuque
- Paquerxs de La Marchita

Coordenadas geográficas en el barrio Teusaquillo, Bogotá (lat ~4.62-4.67, lng ~-74.06 a -74.10).

## Comandos Rápidos

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Sembrar datos
curl -X POST http://localhost:4321/api/seed -H "Origin: http://localhost:4321"

# Ver stats
curl http://localhost:4321/api/stats

# Login test
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4321" \
  -d '{"username":"admin","password":"pacas2025"}'
```

## Licencia

Datos y código para la comunidad de Paquerxs Teusaquillo.
