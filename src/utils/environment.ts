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

export type OS = 'iOS' | 'iPadOS' | 'macOS' | 'Android' | 'Windows' | 'ChromeOS' | 'Linux';

export function getOS(): OS | undefined {
  const ua = navigator.userAgent;
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  if (/iPhone|iPod/.test(ua)) {
    return 'iOS';
  }
  if (ua.includes('iPad') || (ua.includes('Mac') && maxTouchPoints > 1)) {
    return 'iPadOS';
  }
  if (ua.includes('Mac')) {
    return 'macOS';
  }
  if (ua.includes('Android')) {
    return 'Android';
  }
  if (ua.includes('Windows')) {
    return 'Windows';
  }
  if (ua.includes('CrOS')) {
    return 'ChromeOS';
  }
  if (ua.includes('Linux')) {
    return 'Linux';
  }
  return undefined;
}
