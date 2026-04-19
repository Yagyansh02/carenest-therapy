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

describe('Supervisor API Endpoints', () => {
    let mockSupervisorToken;
    let mockSupervisorId;
    const fakeIp = '127.0.0.1';

    beforeEach(async () => {
        // Create an admin user who acts as the Supervisor
        const adminData = { fullName: 'Supervisor User', email: 'supervisor@test.com', password: 'Password123!', role: 'admin' };
        const adminRes = await request(app)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(adminData);
        
        if (adminRes.body && adminRes.body.data) {
            mockSupervisorToken = adminRes.body.data.accessToken;
            mockSupervisorId = adminRes.body.data.user._id;
        }
    });

    describe('GET /api/v1/supervisors (Public)', () => {
        it('should return empty list if no supervisors exist', async () => {
            const res = await request(app)
                .get('/api/v1/supervisors')
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    describe('Protected Route: Profile Management', () => {
        it('should allow user to create a supervisor profile', async () => {
            const supervisorData = {
                title: 'Dr.',
                department: 'Psychology',
                specialization: ['CBT', 'Anxiety'],
                experienceYears: 10
            };

            const res = await request(app)
                .post('/api/v1/supervisors/profile')
                .set('X-Forwarded-For', fakeIp)
                .set('Authorization', `Bearer ${mockSupervisorToken}`)
                .send(supervisorData);

            expect([200, 201]).toContain(res.statusCode);
            
            if (res.statusCode === 201) {
                expect(res.body.success).toBe(true);
            }
        });

        it('should return 401 if accessing /me without token', async () => {
            const res = await request(app)
                .get('/api/v1/supervisors/me')
                .set('X-Forwarded-For', fakeIp);

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/v1/supervisors/:id', () => {
        it('should return 404 for a randomly formatted valid MongoDB ID', async () => {
            const fakeId = "60a7d5ea41b2c55b1424e4c2";
            const res = await request(app)
                .get(`/api/v1/supervisors/${fakeId}`)
                .set('X-Forwarded-For', fakeIp)
                .set('Authorization', `Bearer ${mockSupervisorToken}`);
            
            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });
});