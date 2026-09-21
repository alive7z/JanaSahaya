import path from 'node:path';
import env from '../config/env.js';

/** Store portable paths relative to the persistent upload root, never container paths. */
export function storedUploadPath(filePath) {
  return path.relative(path.resolve(env.uploadDir), path.resolve(filePath)).split(path.sep).join('/');
}
