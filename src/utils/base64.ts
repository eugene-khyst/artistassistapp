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

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64(value: string, label = 'Value'): Uint8Array<ArrayBuffer> {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new Error(`${label} must be base64 encoded`);
  }
}

export function fromBase64Url(value: string, label = 'Value'): Uint8Array<ArrayBuffer> {
  if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) {
    throw new Error(`${label} must be base64url encoded`);
  }
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return fromBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='), label);
  } catch {
    throw new Error(`${label} must be base64url encoded`);
  }
}
