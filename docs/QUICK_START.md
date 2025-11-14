# 🚀 Quick Start Guide - CareNest Therapy Backend

## Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Git
- A REST client (Postman, Thunder Client, or curl)

## Step-by-Step Setup

### 1️⃣ Generate JWT Secrets

Run the secret generator:
```bash
node generate-secrets.js
```

This will output something like:
```
ACCESS_TOKEN_SECRET=a1b2c3d4e5f6...
REFRESH_TOKEN_SECRET=x9y8z7w6v5u4...
```

### 2️⃣ Create .env File

Create a new file named `.env` in the root directory:
```bash
# Copy from example
copy .env.example .env
```

Update it with your values:
```env
PORT=8000
NODE_ENV=development

# Your MongoDB connection string
MONGODB_URI=mongodb://localhost:27017
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net

# Your frontend URL
CORS_ORIGIN=http://localhost:3000

# Paste the secrets from step 1
ACCESS_TOKEN_SECRET=<paste_your_generated_secret>
REFRESH_TOKEN_SECRET=<paste_your_generated_secret>

# Token expiry times (optional, defaults work fine)
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

### 3️⃣ Install Dependencies

```bash
npm install
```

### 4️⃣ Start MongoDB

**Local MongoDB:**
```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod
```

**Or use MongoDB Atlas** (cloud) - no installation needed!

### 5️⃣ Start the Server

```bash
npm run dev
```

You should see:
```
MongoDB connected successfully
Server is running on port 8000
```

### 6️⃣ Test Health Endpoint

Open your browser or use curl:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "CareNest Therapy API is running",
  "timestamp": "2025-11-01T..."
}
```

## 🧪 Testing the Authentication System

### Test 1: Register a Patient

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"John Doe\",\"email\":\"john@example.com\",\"password\":\"test123\",\"role\":\"patient\"}"
```

**Using Postman/Thunder Client:**
- Method: `POST`
- URL: `http://localhost:8000/api/v1/auth/register`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "test123",
  "role": "patient"
}
```

### Test 2: Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"john@example.com\",\"password\":\"test123\"}"
```

**Save the `accessToken` from the response!**

### Test 3: Get Current User

```bash
curl -X GET http://localhost:8000/api/v1/auth/me ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

Replace `YOUR_ACCESS_TOKEN_HERE` with the token from Test 2.

### Test 4: Logout

```bash
curl -X POST http://localhost:8000/api/v1/auth/logout ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## 📝 Complete Test Workflow

1. **Register 3 users** (one for each role):

```json
// Patient
{
  "fullName": "Alice Patient",
  "email": "alice@example.com",
  "password": "alice123",
  "role": "patient"
}

// Therapist
{
  "fullName": "Bob Therapist",
  "email": "bob@example.com",
  "password": "bob123",
  "role": "therapist"
}

// Supervisor
{
  "fullName": "Carol Supervisor",
  "email": "carol@example.com",
  "password": "carol123",
  "role": "supervisor"
}
```

2. **Login as supervisor** to get access token

3. **Test supervisor-only route:**
```
GET http://localhost:8000/api/v1/users
Header: Authorization: Bearer <supervisor_token>
```

This should return all users. Non-supervisors will get 403 Forbidden.

## 🐛 Troubleshooting

### Issue: "MongoDB connection failed"
**Solutions:**
- Check if MongoDB is running: `mongosh` (should connect)
- Verify MONGODB_URI in .env
- For Atlas: check network access (allow your IP)

### Issue: "Invalid access token"
**Solutions:**
- Token might be expired (default 15 min)
- Use refresh token endpoint to get new token
- Or login again

### Issue: "User already exists"
**Solutions:**
- Use a different email
- Or drop the database: `mongosh` → `use carenest` → `db.dropDatabase()`

### Issue: Port 8000 already in use
**Solutions:**
- Change PORT in .env to 8080 or another port
- Or kill the process using port 8000

## 📱 Using with Frontend

### Setting up CORS
Update `CORS_ORIGIN` in .env to your frontend URL:
```env
CORS_ORIGIN=http://localhost:3000
```

### Frontend Authentication Flow

1. **Login request:**
```javascript
const response = await fetch('http://localhost:8000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies!
  body: JSON.stringify({ email, password })
});

const data = await response.json();
// Store accessToken in state/context
```

2. **Making authenticated requests:**
```javascript
const response = await fetch('http://localhost:8000/api/v1/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  credentials: 'include'
});
```

3. **Handling token expiry:**
```javascript
// If you get 401 error, refresh token:
const response = await fetch('http://localhost:8000/api/v1/auth/refresh-token', {
  method: 'POST',
  credentials: 'include'
});
// New tokens will be in cookies
```

## 📚 Next Steps

1. ✅ Authentication is done!
2. 🔜 Implement therapist profile management
3. 🔜 Implement session booking
4. 🔜 Implement feedback system
5. 🔜 Build the React frontend

## 🎯 Available Endpoints

### Public (No auth required)
- `GET /health` - Health check
- `POST /api/v1/auth/register` - Register
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh-token` - Refresh token

### Protected (Auth required)
- `GET /api/v1/auth/me` - Current user
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/change-password` - Change password
- `PATCH /api/v1/users/profile` - Update profile
- `GET /api/v1/users/:id` - Get user by ID

### Supervisor Only
- `GET /api/v1/users` - List all users

## 💡 Pro Tips

1. **Use environment-specific configs:**
   - Development: `NODE_ENV=development`
   - Production: `NODE_ENV=production`

2. **Keep tokens secure:**
   - Never log tokens
   - Use HTTPS in production
   - Tokens are in HTTP-only cookies (good!)

3. **Database naming:**
   - Database name is set in `src/constants.js`
   - Currently: `carenest`

4. **VS Code Extensions:**
   - Thunder Client (REST client)
   - MongoDB for VS Code
   - ESLint
   - Prettier

## 🔗 Useful Links

- [Project Structure](./IMPLEMENTATION_SUMMARY.md)
- [Full API Documentation](./AUTH_README.md)
- [API Examples](./api-examples.js)

---

**You're ready to go! 🎉**

If you have any issues, check the troubleshooting section or refer to the full documentation.
