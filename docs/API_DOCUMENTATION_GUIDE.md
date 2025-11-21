# How to Expand API Documentation

This guide shows you how to document all your existing routes in `api.json`.

## 🗂️ Your Current Routes

Based on your project structure, here are the routes to document:

### 1. Authentication Routes (`/api/v1/auth`)
- POST `/api/v1/auth/register` - Register new user
- POST `/api/v1/auth/login` - Login user
- POST `/api/v1/auth/logout` - Logout user
- POST `/api/v1/auth/refresh-token` - Refresh access token

### 2. User Routes (`/api/v1/users`)
- GET `/api/v1/users` - Get all users
- GET `/api/v1/users/:id` - Get user by ID
- PUT `/api/v1/users/profile` - Update user profile

### 3. Therapist Routes (`/api/v1/therapists`)
- POST `/api/v1/therapists/profile` - Create therapist profile
- PUT `/api/v1/therapists/profile` - Update therapist profile
- GET `/api/v1/therapists/:id` - Get therapist by ID
- GET `/api/v1/therapists` - Get all therapists
- PUT `/api/v1/therapists/availability` - Update availability
- PUT `/api/v1/therapists/qualifications` - Update qualifications
- PUT `/api/v1/therapists/specializations` - Update specializations

## 📋 Complete Example: Documenting Authentication Endpoints

Here's a complete example of how to document all auth endpoints. Copy this into the `paths` section of your `api.json`:

```json
{
  "paths": {
    "/health": {
      "get": {
        "tags": ["Health"],
        "summary": "Health check endpoint",
        "description": "Returns the current status of the API server",
        "responses": {
          "200": {
            "description": "API is healthy",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string", "example": "OK" },
                    "message": { "type": "string", "example": "CareNest Therapy API is running" },
                    "timestamp": { "type": "string", "format": "date-time" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/auth/register": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Register a new user",
        "description": "Create a new user account. Users can register as patient, therapist, or supervisor.",
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
                    "minLength": 2,
                    "maxLength": 100,
                    "example": "John Doe",
                    "description": "User's full name"
                  },
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "john.doe@example.com",
                    "description": "User's email address (must be unique)"
                  },
                  "password": {
                    "type": "string",
                    "format": "password",
                    "minLength": 4,
                    "example": "SecurePass123",
                    "description": "User's password (minimum 4 characters)"
                  },
                  "role": {
                    "type": "string",
                    "enum": ["patient", "therapist", "supervisor"],
                    "default": "patient",
                    "example": "patient",
                    "description": "User role in the system"
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
                  "allOf": [
                    { "$ref": "#/components/schemas/ApiResponse" },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "object",
                          "properties": {
                            "user": { "$ref": "#/components/schemas/User" },
                            "accessToken": {
                              "type": "string",
                              "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            },
                            "refreshToken": {
                              "type": "string",
                              "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            },
            "headers": {
              "Set-Cookie": {
                "description": "Access and refresh tokens set as HTTP-only cookies",
                "schema": {
                  "type": "string",
                  "example": "accessToken=eyJhbGc...; HttpOnly; Secure; SameSite=Strict"
                }
              }
            }
          },
          "400": {
            "description": "Validation error - missing or invalid fields",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ApiError" },
                "example": {
                  "statusCode": 400,
                  "message": "All fields are required",
                  "success": false,
                  "errors": []
                }
              }
            }
          },
          "409": {
            "description": "User with this email already exists",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ApiError" },
                "example": {
                  "statusCode": 409,
                  "message": "User with this email already exists",
                  "success": false,
                  "errors": []
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/auth/login": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Login user",
        "description": "Authenticate user with email and password. Returns access and refresh tokens.",
        "operationId": "loginUser",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email", "password"],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "john.doe@example.com"
                  },
                  "password": {
                    "type": "string",
                    "format": "password",
                    "example": "SecurePass123"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    { "$ref": "#/components/schemas/ApiResponse" },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "object",
                          "properties": {
                            "user": { "$ref": "#/components/schemas/User" },
                            "accessToken": { "type": "string" },
                            "refreshToken": { "type": "string" }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Invalid credentials",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ApiError" }
              }
            }
          }
        }
      }
    },
    "/api/v1/auth/logout": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Logout user",
        "description": "Logout the currently authenticated user and clear tokens",
        "operationId": "logoutUser",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Logout successful",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ApiResponse" }
              }
            }
          },
          "401": {
            "description": "Unauthorized - invalid or missing token",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ApiError" }
              }
            }
          }
        }
      }
    },
    "/api/v1/auth/refresh-token": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Refresh access token",
        "description": "Get a new access token using the refresh token",
        "operationId": "refreshToken",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["refreshToken"],
                "properties": {
                  "refreshToken": {
                    "type": "string",
                    "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Token refreshed successfully",
            "content": {
              "application/json": {
                "schema": {
                  "allOf": [
                    { "$ref": "#/components/schemas/ApiResponse" },
                    {
                      "type": "object",
                      "properties": {
                        "data": {
                          "type": "object",
                          "properties": {
                            "accessToken": { "type": "string" },
                            "refreshToken": { "type": "string" }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Invalid or expired refresh token",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ApiError" }
              }
            }
          }
        }
      }
    }
  }
}
```

## 🎯 Quick Template for Adding New Endpoints

Use this template when adding new endpoints:

```json
"/api/v1/your-route": {
  "get": {
    "tags": ["YourTag"],
    "summary": "Short description",
    "description": "Detailed description of what this endpoint does",
    "operationId": "uniqueOperationName",
    "security": [{ "bearerAuth": [] }],  // Remove if endpoint is public
    "parameters": [
      {
        "name": "id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string"
        },
        "description": "Description of the parameter"
      }
    ],
    "responses": {
      "200": {
        "description": "Success response",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/YourSchema"
            }
          }
        }
      },
      "400": {
        "description": "Bad request",
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

## 💡 Best Practices

1. **Keep it DRY** - Use `$ref` to reference reusable schemas
2. **Be specific** - Add detailed descriptions and examples
3. **Document errors** - Show all possible error responses
4. **Use tags** - Group related endpoints together
5. **Add examples** - Include realistic request/response examples
6. **Security** - Mark protected endpoints with security schemes

## 🔄 Workflow

1. Open `src/docs/api.json`
2. Add your endpoint to the `paths` section
3. Add any new schemas to `components.schemas`
4. Save the file
5. Refresh the documentation page in your browser
6. Test the endpoint using the "Try It" button in Scalar

Happy documenting! 🎉
