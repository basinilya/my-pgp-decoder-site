import * as openpgp from 'openpgp';

const KEY_DB_STORAGE_KEY = 'my-message-utils.gpg-private-keys.v1';

function getDefaultStorage() {
  if (!globalThis.localStorage) {
    throw new Error('localStorage is not available in this runtime.');
  }
  return globalThis.localStorage;
}

function normalizeKeyId(hex) {
  return String(hex || '').trim().toLowerCase();
}

function utf8Decode(bytes) {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('utf8');
  }
  throw new Error('No UTF-8 decoder available.');
}

function bytesFromBase64(base64Text) {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64Text, 'base64'));
  }
  if (typeof atob !== 'undefined') {
    const raw = atob(base64Text);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      out[i] = raw.charCodeAt(i);
    }
    return out;
  }
  throw new Error('No base64 decoder available.');
}

export function createMemoryStorage(seed = {}) {
  const state = { ...seed };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : null;
    },
    setItem(key, value) {
      state[key] = String(value);
    },
    removeItem(key) {
      delete state[key];
    },
    clear() {
      Object.keys(state).forEach((key) => delete state[key]);
    }
  };
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodeBase64Url(input) {
  const normalized = String(input || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  if (!normalized) {
    throw new Error('Empty URL-safe payload.');
  }

  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return bytesFromBase64(normalized + padding);
}

export async function extractPrivateKeyMetadata(armoredKey) {
  const privateKey = await openpgp.readPrivateKey({ armoredKey });
  const keyIds = [privateKey.getKeyID().toHex(), ...privateKey.getSubkeys().map((subkey) => subkey.getKeyID().toHex())]
    .map(normalizeKeyId)
    .filter(Boolean);

  return {
    fingerprint: privateKey.getFingerprint(),
    keyIds: [...new Set(keyIds)],
    userIds: privateKey.getUserIDs()
  };
}

export function loadPrivateKeyRecords(storage = getDefaultStorage()) {
  const raw = storage.getItem(KEY_DB_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePrivateKeyRecords(records, storage = getDefaultStorage()) {
  storage.setItem(KEY_DB_STORAGE_KEY, JSON.stringify(records));
}

export async function upsertPrivateKeyRecord({ armoredKey, passphrase = '', label = '' }, storage = getDefaultStorage()) {
  const metadata = await extractPrivateKeyMetadata(armoredKey);
  const records = loadPrivateKeyRecords(storage);

  const next = {
    id: metadata.fingerprint,
    label: String(label || '').trim(),
    armoredKey,
    passphrase,
    fingerprint: metadata.fingerprint,
    keyIds: metadata.keyIds,
    userIds: metadata.userIds,
    updatedAt: new Date().toISOString()
  };

  const withoutExisting = records.filter((record) => record.id !== next.id);
  const output = [next, ...withoutExisting];
  savePrivateKeyRecords(output, storage);
  return next;
}

export async function readMessageFromUrlSafeParam(urlsafePgpMessage) {
  const param = String(urlsafePgpMessage || '').trim();
  if (!param) {
    throw new Error('Missing urlsafe-pgp-message parameter.');
  }

  let message;

  if (param.includes('-----BEGIN PGP MESSAGE-----')) {
    message = await openpgp.readMessage({ armoredMessage: param });
  } else {
    const bytes = decodeBase64Url(param);
    const asText = utf8Decode(bytes);
    if (asText.includes('-----BEGIN PGP MESSAGE-----')) {
      message = await openpgp.readMessage({ armoredMessage: asText });
    } else {
      message = await openpgp.readMessage({ binaryMessage: bytes });
    }
  }

  const encryptionKeyIds = message.getEncryptionKeyIDs().map((keyId) => normalizeKeyId(keyId.toHex()));
  return { message, encryptionKeyIds };
}

export function findMatchingKeyRecord(records, encryptionKeyIds) {
  const wanted = new Set((encryptionKeyIds || []).map(normalizeKeyId).filter(Boolean));
  if (wanted.size === 0) {
    return null;
  }

  return records.find((record) => (record.keyIds || []).some((keyId) => wanted.has(normalizeKeyId(keyId)))) || null;
}

async function decryptWithRecord(message, keyRecord) {
  const privateKey = await openpgp.readPrivateKey({ armoredKey: keyRecord.armoredKey });
  const decryptionKey = keyRecord.passphrase
    ? await openpgp.decryptKey({ privateKey, passphrase: keyRecord.passphrase })
    : privateKey;

  const result = await openpgp.decrypt({
    message,
    decryptionKeys: decryptionKey,
    format: 'utf8'
  });

  return result.data;
}

export async function decryptUrlSafePgpMessage({ urlsafePgpMessage, storage = getDefaultStorage() }) {
  const { message, encryptionKeyIds } = await readMessageFromUrlSafeParam(urlsafePgpMessage);
  const records = loadPrivateKeyRecords(storage);

  const matched = findMatchingKeyRecord(records, encryptionKeyIds);
  if (matched) {
    try {
      const plaintext = await decryptWithRecord(message, matched);
      return { ok: true, plaintext, keyRecord: matched, encryptionKeyIds };
    } catch (error) {
      return {
        ok: false,
        reason: 'decrypt-failed',
        error,
        encryptionKeyIds
      };
    }
  }

  for (const record of records) {
    try {
      const plaintext = await decryptWithRecord(message, record);
      return { ok: true, plaintext, keyRecord: record, encryptionKeyIds };
    } catch {
      // Try next key in storage.
    }
  }

  return {
    ok: false,
    reason: 'missing-key',
    encryptionKeyIds
  };
}

export function installConsoleMirror({ onEntry }) {
  if (typeof onEntry !== 'function') {
    throw new Error('onEntry callback is required for console mirroring.');
  }

  const methods = ['log', 'info', 'warn', 'error', 'debug'];
  const originals = {};

  for (const method of methods) {
    originals[method] = console[method].bind(console);
    console[method] = (...args) => {
      let plainText;
      try {
        plainText = args
          .map((arg) => {
            if (arg instanceof Error) {
              return arg.stack || arg.message;
            }
            if (typeof arg === 'string') {
              return arg;
            }
            return JSON.stringify(arg);
          })
          .join(' ');
      } catch {
        plainText = args.map((arg) => String(arg)).join(' ');
      }

      onEntry({
        method,
        timestamp: new Date().toISOString(),
        plainText,
        escapedHtml: escapeHtml(plainText).replace(/\n/g, '<br>')
      });

      originals[method](...args);
    };
  }

  return () => {
    for (const method of methods) {
      if (originals[method]) {
        console[method] = originals[method];
      }
    }
  };
}
