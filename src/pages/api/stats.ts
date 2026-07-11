import type { APIRoute } from 'astro';
import { getQueryStats, countPacas, cleanupExpiredSessions } from '../../lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  const queries = getQueryStats();
  const totalPacas = await countPacas();
  const expiredCleaned = await cleanupExpiredSessions();

  return new Response(JSON.stringify({
    pacas: totalPacas,
    sessions: { expiredCleaned },
    queries,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
