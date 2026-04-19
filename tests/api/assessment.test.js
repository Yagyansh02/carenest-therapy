import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { connectDB, closeDB, clearDB } from '../utils/db.setup.js';
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

describe('Assessment API Endpoints', () => {
    let mockPatientToken;
    let mockAdminToken;
    
    // Create users to test with protected routes
    beforeEach(async () => {
        // Create Patient
        const patientData = { fullName: 'Test Patient', email: 'PatientA@test.com', password: 'Password123!', role: 'patient' };
        const patientRes = await request(appInstance)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(patientData);
        if (patientRes.body && patientRes.body.data) {
            mockPatientToken = patientRes.body.data.accessToken;
        }

        // Create Admin — register as patient then elevate role directly in DB
        const adminData = { fullName: 'Admin User', email: 'adminA@test.com', password: 'Password123!' };
        const adminRes = await request(appInstance)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(adminData);
        if (adminRes.body && adminRes.body.data) {
            const adminId = adminRes.body.data.user._id;
            // Elevate to admin role directly in DB
            await User.findByIdAndUpdate(adminId, { role: 'admin' });
            // Re-login to get a fresh token reflecting the new role
            const loginRes = await request(appInstance)
                .post('/api/v1/users/login')
                .set('X-Forwarded-For', fakeIp)
                .send({ email: adminData.email, password: adminData.password });
            if (loginRes.body && loginRes.body.data) {
                mockAdminToken = loginRes.body.data.accessToken;
            }
        }
    });

    describe('GET /api/v1/assessments', () => {
        it('should return 401 Unauthorized if submitting without auth', async () => {
            const res = await request(appInstance)
                .post('/api/v1/assessments')
                .set('X-Forwarded-For', fakeIp)
                .send({ score: 10 });
            expect(res.statusCode).toBe(401);
        });

        it('should allow patient to retrieve their assessment (empty if none)', async () => {
            const res = await request(appInstance)
                .get('/api/v1/assessments/me')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp);
            
            // No assessment submitted yet, so 404 is expected
            expect([200, 404]).toContain(res.statusCode);
            if (res.statusCode === 200 && res.body.data) {
                expect(res.body.success).toBe(true);
            }
        });
    });

    describe('POST /api/v1/assessments', () => {
        it('should allow patient to submit an assessment', async () => {
            const assessmentData = {
                concerns: ['Anxiety', 'Stress'],
                impactLevel: 3,
                ageGroup: '18-25',
                occupation: 'Student',
                lifestyle: 'Moderate',
                activityLevel: 'Moderate',
                duration: 'Less than 1 month'
            };

            const res = await request(appInstance)
                .post('/api/v1/assessments')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp)
                .send(assessmentData);

            expect([200, 201]).toContain(res.statusCode);
            expect(res.body.success).toBe(true);
        });
    });

    describe('Role-specific paths', () => {
        it('should ban patient from getting /all (admin only)', async () => {
            const res = await request(appInstance)
                .get('/api/v1/assessments/all')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(403);
        });

        it('should allow patient to fetch recommendations (404 if no assessment)', async () => {
            const res = await request(appInstance)
                .get('/api/v1/assessments/recommendations')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp);
            
            // Without submitting an assessment first, should get 404
            expect([200, 404]).toContain(res.statusCode);
        });
    });
});