import type { APIRoute } from 'astro';
import { getPacaById, updatePaca, deletePaca, validateSession } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'ID inválido' }), { status: 400 });
    }

    const paca = await getPacaById(id);
    if (!paca) {
      return new Response(JSON.stringify({ error: 'Paca no encontrada' }), { status: 404 });
    }

    return new Response(JSON.stringify(paca), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching paca:', error);
    return new Response(JSON.stringify({ error: 'Error al obtener paca' }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'ID inválido' }), { status: 400 });
    }

    const body = await request.json();
    const updated = await updatePaca(id, body);

    if (!updated) {
      return new Response(JSON.stringify({ error: 'Paca no encontrada o sin cambios' }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: 'Paca actualizada' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating paca:', error);
    return new Response(JSON.stringify({ error: 'Error al actualizar paca' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const token = cookies.get('session')?.value;
    if (!token || !(await validateSession(token))) {
      return new Response(JSON.stringify({ error: 'No autorizado. Inicia sesion como admin.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = Number(params.id);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'ID inválido' }), { status: 400 });
    }

    const deleted = await deletePaca(id);
    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Paca no encontrada' }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: 'Paca eliminada' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting paca:', error);
    return new Response(JSON.stringify({ error: 'Error al eliminar paca' }), { status: 500 });
  }
};
