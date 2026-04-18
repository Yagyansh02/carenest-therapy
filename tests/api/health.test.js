import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Health Check API', () => {
    it('GET /health should return 200 OK and status JSON', async () => {
        const res = await request(app).get('/health');
        
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('status', 'OK');
        expect(res.body).toHaveProperty('message', 'CareNest Therapy API is running');
        expect(res.body).toHaveProperty('timestamp');
    });
});
