/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export const COMMIT_HASH: string = process.env.CF_PAGES_COMMIT_SHA || Date.now().toString();
export const WEBSITE_URL = 'https://artistassistapp.com';
export const WATERMARK_TEXT = 'ArtistAssistApp.com';
export const API_URL = 'https://api.artistassistapp.com';
export const PATREON_URL = 'https://www.patreon.com/artistassistapp';
