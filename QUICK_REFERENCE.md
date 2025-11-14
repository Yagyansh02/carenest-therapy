# 🚀 Quick Reference Card

## 📍 Your API Documentation
```
http://localhost:5000/docs
```

## ✏️ Edit Documentation

**Authentication endpoints** → `src/docs/auth.json`
**User endpoints** → `src/docs/users.json`  
**Therapist endpoints** → `src/docs/therapists.json`

## 🔄 After Editing

```bash
npm run docs:consolidate
```

Then refresh: http://localhost:5000/docs

## 📁 Files Overview

| File | Edit? | Purpose |
|------|-------|---------|
| `api.json` | ❌ | Auto-generated (don't touch!) |
| `auth.json` | ✅ | Auth endpoints |
| `users.json` | ✅ | User endpoints |
| `therapists.json` | ✅ | Therapist endpoints |
| `api.base.json` | ⚠️ | API settings (rarely) |

## 🎯 Common Tasks

### Add auth endpoint
```bash
1. Edit src/docs/auth.json
2. npm run docs:consolidate
3. Refresh browser
```

### Add user endpoint
```bash
1. Edit src/docs/users.json
2. npm run docs:consolidate
3. Refresh browser
```

### Add new feature
```bash
1. Create src/docs/feature.json
2. Edit consolidate-docs.js (add to FEATURE_FILES)
3. Edit api.base.json (add tag)
4. npm run docs:consolidate
```

## ⚡ NPM Scripts

```bash
npm run dev                  # Start server (port 5000)
npm run docs:consolidate     # Merge docs
npm run docs:watch          # Auto-merge on save
```

## 📊 Current Stats

✅ **14 endpoints** documented
✅ **4 schemas** defined
✅ **Port 5000** everywhere
✅ **3 feature files** ready

## 📚 Full Guides

- `src/docs/README.md` - Complete documentation
- `docs/MODULAR_DOCS_GUIDE.md` - Quick guide
- `docs/MODULAR_DOCS_VISUAL.md` - Visual diagrams
- `docs/MODULAR_IMPLEMENTATION_COMPLETE.md` - Implementation summary

## ⚠️ Remember

✅ Edit feature files (auth.json, users.json, therapists.json)
✅ Run consolidation after changes
❌ DON'T edit api.json directly!

---

**Happy documenting!** 🎉
