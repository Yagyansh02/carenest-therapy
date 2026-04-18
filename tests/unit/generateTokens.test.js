import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateAccessToken, generateRefreshToken, generateTokens } from '../../../src/utils/generateTokens.js';
import jwt from 'jsonwebtoken';

describe('Token Generation Utilities', () => {
    const mockUser = {
        _id: 'sampleId123',
        email: 'test@example.com',
        role: 'patient'
    };

    beforeEach(() => {
        // Set environment variables required for signing
        process.env.ACCESS_TOKEN_SECRET = 'test_access_secret';
        process.env.ACCESS_TOKEN_EXPIRY = '15m';
        process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret';
        process.env.REFRESH_TOKEN_EXPIRY = '7d';
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should generate a valid access token containing user info', () => {
        const token = generateAccessToken(mockUser);
        expect(token).toBeDefined();

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        expect(decoded._id).toBe(mockUser._id);
        expect(decoded.email).toBe(mockUser.email);
        expect(decoded.role).toBe(mockUser.role);
    });

    it('should generate a valid refresh token containing only user _id', () => {
        const token = generateRefreshToken(mockUser);
        expect(token).toBeDefined();

        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        expect(decoded._id).toBe(mockUser._id);
        expect(decoded.email).toBeUndefined(); // Shouldn't have email
    });

    it('should generate both tokens using generateTokens', () => {
        const tokens = generateTokens(mockUser);
        expect(tokens.accessToken).toBeDefined();
        expect(tokens.refreshToken).toBeDefined();
    });
});