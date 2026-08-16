/**
 * privacyCrypto.ts — Client-Side Encryption Vault
 * OWASP 2023 Floor: PBKDF2 with SHA-256 and >=600,000 iterations.
 * Cipher: AES-GCM-256 with unique 96-bit IV per encryption.
 * Secrets never touch console, errors, or unencrypted sync storage.
 */

const PBKDF2_ITERATIONS = 600000;
const KEY_LEN_BITS = 256;

export interface EncryptedData {
  ciphertext: string; // Base64
  salt: string;       // Base64
  iv: string;         // Base64
}

let cachedSessionKey: CryptoKey | null = null;

export async function deriveKey(passphrase: string, saltInput?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const enc = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const salt = saltInput || crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: KEY_LEN_BITS },
    false,
    ['encrypt', 'decrypt']
  );

  cachedSessionKey = key;
  return { key, salt };
}

export function setSessionKey(key: CryptoKey | null): void {
  cachedSessionKey = key;
}

export function getSessionKey(): CryptoKey | null {
  return cachedSessionKey;
}

export function clearSessionKey(): void {
  cachedSessionKey = null;
}

export async function encryptSecret(plaintext: string, passphraseKey?: CryptoKey): Promise<EncryptedData> {
  const key = passphraseKey || cachedSessionKey;
  if (!key) {
    throw new Error('Vault Locked: No session key derived. Provide passphrase.');
  }

  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  return {
    ciphertext: bufferToBase64(new Uint8Array(ciphertextBuffer)),
    salt: '', // Salt stored derived if passphrase used
    iv: bufferToBase64(iv),
  };
}

export async function decryptSecret(encrypted: EncryptedData, passphraseKey?: CryptoKey): Promise<string> {
  const key = passphraseKey || cachedSessionKey;
  if (!key) {
    throw new Error('Vault Locked: No session key available for decryption.');
  }

  const iv = base64ToBuffer(encrypted.iv);
  const ciphertext = base64ToBuffer(encrypted.ciphertext);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
