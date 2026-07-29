/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {fromBase64, toBase64Url} from '@/utils/base64';

const NONCE_LEN = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export enum EncryptionAlgorithm {
  A256GCM = 'A256GCM',
}

export interface EncryptedEnvelope {
  alg: string;
  iv: string;
  ciphertext: string;
  tag: string;
}

export function isEncrypted(value: unknown): value is EncryptedEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'alg' in value &&
    'iv' in value &&
    'ciphertext' in value &&
    'tag' in value
  );
}

export function base64To256BitKey(keyBase64?: string): Uint8Array<ArrayBuffer> {
  if (!keyBase64) {
    throw new Error('Cipher key is required');
  }
  const key = fromBase64(keyBase64);
  if (key.length !== 32) {
    throw new Error(`Cipher key must decode to 32 bytes, got ${key.length}`);
  }
  return key;
}

export async function decrypt(
  {alg, iv, ciphertext, tag}: EncryptedEnvelope,
  key: Uint8Array<ArrayBuffer>
): Promise<string> {
  if (alg !== (EncryptionAlgorithm.A256GCM as string)) {
    throw new Error(`Unsupported algorithm: ${alg}`);
  }
  const ivBytes = fromBase64(iv);
  if (ivBytes.length !== NONCE_LEN) {
    throw new Error(`IV must be ${NONCE_LEN} bytes, got ${ivBytes.length}`);
  }
  const ciphertextBytes = fromBase64(ciphertext);
  const tagBytes = fromBase64(tag);

  const combined = new Uint8Array(new ArrayBuffer(ciphertextBytes.length + tagBytes.length));
  combined.set(ciphertextBytes, 0);
  combined.set(tagBytes, ciphertextBytes.length);

  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    {name: 'AES-GCM', iv: ivBytes},
    cryptoKey,
    combined
  );
  return decoder.decode(plaintext);
}

export function randomBase64Url(bytes: number): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function createSha256Base64Url(value: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}
