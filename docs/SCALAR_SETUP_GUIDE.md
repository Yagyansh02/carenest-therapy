# Scalar API Documentation Setup Guide

## 📁 Project Structure

```
Carenest-therapy/
├── src/
│   ├── docs/
│   │   ├── api.json              # Main OpenAPI specification file
│   │   └── examples/             # (Optional) Example request/response files
│   ├── routes/
│   │   ├── docs.routes.js        # Scalar documentation route
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── therapist.routes.js
│   └── app.js                     # Main Express app (updated)
```

## 🚀 Installation

Install the required package:

```bash
npm install @scalar/express-api-reference
```

## ✅ What Was Done

1. ✅ Created `/src/docs` folder
2. ✅ Created `/src/docs/api.json` with OpenAPI 3.1.0 template
3. ✅ Created `/src/routes/docs.routes.js` for Scalar integration
4. ✅ Updated `/src/app.js` to include the documentation route
5. ✅ Documented the `/health` endpoint as a sample

## 🎯 How to Access Documentation

1. Start your server:
   ```bash
   npm start
   # or
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8000/api-docs
   ```

3. You should see the beautiful Scalar API documentation UI!

## 📝 How to Add More API Endpoints

### Step 1: Open `src/docs/api.json`

### Step 2: Add your endpoint under the `paths` section

Example - Adding a POST endpoint for user registration:

```json
"/api/v1/auth/register": {
  "post": {
    "tags": ["Authentication"],
    "summary": "Register a new user",
    "description": "Create a new user account with email and password",
    "operationId": "registerUser",
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "required": ["fullName", "email", "password"],
            "properties": {
              "fullName": {
                "type": "string",
                "example": "John Doe"
              },
              "email": {
                "type": "string",
                "format": "email",
                "example": "john@example.com"
              },
              "password": {
                "type": "string",
                "format": "password",
                "minLength": 4,
                "example": "SecurePass123"
              },
              "role": {
                "type": "string",
                "enum": ["patient", "therapist", "supervisor"],
                "default": "patient",
                "example": "patient"
              }
            }
          }
        }
      }
    },
    "responses": {
      "201": {
        "description": "User registered successfully",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiResponse"
            }
          }
        }
      },
      "400": {
        "description": "Bad request - validation error",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "409": {
        "description": "User already exists",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      }
    }
  }
}
```

### Step 3: Add new schemas to `components.schemas` if needed

Example - Adding a Therapist schema:

```json
"Therapist": {
  "allOf": [
    {
      "$ref": "#/components/schemas/User"
    },
    {
      "type": "object",
      "properties": {
        "specializations": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "example": ["anxiety", "depression"]
        },
        "experience": {
          "type": "integer",
          "example": 5
        },
        "availability": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "day": {
                "type": "string",
                "example": "Monday"
              },
              "slots": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "example": ["09:00-10:00", "14:00-15:00"]
              }
            }
          }
        }
      }
    }
  ]
}
```

### Step 4: Save the file and refresh the browser

No need to restart the server - just reload the documentation page!

## 🎨 Customization Options

### Change Theme

Edit `src/routes/docs.routes.js` and modify the theme:

```javascript
theme: "purple", // Options: default, alternate, moon, purple, solarized, bluePlanet, saturn, kepler, mars, deepSpace
```

### Change Layout

```javascript
layout: "modern", // Options: modern, classic
```

### Toggle Dark Mode

```javascript
darkMode: true, // true or false
```

### Hide Models Section

```javascript
hideModels: true,
```

## 🔐 Adding Authentication

For protected endpoints, add security to the endpoint:

```json
{
  "/api/v1/users/profile": {
    "get": {
      "tags": ["Users"],
      "summary": "Get user profile",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "responses": {
        "200": {
          "description": "Success"
        },
        "401": {
          "description": "Unauthorized"
        }
      }
    }
  }
}
```

## 📚 Resources

- [Scalar Documentation](https://github.com/scalar/scalar)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Scalar Themes Gallery](https://github.com/scalar/scalar#themes)

## 🐛 Troubleshooting

### Documentation not loading?
1. Check if `@scalar/express-api-reference` is installed
2. Verify the server is running on the correct port
3. Check browser console for errors

### Changes not appearing?
1. Hard refresh the browser (Ctrl + Shift + R or Cmd + Shift + R)
2. Clear browser cache
3. Verify `api.json` has valid JSON syntax

### Syntax errors in api.json?
Use a JSON validator: https://jsonlint.com/

## 💡 Pro Tips

1. **Use `$ref` for reusable schemas** - Don't repeat yourself!
2. **Add detailed descriptions** - Help your frontend developers
3. **Include examples** - Makes testing easier
4. **Document error responses** - Show what can go wrong
5. **Keep it organized** - Use tags to group related endpoints
6. **Version your API** - Use `/api/v1/`, `/api/v2/` in paths

## 🎯 Next Steps

1. Install the package: `npm install @scalar/express-api-reference`
2. Start your server
3. Visit `http://localhost:8000/api-docs`
4. Start documenting your endpoints in `src/docs/api.json`
5. Share the docs URL with your frontend team! 🎉
