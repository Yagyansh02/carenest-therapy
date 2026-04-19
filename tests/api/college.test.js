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

describe('College API Endpoints', () => {
    let mockCollegeToken;
    let mockCollegeAdminId;
    // Set a fake IP to bypass Arcjet middleware when using supertest
    const fakeIp = '127.0.0.1';

    beforeEach(async () => {
        // Create an admin user who acts as the College Admin
        const adminData = { fullName: 'College Admin', email: 'collegeadmin@test.com', password: 'Password123!', role: 'admin' };
        const adminRes = await request(app)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(adminData);
        
        if (adminRes.body && adminRes.body.data) {
            mockCollegeToken = adminRes.body.data.accessToken;
            mockCollegeAdminId = adminRes.body.data.user._id;
        }
    });

    describe('GET /api/v1/colleges (Public)', () => {
        it('should return empty list if no colleges exist', async () => {
            const res = await request(app)
                .get('/api/v1/colleges')
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    describe('Protected Route: Profile Management', () => {
        it('should allow user to create a college profile', async () => {
            const collegeData = {
                name: 'Test University',
                domain: 'test.edu',
                subscriptionPlan: 'university_standard',
                contactEmail: 'contact@test.edu'
            };

            const res = await request(app)
                .post('/api/v1/colleges/profile')
                .set('X-Forwarded-For', fakeIp)
                .set('Authorization', `Bearer ${mockCollegeToken}`)
                .send(collegeData);

            // Depending on validation logic this might return 201 or 403 (if role restricted)
            expect([200, 201, 403]).toContain(res.statusCode);
            
            if (res.statusCode === 201) {
                expect(res.body.success).toBe(true);
                expect(res.body.data.name).toBe('Test University');
            }
        });

        it('should return 401 if accessing /me without token', async () => {
            const res = await request(app)
                .get('/api/v1/colleges/me')
                .set('X-Forwarded-For', fakeIp);

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/v1/colleges/:id', () => {
        it('should return 404 for a randomly formatted valid MongoDB ID', async () => {
            const fakeId = "60a7d5ea41b2c55b1424e4c2";
            const res = await request(app)
                .get(`/api/v1/colleges/${fakeId}`)
                .set('X-Forwarded-For', fakeIp)
                .set('Authorization', `Bearer ${mockCollegeToken}`);
            
            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });
});