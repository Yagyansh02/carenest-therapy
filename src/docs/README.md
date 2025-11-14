# 📚 Modular API Documentation System

## 🎯 Overview

This documentation system uses a **modular approach** where each feature has its own JSON file, and they all consolidate into a single `api.json` file that Scalar uses to generate the interactive documentation.

## 📁 File Structure

```
src/docs/
├── api.json                    # 🔄 Auto-generated consolidated file (DO NOT EDIT MANUALLY)
├── api.base.json              # 📋 Base template with common info & schemas
├── auth.json                  # 🔐 Authentication endpoints
├── users.json                 # 👤 User management endpoints
├── therapists.json            # 🩺 Therapist endpoints
├── consolidate-docs.js        # 🛠️ Consolidation script
└── README.md                  # 📖 This file
```

## 🚀 Quick Start

### 1. Edit Feature Files

Edit the individual JSON files for your features:

```bash
src/docs/auth.json          # Authentication routes
src/docs/users.json         # User routes
src/docs/therapists.json    # Therapist routes
```

### 2. Run Consolidation

After editing any feature file, run:

```bash
npm run docs:consolidate
```

This will merge all files into `api.json`.

### 3. View Documentation

Start your server and visit:
```
http://localhost:5000/docs
```

## 🔧 Available Commands

| Command | Description |
|---------|-------------|
| `npm run docs:consolidate` | Manually consolidate all documentation files |
| `npm run docs:watch` | Auto-consolidate when any JSON file changes |
| `npm run dev` | Start development server with docs |

## 📝 How to Add New Endpoints

### Step 1: Choose the Right File

- **Authentication** → Edit `auth.json`
- **Users** → Edit `users.json`
- **Therapists** → Edit `therapists.json`
- **New Feature** → Create `feature-name.json`

### Step 2: Add Your Endpoint

Open the appropriate file and add your endpoint under `paths`:

```json
{
  "paths": {
    "/api/v1/your-route": {
      "get": {
        "tags": ["YourTag"],
        "summary": "Brief description",
        "description": "Detailed description",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/YourSchema"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Step 3: Consolidate

Run the consolidation command:

```bash
npm run docs:consolidate
```

### Step 4: Refresh Browser

Refresh `http://localhost:5000/docs` to see your changes!

## 🆕 Adding a New Feature File

### 1. Create the File

Create a new JSON file in `src/docs/`:

```bash
# Example: sessions.json for therapy sessions
src/docs/sessions.json
```

### 2. Define Your Paths

```json
{
  "paths": {
    "/api/v1/sessions": {
      "get": {
        "tags": ["Sessions"],
        "summary": "Get all sessions",
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Session": {
        "type": "object",
        "properties": {
          "_id": { "type": "string" },
          "patientId": { "type": "string" },
          "therapistId": { "type": "string" },
          "date": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

### 3. Register in Consolidator

Edit `consolidate-docs.js` and add your file:

```javascript
const FEATURE_FILES = [
  'auth.json',
  'users.json',
  'therapists.json',
  'sessions.json',  // ← Add your file here
];
```

### 4. Add Tag to Base Template

Edit `api.base.json` to add the tag:

```json
"tags": [
  {
    "name": "Health",
    "description": "Health check endpoints"
  },
  {
    "name": "Sessions",
    "description": "Therapy session management"
  }
]
```

### 5. Consolidate

```bash
npm run docs:consolidate
```

## 🎨 File Breakdown

### `api.base.json`
**Purpose**: Base template with metadata
- ✅ API info (title, version, description)
- ✅ Server URLs (uses port 5000)
- ✅ Tags
- ✅ Common schemas (User, ApiResponse, ApiError)
- ✅ Security schemes

**When to edit**: Rarely. Only when changing API-wide settings.

### `auth.json`
**Purpose**: Authentication endpoints
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/logout`
- POST `/api/v1/auth/refresh-token`

**When to edit**: When adding/modifying auth endpoints.

### `users.json`
**Purpose**: User management endpoints
- GET `/api/v1/users`
- GET `/api/v1/users/:id`
- PUT `/api/v1/users/profile`

**When to edit**: When adding/modifying user endpoints.

### `therapists.json`
**Purpose**: Therapist-specific endpoints
- POST/PUT `/api/v1/therapists/profile`
- GET `/api/v1/therapists`
- GET `/api/v1/therapists/:id`
- PUT `/api/v1/therapists/availability`
- PUT `/api/v1/therapists/qualifications`
- PUT `/api/v1/therapists/specializations`

**Includes**: Therapist schema definition

**When to edit**: When adding/modifying therapist endpoints.

### `api.json`
**Purpose**: Consolidated documentation (AUTO-GENERATED)

**⚠️ DO NOT EDIT MANUALLY!** This file is automatically generated by the consolidation script.

### `consolidate-docs.js`
**Purpose**: Merges all feature files into `api.json`

**How it works**:
1. Reads `api.base.json` as the template
2. Reads all feature files
3. Merges paths and schemas
4. Writes to `api.json`

**When to edit**: Only when adding new feature files.

## 🔄 Workflow

```
1. Edit Feature File
   (auth.json, users.json, etc.)
          ↓
2. Run Consolidation
   (npm run docs:consolidate)
          ↓
3. api.json Updated
   (Auto-generated)
          ↓
4. Scalar Reads api.json
   (Serves documentation)
          ↓
5. View in Browser
   (http://localhost:5000/docs)
```

## 💡 Best Practices

### ✅ DO

- ✅ Edit individual feature files (`auth.json`, `users.json`, etc.)
- ✅ Run `npm run docs:consolidate` after changes
- ✅ Use `$ref` to reference common schemas
- ✅ Add detailed descriptions and examples
- ✅ Keep related endpoints in the same file
- ✅ Document all error responses

### ❌ DON'T

- ❌ Edit `api.json` directly (it's auto-generated!)
- ❌ Forget to run consolidation after changes
- ❌ Duplicate schema definitions across files
- ❌ Leave endpoints undocumented
- ❌ Forget to add tags in `api.base.json`

## 🎯 Common Tasks

### Add New Authentication Endpoint

1. Open `src/docs/auth.json`
2. Add endpoint under `paths`
3. Run `npm run docs:consolidate`
4. Refresh browser

### Add New User Endpoint

1. Open `src/docs/users.json`
2. Add endpoint under `paths`
3. Run `npm run docs:consolidate`
4. Refresh browser

### Add New Feature

1. Create `src/docs/feature-name.json`
2. Add to `FEATURE_FILES` in `consolidate-docs.js`
3. Add tag in `api.base.json`
4. Run `npm run docs:consolidate`
5. Refresh browser

### Change API Port

1. Edit `api.base.json`
2. Update server URL to your port
3. Run `npm run docs:consolidate`

### Add New Schema

Option 1: Common schema (used by multiple features)
- Add to `api.base.json` under `components.schemas`

Option 2: Feature-specific schema
- Add to feature file under `components.schemas`
- Example: `Therapist` schema is in `therapists.json`

## 🐛 Troubleshooting

### Changes not appearing?

1. Did you run `npm run docs:consolidate`?
2. Did you refresh the browser?
3. Check console for JSON syntax errors

### Consolidation failing?

1. Validate your JSON: https://jsonlint.com/
2. Check for:
   - Missing commas
   - Extra commas
   - Unclosed brackets
   - Invalid property names

### Endpoint not showing in docs?

1. Check if it's in the feature file
2. Run consolidation
3. Check if `api.json` has the endpoint
4. Refresh browser with Ctrl+Shift+R

## 📊 Current Status

✅ **Configured Files**:
- `api.base.json` - Base template
- `auth.json` - 4 authentication endpoints
- `users.json` - 3 user endpoints
- `therapists.json` - 7 therapist endpoints

✅ **Total Endpoints**: 14 documented endpoints

✅ **Total Schemas**: 4 schemas (User, ApiResponse, ApiError, Therapist)

## 🚀 Auto-consolidation (Optional)

Want automatic consolidation when you save files?

### Terminal 1: Run consolidation watcher
```bash
npm run docs:watch
```

### Terminal 2: Run development server
```bash
npm run dev
```

Now any time you save a JSON file, it will auto-consolidate!

## 📚 Examples

### Example 1: Add a GET endpoint

In `users.json`:
```json
{
  "paths": {
    "/api/v1/users/me": {
      "get": {
        "tags": ["Users"],
        "summary": "Get current user",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Current user retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Example 2: Add a POST endpoint with body

In `therapists.json`:
```json
{
  "paths": {
    "/api/v1/therapists/sessions": {
      "post": {
        "tags": ["Therapists"],
        "summary": "Create therapy session",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "patientId": { "type": "string" },
                  "date": { "type": "string", "format": "date-time" }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Session created"
          }
        }
      }
    }
  }
}
```

## 🔗 Related Files

- **Scalar Route**: `src/routes/docs.routes.js`
- **Main App**: `src/app.js` (mounts `/docs` route)
- **Guides**: `docs/SCALAR_*.md` files

## ✨ Benefits of This System

1. **Modular**: Each feature in its own file
2. **Maintainable**: Easy to find and edit endpoints
3. **Scalable**: Add new features without cluttering
4. **Team-friendly**: Multiple people can work on different files
5. **Version control friendly**: Smaller, focused diffs
6. **Automated**: One command consolidates everything
7. **Consistent**: Port 5000 everywhere

## 🎊 You're Ready!

Start documenting your API by editing the feature files and running:

```bash
npm run docs:consolidate
```

Then visit: **http://localhost:5000/docs** 🚀
