import type { APIRoute } from 'astro';
import { createPaca, getAllPacas } from '../../lib/db';
import { pacasSeed } from '../../lib/seed';

export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    const existing = await getAllPacas(1, 0);
    if (existing.length > 0) {
      return new Response(JSON.stringify({ message: 'Base de datos ya tiene datos', inserted: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let inserted = 0;
    for (const paca of pacasSeed) {
      try {
        await createPaca(paca);
        inserted++;
      } catch (e) {
        console.warn(`Skipping: ${paca.nombre}`);
      }
    }

    return new Response(JSON.stringify({ message: `${inserted} pacas sembradas`, inserted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error seeding:', error);
    return new Response(JSON.stringify({ error: 'Error al sembrar datos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
