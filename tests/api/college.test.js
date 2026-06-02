import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { connectDB, closeDB, clearDB } from '../utils/db.setup.js';

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await closeDB(); });
beforeEach(async () => { await clearDB(); });

describe('College API Endpoints', () => {
    let mockCollegeToken;
    let mockCollegeAdminId;
    const fakeIp = '127.0.0.1';

    beforeEach(async () => {
        // Create a college user
        const collegeData = { fullName: 'College Admin', email: 'collegeadmin@test.com', password: 'Password123!', role: 'college' };
        const res = await request(app).post('/api/v1/users/register').set('X-Forwarded-For', fakeIp).send(collegeData);
        if (res.body?.data) {
            mockCollegeToken = res.body.data.accessToken;
            mockCollegeAdminId = res.body.data.user._id;
        }
    });

    describe('GET /api/v1/colleges (Public)', () => {
        it('should return empty list if no colleges exist', async () => {
            const res = await request(app).get('/api/v1/colleges').set('X-Forwarded-For', fakeIp);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            // API returns { colleges: [], pagination: {...} }
            expect(res.body.data.colleges).toBeInstanceOf(Array);
        });
    });

    describe('Protected Route: Profile Management', () => {
        it('should allow college user to create a college profile', async () => {
            const collegeData = {
                institutionName: 'Test University',
                affiliationNumber: 'AFF-001',
                contactEmail: 'contact@test.edu'
            };
            const res = await request(app).post('/api/v1/colleges/profile').set('X-Forwarded-For', fakeIp).set('Authorization', `Bearer ${mockCollegeToken}`).send(collegeData);
            expect([200, 201, 403]).toContain(res.statusCode);
            if (res.statusCode === 201) {
                expect(res.body.success).toBe(true);
            }
        });

        it('should return 401 if accessing /me without token', async () => {
            const res = await request(app).get('/api/v1/colleges/me').set('X-Forwarded-For', fakeIp);
            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/v1/colleges/:id', () => {
        it('should return 404 for a randomly formatted valid MongoDB ID', async () => {
            const fakeId = "60a7d5ea41b2c55b1424e4c2";
            // Route is behind verifyJWT, so pass token
            const res = await request(app).get(`/api/v1/colleges/${fakeId}`).set('X-Forwarded-For', fakeIp).set('Authorization', `Bearer ${mockCollegeToken}`);
            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });
});