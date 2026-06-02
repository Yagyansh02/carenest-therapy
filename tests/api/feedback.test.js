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

describe('Feedback API Endpoints', () => {
    let mockPatientToken;
    let mockTherapistId = "60a7d5ea41b2c55b1424e4c2"; // Randomly generated valid ID for testing
    const fakeIp = '127.0.0.1';

    beforeEach(async () => {
        // Create user
        const userData = { fullName: 'Feedback Patient', email: 'feedback@test.com', password: 'Password123!', role: 'patient' };
        const userRes = await request(app)
            .post('/api/v1/users/register')
            .set('X-Forwarded-For', fakeIp)
            .send(userData);
        
        if (userRes.body && userRes.body.data) {
            mockPatientToken = userRes.body.data.accessToken;
        }
    });

    describe('GET /api/v1/feedbacks/therapist/:therapistId/rating (Public)', () => {
        it('should return a rating even if therapist has no reviews yet', async () => {
            const res = await request(app)
                .get(`/api/v1/feedbacks/therapist/${mockTherapistId}/rating`)
                .set('X-Forwarded-For', fakeIp);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('averageRating');
            expect(res.body.data).toHaveProperty('totalReviews');
        });
    });

    describe('POST /api/v1/feedbacks', () => {
        it('should block unauthenticated submissions', async () => {
            const res = await request(app)
                .post('/api/v1/feedbacks')
                .set('X-Forwarded-For', fakeIp)
                .send({
                    therapist: mockTherapistId,
                    rating: 5,
                    review: 'Great session!'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should allow an authenticated user to submit feedback', async () => {
            const feedbackData = {
                therapist: mockTherapistId,
                rating: 4,
                review: 'Very helpful talk today.'
            };

            const res = await request(app)
                .post('/api/v1/feedbacks')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp)
                .send(feedbackData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.rating).toBe(4);
            expect(res.body.data.review).toBe('Very helpful talk today.');
        });
    });

    describe('GET /api/v1/feedbacks', () => {
        it('should allow users to fetch their feedback list', async () => {
            const res = await request(app)
                .get('/api/v1/feedbacks')
                .set('Authorization', `Bearer ${mockPatientToken}`)
                .set('X-Forwarded-For', fakeIp);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
        });
    });
});