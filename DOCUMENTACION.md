# Documentación Técnica — Paquerxs

Comandos y pasos para configuración, despliegue y mantenimiento de la aplicación.

---

## 1. Instalación del Proyecto

```bash
cd Documentos/WIKIMEDIA/PAQUERXS/pacas-app
yarn install
```

## 2. Desarrollo Local

```bash
yarn dev              # Puerto 4321, auto-reload
```

## 3. Build

```bash
yarn build            # Compila a dist/ (~2s local)
```

## 4. Base de Datos

### Crear esquema en MariaDB ToolsDB

```bash
mariadb -h tools.db.svc.wikimedia.cloud s57854__pacas < schema.sql
```

### Sembrar datos de prueba (26 pacas)

```bash
curl -X POST http://localhost:4321/api/seed -H "Origin: http://localhost:4321"
```

Producción:
```bash
curl -X POST https://paquerxs.toolforge.org/api/seed
```

---

## 5. Despliegue en Wikimedia Toolforge

### 5.1. Configurar git (remotos GitHub + GitLab)

```bash
cd ~/Documentos/WIKIMEDIA/PAQUERXS/pacas-app
git remote add origin git@github.com:Noisk8/paquerxs.git
git remote add toolforge https://gitlab.wikimedia.org/toolforge-repos/paquerxs.git
```

### 5.2. Clonar en Toolforge

```bash
ssh s57854@tools-login.wmcloud.org
git clone https://gitlab.wikimedia.org/toolforge-repos/paquerxs.git ~/pacas-app
cd ~/pacas-app
```

### 5.3. Variables de entorno (Toolforge envvars)

**Obligatorias:**
```bash
toolforge envvars create ADMIN_USER "admin"
toolforge envvars create ADMIN_PASS "t contraseña segura"
toolforge envvars create TOOLSDB_HOST "tools.db.svc.wikimedia.cloud"
toolforge envvars create TOOLSDB_USER "s57854__pacas"
toolforge envvars create TOOLSDB_PASSWORD "t password de MariaDB"
toolforge envvars create TOOLSDB_DATABASE "s57854__pacas"
```

> **NOTA:** No existe `toolforge env vars` — el comando correcto es `toolforge envvars create`.

### 5.4. Crear base de datos en Toolforge

```bash
ssh s57854@tools-login.wmcloud.org
mariadb --defaults-file=$HOME/replica.my.cnf -h tools.db.svc.wikimedia.cloud
```

Dentro de MariaDB:
```sql
CREATE DATABASE `s57854__pacas` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

Aplicar schema:
```bash
mariadb --defaults-file=$HOME/replica.my.cnf -h tools.db.svc.wikimedia.cloud s57854__pacas < schema.sql
```

### 5.5. Build y restart del webservice

```bash
ssh s57854@tools-login.wmcloud.org
cd ~/pacas-app

# Pull últimos cambios
git pull origin main

# Build manual (si es necesario)
toolforge build --buildservice node20

# Restart
toolforge webservice --service paquerxs buildservice restart
```

### 5.6. Verificar despliegue

```bash
curl -s https://paquerxs.toolforge.org/api/stats
curl -X POST https://paquerxs.toolforge.org/api/seed
curl -s 'https://paquerxs.toolforge.org/api/pacas?limit=3'
```

### 5.7. Comandos útiles de Toolforge

```bash
toolforge webservice --service paquerxs status
toolforge webservice --service paquerxs restart
toolforge webservice --service paquerxs logs
toolforge webservice --service paquerxs stop
toolforge webservice --service paquerxs shell
toolforge webservice --service paquerxs env list
```

---

## 6. Git Push (GitHub + GitLab)

### Subir cambios a GitHub (rama `main`)

```bash
git checkout main
git add .
git commit -m "feat: descripción"
git push origin main
```

### Subir cambios a GitLab (Toolforge)

```bash
git checkout main
git add .
git commit -m "feat: descripción"
git push toolforge main
```

### Subir a ambas plataformas

```bash
git checkout main
git add .
git commit -m "feat: descripción"
git push origin main
git push toolforge main
```

---

## 7. Arquitectura del Proyecto

```
pacas-app/
├── server.js              # Express backend + API routes
├── index.html             # Entry point SPA
├── vite.config.js         # Vite + Vue + Tailwind
├── package.json           # Dependencias
├── schema.sql             # Esquema MariaDB
├── service.template       # Toolforge buildservice config
├── Procfile               # toolforge process type
├── src/
│   ├── main.js            # Vue entry
│   ├── App.vue            # Root component
│   ├── router/index.js    # Vue Router
│   ├── views/             # Páginas (6 rutas)
│   ├── components/        # ThemeToggle, PWAInstall
│   ├── lib/
│   │   ├── db.ts          # SQLite + MariaDB pool
│   │   ├── types.ts       # Typescript types
│   │   └── seed.ts        # 26 pacas de ejemplo
│   └── styles.css         # Tailwind v4
├── public/
│   ├── icons/paca.png     # Favicon + markers
│   ├── manifest.webmanifest
│   └── sw.js
└── dist/                  # Build output (no commitear)
```

---

## 8. Licencia

- Código: GPL-3.0-or-later
- Datos: ODbL-1.0
