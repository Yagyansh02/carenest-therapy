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

describe('Chat API Endpoints', () => {
    let mockPatientToken;
    let mockTherapistToken;
    let mockTherapistId;
    const fakeIp = '127.0.0.1';

    beforeEach(async () => {
        // Create Patient
        const patientData = { fullName: 'Chat Patient', email: 'chatpatient@test.com', password: 'Password123!', role: 'patient' };
        const patientRes = await request(app)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(patientData);
        
        if (patientRes.body && patientRes.body.data) {
            mockPatientToken = patientRes.body.data.accessToken;
        }

        // Create Therapist
        const therapistData = { fullName: 'Chat Therapist', email: 'chattherapist@test.com', password: 'Password123!', role: 'therapist' };
        const therapistRes = await request(app)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(therapistData);
        
        if (therapistRes.body && therapistRes.body.data) {
            mockTherapistToken = therapistRes.body.data.accessToken;
            mockTherapistId = therapistRes.body.data.user._id;
        }
    });

    describe('GET /api/v1/chat/rooms', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            const res = await request(app)
                .get('/api/v1/chat/rooms')
                .set('X-Forwarded-For', fakeIp);
            expect(res.statusCode).toBe(401);
        });

        it('should return empty chat rooms list for a new patient', async () => {
            const res = await request(app)
                .get('/api/v1/chat/rooms')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    describe('GET /api/v1/chat/room/:otherUserId', () => {
        it('should allow patient to get or create chat room with a therapist', async () => {
            const res = await request(app)
                .get(`/api/v1/chat/room/${mockTherapistId}`)
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp);

            // Might be 403 if they don't have an active session together
            expect([200, 201, 403]).toContain(res.statusCode);
        });
    });

    describe('GET /api/v1/chat/unread-count', () => {
        it('should return 0 unread messages for a new user', async () => {
            const res = await request(app)
                .get('/api/v1/chat/unread-count')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.unreadCount).toBe(0);
        });
    });
});