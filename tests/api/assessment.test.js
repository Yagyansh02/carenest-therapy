import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { connectDB, closeDB, clearDB } from '../utils/db.setup.js';

let appInstance = app;

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
        const patientRes = await request(appInstance).post('/api/v1/users/register').send(patientData);
        if (patientRes.body && patientRes.body.data) {
            mockPatientToken = patientRes.body.data.accessToken;
        }

        // Create Admin
        const adminData = { fullName: 'Admin User', email: 'adminA@test.com', password: 'Password123!', role: 'admin' };
        const adminRes = await request(appInstance).post('/api/v1/users/register').send(adminData);
        if (adminRes.body && adminRes.body.data) {
            mockAdminToken = adminRes.body.data.accessToken;
            // Hack to elevate role directly in DB if register doesn't assign admin directly
            const adminId = adminRes.body.data.user._id;
            await request(appInstance)
                .patch(`/api/v1/users/profile`)
                .set('Authorization', `Bearer ${mockAdminToken}`)
                .send({ role: 'admin' });
        }
    });

    describe('GET /api/v1/assessments', () => {
        it('should return 401 Unauthorized if submitting without auth', async () => {
            const res = await request(appInstance).post('/api/v1/assessments').send({ score: 10 });
            expect(res.statusCode).toBe(401);
        });

        it('should allow patient to retrieve their assessment (empty if none)', async () => {
            const res = await request(appInstance)
                .get('/api/v1/assessments/me')
                .set('Authorization', `Bearer ${mockPatientToken}`);
            
            // Depending on the implementation, maybe 404 if no assessment or 200 with empty
            expect([200, 404]).toContain(res.statusCode);
            if (res.statusCode === 200 && res.body.data) {
                expect(res.body.success).toBe(true);
            }
        });
    });

    describe('POST /api/v1/assessments', () => {
        it('should allow patient to submit an assessment', async () => {
            const assessmentData = {
                answers: [
                    { question: 'q1', answer: 'a1', score: 3 },
                    { question: 'q2', answer: 'a2', score: 2 } // Mock format
                ],
                totalScore: 5,
                preferences: { preferredGender: 'Any', preferredLanguage: 'English' },
                severity: 'low'
            };

            const res = await request(appInstance)
                .post('/api/v1/assessments')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .send(assessmentData);

            expect([200, 201]).toContain(res.statusCode);
            expect(res.body.success).toBe(true);
        });
    });

    describe('Role-specific paths', () => {
        it('should ban patient from getting /all (admin only)', async () => {
            const res = await request(appInstance)
                .get('/api/v1/assessments/all')
                .set('Authorization', `Bearer ${mockPatientToken}`);
            
            expect(res.statusCode).toBe(403);
        });

        it('should allow patient to fetch recommendations', async () => {
            const res = await request(appInstance)
                .get('/api/v1/assessments/recommendations')
                .set('Authorization', `Bearer ${mockPatientToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});