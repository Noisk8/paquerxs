import type { APIRoute } from 'astro';
import { getAllPacas, countPacas, createPaca } from '../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 500);
    const offset = Math.max(Number(url.searchParams.get('offset') || '0'), 0);
    const [pacas, total] = await Promise.all([getAllPacas(limit, offset), countPacas()]);

    return new Response(JSON.stringify({
      data: pacas,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching pacas:', error);
    return new Response(JSON.stringify({ error: 'Error al obtener pacas' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { nombre, colectivo, peso, fecha_inicio, coordenadas_lat, coordenadas_lng, participantes, informacion } = body;

    if (!nombre || !colectivo || !fecha_inicio || !peso || !coordenadas_lat || !coordenadas_lng || !participantes || !informacion) {
      return new Response(JSON.stringify({ error: 'Todos los campos son obligatorios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pesoNum = Number(peso);
    const partNum = Number(participantes);
    const latNum = Number(coordenadas_lat);
    const lngNum = Number(coordenadas_lng);

    if (isNaN(pesoNum) || pesoNum < 0.1) {
      return new Response(JSON.stringify({ error: 'El peso debe ser minimo 0.1 kg' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (isNaN(partNum) || partNum < 1) {
      return new Response(JSON.stringify({ error: 'Debe haber minimo 1 participante' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (isNaN(latNum) || isNaN(lngNum)) {
      return new Response(JSON.stringify({ error: 'Coordenadas invalidas' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const id = await createPaca({
      nombre,
      colectivo,
      peso: pesoNum,
      fecha_inicio,
      coordenadas_lat: latNum,
      coordenadas_lng: lngNum,
      participantes: partNum,
      informacion,
    });

    return new Response(JSON.stringify({ id, message: 'Paca creada exitosamente' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating paca:', error);
    return new Response(JSON.stringify({ error: 'Error al crear paca' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
