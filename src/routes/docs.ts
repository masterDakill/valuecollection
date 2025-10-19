// 📚 API Documentation Routes
// Serves OpenAPI spec and interactive documentation

import { Hono } from 'hono';
import { generateOpenAPISpec, generateCurlExamples } from '../lib/openapi';

export const docsRoutes = new Hono<{ Bindings: any }>();

/**
 * GET /docs
 * Swagger UI for interactive API documentation
 */
docsRoutes.get('/docs', (c) => {
  const baseUrl = c.env.BASE_URL || 'http://localhost:3000';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ImageToValue API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .topbar {
      display: none;
    }
    .swagger-ui .info .title {
      font-size: 2.5rem;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '${baseUrl}/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true
      });
    };
  </script>
</body>
</html>
  `.trim();

  c.header('Content-Type', 'text/html; charset=utf-8');
  return c.html(html);
});

/**
 * GET /openapi.json
 * OpenAPI specification in JSON format
 */
docsRoutes.get('/openapi.json', (c) => {
  const baseUrl = c.env.BASE_URL || 'http://localhost:3000';
  const spec = generateOpenAPISpec(baseUrl);

  return c.json(spec);
});

/**
 * GET /openapi.yaml
 * OpenAPI specification in YAML format
 */
docsRoutes.get('/openapi.yaml', (c) => {
  const baseUrl = c.env.BASE_URL || 'http://localhost:3000';
  const spec = generateOpenAPISpec(baseUrl);

  // Simple JSON to YAML converter (for basic objects)
  const yaml = jsonToYaml(spec);

  c.header('Content-Type', 'text/yaml; charset=utf-8');
  return c.text(yaml);
});

/**
 * GET /examples
 * Curl examples for testing
 */
docsRoutes.get('/examples', (c) => {
  const baseUrl = c.env.BASE_URL || 'http://localhost:3000';
  const examples = generateCurlExamples(baseUrl);

  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(examples);
});

/**
 * Simple JSON to YAML converter
 */
function jsonToYaml(obj: any, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        yaml += `${spaces}-\n${jsonToYaml(item, indent + 1)}`;
      } else {
        yaml += `${spaces}- ${formatValue(item)}\n`;
      }
    });
  } else if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        if (value.length === 0) {
          yaml += `${spaces}  []\n`;
        } else {
          yaml += jsonToYaml(value, indent + 1);
        }
      } else if (typeof value === 'object' && value !== null) {
        yaml += `${spaces}${key}:\n${jsonToYaml(value, indent + 1)}`;
      } else {
        yaml += `${spaces}${key}: ${formatValue(value)}\n`;
      }
    });
  }

  return yaml;
}

function formatValue(value: any): string {
  if (typeof value === 'string') {
    // Quote strings that contain special characters
    if (value.includes(':') || value.includes('#') || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (value === null) return 'null';
  if (value === undefined) return 'null';
  return String(value);
}
