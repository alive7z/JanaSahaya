import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

/**
 * Upload strategy:
 *  - MIME type allow-list
 *  - extension allow-list (with an explicit dangerous-extension block-list)
 *  - size limit (single file + total count)
 *  - magic-byte verification AFTER multer writes the file (see verifyImageMagic below)
 */

const ALLOWED_MIME = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

/** Magic byte signatures per declared MIME type, keyed by the name detectMagic returns. */
const MIME_TO_MAGIC_NAME = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/** Never accept these extensions regardless of claimed MIME type. */
const BLOCKED_EXT = new Set([
  '.exe', '.js', '.jsx', '.mjs', '.sh', '.php', '.phtml', '.phar',
  '.html', '.htm', '.svg', '.svgz', '.xml', '.xhtml', '.cgi', '.pl',
  '.py', '.r', '.rb', '.jsp', '.asp', '.aspx', '.bat', '.cmd', '.com',
  '.msi', '.dll', '.so', '.bin', '.sql', '.tar', '.zip', '.gz', '.7z',
]);

const IMG_MAGIC = {
  jpg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  webp: [0x52, 0x49, 0x46, 0x46], // "RIFF", then bytes 8-11 = "WEBP"
};

export const IMAGE_SIZE_LIMIT = env.maxUploadMb * 1024 * 1024;

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const dir = path.join(env.uploadDir, new Date().toISOString().slice(0, 10));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    // Never trust the original filename: generate a random one.
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : ALLOWED_MIME.get(file.mimetype) || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomUUID()}${safeExt}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const originalExt = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXT.has(originalExt)) {
    return cb(new AppError(400, `File type .${originalExt.slice(1)} is not allowed`));
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new AppError(400, `Unsupported MIME type: ${file.mimetype}`));
  }
  if (!ALLOWED_EXT.has(originalExt)) {
    return cb(new AppError(400, `Unsupported file extension: ${originalExt}`));
  }
  return cb(null, true);
};

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: IMAGE_SIZE_LIMIT, files: 5 },
});

async function detectMagic(filepath) {
  const fd = await fsp.open(filepath, 'r');
  try {
    const buf = Buffer.alloc(12);
    const { bytesRead } = await fd.read(buf, 0, 12, 0);
    const sig = [...buf.subarray(0, bytesRead)];
    if (startsWith(sig, IMG_MAGIC.jpg)) return 'jpg';
    if (startsWith(sig, IMG_MAGIC.png)) return 'png';
    if (startsWith(sig, IMG_MAGIC.webp) && sig[8] === 0x57 && sig[9] === 0x45 && sig[10] === 0x42 && sig[11] === 0x50) return 'webp';
    return null;
  } finally {
    await fd.close();
  }
}

function startsWith(sig, needle) {
  if (sig.length < needle.length) return false;
  return needle.every((byte, i) => sig[i] === byte);
}

/**
 * Verifies that every uploaded file really is the image type it claims to be.
 * Files that fail are deleted and the request is rejected with 400.
 */
export async function verifyImageMagic(req, _res, next) {
  const files = Object.values(req.files ?? {}).flat();
  try {
    for (const f of files) {
      const detected = await detectMagic(f.path);
      const expectedMagic = MIME_TO_MAGIC_NAME.get(f.mimetype);
      if (!expectedMagic || detected !== expectedMagic) {
        await Promise.all(files.map((file) => fsp.unlink(file.path).catch(() => {})));
        return next(new AppError(400, `File content does not match its declared type (${f.originalname})`));
      }
    }
    next();
  } catch (err) {
    await Promise.all(files.map((file) => fsp.unlink(file.path).catch(() => {})));
    next(err);
  }
}

/** Limit which fields carry image files. */
export const issueImages = [uploadImages.fields([{ name: 'images', maxCount: 5 }, { name: 'evidence', maxCount: 5 }]), verifyImageMagic];
