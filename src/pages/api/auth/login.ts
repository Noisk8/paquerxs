import type { APIRoute } from 'astro';
import { createSession } from '../../../lib/db';

export const prerender = false;

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'Demasiados intentos. Intenta en 15 minutos.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { username, password } = body;

    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS;
    const isProd = !!process.env.TOOLSDB_HOST;

    if (!adminPass) {
      console.error('ADMIN_PASS not set in environment');
      return new Response(JSON.stringify({ error: 'Configuracion del servidor incompleta' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (isProd && adminPass === 'pacas2025') {
      console.error('WARNING: Using default ADMIN_PASS in production!');
    }

    if (username !== adminUser || password !== adminPass) {
      return new Response(JSON.stringify({ error: 'Credenciales incorrectas' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = await createSession(username);

    return new Response(JSON.stringify({ message: 'Sesion iniciada', token }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
