-- Esquema de base de datos para Paquerxs (Toolforge ToolsDB)
-- Ejecutar: mariadb --defaults-file=$HOME/replica.my.cnf -h tools.db.svc.wikimedia.cloud < schema.sql

CREATE TABLE IF NOT EXISTS pacas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  colectivo VARCHAR(255) NOT NULL,
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
  INDEX idx_pacas_coords (coordenadas_lat, coordenadas_lng)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(64) PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_sessions_expires (expires_at)
);
