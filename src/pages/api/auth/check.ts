import type { APIRoute } from 'astro';
import { validateSession } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get('session')?.value;

  if (!token) {
    return new Response(JSON.stringify({ admin: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const valid = await validateSession(token);

  return new Response(JSON.stringify({ admin: valid }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
