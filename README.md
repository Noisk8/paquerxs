# Paquerxs — App Web de Monitoreo Comunitario

Aplicación web para colectivos de Teusaquillo (Bogotá) que registra, visualiza y mapa pacas digestoras — dispositivos de regeneración biológica del s.

Desarrollada por [Wikimedia Colombia](https://meta.wikimedia.org/wiki/Wikimedia_Colombia).

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Vue.js (SPA) | 3.x |
| Routing | Vue Router | 4.x |
| Estilos | Tailwind CSS | 4.x |
| Bundler | Vite | 6.x |
| Backend | Express.js | 4.x |
| Runtime | Node.js | 20.x |
| DB Local | SQLite (better-sqlite3) | — |
| DB Producción | MariaDB (ToolsDB) | 3.x |
| Mapas | Leaflet.js | 1.9.4 (bundled) |
| Despliegue | Wikimedia Toolforge | — |

## Características

- **Mapa interactivo** — Leaflet con filtros por colectivo y nombre, GPS auto-detect, pin arrastrable
- **Inventario** — Vista tarjeta/tabla, filtros, paginación (API `limit`/`offset`)
- **Formulario** — Geolocalización automática, validación completa
- **Admin** — Cookie sessions (24h TTL), rate limiting (5 intentos/15min)
- **PWA** — Manifest, service worker, instalable en móviles
- **Dark/light theme** — Detección del sistema, localStorage
- **Responsive** — Hamburger nav, layouts adaptativos
- **Open data** — Licencia ODbL-1.0 para datos

## Quick Start

```bash
cd pacas-app
yarn install
yarn dev          # → http://localhost:4321
```

## Estructura del Proyecto

```
pacas-app/
├── server.js              # Express backend (API + SPA)
├── src/
│   ├── views/             # 6 páginas: Mapa, Pacas, Formulario, Admin, About, Términos
│   ├── components/        # ThemeToggle, PWAInstall
│   ├── lib/db.ts          # Capa BD (SQLite local / MariaDB ToolsDB)
│   ├── lib/seed.ts        # 26 pacas de ejemplo
│   └── lib/types.ts       # TypeScript types
├── public/
│   ├── icons/paca.png     # Favicon + markers
│   └── manifest.webmanifest
├── schema.sql             # Esquema MariaDB
├── service.template       # Toolforge buildservice
└── Procfile               # Toolforge process
```

## Desarrollo Local

```bash
yarn dev                    # Dev server en :4321
yarn build                  # Build para producción (~2s)
curl -X POST http://localhost:4321/api/seed  # Sembrar 26 pacas
```

## API Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/pacas?limit=100&offset=0` | No | Pacas paginadas |
| `POST` | `/api/pacas` | No | Crear paca |
| `DELETE` | `/api/pacas/:id` | Sesión | Eliminar paca |
| `POST` | `/api/seed` | No | Sembrar datos |
| `GET` | `/api/stats` | No | Métricas |
| `POST` | `/api/auth/login` | No | Login (rate limited) |
| `GET` | `/api/auth/check` | Cookie | Verificar sesión |

## Ver Datos de la Base de Datos

### En el navegador

Abre directamente estas URLs en tu navegador para ver los datos en JSON:

- **Todas las pacas**: `https://paquerxs.toolforge.org/api/pacas?limit=100`
- **Estadísticas**: `https://paquerxs.toolforge.org/api/stats`
- **Paca específica**: `https://paquerxs.toolforge.org/api/pacas/1`

### Con curl (terminal)

```bash
# Ver todas las pacas
curl -s 'https://paquerxs.toolforge.org/api/pacas?limit=100' | python3 -m json.tool

# Ver estadísticas (total, colectivos, etc.)
curl -s https://paquerxs.toolforge.org/api/stats | python3 -m json.tool

# Ver solo 5 pacas
curl -s 'https://paquerxs.toolforge.org/api/pacas?limit=5' | python3 -m json.tool

# Buscar por nombre
curl -s 'https://paquerxs.toolforge.org/api/pacas?limit=100' | python3 -c "import json,sys; [print(p['nombre']) for p in json.load(sys.stdin)['data']]"
```

### Ejemplo de respuesta

```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Paquerxs Teusaquillo",
      "colectivo": "Paquerxs del Parkway",
      "peso": 150,
      "fecha_inicio": "2024-03-15",
      "coordenadas_lat": 4.632,
      "coordenadas_lng": -74.085,
      "participantes": 8,
      "created_at": "2024-03-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 26,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

## Despliegue

- **Toolforge**: `https://paquerxs.toolforge.org`
- Rama `main` → Toolforge

Ver `DOCUMENTACION.md` para comandos detallados de configuración y despliegue.

## Datos

26 pacas de colectivos de Teusaquillo, Bogotá:

- Paquerxs del Parkway
- Paquerxs de San Luis
- Paquerxs del Neuque
- Paquerxs de La Marchita

## Licencia

- Código: **GPL-3.0-or-later**
- Datos: **ODbL-1.0**
