import type { Paca } from './types';

export type { Paca };

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
  return sqliteDb;
}

// --- MariaDB (Toolforge) ---
let mariadbPool: any = null;
let mariadbReady = false;

async function getMariaDb() {
  if (mariadbPool) return mariadbPool;
  const mariadb = await import('mariadb');
  mariadbPool = mariadb.default.createPool({
    host: process.env.TOOLSDB_HOST,
    user: process.env.TOOLSDB_USER,
    password: process.env.TOOLSDB_PASSWORD,
    database: process.env.TOOLSDB_DATABASE,
    connectionLimit: 5,
    charset: 'utf8mb4',
  });
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
