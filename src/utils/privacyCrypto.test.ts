import { describe, it, expect } from 'vitest';
import { deriveKey, encryptSecret, decryptSecret } from './privacyCrypto';

describe('privacyCrypto - AES-GCM-256 Vault', () => {
  it('should derive key, encrypt secret, and decrypt correctly', async () => {
    const passphrase = 'test-secret-passphrase-123!';
    const secretText = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';

    const { key } = await deriveKey(passphrase);
    expect(key).toBeDefined();

    const encrypted = await encryptSecret(secretText, key);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.ciphertext).not.toEqual(secretText);

    const decrypted = await decryptSecret(encrypted, key);
    expect(decrypted).toEqual(secretText);
  });
});
