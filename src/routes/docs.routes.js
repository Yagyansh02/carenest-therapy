import express from "express";
import { apiReference } from "@scalar/express-api-reference";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * Load the OpenAPI specification from the JSON file
 * This reads the api.json file synchronously when the server starts
 */
const openApiSpec = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../docs/api.json"), "utf-8")
);

/**
 * @route GET /api-docs
 * @description Serves the Scalar API documentation UI
 * @access Public
 * 
 * Configuration options:
 * - spec: The OpenAPI specification object
 * - theme: Color theme for the documentation UI (default, alternate, moon, purple, solarized, bluePlanet, saturn, kepler, mars, deepSpace)
 * - layout: Layout style (modern or classic)
 * - darkMode: Enable dark mode (true/false)
 * - hideDownloadButton: Hide the download spec button
 * - hideModels: Hide the models section
 * - authentication: Pre-fill authentication credentials (useful for development)
 */
router.get(
  "/",
  apiReference({
    spec: {
      content: openApiSpec,
    },
    theme: "purple", // Change to your preferred theme
    layout: "modern",
    darkMode: true,
    hideDownloadButton: false,
    // Uncomment to hide the models section
    // hideModels: true,
    
    // Optional: Pre-fill auth for development (remove in production)
    // authentication: {
    //   preferredSecurityScheme: "bearerAuth",
    //   bearerToken: "your-test-token-here",
    // },
  })
);

export default router;
