import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { connectDB, closeDB, clearDB } from '../utils/db.setup.js';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('Video Call API Endpoints', () => {
    let mockUserToken;
    const fakeIp = '127.0.0.1';

    beforeEach(async () => {
        // Create Patient
        const userData = { fullName: 'VideoCall User', email: 'video@test.com', password: 'Password123!', role: 'patient' };
        const userRes = await request(app)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(userData);
        
        if (userRes.body && userRes.body.data) {
            mockUserToken = userRes.body.data.accessToken;
        }
    });

    describe('GET /api/v1/video-calls/:sessionId/token', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            const fakeSessionId = "60a7d5ea41b2c55b1424e4c2";
            const res = await request(app)
                .get(`/api/v1/video-calls/${fakeSessionId}/token`)
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should return 404 or 403 when trying to join an invalid/foreign video session', async () => {
            const fakeSessionId = "60a7d5ea41b2c55b1424e4c2";
            const res = await request(app)
                .get(`/api/v1/video-calls/${fakeSessionId}/token`)
                .set('Authorization', `Bearer ${mockUserToken}`)
                .set('X-Forwarded-For', fakeIp);
            
            expect([403, 404]).toContain(res.statusCode);
            expect(res.body.success).toBe(false);
        });
    });
});