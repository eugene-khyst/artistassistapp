/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {
  AndroidOutlined,
  AppleOutlined,
  ChromeOutlined,
  DesktopOutlined,
  LinuxOutlined,
  MobileOutlined,
  TabletOutlined,
  WindowsOutlined,
} from '@ant-design/icons';
import {Alert, Col, Row, theme, Typography} from 'antd';
import type {PropsWithChildren} from 'react';

const BROWSER_FEATURES: Record<string, boolean> = {
  Worker: typeof Worker !== 'undefined',
  OffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
  createImageBitmap: typeof createImageBitmap !== 'undefined',
  indexedDB: typeof indexedDB !== 'undefined',
  localStorage: typeof localStorage !== 'undefined',
};
const IS_BROWSER_SUPPORTED = Object.values(BROWSER_FEATURES).every(value => value);

export const BrowserSupport: React.FC<PropsWithChildren> = ({children}: PropsWithChildren) => {
  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  if (!IS_BROWSER_SUPPORTED) {
    const browserFeaturesListItems = Object.entries(BROWSER_FEATURES).map(
      ([feature, isSupported]) => `${feature} ${isSupported ? '✔️' : '❗'}`
    );
    return (
      <div style={{padding: 16}}>
        <Alert message={`Your web browser is not supported.`} type="error" showIcon />
        <Typography.Title level={2}>Supported web browsers and operating systems</Typography.Title>
        <Row gutter={32}>
          <Col xs={24} md={12}>
            <Typography.Paragraph>
              <Typography.Title level={3}>
                <TabletOutlined style={{color: colorTextTertiary}} /> Tablet and{' '}
                <MobileOutlined style={{color: colorTextTertiary}} /> Mobile
              </Typography.Title>
              <ul>
                <li>
                  <AppleOutlined style={{color: colorTextTertiary}} /> iPadOS 16.4+ or iOS 16.4+
                  (not supported in any browser on older versions of iPadOS and iOS)
                </li>
                <li>
                  <AndroidOutlined style={{color: colorTextTertiary}} /> Android
                  <ul>
                    <li>Chrome 69+</li>
                    <li>Firefox 105+</li>
                    <li>Opera 73+</li>
                    <li>Samsung Internet 10.1+</li>
                  </ul>
                </li>
              </ul>
            </Typography.Paragraph>
          </Col>
          <Col xs={24} md={12}>
            <Typography.Paragraph>
              <Typography.Title level={3}>
                <DesktopOutlined style={{color: colorTextTertiary}} /> Desktop
              </Typography.Title>
              <ul>
                <li>
                  <AppleOutlined style={{color: colorTextTertiary}} /> macOS
                  <ul>
                    <li>Safari 16.4 (macOS Big Sur, Monterey, Ventura, Sonoma or later)</li>
                    <li>
                      or install the latest version of the Chrome, Edge, Firefox or Opera web
                      browser
                    </li>
                  </ul>
                </li>
                <li>
                  <WindowsOutlined style={{color: colorTextTertiary}} /> Windows and{' '}
                  <LinuxOutlined style={{color: colorTextTertiary}} /> Linux
                  <ul>
                    <li>Chrome 69+</li>
                    <li>Edge 79+</li>
                    <li>Firefox 105+</li>
                    <li>Opera 64+</li>
                  </ul>
                </li>
                <li>
                  <ChromeOutlined style={{color: colorTextTertiary}} /> ChromeOS 69+
                </li>
              </ul>
            </Typography.Paragraph>
          </Col>
        </Row>
        <Typography.Title level={2}>Diagnostics</Typography.Title>
        <Typography.Paragraph>{navigator.userAgent}</Typography.Paragraph>
        <Typography.Paragraph>
          <ul>
            {browserFeaturesListItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </Typography.Paragraph>
      </div>
    );
  }
  return children;
};
