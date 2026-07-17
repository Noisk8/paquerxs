import type { Paca, Medicion, Colectivo } from './types';

export type { Paca, Medicion, Colectivo };

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isLocal(): boolean {
  return !process.env.TOOLSDB_HOST;
}

// --- Query logger ---
let queryCount = 0;
let slowQueryCount = 0;
const SLOW_THRESHOLD_MS = 1000;

function logQuery(label: string, ms: number) {
  queryCount++;
  if (ms > SLOW_THRESHOLD_MS) {
    slowQueryCount++;
    console.warn(`[SLOW QUERY ${ms.toFixed(0)}ms] ${label}`);
  }
}

function dbError(operation: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[DB ERROR] ${operation}: ${msg}`);
}

export function getQueryStats() {
  return { total: queryCount, slow: slowQueryCount, slowThresholdMs: SLOW_THRESHOLD_MS };
}

// --- SQLite (local dev) ---
let sqliteDb: any = null;

async function getSqlite() {
  if (sqliteDb) return sqliteDb;
  const { default: Database } = await import('better-sqlite3');
  const { join } = await import('path');
  const dbPath = join(process.cwd(), 'pacas.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS pacas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      colectivo TEXT NOT NULL,
      peso REAL,
      fecha_inicio TEXT NOT NULL,
      coordenadas_lat REAL,
      coordenadas_lng REAL,
      participantes INTEGER,
      informacion TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_pacas_fecha ON pacas(fecha_inicio)`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_pacas_colectivo ON pacas(colectivo)`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_pacas_coords ON pacas(coordenadas_lat, coordenadas_lng)`);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )
  `);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS mediciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paca_id INTEGER NOT NULL,
      peso REAL NOT NULL,
      fecha TEXT NOT NULL,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (paca_id) REFERENCES pacas(id)
    )
  `);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_mediciones_paca ON mediciones(paca_id)`);
  sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_mediciones_fecha ON mediciones(fecha)`);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS colectivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#68c67c',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  const userCount = sqliteDb.prepare('SELECT COUNT(*) as total FROM users').get().total;
  if (userCount === 0) {
    try {
      const crypto = await import('crypto');
      const { promisify } = await import('util');
      const scrypt = promisify(crypto.scrypt);
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = (await scrypt('pacas2025', salt, 64)).toString('hex');
      sqliteDb.prepare('INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)').run('admin', `${salt}:${hash}`);
      console.log('[DB] Default admin user created (admin/pacas2025)');
    } catch (e) {
      // User might already exist from concurrent init
    }
  }
  const count = sqliteDb.prepare('SELECT COUNT(*) as total FROM pacas').get().total;
  if (count === 0) {
    const { pacasSeed } = await import('./seed');
    const ins = sqliteDb.prepare(
      `INSERT INTO pacas (nombre, colectivo, peso, fecha_inicio, coordenadas_lat, coordenadas_lng, participantes, informacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const p of pacasSeed) {
      ins.run(p.nombre, p.colectivo, p.peso, p.fecha_inicio, p.coordenadas_lat, p.coordenadas_lng, p.participantes, p.informacion);
    }
    console.log(`[DB] Auto-seeded ${pacasSeed.length} pacas`);
  }
  // Auto-seed colectivos from existing pacas
  const existingColectivos = sqliteDb.prepare('SELECT COUNT(*) as total FROM colectivos').get().total;
  if (existingColectivos === 0) {
    const colectivoNames = sqliteDb.prepare('SELECT DISTINCT colectivo FROM pacas').all() as { colectivo: string }[];
    const defaultColors: Record<string, string> = {
      'Paquerxs del Parkway': '#68c67c',
      'Paquerxs de San Luis': '#5dd4be',
      'Paquerxs del Neuque': '#ffcd6e',
      'Paquerxs de La Marchita': '#fe7763',
      'Paquerxs Armenia': '#2b5740',
    };
    for (const { colectivo } of colectivoNames) {
      const color = defaultColors[colectivo] || '#68c67c';
      sqliteDb.prepare('INSERT OR IGNORE INTO colectivos (nombre, color) VALUES (?, ?)').run(colectivo, color);
    }
    console.log(`[DB] Auto-seeded ${colectivoNames.length} colectivos`);
  }
  return sqliteDb;
}

// --- MariaDB (Toolforge) ---
let mariadbPool: any = null;
let mariadbReady = false;

async function getMariaDb() {
  if (mariadbPool) return mariadbPool;
  const mariadb = await import('mariadb');
  mariadbPool = mariadb.default.createPool({
    host: process.env.TOOLSDB_HOST || 'tools.db.svc.wikimedia.cloud',
    user: process.env.TOOLSDB_USER || process.env.TOOL_TOOLSDB_USER,
    password: process.env.TOOLSDB_PASSWORD || process.env.TOOL_TOOLSDB_PASSWORD,
    database: process.env.TOOLSDB_DATABASE,
    connectionLimit: 5,
    charset: 'utf8mb4',
  });
  console.log(`[DB] Connecting to MariaDB: host=${mariadbPool.config?.connectionConfig?.host} user=${mariadbPool.config?.connectionConfig?.user} db=${mariadbPool.config?.connectionConfig?.database}`);
  if (!mariadbReady) {
    const conn = await mariadbPool.getConnection();
    await conn.query(`
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
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(64) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        INDEX idx_sessions_expires (expires_at)
      )
    `);
    await conn.query(`
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
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS colectivos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE,
        color VARCHAR(7) NOT NULL DEFAULT '#68c67c',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    const userCount = (await conn.query('SELECT COUNT(*) as total FROM users'))[0].total;
    if (userCount === 0) {
      const crypto = await import('crypto');
      const { promisify } = await import('util');
      const scrypt = promisify(crypto.scrypt);
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = (await scrypt('pacas2025', salt, 64)).toString('hex');
      await conn.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['admin', `${salt}:${hash}`]);
      console.log('[DB] Default admin user created (admin/pacas2025)');
    }
    conn.release();
    mariadbReady = true;
  }
  return mariadbPool;
}

// --- Helpers ---
function expiresAt(): string {
  const d = new Date(Date.now() + SESSION_TTL_MS);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

// --- Unified ---
export async function getAllPacas(limit = 200, offset = 0): Promise<Paca[]> {
  const t0 = performance.now();
  if (isLocal()) {
    const db = await getSqlite();
    const r = db.prepare('SELECT * FROM pacas ORDER BY fecha_inicio DESC LIMIT ? OFFSET ?').all(limit, offset) as Paca[];
    logQuery(`getAllPacas(${limit},${offset})`, performance.now() - t0);
    return r;
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT * FROM pacas ORDER BY fecha_inicio DESC LIMIT ? OFFSET ?', [limit, offset]);
  logQuery(`getAllPacas(${limit},${offset})`, performance.now() - t0);
  return rows as unknown as Paca[];
}

export async function countPacas(): Promise<number> {
  const t0 = performance.now();
  if (isLocal()) {
    const db = await getSqlite();
    const r = db.prepare('SELECT COUNT(*) as total FROM pacas').get().total;
    logQuery('countPacas', performance.now() - t0);
    return r;
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT COUNT(*) as total FROM pacas');
  logQuery('countPacas', performance.now() - t0);
  return Number(rows[0].total);
}

export async function getPacaById(id: number): Promise<Paca | null> {
  const t0 = performance.now();
  if (isLocal()) {
    const db = await getSqlite();
    const r = db.prepare('SELECT * FROM pacas WHERE id = ?').get(id) || null;
    logQuery(`getPacaById(${id})`, performance.now() - t0);
    return r;
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT * FROM pacas WHERE id = ?', [id]);
  logQuery(`getPacaById(${id})`, performance.now() - t0);
  return rows.length > 0 ? rows[0] : null;
}

export async function createPaca(paca: Omit<Paca, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const t0 = performance.now();
  if (isLocal()) {
    const db = await getSqlite();
    const r = db.prepare(
      `INSERT INTO pacas (nombre, colectivo, peso, fecha_inicio, coordenadas_lat, coordenadas_lng, participantes, informacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(paca.nombre, paca.colectivo, paca.peso, paca.fecha_inicio, paca.coordenadas_lat, paca.coordenadas_lng, paca.participantes, paca.informacion);
    logQuery('createPaca', performance.now() - t0);
    return Number(r.lastInsertRowid);
  }
  const db = await getMariaDb();
  const r = await db.query(
    `INSERT INTO pacas (nombre, colectivo, peso, fecha_inicio, coordenadas_lat, coordenadas_lng, participantes, informacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [paca.nombre, paca.colectivo, paca.peso, paca.fecha_inicio, paca.coordenadas_lat, paca.coordenadas_lng, paca.participantes, paca.informacion]
  );
  logQuery('createPaca', performance.now() - t0);
  return Number(r.insertId);
}

export async function updatePaca(id: number, paca: Partial<Omit<Paca, 'id' | 'created_at' | 'updated_at'>>): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(paca)) {
    if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
  }
  if (fields.length === 0) return false;

  const t0 = performance.now();
  if (isLocal()) {
    const db = await getSqlite();
    values.push(id);
    const r = db.prepare(`UPDATE pacas SET ${fields.join(', ')} WHERE id = ?`).run(...values).changes > 0;
    logQuery(`updatePaca(${id})`, performance.now() - t0);
    return r;
  }
  const db = await getMariaDb();
  values.push(id);
  const r = await db.query(`UPDATE pacas SET ${fields.join(', ')} WHERE id = ?`, values);
  logQuery(`updatePaca(${id})`, performance.now() - t0);
  return r.affectedRows > 0;
}

export async function deletePaca(id: number): Promise<boolean> {
  const t0 = performance.now();
  if (isLocal()) {
    const db = await getSqlite();
    const r = db.prepare('DELETE FROM pacas WHERE id = ?').run(id).changes > 0;
    logQuery(`deletePaca(${id})`, performance.now() - t0);
    return r;
  }
  const db = await getMariaDb();
  const r = await db.query('DELETE FROM pacas WHERE id = ?', [id]);
  logQuery(`deletePaca(${id})`, performance.now() - t0);
  return r.affectedRows > 0;
}

export async function createSession(username: string): Promise<string> {
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const exp = expiresAt();
  if (isLocal()) {
    const db = await getSqlite();
    db.prepare('INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)').run(token, username, exp);
  } else {
    const db = await getMariaDb();
    await db.query('INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)', [token, username, exp]);
  }
  return token;
}

export async function validateSession(token: string): Promise<boolean> {
  if (isLocal()) {
    const db = await getSqlite();
    const row = db.prepare('SELECT expires_at FROM sessions WHERE token = ?').get(token) as any;
    if (!row) return false;
    if (new Date(row.expires_at) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return false;
    }
    return true;
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT expires_at FROM sessions WHERE token = ?', [token]) as any[];
  if (rows.length === 0) return false;
  if (new Date(rows[0].expires_at) < new Date()) {
    await db.query('DELETE FROM sessions WHERE token = ?', [token]);
    return false;
  }
  return true;
}

export async function deleteSession(token: string): Promise<void> {
  if (isLocal()) {
    const db = await getSqlite();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  } else {
    const db = await getMariaDb();
    await db.query('DELETE FROM sessions WHERE token = ?', [token]);
  }
}

export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now).changes;
  }
  const db = await getMariaDb();
  const r = await db.query('DELETE FROM sessions WHERE expires_at < ?', [now]);
  return r.affectedRows;
}

// --- Users ---
export async function verifyUser(username: string, password: string): Promise<boolean> {
  const crypto = await import('crypto');
  const { promisify } = await import('util');
  const scrypt = promisify(crypto.scrypt);

  if (isLocal()) {
    const db = await getSqlite();
    const row = db.prepare('SELECT password_hash FROM users WHERE username = ?').get(username) as any;
    if (!row) return false;
    const [salt, hash] = row.password_hash.split(':');
    const verify = (await scrypt(password, salt, 64)).toString('hex');
    return verify === hash;
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT password_hash FROM users WHERE username = ?', [username]) as any[];
  if (rows.length === 0) return false;
  const [salt, hash] = rows[0].password_hash.split(':');
  const verify = (await scrypt(password, salt, 64)).toString('hex');
  return verify === hash;
}

export async function getUsers(): Promise<{ id: number; username: string; created_at: string }[]> {
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('SELECT id, username, created_at FROM users ORDER BY id').all();
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT id, username, created_at FROM users ORDER BY id');
  return rows as unknown as { id: number; username: string; created_at: string }[];
}

export async function createUser(username: string, password: string): Promise<number> {
  const crypto = await import('crypto');
  const { promisify } = await import('util');
  const scrypt = promisify(crypto.scrypt);
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  const passwordHash = `${salt}:${hash}`;

  if (isLocal()) {
    const db = await getSqlite();
    const r = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
    return Number(r.lastInsertRowid);
  }
  const db = await getMariaDb();
  const r = await db.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, passwordHash]);
  return Number(r.insertId);
}

export async function deleteUser(id: number): Promise<boolean> {
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
  }
  const db = await getMariaDb();
  const r = await db.query('DELETE FROM users WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

// --- Mediciones ---
export async function getMedicionesByPaca(pacaId: number): Promise<Medicion[]> {
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('SELECT * FROM mediciones WHERE paca_id = ? ORDER BY fecha ASC').all(pacaId) as Medicion[];
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT * FROM mediciones WHERE paca_id = ? ORDER BY fecha ASC', [pacaId]);
  return rows as unknown as Medicion[];
}

export async function createMedicion(medicion: Omit<Medicion, 'id' | 'created_at'>): Promise<number> {
  if (isLocal()) {
    const db = await getSqlite();
    const r = db.prepare(
      'INSERT INTO mediciones (paca_id, peso, fecha, notas) VALUES (?, ?, ?, ?)'
    ).run(medicion.paca_id, medicion.peso, medicion.fecha, medicion.notas || null);
    return Number(r.lastInsertRowid);
  }
  const db = await getMariaDb();
  const r = await db.query(
    'INSERT INTO mediciones (paca_id, peso, fecha, notas) VALUES (?, ?, ?, ?)',
    [medicion.paca_id, medicion.peso, medicion.fecha, medicion.notas || null]
  );
  return Number(r.insertId);
}

export async function deleteMedicion(id: number): Promise<boolean> {
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('DELETE FROM mediciones WHERE id = ?').run(id).changes > 0;
  }
  const db = await getMariaDb();
  const r = await db.query('DELETE FROM mediciones WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

export async function getPacasByColectivo(colectivo: string): Promise<Paca[]> {
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('SELECT * FROM pacas WHERE colectivo = ? ORDER BY fecha_inicio DESC').all(colectivo) as Paca[];
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT * FROM pacas WHERE colectivo = ? ORDER BY fecha_inicio DESC', [colectivo]);
  return rows as unknown as Paca[];
}

export async function getColectivoStats(colectivo: string): Promise<{ total_pacas: number; total_kg: number; kg_por_paca: number; primera_fecha: string; ultima_fecha: string } | null> {
  if (isLocal()) {
    const db = await getSqlite();
    const row = db.prepare(`
      SELECT
        COUNT(*) as total_pacas,
        COALESCE(SUM(m.peso), 0) as total_kg,
        CASE WHEN COUNT(*) > 0 THEN ROUND(COALESCE(SUM(m.peso), 0) * 1.0 / COUNT(*), 2) ELSE 0 END as kg_por_paca,
        MIN(m.fecha) as primera_fecha,
        MAX(m.fecha) as ultima_fecha
      FROM pacas p
      LEFT JOIN mediciones m ON m.paca_id = p.id
      WHERE p.colectivo = ?
    `).get(colectivo) as any;
    return row && row.total_pacas > 0 ? row : null;
  }
  const db = await getMariaDb();
  const rows = await db.query(`
    SELECT
      COUNT(*) as total_pacas,
      COALESCE(SUM(m.peso), 0) as total_kg,
      CASE WHEN COUNT(*) > 0 THEN ROUND(COALESCE(SUM(m.peso), 0) * 1.0 / COUNT(*), 2) ELSE 0 END as kg_por_paca,
      MIN(m.fecha) as primera_fecha,
      MAX(m.fecha) as ultima_fecha
    FROM pacas p
    LEFT JOIN mediciones m ON m.paca_id = p.id
    WHERE p.colectivo = ?
  `, [colectivo]);
  const row = rows[0] as any;
  return row && row.total_pacas > 0 ? row : null;
}

export async function getAllColectivos(): Promise<string[]> {
  if (isLocal()) {
    const db = await getSqlite();
    const rows = db.prepare('SELECT DISTINCT colectivo FROM pacas ORDER BY colectivo').all() as { colectivo: string }[];
    return rows.map(r => r.colectivo);
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT DISTINCT colectivo FROM pacas ORDER BY colectivo') as { colectivo: string }[];
  return rows.map(r => r.colectivo);
}

// --- Colectivos (tabla normalizada) ---
export async function getColectivos(): Promise<Colectivo[]> {
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('SELECT * FROM colectivos ORDER BY nombre').all() as Colectivo[];
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT * FROM colectivos ORDER BY nombre');
  return rows as unknown as Colectivo[];
}

export async function getColectivoById(id: number): Promise<Colectivo | null> {
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('SELECT * FROM colectivos WHERE id = ?').get(id) || null;
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT * FROM colectivos WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
}

export async function getColectivoByNombre(nombre: string): Promise<Colectivo | null> {
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('SELECT * FROM colectivos WHERE nombre = ?').get(nombre) || null;
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT * FROM colectivos WHERE nombre = ?', [nombre]);
  return rows.length > 0 ? rows[0] : null;
}

export async function createColectivo(nombre: string, color: string): Promise<number> {
  if (isLocal()) {
    const db = await getSqlite();
    const r = db.prepare('INSERT INTO colectivos (nombre, color) VALUES (?, ?)').run(nombre, color);
    return Number(r.lastInsertRowid);
  }
  const db = await getMariaDb();
  const r = await db.query('INSERT INTO colectivos (nombre, color) VALUES (?, ?)', [nombre, color]);
  return Number(r.insertId);
}

export async function updateColectivo(id: number, nombre: string, color: string): Promise<boolean> {
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('UPDATE colectivos SET nombre = ?, color = ? WHERE id = ?').run(nombre, color, id).changes > 0;
  }
  const db = await getMariaDb();
  const r = await db.query('UPDATE colectivos SET nombre = ?, color = ? WHERE id = ?', [nombre, color, id]);
  return r.affectedRows > 0;
}

export async function deleteColectivo(id: number): Promise<boolean> {
  if (isLocal()) {
    const db = await getSqlite();
    return db.prepare('DELETE FROM colectivos WHERE id = ?').run(id).changes > 0;
  }
  const db = await getMariaDb();
  const r = await db.query('DELETE FROM colectivos WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

export async function getColectivoColor(nombre: string): Promise<string | null> {
  if (isLocal()) {
    const db = await getSqlite();
    const row = db.prepare('SELECT color FROM colectivos WHERE nombre = ?').get(nombre) as any;
    return row ? row.color : null;
  }
  const db = await getMariaDb();
  const rows = await db.query('SELECT color FROM colectivos WHERE nombre = ?', [nombre]) as any[];
  return rows.length > 0 ? rows[0].color : null;
}
