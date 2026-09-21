import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { fileURLToPath } from 'node:url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let spec;
try {
  const yaml = fs.readFileSync(path.join(__dirname, '../../docs/openapi.yaml'), 'utf8');
  spec = YAML.parse(yaml);
} catch (err) {
  logger.warn('Failed to load openapi.yaml: %s', err.message);
  spec = { openapi: '3.0.3', info: { title: 'JanaSahaya API', version: '1.0.0' }, paths: {} };
}

const router = Router();

router.get('/openapi.json', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(spec);
});

export { spec as swaggerSpec };
export default router;