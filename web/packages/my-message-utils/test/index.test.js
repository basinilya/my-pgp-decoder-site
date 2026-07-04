import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createMemoryStorage,
  deletePrivateKeyRecord,
  decodeBase64Url,
  decryptUrlSafePgpMessage,
  escapeHtml,
  findMatchingKeyRecord,
  loadPrivateKeyRecords,
  upsertPrivateKeyRecord
} from '../src/index.js';

function toUrlSafeBase64(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

describe('my-message-utils', () => {
  it('escapes HTML characters', () => {
    expect(escapeHtml('<b>hello</b> & "ok"')).toBe('&lt;b&gt;hello&lt;/b&gt; &amp; &quot;ok&quot;');
  });

  it('decodes URL-safe base64 payloads', () => {
    const decoded = decodeBase64Url('c2FtcGxlLW1lc3NhZ2U');
    expect(Buffer.from(decoded).toString('utf8')).toBe('sample-message');
  });

  it('stores and finds imported private keys', async () => {
    const storage = createMemoryStorage();
    const keyPath = path.resolve(process.cwd(), '../shell-examples/sample-secret-key.asc');
    const armoredKey = fs.readFileSync(keyPath, 'utf8');

    const record = await upsertPrivateKeyRecord(
      {
        armoredKey,
        passphrase: 'sample-passphrase',
        label: 'sample'
      },
      storage
    );

    const records = loadPrivateKeyRecords(storage);
    const matched = findMatchingKeyRecord(records, [record.keyIds[0]]);

    expect(records).toHaveLength(1);
    expect(matched?.fingerprint).toBe(record.fingerprint);
  });

  it('deletes stored private keys by id', async () => {
    const storage = createMemoryStorage();
    const keyPath = path.resolve(process.cwd(), '../shell-examples/sample-secret-key.asc');
    const armoredKey = fs.readFileSync(keyPath, 'utf8');

    const record = await upsertPrivateKeyRecord(
      {
        armoredKey,
        passphrase: 'sample-passphrase',
        label: 'sample'
      },
      storage
    );

    expect(deletePrivateKeyRecord(record.id, storage)).toBe(true);
    expect(loadPrivateKeyRecords(storage)).toHaveLength(0);
    expect(deletePrivateKeyRecord(record.id, storage)).toBe(false);
  });

  it('decrypts a URL-safe encoded binary pgp message', async () => {
    const storage = createMemoryStorage();
    const keyPath = path.resolve(process.cwd(), '../shell-examples/sample-secret-key.asc');
    const messagePath = path.resolve(process.cwd(), '../shell-examples/sample-message.txt.gpg');

    await upsertPrivateKeyRecord(
      {
        armoredKey: fs.readFileSync(keyPath, 'utf8'),
        passphrase: 'sample-passphrase',
        label: 'sample key'
      },
      storage
    );

    const urlsafePgpMessage = toUrlSafeBase64(fs.readFileSync(messagePath));
    const result = await decryptUrlSafePgpMessage({ urlsafePgpMessage, storage });

    expect(result.ok).toBe(true);
    expect(result.plaintext.trim()).toBe('sample message');
  });
});
