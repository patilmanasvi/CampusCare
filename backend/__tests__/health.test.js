const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

let server;

beforeAll(async () => {
  server = await new Promise((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });
});

afterAll(async () => {
  if (server?.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await db.closePool();
});

describe('GET /api/health', () => {
  it('should return 200 or 503 depending on database availability', async () => {
    const res = await request(server).get('/api/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('service', 'CampusCare Backend API');
    expect(res.body.checks).toHaveProperty('server');
    expect(res.body.checks).toHaveProperty('database');
  });

  it('should return 200 for root welcome endpoint', async () => {
    const res = await request(server).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ONLINE');
    expect(res.body).toHaveProperty('system', 'CampusCare Backend API');
  });

  it('should return 404 for nonexistent route', async () => {
    const res = await request(server).get('/api/nonexistent-route-xyz');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('code', 'NOT_FOUND');
  });

  it('should not grant CORS access to an unconfigured browser origin', async () => {
    const res = await request(server).get('/').set('Origin', 'https://untrusted.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should block cross-origin state-changing requests', async () => {
    const res = await request(server).post('/api/auth/logout').set('Origin', 'https://untrusted.example');
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('ORIGIN_NOT_ALLOWED');
  });
});
