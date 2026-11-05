/**
 * Client-only: derive AES-GCM key from passphrase + salt (PBKDF2), encrypt/decrypt JSON payloads.
 */

const PBKDF2_ITERATIONS = 210_000;

const te = new TextEncoder();

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export function randomSaltBase64(): string {
  const b = randomBytes(16);
  return btoa(String.fromCharCode(...b));
}

export function randomIvBase64(): string {
  const b = randomBytes(12);
  return btoa(String.fromCharCode(...b));
}

async function deriveAesKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const baseKey = await crypto.subtle.importKey("raw", te.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export type VaultPayload = {
  password?: string;
  notes?: string;
};

export async function encryptVaultPayload(
  passphrase: string,
  saltB64: string,
  payload: VaultPayload
): Promise<{ encryptedData: string; iv: string }> {
  const key = await deriveAesKey(passphrase, saltB64);
  const iv = randomBytes(12);
  const plain = te.encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    plain as BufferSource
  );
  const combined = new Uint8Array(ct);
  return {
    encryptedData: btoa(String.fromCharCode(...combined)),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptVaultPayload(
  passphrase: string,
  saltB64: string,
  ivB64: string,
  encryptedDataB64: string
): Promise<VaultPayload> {
  const key = await deriveAesKey(passphrase, saltB64);
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(encryptedDataB64), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ct as BufferSource
  );
  const json = new TextDecoder().decode(plain);
  return JSON.parse(json) as VaultPayload;
}

export async function encryptFileBytes(
  passphrase: string,
  saltB64: string,
  bytes: ArrayBuffer
): Promise<{ iv: string; ciphertext: ArrayBuffer }> {
  const key = await deriveAesKey(passphrase, saltB64);
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    bytes as BufferSource
  );
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: ct,
  };
}

export async function decryptFileBytes(
  passphrase: string,
  saltB64: string,
  ivB64: string,
  ciphertext: ArrayBuffer
): Promise<ArrayBuffer> {
  const key = await deriveAesKey(passphrase, saltB64);
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = new Uint8Array(ciphertext);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ct as BufferSource);
}
