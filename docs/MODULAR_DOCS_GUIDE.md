# 🔄 Modular API Documentation - Quick Guide

## 📝 What Changed?

Your API documentation system is now **modular**! Instead of one giant `api.json` file, you have:

✅ **Separate files for each feature**
✅ **Automatic consolidation**
✅ **Port 5000 everywhere**
✅ **Easy to maintain**

## 📁 New Structure

```
src/docs/
├── api.json               # ⚠️ AUTO-GENERATED - Don't edit!
├── api.base.json         # Base template
├── auth.json             # Auth endpoints ✏️ Edit this
├── users.json            # User endpoints ✏️ Edit this
├── therapists.json       # Therapist endpoints ✏️ Edit this
├── consolidate-docs.js   # Merger script
└── README.md             # Full documentation
```

## 🚀 How to Use

### 1️⃣ Edit a Feature File

**Example**: Adding a new auth endpoint

Edit `src/docs/auth.json`:
```json
{
  "paths": {
    "/api/v1/auth/verify-email": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Verify email address",
        "responses": {
          "200": { "description": "Email verified" }
        }
      }
    }
  }
}
```

### 2️⃣ Run Consolidation

```bash
npm run docs:consolidate
```

### 3️⃣ View Changes

Visit: **http://localhost:5000/docs**

## 💡 Quick Commands

```bash
# Consolidate documentation
npm run docs:consolidate

# Auto-consolidate on file changes
npm run docs:watch

# Start dev server
npm run dev
```

## ✏️ Which File to Edit?

| Feature | File | Endpoints |
|---------|------|-----------|
| Authentication | `auth.json` | login, register, logout, refresh |
| Users | `users.json` | user profiles, user management |
| Therapists | `therapists.json` | therapist profiles, availability |
| **New Feature** | `feature.json` | Create new file! |

## 🆕 Add New Feature

1. Create `src/docs/feature-name.json`
2. Edit `consolidate-docs.js` → Add file to `FEATURE_FILES`
3. Edit `api.base.json` → Add tag
4. Run `npm run docs:consolidate`

## 📊 Current Status

✅ Port 5000 configured everywhere
✅ 4 auth endpoints documented
✅ 3 user endpoints documented
✅ 7 therapist endpoints documented
✅ **Total: 14 endpoints ready!**

## 🎯 Workflow

```
Edit feature file (auth.json, users.json)
          ↓
npm run docs:consolidate
          ↓
api.json updated automatically
          ↓
Refresh http://localhost:5000/docs
```

## ⚠️ Important Rules

✅ **DO**:
- Edit `auth.json`, `users.json`, `therapists.json`
- Run `npm run docs:consolidate` after changes
- Add new features in new files

❌ **DON'T**:
- Edit `api.json` directly (auto-generated!)
- Forget to consolidate after changes
- Duplicate schemas across files

## 🔍 Full Documentation

For complete details, see: **`src/docs/README.md`**

## 🎊 Ready to Go!

1. ✅ Port 5000 configured
2. ✅ Modular system ready
3. ✅ 14 endpoints documented
4. ⏳ Start server: `npm run dev`
5. ⏳ Visit: http://localhost:5000/docs

**Happy documenting! 🚀**
