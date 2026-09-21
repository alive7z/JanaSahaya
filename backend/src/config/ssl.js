import fs from 'node:fs';
import env from './env.js';

/**
 * Build the mysql2 `ssl` option from DB_SSL_CA_PATH (required by Aiven MySQL).
 *
 * - Unset  -> undefined (plain connection, used for local development / Docker).
 * - Set    -> { ca, rejectUnauthorized: true }. The CA file must exist; TLS
 *             verification is never disabled.
 */
export function buildSslConfig() {
  const caPath = env.db.sslCaPath;
  if (!caPath) return undefined;

  if (!fs.existsSync(caPath)) {
    throw new Error(
      `DB_SSL_CA_PATH is set but the CA certificate was not found at "${caPath}". ` +
        'Mount the Aiven CA file (Render secret file) or unset DB_SSL_CA_PATH for a non-TLS database.',
    );
  }

  return {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true,
  };
}

export default buildSslConfig;
