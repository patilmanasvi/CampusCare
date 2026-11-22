const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('should return 200 or 503 depending on database availability', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('service', 'CampusCare Backend API');
    expect(res.body.checks).toHaveProperty('server');
    expect(res.body.checks).toHaveProperty('database');
  });

  it('should return 200 for root welcome endpoint', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ONLINE');
    expect(res.body).toHaveProperty('system', 'CampusCare Backend API');
  });

  it('should return 404 for nonexistent route', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('code', 'NOT_FOUND');
  });
});
