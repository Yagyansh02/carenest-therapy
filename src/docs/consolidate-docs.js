import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Consolidates all modular API documentation files into a single api.json
 * 
 * This script:
 * 1. Reads the base template from api.json
 * 2. Loads all individual feature documentation files (auth.json, users.json, etc.)
 * 3. Merges paths and schemas from all files
 * 4. Writes the consolidated documentation back to api.json
 * 
 * Usage: node consolidate-docs.js
 */

const DOCS_DIR = __dirname;
const BASE_TEMPLATE_FILE = path.join(DOCS_DIR, 'api.base.json');
const OUTPUT_FILE = path.join(DOCS_DIR, 'api.json');

// List of feature documentation files to consolidate
const FEATURE_FILES = [
  'users.json',
  'therapists.json',
  // Add more feature files here as you create them
];

function consolidateDocs() {
  try {
    console.log('🔄 Starting documentation consolidation...\n');

    // Read base template
    console.log('📖 Reading base template...');
    const baseTemplate = JSON.parse(
      fs.readFileSync(BASE_TEMPLATE_FILE, 'utf-8')
    );

    // Initialize consolidated spec with base template
    const consolidatedSpec = {
      ...baseTemplate,
      paths: { ...baseTemplate.paths },
      components: {
        ...baseTemplate.components,
        schemas: { ...baseTemplate.components.schemas },
      },
    };

    // Process each feature file
    FEATURE_FILES.forEach((filename) => {
      const filePath = path.join(DOCS_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Warning: ${filename} not found, skipping...`);
        return;
      }

      console.log(`📄 Processing ${filename}...`);
      const featureSpec = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Merge paths
      if (featureSpec.paths) {
        consolidatedSpec.paths = {
          ...consolidatedSpec.paths,
          ...featureSpec.paths,
        };
      }

      // Merge schemas if present
      if (featureSpec.components?.schemas) {
        consolidatedSpec.components.schemas = {
          ...consolidatedSpec.components.schemas,
          ...featureSpec.components.schemas,
        };
      }

      // Merge other component sections if needed
      if (featureSpec.components) {
        Object.keys(featureSpec.components).forEach((key) => {
          if (key !== 'schemas') {
            consolidatedSpec.components[key] = {
              ...consolidatedSpec.components[key],
              ...featureSpec.components[key],
            };
          }
        });
      }
    });

    // Write consolidated spec to output file
    console.log('\n💾 Writing consolidated documentation...');
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(consolidatedSpec, null, 2),
      'utf-8'
    );

    // Calculate statistics
    const pathCount = Object.keys(consolidatedSpec.paths).length;
    const schemaCount = Object.keys(consolidatedSpec.components.schemas).length;

    console.log('\n✅ Documentation consolidation complete!');
    console.log(`📊 Statistics:`);
    console.log(`   - Total endpoints: ${pathCount}`);
    console.log(`   - Total schemas: ${schemaCount}`);
    console.log(`   - Output file: ${OUTPUT_FILE}\n`);

  } catch (error) {
    console.error('❌ Error consolidating documentation:', error.message);
    process.exit(1);
  }
}

// Run consolidation
consolidateDocs();
