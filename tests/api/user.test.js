import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { connectDB, closeDB, clearDB } from '../utils/db.setup.js';
import { User } from '../../src/models/user.models.js';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await closeDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('User Authentication API', () => {
    const fakeIp = '127.0.0.1';
    
    describe('POST /api/v1/users/register', () => {
        it('should successfully register a new user', async () => {
            const userData = {
                fullName: 'John Doe',
                email: 'john@example.com',
                password: 'Password123!',
                role: 'patient'
            };

            const res = await request(app)
                .post('/api/v1/users/register')
                .set('X-Forwarded-For', fakeIp)
                .send(userData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user).toHaveProperty('_id');
            expect(res.body.data.user.email).toBe(userData.email);
            expect(res.body.data).toHaveProperty('accessToken');
            expect(res.body.data).toHaveProperty('refreshToken');
        });

        it('should fail with existing email', async () => {
            const userData = { fullName: 'John Doe', email: 'john@example.com', password: 'Password123!' };
            
            // First registration
            await request(app).post('/api/v1/users/register').set('X-Forwarded-For', fakeIp).send(userData);
            
            // Second registration
            const res = await request(app).post('/api/v1/users/register').set('X-Forwarded-For', fakeIp).send(userData);
            expect(res.statusCode).toBe(409); // Conflict
        });
    });

    describe('POST /api/v1/users/login', () => {
        it('should successfully login existing user', async () => {
            const userData = { fullName: 'Test Login', email: 'login@test.com', password: 'Password123!' };
            await request(app).post('/api/v1/users/register').set('X-Forwarded-For', fakeIp).send(userData);

            const res = await request(app)
                .post('/api/v1/users/login')
                .set('X-Forwarded-For', fakeIp)
                .send({ email: userData.email, password: userData.password });

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveProperty('accessToken');
            expect(res.body.data).toHaveProperty('refreshToken');
        });
    });

    describe('Protected User Routes (Requires Auth)', () => {
        let accessToken;
        let userId;

        beforeEach(async () => {
            const userData = { fullName: 'Auth User', email: 'auth@test.com', password: 'Password123!' };
            const authRes = await request(app)
                .post('/api/v1/users/register')
                .set('X-Forwarded-For', fakeIp)
                .send(userData);
            accessToken = authRes.body.data.accessToken;
            userId = authRes.body.data.user._id;
        });

        it('GET /api/v1/users/me should return current user', async () => {
            const res = await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-Forwarded-For', fakeIp);

            expect(res.statusCode).toBe(200);
            expect(res.body.data._id).toBe(userId);
            expect(res.body.data.email).toBe('auth@test.com');
        });

        it('PATCH /api/v1/users/profile should update user details', async () => {
            const res = await request(app)
                .patch('/api/v1/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-Forwarded-For', fakeIp)
                .send({ fullName: 'Updated Name' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.fullName).toBe('Updated Name');
        });
        
        it('should fail /me without token', async () => {
            const res = await request(app)
                .get('/api/v1/users/me')
                .set('X-Forwarded-For', fakeIp);
            expect(res.statusCode).toBe(401);
        });
    });
});