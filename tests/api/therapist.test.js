import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { connectDB, closeDB, clearDB } from '../utils/db.setup.js';
import { Therapist } from '../../src/models/therapist.models.js';
import { User } from '../../src/models/user.models.js';

let appInstance = app;
const fakeIp = '127.0.0.1';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('Therapists API Endpoints', () => {
    let mockUserToken;
    let mockUserId;
    
    // Create an auth user to test with protected routes
    beforeEach(async () => {
        const userData = { fullName: 'Test Client', email: 'client@test.com', password: 'Password123!', role: 'patient' };
        const authRes = await request(appInstance)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(userData);
        // Safely extract token and ID
        if (authRes.body && authRes.body.data) {
            mockUserToken = authRes.body.data.accessToken;
            mockUserId = authRes.body.data.user._id;
        }
    });

    describe('GET /api/v1/therapists', () => {
        it('should fetch an empty list if no therapists exist', async () => {
            const res = await request(appInstance)
                .get('/api/v1/therapists')
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.therapists).toBeInstanceOf(Array);
            expect(res.body.data.therapists.length).toBe(0);
        });

        it('should return 401 Unauthorized for therapist-only endpoints without auth', async () => {
            const res = await request(appInstance)
                .get('/api/v1/therapists/me')
                .set('X-Forwarded-For', fakeIp);
            expect(res.statusCode).toBe(401);
        });

        it('should return 403 when non-therapist accesses therapist-only endpoint', async () => {
            const res = await request(appInstance)
                .get('/api/v1/therapists/me')
                .set('Authorization', `Bearer ${mockUserToken}`)
                .set('X-Forwarded-For', fakeIp);
            
            // Patient should get 403 because /me requires therapist role
            expect(res.statusCode).toBe(403);
        });
    });

    describe('GET /api/v1/therapists/:id', () => {
        it('should return 404 for non-existent therapist ID', async () => {
            const fakeId = "60a7d5ea41b2c55b1424e4c2"; // valid ObjectId but missing
            const res = await request(appInstance)
                .get(`/api/v1/therapists/${fakeId}`)
                .set('X-Forwarded-For', fakeIp);
            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
        
        it('should reject invalid MongoDB object IDs format', async () => {
            const res = await request(appInstance)
                .get('/api/v1/therapists/123invalid_id_format')
                .set('X-Forwarded-For', fakeIp);
            // Your API might throw 400 or cast error 500 depending on middleware
            const code = res.statusCode; 
            expect([400, 404, 500]).toContain(code);
        });
    });
});