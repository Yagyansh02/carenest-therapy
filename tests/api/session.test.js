import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { connectDB, closeDB, clearDB } from '../utils/db.setup.js';

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

describe('Session API Endpoints', () => {
    let mockPatientToken;
    let mockPatientId;
    let mockTherapistToken;
    let mockTherapistId;
    
    // Create users to test with protected routes
    beforeEach(async () => {
        // Create Patient
        const patientData = { fullName: 'Test Patient', email: 'patient@test.com', password: 'Password123!', role: 'patient' };
        const patientRes = await request(appInstance)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(patientData);
        if (patientRes.body && patientRes.body.data) {
            mockPatientToken = patientRes.body.data.accessToken;
            mockPatientId = patientRes.body.data.user._id;
        }

        // Create Therapist
        const therapistData = { fullName: 'Test Therapist', email: 'therapist@test.com', password: 'Password123!', role: 'therapist' };
        const therapistRes = await request(appInstance)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(therapistData);
        if (therapistRes.body && therapistRes.body.data) {
            mockTherapistToken = therapistRes.body.data.accessToken;
            mockTherapistId = therapistRes.body.data.user._id;
        }
    });

    describe('GET /api/v1/sessions', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            const res = await request(appInstance)
                .get('/api/v1/sessions')
                .set('X-Forwarded-For', fakeIp);
            expect(res.statusCode).toBe(401);
        });

        it('should return empty array for new patient', async () => {
            const res = await request(appInstance)
                .get('/api/v1/sessions')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.sessions).toBeInstanceOf(Array);
            expect(res.body.data.sessions.length).toBe(0);
        });
    });

    describe('POST /api/v1/sessions', () => {
        it('should allow a patient to create a session', async () => {
            const sessionData = {
                therapistId: mockTherapistId,
                patientId: mockPatientId,
                scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                duration: 60,
                sessionFee: 100
            };

            const res = await request(appInstance)
                .post('/api/v1/sessions')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp)
                .send(sessionData);

            // Expecting 201 Created or 200 depending on your controller implementation
            expect([200, 201]).toContain(res.statusCode);
            expect(res.body.success).toBe(true);
            if (res.body.data) {
                const session = res.body.data.session || res.body.data;
                expect(session).toHaveProperty('_id');
                const pId = session.patientId?._id || session.patientId;
                expect(pId.toString()).toBe(mockPatientId.toString());
            }
        });
    });

    describe('Role-specific routes', () => {
        it('should allow patient to access patient/my-sessions', async () => {
            const res = await request(appInstance)
                .get('/api/v1/sessions/patient/my-sessions')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(200);
        });

        it('should forbid patient from accessing therapist/my-sessions', async () => {
            const res = await request(appInstance)
                .get('/api/v1/sessions/therapist/my-sessions')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(403); // Forbidden due to verifyRole
        });
        
        it('should allow therapist to access therapist/my-sessions', async () => {
            const res = await request(appInstance)
                .get('/api/v1/sessions/therapist/my-sessions')
                .set('Authorization', `Bearer ${mockTherapistToken}`)
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(200);
        });
    });
});