import request from 'supertest';
import express, { Request, Response } from 'express';
import { authLimiter } from '../rate-limit.middleware';

describe('Rate Limit Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.post('/login', authLimiter, (_req: Request, res: Response) => {
      res.json({ success: true });
    });
  });

  it('should allow requests within the limit', async () => {
    const response = await request(app).post('/login');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should return 429 after exceeding the limit', async () => {
    // Make 5 requests (the limit)
    for (let i = 0; i < 5; i++) {
      const response = await request(app).post('/login');
      expect(response.status).toBe(200);
    }

    // 6th request should be rate limited
    const response = await request(app).post('/login');
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('TooManyRequests');
  });

  it('should include Retry-After header on rate limit', async () => {
    // Exceed the limit
    for (let i = 0; i < 5; i++) {
      await request(app).post('/login');
    }

    const response = await request(app).post('/login');
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
    expect(parseInt(response.headers['retry-after'])).toBeGreaterThan(0);
  });
});
