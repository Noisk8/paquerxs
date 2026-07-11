import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '4321');

app.use(express.json());
app.use(cookieParser());

// --- API Routes ---

// Rate limiting
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

// GET /api/pacas
app.get('/api/pacas', async (req, res) => {
  try {
    const { getAllPacas, countPacas } = await import('./src/lib/db.ts');
    const limit = Math.min(Number(req.query.limit || '100'), 500);
    const offset = Math.max(Number(req.query.offset || '0'), 0);
    const [pacas, total] = await Promise.all([getAllPacas(limit, offset), countPacas()]);
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ data: pacas, pagination: { total, limit, offset, hasMore: offset + limit < total } });
  } catch (error) {
    console.error('Error fetching pacas:', error);
    res.status(500).json({ error: 'Error al obtener pacas' });
  }
});

// POST /api/pacas
app.post('/api/pacas', async (req, res) => {
  try {
    const { createPaca } = await import('./src/lib/db.ts');
    const { nombre, colectivo, peso, fecha_inicio, coordenadas_lat, coordenadas_lng, participantes, informacion } = req.body;

    if (!nombre || !colectivo || !fecha_inicio || !peso || !coordenadas_lat || !coordenadas_lng || !participantes || !informacion) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const pesoNum = Number(peso);
    const partNum = Number(participantes);
    const latNum = Number(coordenadas_lat);
    const lngNum = Number(coordenadas_lng);

    if (isNaN(pesoNum) || pesoNum < 0.1) return res.status(400).json({ error: 'El peso debe ser minimo 0.1 kg' });
    if (isNaN(partNum) || partNum < 1) return res.status(400).json({ error: 'Debe haber minimo 1 participante' });
    if (isNaN(latNum) || isNaN(lngNum)) return res.status(400).json({ error: 'Coordenadas invalidas' });

    const id = await createPaca({ nombre, colectivo, peso: pesoNum, fecha_inicio, coordenadas_lat: latNum, coordenadas_lng: lngNum, participantes: partNum, informacion });
    res.status(201).json({ id, message: 'Paca creada exitosamente' });
  } catch (error) {
    console.error('Error creating paca:', error);
    res.status(500).json({ error: 'Error al crear paca' });
  }
});

// GET /api/pacas/:id
app.get('/api/pacas/:id', async (req, res) => {
  try {
    const { getPacaById } = await import('./src/lib/db.ts');
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalido' });
    const paca = await getPacaById(id);
    if (!paca) return res.status(404).json({ error: 'Paca no encontrada' });
    res.json(paca);
  } catch (error) {
    console.error('Error fetching paca:', error);
    res.status(500).json({ error: 'Error al obtener paca' });
  }
});

// PUT /api/pacas/:id
app.put('/api/pacas/:id', async (req, res) => {
  try {
    const { updatePaca } = await import('./src/lib/db.ts');
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalido' });
    const updated = await updatePaca(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Paca no encontrada o sin cambios' });
    res.json({ message: 'Paca actualizada' });
  } catch (error) {
    console.error('Error updating paca:', error);
    res.status(500).json({ error: 'Error al actualizar paca' });
  }
});

// DELETE /api/pacas/:id
app.delete('/api/pacas/:id', async (req, res) => {
  try {
    const { deletePaca, validateSession } = await import('./src/lib/db.ts');
    const token = req.cookies.session;
    if (!token || !(await validateSession(token))) {
      return res.status(401).json({ error: 'No autorizado. Inicia sesion como admin.' });
    }
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalido' });
    const deleted = await deletePaca(id);
    if (!deleted) return res.status(404).json({ error: 'Paca no encontrada' });
    res.json({ message: 'Paca eliminada' });
  } catch (error) {
    console.error('Error deleting paca:', error);
    res.status(500).json({ error: 'Error al eliminar paca' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { createSession } = await import('./src/lib/db.ts');
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Demasiados intentos. Intenta en 15 minutos.' });
    }

    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const isProd = !!process.env.TOOLSDB_HOST;
    const adminPass = process.env.ADMIN_PASS || (isProd ? '' : 'pacas2025');

    if (!adminPass) {
      console.error('ADMIN_PASS not set in environment');
      return res.status(500).json({ error: 'Configuracion del servidor incompleta' });
    }

    if (isProd && adminPass === 'pacas2025') {
      console.warn('WARNING: Using default ADMIN_PASS in production!');
    }

    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = await createSession(username);
    res.set('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    res.json({ message: 'Sesion iniciada', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { deleteSession } = await import('./src/lib/db.ts');
    const token = req.cookies.session;
    if (token) await deleteSession(token);
    res.set('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0');
    res.json({ message: 'Sesion cerrada' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/auth/check
app.get('/api/auth/check', async (req, res) => {
  try {
    const { validateSession } = await import('./src/lib/db.ts');
    const token = req.cookies.session;
    if (!token) return res.json({ admin: false });
    const valid = await validateSession(token);
    res.json({ admin: valid });
  } catch (error) {
    res.json({ admin: false });
  }
});

// POST /api/seed
app.post('/api/seed', async (req, res) => {
  try {
    const { createPaca, getAllPacas } = await import('./src/lib/db.ts');
    const { pacasSeed } = await import('./src/lib/seed.ts');
    const existing = await getAllPacas(1, 0);
    if (existing.length > 0) {
      return res.json({ message: 'Base de datos ya tiene datos', inserted: 0 });
    }
    let inserted = 0;
    for (const paca of pacasSeed) {
      try { await createPaca(paca); inserted++; } catch (e) { console.warn(`Skipping: ${paca.nombre}`); }
    }
    res.json({ message: `${inserted} pacas sembradas`, inserted });
  } catch (error) {
    console.error('Error seeding:', error);
    res.status(500).json({ error: 'Error al sembrar datos' });
  }
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const { getQueryStats, countPacas, cleanupExpiredSessions } = await import('./src/lib/db.ts');
    const queries = getQueryStats();
    const totalPacas = await countPacas();
    const expiredCleaned = await cleanupExpiredSessions();
    res.json({ pacas: totalPacas, sessions: { expiredCleaned }, queries });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Error al obtener estadisticas' });
  }
});

// --- Serve static files (Vue SPA) ---
const distPath = join(__dirname, 'dist', 'client');
app.use(express.static(distPath, { maxAge: '1h' }));

// SPA fallback — all non-API routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Paquerxs server running on http://0.0.0.0:${PORT}`);
});
