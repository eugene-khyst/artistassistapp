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

export enum OS {
  I_OS = 'iOS',
  I_PAD_OS = 'iPadOS',
  MAC_OS = 'macOS',
  ANDROID = 'Android',
  WINDOWS = 'Windows',
  CHROME_OS = 'ChromeOS',
  LINUX = 'Linux',
}

export enum DisplayMode {
  BROWSER = 'browser',
  STANDALONE = 'standalone',
  TWA = 'twa',
}

export function getOS(): OS | undefined {
  const ua = navigator.userAgent;
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  if (/iPhone|iPod/.test(ua)) {
    return OS.I_OS;
  }
  if (ua.includes('iPad') || (ua.includes('Mac') && maxTouchPoints > 1)) {
    return OS.I_PAD_OS;
  }
  if (ua.includes('Mac')) {
    return OS.MAC_OS;
  }
  if (ua.includes('Android')) {
    return OS.ANDROID;
  }
  if (ua.includes('Windows')) {
    return OS.WINDOWS;
  }
  if (ua.includes('CrOS')) {
    return OS.CHROME_OS;
  }
  if (ua.includes('Linux')) {
    return OS.LINUX;
  }
  return undefined;
}

export function getDisplayMode(): DisplayMode {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (document.referrer.startsWith('android-app://')) {
    return DisplayMode.TWA;
  } else if (('standalone' in navigator && navigator.standalone) || isStandalone) {
    return DisplayMode.STANDALONE;
  }
  return DisplayMode.BROWSER;
}
