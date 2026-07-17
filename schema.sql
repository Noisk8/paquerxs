-- Esquema de base de datos para Wiki Paquera (Toolforge ToolsDB)
-- Ejecutar: mysql -h tools.db.svc.wikimedia.cloud -u s57854 -p s57854__pacas < schema.sql

CREATE TABLE IF NOT EXISTS colectivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL DEFAULT '#68c67c',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pacas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  colectivo VARCHAR(255) NOT NULL,
  colectivo_id INT DEFAULT NULL,
  peso DECIMAL(10,2) DEFAULT NULL,
  fecha_inicio DATE NOT NULL,
  coordenadas_lat DECIMAL(10,7) DEFAULT NULL,
  coordenadas_lng DECIMAL(10,7) DEFAULT NULL,
  participantes INT DEFAULT NULL,
  informacion TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pacas_fecha (fecha_inicio),
  INDEX idx_pacas_colectivo (colectivo),
  INDEX idx_pacas_coords (coordenadas_lat, coordenadas_lng),
  FOREIGN KEY (colectivo_id) REFERENCES colectivos(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(64) PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_sessions_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mediciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paca_id INT NOT NULL,
  peso DECIMAL(10,2) NOT NULL,
  fecha DATE NOT NULL,
  notas TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paca_id) REFERENCES pacas(id),
  INDEX idx_mediciones_paca (paca_id),
  INDEX idx_mediciones_fecha (fecha)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrar datos existentes: insertar colectivos desde pacas
INSERT IGNORE INTO colectivos (nombre, color) SELECT DISTINCT colectivo, '#68c67c' FROM pacas;

-- Migrar colectivo_id en pacas
UPDATE pacas p INNER JOIN colectivos c ON p.colectivo = c.nombre SET p.colectivo_id = c.id;
