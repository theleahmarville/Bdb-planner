/**
 * Client-side encryption for Zion backup export/import. The passphrase never
 * leaves the device and the server never sees the plaintext or the key —
 * encryption/decryption happens entirely in the browser via Web Crypto.
 */

const PBKDF2_ITERATIONS = 200_000;

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(bytes)));
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface EncryptedBundle {
  v: 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

export async function encryptJson(data: unknown, passphrase: string): Promise<EncryptedBundle> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plaintext);
  return {
    v: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptJson<T = unknown>(bundle: EncryptedBundle, passphrase: string): Promise<T> {
  const salt = fromBase64(bundle.salt);
  const iv = fromBase64(bundle.iv);
  const key = await deriveKey(passphrase, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    fromBase64(bundle.ciphertext) as BufferSource
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
