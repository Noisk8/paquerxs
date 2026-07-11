import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://localhost:4321';

let serverProcess: any;

beforeAll(async () => {
  const { execSync } = await import('child_process');
  execSync('yarn build', { cwd: process.cwd(), stdio: 'pipe' });
  const { spawn } = await import('child_process');
  serverProcess = spawn('node', ['dist/server/entry.mjs'], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
  await new Promise(r => setTimeout(r, 2000));
});

afterAll(() => {
  if (serverProcess) serverProcess.kill();
});

describe('API /api/pacas', () => {
  it('returns paginated results', async () => {
    const res = await fetch(`${BASE}/api/pacas?limit=3&offset=0`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('hasMore');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('respects limit parameter', async () => {
    const res = await fetch(`${BASE}/api/pacas?limit=2&offset=0`);
    const data = await res.json();
    expect(data.data.length).toBeLessThanOrEqual(2);
  });
});

describe('API /api/auth', () => {
  it('check returns admin: false when not logged in', async () => {
    const res = await fetch(`${BASE}/api/auth/check`);
    const data = await res.json();
    expect(data.admin).toBe(false);
  });

  it('rejects wrong credentials', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': BASE },
      body: JSON.stringify({ username: 'wrong', password: 'wrong' }),
    });
    // 401 if ADMIN_PASS is set, 500 if not configured
    expect([401, 500]).toContain(res.status);
  });
});

describe('API /api/stats', () => {
  it('returns stats object', async () => {
    const res = await fetch(`${BASE}/api/stats`);
    const data = await res.json();
    expect(data).toHaveProperty('pacas');
    expect(data).toHaveProperty('queries');
    expect(data).toHaveProperty('sessions');
  });
});

describe('Pages', () => {
  it('index loads', async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.status).toBe(200);
  });

  it('pacas loads', async () => {
    const res = await fetch(`${BASE}/pacas`);
    expect(res.status).toBe(200);
  });

  it('formulario loads', async () => {
    const res = await fetch(`${BASE}/formulario`);
    expect(res.status).toBe(200);
  });

  it('about loads', async () => {
    const res = await fetch(`${BASE}/about`);
    expect(res.status).toBe(200);
  });
});
