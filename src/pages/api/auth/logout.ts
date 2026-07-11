import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get('session')?.value;

  if (token) {
    await deleteSession(token);
  }

  return new Response(JSON.stringify({ message: 'Sesion cerrada' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; Path=/; HttpOnly; Max-Age=0',
    },
  });
};
