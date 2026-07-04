import {
  deletePrivateKeyRecord,
  decryptUrlSafePgpMessage,
  escapeHtml,
  installConsoleMirror,
  loadPrivateKeyRecords,
  upsertPrivateKeyRecord
} from 'my-message-utils';

const statusText = document.querySelector('#status-text');
const messageOutput = document.querySelector('#message-output');
const consoleOutput = document.querySelector('#console-output');
const keyManager = document.querySelector('#key-manager');
const openKeyManagerButton = document.querySelector('#open-key-manager');
const closeKeyManagerButton = document.querySelector('#close-key-manager');
const keyFileInput = document.querySelector('#key-file');
const keyTextInput = document.querySelector('#key-text');
const keyLabelInput = document.querySelector('#key-label');
const keyPassphraseInput = document.querySelector('#key-passphrase');
const saveKeyButton = document.querySelector('#save-key');
const storedKeysList = document.querySelector('#stored-keys');

let keyFileText = '';

function setStatus(text) {
  statusText.textContent = text;
}

function setMessage(plainText) {
  messageOutput.innerHTML = escapeHtml(plainText || '(No message decrypted yet.)');
}

function toggleKeyManager(show) {
  keyManager.classList.toggle('hidden', !show);
}

function renderStoredKeys() {
  const records = loadPrivateKeyRecords();
  storedKeysList.innerHTML = '';

  if (records.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No private keys saved yet.';
    storedKeysList.appendChild(empty);
    return;
  }

  records.forEach((record) => {
    const item = document.createElement('li');
    item.className = 'stored-key-item';

    const summary = document.createElement('span');
    summary.className = 'stored-key-summary';
    const label = record.label ? `${record.label} ` : '';
    const users = record.userIds && record.userIds.length > 0 ? record.userIds.join(', ') : 'Unknown user';
    summary.textContent = `${label}${users} (${record.fingerprint})`;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'toolbar-btn ghost stored-key-delete';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', async () => {
      const confirmed = window.confirm(`Delete stored key ${record.fingerprint}?`);
      if (!confirmed) {
        setStatus(`Deletion cancelled for key ${record.fingerprint}.`);
        return;
      }

      const deleted = deletePrivateKeyRecord(record.id);
      if (!deleted) {
        setStatus(`Key ${record.fingerprint} was already removed.`);
        renderStoredKeys();
        return;
      }

      renderStoredKeys();
      setStatus(`Deleted key ${record.fingerprint}.`);
      await loadAndDecryptFromUrlIfPresent();
    });

    item.append(summary, deleteButton);
    storedKeysList.appendChild(item);
  });
}

function appendConsoleEntry(entry) {
  const line = document.createElement('div');
  line.className = `console-line console-${entry.method}`;
  line.innerHTML = `<span class="console-tag">${escapeHtml(entry.method)}</span> ${entry.escapedHtml}`;
  consoleOutput.appendChild(line);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

async function loadAndDecryptFromUrlIfPresent() {
  const params = new URLSearchParams(window.location.search);
  const urlsafePgpMessage = params.get('urlsafe-pgp-message');

  if (!urlsafePgpMessage) {
    setStatus('No urlsafe-pgp-message query parameter found.');
    return;
  }

  setStatus('Attempting to decrypt message from URL parameter...');

  try {
    const result = await decryptUrlSafePgpMessage({ urlsafePgpMessage });

    if (result.ok) {
      setStatus(`Message decrypted with key ${result.keyRecord.fingerprint}.`);
      setMessage(result.plaintext);
      return;
    }

    if (result.reason === 'missing-key') {
      setStatus('No matching key in local storage. Upload or paste the required private key.');
      setMessage('(Message is encrypted. Add a key to decrypt it.)');
      toggleKeyManager(true);
      return;
    }

    setStatus('A key was found but decryption failed. Verify key passphrase and key content.');
    toggleKeyManager(true);
  } catch (error) {
    setStatus(`Unable to process urlsafe-pgp-message: ${error.message}`);
    toggleKeyManager(true);
  }
}

openKeyManagerButton.addEventListener('click', () => toggleKeyManager(true));
closeKeyManagerButton.addEventListener('click', () => toggleKeyManager(false));

keyFileInput.addEventListener('change', async (event) => {
  const [file] = event.target.files || [];
  keyFileText = '';

  if (!file) {
    return;
  }

  keyFileText = await file.text();
  setStatus(`Loaded key file ${file.name}. Click Save Key to import.`);
});

saveKeyButton.addEventListener('click', async () => {
  const armoredKey = keyTextInput.value.trim() || keyFileText.trim();

  if (!armoredKey) {
    setStatus('Provide a private key by file upload or paste before saving.');
    return;
  }

  try {
    const record = await upsertPrivateKeyRecord({
      armoredKey,
      label: keyLabelInput.value,
      passphrase: keyPassphraseInput.value
    });

    renderStoredKeys();
    setStatus(`Saved key ${record.fingerprint}.`);
    keyTextInput.value = '';
    keyPassphraseInput.value = '';
    keyLabelInput.value = '';
    keyFileInput.value = '';
    keyFileText = '';

    await loadAndDecryptFromUrlIfPresent();
  } catch (error) {
    setStatus(`Failed to save key: ${error.message}`);
  }
});

installConsoleMirror({ onEntry: appendConsoleEntry });
console.info('Console mirroring is active.');

setMessage('(Waiting for decrypted content.)');
renderStoredKeys();
loadAndDecryptFromUrlIfPresent();
