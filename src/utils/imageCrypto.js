const crypto = require('crypto');

const PREFIX = 'enc:v1';
const ALGORITHM = 'aes-256-gcm';

function resolveKey() {
  const raw = process.env.IMAGE_ENCRYPTION_KEY;
  if (!raw || !String(raw).trim()) {
    return null;
  }

  const value = String(raw).trim();

  try {
    const keyFromBase64 = Buffer.from(value, 'base64');
    if (keyFromBase64.length === 32) {
      return keyFromBase64;
    }
  } catch (_) {
    // Fall back to other formats.
  }

  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    return Buffer.from(value, 'hex');
  }

  if (value.length >= 32) {
    return Buffer.from(value.slice(0, 32), 'utf8');
  }

  return null;
}

function encryptImageString(input) {
  if (typeof input !== 'string') {
    return input;
  }

  const value = input.trim();
  if (!value) {
    return '';
  }

  if (value.startsWith(`${PREFIX}:`)) {
    return value;
  }

  const key = resolveKey();
  if (!key) {
    return value;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptImageString(input) {
  if (typeof input !== 'string') {
    return input;
  }

  const value = input.trim();
  if (!value) {
    return '';
  }

  if (!value.startsWith(`${PREFIX}:`)) {
    return value;
  }

  const key = resolveKey();
  if (!key) {
    return '';
  }

  const parts = value.split(':');
  if (parts.length !== 5) {
    return '';
  }

  try {
    const iv = Buffer.from(parts[2], 'base64');
    const tag = Buffer.from(parts[3], 'base64');
    const encrypted = Buffer.from(parts[4], 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (_) {
    return '';
  }
}

module.exports = {
  encryptImageString,
  decryptImageString,
};
