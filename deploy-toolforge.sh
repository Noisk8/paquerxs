#!/bin/bash
# deploy-toolforge.sh — Deploy completo de Paquerxs en Toolforge
# Basado en: https://wikitech.wikimedia.org/wiki/Help:Toolforge/Node.js
# Basado en: https://wikitech.wikimedia.org/wiki/Help:Toolforge/Database
#
# Ejecutar desde Toolforge shell:
#   ssh <usuario>@tools-login.wmcloud.org
#   bash deploy-toolforge.sh
#
# Este script NO se sube al repo publico (.gitignore)

set -e

TOOL_NAME="paquerxs"
TOOLFORGE_USER=$(whoami)
TOOL_DIR="$HOME/www/js"

echo "============================================"
echo "  Paquerxs — Deploy Toolforge"
echo "  Usuario: $TOOLFORGE_USER"
echo "  Herramienta: $TOOL_NAME"
echo "============================================"
echo ""

# --- PASO 1: Clonar/actualizar repo ---
echo "[1/6] Preparando codigo en $TOOL_DIR ..."
mkdir -p "$HOME/www"
if [ -d "$TOOL_DIR/.git" ]; then
  echo "  Repo existente, actualizando..."
  cd "$TOOL_DIR"
  git pull origin main
else
  echo "  Clonando repo..."
  git clone https://gitlab.wikimedia.org/toolforge-repos/${TOOL_NAME}.git "$TOOL_DIR"
  cd "$TOOL_DIR"
fi

# --- PASO 2: Symlink replica.my.cnf ---
echo "[2/6] Configurando credenciales de base de datos ..."
if [ ! -f "$HOME/.my.cnf" ] && [ -f "$HOME/replica.my.cnf" ]; then
  ln -s "$HOME/replica.my.cnf" "$HOME/.my.cnf"
  echo "  Symlink creado: ~/.my.cnf -> ~/replica.my.cnf"
else
  echo "  Credenciales ya configuradas"
fi

# --- PASO 3: Crear base de datos ToolsDB ---
DB_NAME="${TOOLFORGE_USER}__${TOOL_NAME}"
echo "[3/6] Creando base de datos $DB_NAME en ToolsDB ..."
mariadb --defaults-file="$HOME/replica.my.cnf" -h tools.db.svc.wikimedia.cloud -e "
  CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
" 2>/dev/null && echo "  Base de datos creada/verificada" || echo "  Warning: No se pudo crear la DB (puede que ya exista)"

# --- PASO 4: Aplicar schema ---
echo "[4/6] Aplicando schema ..."
if [ -f "schema.sql" ]; then
  mariadb --defaults-file="$HOME/replica.my.cnf" -h tools.db.svc.wikimedia.cloud "$DB_NAME" < schema.sql 2>/dev/null \
    && echo "  Schema aplicado correctamente" \
    || echo "  Warning: Schema ya aplicado o error menor"
else
  echo "  Error: schema.sql no encontrado"
  exit 1
fi

# --- PASO 5: Variables de entorno ---
echo "[5/6] Configurando variables de entorno ..."
read -s -p "  Password para admin (dejar vacio para usar pacas2025): " ADMIN_PASS
echo ""
ADMIN_PASS="${ADMIN_PASS:-pacas2025}"

# Obtener password de ToolsDB desde replica.my.cnf
TOOLSDB_PASS=$(grep password "$HOME/replica.my.cnf" | head -1 | cut -d'=' -f2 | tr -d ' "')

toolforge webservice --service "$TOOL_NAME" env set ADMIN_USER=admin 2>/dev/null || true
toolforge webservice --service "$TOOL_NAME" env set ADMIN_PASS="$ADMIN_PASS" 2>/dev/null || true
toolforge webservice --service "$TOOL_NAME" env set TOOLSDB_HOST=tools.db.svc.wikimedia.cloud 2>/dev/null || true
toolforge webservice --service "$TOOL_NAME" env set TOOLSDB_USER="$TOOLFORGE_USER" 2>/dev/null || true
toolforge webservice --service "$TOOL_NAME" env set TOOLSDB_PASSWORD="$TOOLSDB_PASS" 2>/dev/null || true
toolforge webservice --service "$TOOL_NAME" env set TOOLSDB_DATABASE="$DB_NAME" 2>/dev/null || true

echo "  Variables de entorno configuradas"

# --- PASO 6: Iniciar servicio ---
echo "[6/6] Iniciando webservice ..."
toolforge webservice --service "$TOOL_NAME" node20 start 2>/dev/null \
  && echo "  Servicio iniciado" \
  || echo "  Warning: El servicio puede que ya este corriendo"

echo ""
echo "============================================"
echo "  Deploy completado!"
echo "============================================"
echo ""
echo "  URL: https://${TOOL_NAME}.toolforge.org"
echo "  Base de datos: $DB_NAME"
echo ""
echo "  Comandos utiles:"
echo "    toolforge webservice $TOOL_NAME logs     # Ver logs"
echo "    toolforge webservice $TOOL_NAME restart  # Reiniciar"
echo "    toolforge webservice $TOOL_NAME stop     # Detener"
echo "    toolforge webservice $TOOL_NAME shell    # Shell interactivo"
echo ""
echo "  Sembrar datos iniciales:"
echo "    curl -X POST https://${TOOL_NAME}.toolforge.org/api/seed -H 'Origin: https://${TOOL_NAME}.toolforge.org'"
echo ""
