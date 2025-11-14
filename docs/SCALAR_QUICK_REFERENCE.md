# 🚀 Scalar API Docs - Quick Reference

## Installation
```bash
npm install @scalar/express-api-reference
```

## Access Documentation
```
http://localhost:8000/api-docs
```

## File Locations
- **OpenAPI Spec**: `src/docs/api.json`
- **Route Handler**: `src/routes/docs.routes.js`
- **App Config**: `src/app.js` (line with `/api-docs`)

## Quick Edits

### Add New Endpoint
Edit `src/docs/api.json` → Add to `paths` section:
```json
"/api/v1/your-endpoint": {
  "get": {
    "tags": ["YourTag"],
    "summary": "Brief description",
    "responses": {
      "200": { "description": "Success" }
    }
  }
}
```

### Add New Schema
Edit `src/docs/api.json` → Add to `components.schemas`:
```json
"YourModel": {
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" }
  }
}
```

### Change Theme
Edit `src/routes/docs.routes.js`:
```javascript
theme: "purple", // default, alternate, moon, purple, solarized, etc.
```

### Mark Endpoint as Protected
Add to endpoint:
```json
"security": [{ "bearerAuth": [] }]
```

## Available Themes
- `default` - Clean light theme
- `alternate` - Alternative light theme  
- `moon` - Dark theme
- `purple` - Purple accent (current)
- `solarized` - Solarized color scheme
- `bluePlanet` - Blue theme
- `saturn` - Saturn theme
- `kepler` - Kepler theme
- `mars` - Red theme
- `deepSpace` - Deep space theme

## Common Tasks

### Test an Endpoint
1. Go to http://localhost:8000/api-docs
2. Click on an endpoint
3. Click "Try it" button
4. Fill in parameters
5. Click "Send"

### Add Authentication
1. In Scalar UI, click lock icon 🔒
2. Select "bearerAuth"
3. Paste your JWT token
4. All protected endpoints will use this token

### Share Documentation
Just share the URL: `http://yourserver.com/api-docs`

## Troubleshooting

**Not loading?**
- Check if package is installed: `npm list @scalar/express-api-reference`
- Verify server is running
- Check console for errors

**Invalid JSON?**
- Use JSON validator: https://jsonlint.com/
- Check for missing commas, brackets

**Changes not appearing?**
- Hard refresh: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
- Check if `api.json` was saved

## Resources
- 📖 [Full Setup Guide](./SCALAR_SETUP_GUIDE.md)
- 📚 [Documentation Guide](./API_DOCUMENTATION_GUIDE.md)
- 🌐 [Scalar GitHub](https://github.com/scalar/scalar)
- 📝 [OpenAPI Spec](https://spec.openapis.org/oas/v3.1.0)
